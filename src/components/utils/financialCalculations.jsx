/**
 * @file Financial Calculations Utilities
 * @description Centralized functions for calculating expenses, income, and budget statistics.
 * @created 11-Nov-2025
 * @updated 15-Jan-2026 - CRITICAL FIX: Custom Budget calculations now unified across all views (Dashboard, BudgetDetail). Paid and unpaid amounts aggregate ALL linked transactions regardless of payment date or transaction date. Only customBudgetId filtering is applied.
 */

import { isDateInRange } from "./dateUtils";
import { getMonthBoundaries } from "./dateUtils"; // Ensure this is imported
import { base44 } from "@/api/base44Client";
import { parseDate, getFirstDayOfMonth } from "./dateUtils";
import { ensureSystemBudgetsExist } from "./budgetInitialization";

// ADDED 17-Jan-2026: Re-export ensureSystemBudgetsExist for use throughout the app
export { ensureSystemBudgetsExist };

/**
 * Helper to check if a transaction falls within a date range.
 */
export const isTransactionInDateRange = (transaction, startDate, endDate) => {
    if (transaction.type === 'income') {
        return isDateInRange(transaction.date, startDate, endDate);
    }
    // Paid transactions use paidDate, fallback to date. Unpaid use date.
    const effectiveDate = (transaction.isPaid && transaction.paidDate)
        ? transaction.paidDate
        : transaction.date;

    return isDateInRange(effectiveDate, startDate, endDate);
};

/**
 * Helper to determine if a budget ID corresponds to an actual custom budget.
 */
const isActualCustomBudget = (budgetId, allCustomBudgets) => {
    if (!budgetId) return false;
    const budget = allCustomBudgets.find(cb => cb.id === budgetId);
    return budget && !budget.isSystemBudget;
};

/**
 * Calculates total monthly income within a date range.
 */
export const getMonthlyIncome = (transactions, startDate, endDate) => {
    return transactions
        .filter(t => t.type === 'income' && isTransactionInDateRange(t, startDate, endDate))
        .reduce((sum, t) => sum + t.amount, 0);
};

/**
 * Calculates total monthly PAID expenses (excludes unpaid).
 */
export const getMonthlyPaidExpenses = (transactions, startDate, endDate) => {
    return transactions
        .filter(t =>
            t.type === 'expense' &&
            t.isPaid &&
            isTransactionInDateRange(t, startDate, endDate)
        )
        .reduce((sum, t) => sum + t.amount, 0);
};

/**
 * Calculates total monthly expenses (paid + unpaid).
 */
export const getTotalMonthExpenses = (transactions, startDate, endDate) => {
    return transactions
        .filter(t =>
            t.type === 'expense' &&
            isTransactionInDateRange(t, startDate, endDate)
        )
        .reduce((sum, t) => sum + t.amount, 0);
};

/**
 * Helper: Resolves the budget limit (Goal) based on the active mode.
 * This centralizes the logic so we don't repeat (Income * %) everywhere.
 * @param {Object} goal - The budget goal (needs target_percentage and/or target_amount)
 * @param {number} monthlyIncome - The total monthly income
 * @param {Object} settings - App settings (must include goalMode and fixedLifestyleMode)
 * @param {number} historicalAverage - (Optional) Average income from previous months for Inflation Protection
 */
export const resolveBudgetLimit = (goal, monthlyIncome, settings = {}, historicalAverage = 0) => {
    if (!goal) return 0;

    const goalMode = settings.goalMode ?? true; // Default to Percentage
    // If goalMode is False (Absolute), return the flat amount
    if (goalMode === false) return goal.target_amount || 0;

    // --- INFLATION PROTECTION LOGIC ---
    // If enabled AND we have history AND current income exceeds history
    if (settings.fixedLifestyleMode && historicalAverage > 0 && monthlyIncome > historicalAverage) {
        const basisIncome = historicalAverage;
        const overflow = monthlyIncome - basisIncome;

        // 1. Calculate the standard percentage based on the LOWER basis
        const standardCalc = (basisIncome * (goal.target_percentage || 0)) / 100;

        // 2. If this is SAVINGS, add the entire overflow
        if (goal.priority === 'savings') {
            return standardCalc + overflow;
        }

        // 3. For Needs/Wants, return the capped amount
        return standardCalc;
    }
    // Default to Percentage Mode (true or undefined)
    return (monthlyIncome * (goal.target_percentage || 0)) / 100;
};

/**
 * CORE AGGREGATOR: Calculates granular breakdown of expenses in one pass.
 * Replaces getPaidNeedsExpenses, getDirectPaidWantsExpenses, etc.
 * * @returns {Object} { needs: { paid, unpaid, total }, wants: { directPaid, directUnpaid, customPaid, customUnpaid, total } }
 */
export const getFinancialBreakdown = (transactions, categories, allCustomBudgets, startDate, endDate) => {
    const result = {
        needs: { paid: 0, unpaid: 0, total: 0 },
        wants: {
            directPaid: 0,
            directUnpaid: 0,
            customPaid: 0,
            customUnpaid: 0,
            total: 0
        }
    };

    transactions.forEach(t => {
        if (t.type !== 'expense') return;
        if (!isTransactionInDateRange(t, startDate, endDate)) return;

        const isCustom = isActualCustomBudget(t.customBudgetId, allCustomBudgets);
        const category = categories ? categories.find(c => c.id === t.category_id) : null;
        // Priority hierarchy: Transaction > Category > Default 'wants'
        const priority = t.financial_priority || category?.priority || 'wants';

        // CRITICAL FIX 13-Jan-2026: Expenses in CBs should NEVER appear in SB direct calculations
        // If assigned to a CB, skip this transaction for system budget direct calculations
        if (isCustom) {
            // "Indirect" Wants (Vacations, etc.) - Only count in customPaid/customUnpaid
            if (t.isPaid) result.wants.customPaid += t.amount;
            else result.wants.customUnpaid += t.amount;
            return; // CRITICAL: Exit early to prevent double-counting in direct
        }

        // 1. NEEDS Logic (Direct only - CBs never contain needs)
        if (priority === 'needs') {
            if (t.isPaid) result.needs.paid += t.amount;
            else result.needs.unpaid += t.amount;
        }
        // 2. WANTS Logic (Direct only - CBs handled above)
        else if (priority === 'wants') {
            if (t.isPaid) result.wants.directPaid += t.amount;
            else result.wants.directUnpaid += t.amount;
        }
    });

    // Compute Totals
    result.needs.total = result.needs.paid + result.needs.unpaid;

    result.wants.total =
        result.wants.directPaid +
        result.wants.directUnpaid +
        result.wants.customPaid +
        result.wants.customUnpaid;

    return result;
};

/**
 * CRITICAL FIX 15-Jan-2026: Calculates statistics for a single custom budget.
 * 
 * UNIFIED CALCULATION LOGIC:
 * - Aggregates ALL transactions linked to the custom budget (by customBudgetId)
 * - IGNORES payment dates and transaction dates completely
 * - Paid amount = Sum of all paid expenses linked to this budget (t.isPaid === true)
 * - Unpaid amount = Sum of all unpaid expenses linked to this budget (t.isPaid === false)
 * - This ensures CONSISTENT results across:
 *   1. Dashboard > Custom Budgets section (Card View)
 *   2. Dashboard > Custom Budgets section (Bar View)
 *   3. BudgetDetail > Custom Budgets section (when viewing Wants SB)
 *   4. BudgetDetail > Individual Custom Budget view
 * 
 * IMPORTANT: The monthStart/monthEnd parameters are kept for API compatibility
 * but are completely IGNORED for custom budget calculations. Date filtering is
 * only relevant for System Budgets or monthly aggregate views, NOT for individual
 * custom budget statistics.
 * 
 * @param {Object} customBudget - The custom budget entity
 * @param {Array} transactions - ALL transactions (will be filtered by customBudgetId)
 * @param {string} monthStart - IGNORED (kept for API compatibility)
 * @param {string} monthEnd - IGNORED (kept for API compatibility)
 * @param {string} baseCurrency - Base currency for display (default: 'USD')
 * @returns {Object} Budget statistics with paid, unpaid, spent, remaining amounts
 */
export const getCustomBudgetStats = (customBudget, transactions) => {
    // CRITICAL: Filter ONLY by customBudgetId - NO date filtering
    // Custom budgets show ALL expenses linked to them, regardless of when they were paid
    const budgetTransactions = transactions.filter(t => t.customBudgetId === customBudget.id);

    const expenses = budgetTransactions.filter(t => t.type === 'expense');
    const allocated = customBudget.allocatedAmount || 0;

    // Calculate paid/unpaid in ONE pass to prevent double-counting
    let paidBase = 0;
    let unpaidBase = 0;

    expenses.forEach(t => {
        if (t.isPaid) {
            paidBase += t.amount;
        } else {
            unpaidBase += t.amount;
        }
    });

    const spent = paidBase + unpaidBase;

    return {
        allocated,
        spent,
        unpaid: {
            totalBaseCurrencyAmount: unpaidBase,
            foreignCurrencyDetails: []
        },
        remaining: allocated - spent,
        paid: {
            totalBaseCurrencyAmount: paidBase,
            foreignCurrencyDetails: []
        },
        paidAmount: paidBase,
        unpaidAmount: unpaidBase,
        totalAllocatedUnits: allocated,
        totalSpentUnits: spent,
        totalUnpaidUnits: unpaidBase,
        totalTransactionCount: expenses.length
    };
};

/**
 * Calculates statistics for a system budget.
 * Optimized to use getFinancialBreakdown for single-pass calculation.
 * UPDATED: Accepts settings and historicalAverage to correctly resolve the budget limit.
 */
export const getSystemBudgetStats = (systemBudget, transactions, categories, allCustomBudgets, startDate, endDate, monthlyIncome = 0, settings = {}, historicalAverage = 0) => {
    // Get the granular data in one pass
    const breakdown = getFinancialBreakdown(transactions, categories, allCustomBudgets, startDate, endDate);

    let paidAmount = 0;
    let unpaidAmount = 0;

    if (systemBudget.systemBudgetType === 'needs') {
        paidAmount = breakdown.needs.paid;
        unpaidAmount = breakdown.needs.unpaid;
    } else if (systemBudget.systemBudgetType === 'wants') {
        // Wants System Budget aggregates Direct + Custom
        paidAmount = breakdown.wants.directPaid + breakdown.wants.customPaid;
        unpaidAmount = breakdown.wants.directUnpaid + breakdown.wants.customUnpaid;
    } else if (systemBudget.systemBudgetType === 'savings') {
        // Savings = Income - (Needs + Wants)
        const totalExpenses = breakdown.needs.total + breakdown.wants.total;
        paidAmount = Math.max(0, monthlyIncome - totalExpenses);
        unpaidAmount = 0;
    }

    // Use the helper to resolve the limit based on mode
    const totalBudget = resolveBudgetLimit(systemBudget, monthlyIncome, settings, historicalAverage);

    const totalSpent = paidAmount + unpaidAmount;
    const remaining = totalBudget - totalSpent;
    const percentageUsed = totalBudget > 0 ? (totalSpent / totalBudget) * 100 : 0;

    return {
        paid: {
            totalBaseCurrencyAmount: paidAmount,
            foreignCurrencyDetails: []
        },
        unpaid: {
            totalBaseCurrencyAmount: unpaidAmount,
            foreignCurrencyDetails: []
        },
        totalSpent,
        paidAmount,
        unpaidAmount,
        remaining,
        percentageUsed,
        // Pass granular stats back if UI needs them (e.g. for Direct vs Custom split)
        breakdown
    };
};

/**
 * Calculates allocation statistics for a custom budget's categories.
 */
export const getCustomBudgetAllocationStats = (customBudget, allocations, transactions) => {
    const budgetTransactions = transactions.filter(t => t.customBudgetId === customBudget.id);
    const totalAllocated = allocations.reduce((sum, a) => sum + a.allocatedAmount, 0);
    const unallocated = customBudget.allocatedAmount - totalAllocated;

    const categorySpending = {};
    allocations.forEach(allocation => {
        const spent = budgetTransactions
            .filter(t => t.type === 'expense' && t.category_id === allocation.categoryId)
            .reduce((sum, t) => sum + t.amount, 0);

        categorySpending[allocation.categoryId] = {
            allocated: allocation.allocatedAmount,
            spent,
            remaining: allocation.allocatedAmount - spent,
            percentageUsed: allocation.allocatedAmount > 0 ? (spent / allocation.allocatedAmount) * 100 : 0
        };
    });

    const allocatedCategoryIds = allocations.map(a => a.categoryId);
    const unallocatedSpent = budgetTransactions
        .filter(t => t.type === 'expense' && (!t.category_id || !allocatedCategoryIds.includes(t.category_id)))
        .reduce((sum, t) => sum + t.amount, 0);

    return {
        totalAllocated,
        unallocated,
        unallocatedSpent,
        unallocatedRemaining: unallocated - unallocatedSpent,
        categorySpending
    };
};

/**
 * Calculates the net "Bonus Savings Potential".
 * (Needs Limit + Wants Limit) - Actual Spending
 * UPDATED: Accepts settings to correctly resolve the limits.
 */
export const calculateBonusSavingsPotential = (systemBudgets, transactions, categories, allCustomBudgets, startDate, endDate, monthlyIncome = 0, settings = {}, historicalAverage = 0) => {
    // let netPotential = 0;

    // Calculate everything once
    // const breakdown = getFinancialBreakdown(transactions, categories, allCustomBudgets, startDate, endDate);

    // 1. Get the Goals (the percentages/amounts)
    const needsBudget = systemBudgets.find(sb => sb.systemBudgetType === 'needs');
    const wantsBudget = systemBudgets.find(sb => sb.systemBudgetType === 'wants');

    // if (needsBudget) {
    //     const limit = resolveBudgetLimit(needsBudget, monthlyIncome, settings, historicalAverage);
    //     netPotential += limit - breakdown.needs.total;
    // }

    // if (wantsBudget) {
    //     const limit = resolveBudgetLimit(wantsBudget, monthlyIncome, settings, historicalAverage);
    //     netPotential += limit - breakdown.wants.total;
    // }

    // return netPotential;
    
    // 2. Use the persisted budgetAmount from the database schema
    const needsLimit = needsBudget?.budgetAmount || 0;
    const wantsLimit = wantsBudget?.budgetAmount || 0;
    const totalLimit = needsLimit + wantsLimit;

    // 3. Get total spending for this month (using the existing simple function)
    // We use getMonthlyPaidExpenses because efficiency is based on what you actually paid.
    const actualSpent = getMonthlyPaidExpenses(transactions, startDate, endDate);

    // DEBUG LOGS - Check your browser console
    console.log("--- EB CALCULATION ---");
    console.log("Needs Budget Found:", !!needsBudget);
    console.log("Wants Budget Found:", !!wantsBudget);
    console.log("Limits:", { needsLimit, wantsLimit, totalLimit });
    console.log("Actual Spent:", actualSpent);
    console.log("Result:", totalLimit - actualSpent);
    // 4. Bonus = What you were allowed to spend - What you actually spent
    return totalLimit - actualSpent;
};

/**
 * Calculates the average monthly income for the X months PRIOR to the current reference date.
 * Used for "Inflation Protection" baseline.
 */

export const getHistoricalAverageIncome = (transactions, selectedMonth, selectedYear, lookbackMonths = 3) => {
    if (!transactions || transactions.length === 0) return 0;

    let totalIncome = 0;

    // Iterate backwards from the previous month
    for (let i = 1; i <= lookbackMonths; i++) {
        // Create date for (Month - i)
        // JS Date automatically handles year rollover (e.g., Month -1 becomes Dec of prev year)
        const date = new Date(selectedYear, selectedMonth - i, 1);
        const m = date.getMonth();
        const y = date.getFullYear();

        const { monthStart, monthEnd } = getMonthBoundaries(m, y);
        totalIncome += getMonthlyIncome(transactions, monthStart, monthEnd);
    }

    return totalIncome / lookbackMonths;
};

/**
 * Recalculates System Budgets for Current and Future months based on updated Goals.
 * STRICTLY ignores past months to preserve history.
 * UPDATED 17-Jan-2026: Now ensures budgets exist before attempting updates.
 * @param {Object} updatedGoal - The specific goal updated (e.g., { priority: 'needs', target_percentage: 50 })
 * @param {Object} settings - App settings (to determine if we are in 'absolute' or 'percentage' mode)
 * @param {string} userEmail - User's email to ensure budgets exist for
 * @param {Array} allGoals - All budget goals for calculating amounts
 */
export const snapshotFutureBudgets = async (updatedGoal, settings, userEmail = null, allGoals = []) => {
    if (!updatedGoal || !settings) return;

    // 1. Define the "Horizon" (The first day of the current month)
    const now = new Date();
    const currentMonthStart = getFirstDayOfMonth(now.getMonth(), now.getFullYear());

    // 2. Fetch only relevant future/current budgets for this priority type
    let budgetsToUpdate = await base44.entities.SystemBudget.filter({
        systemBudgetType: updatedGoal.priority,
        startDate: { $gte: currentMonthStart }
    });

    // ADDED 17-Jan-2026: If no budgets exist for the current month and we have userEmail,
    // ensure at least the current month's budget exists
    if (budgetsToUpdate.length === 0 && userEmail) {
        const { monthStart, monthEnd } = getMonthBoundaries(now.getMonth(), now.getFullYear());
        
        // Fetch income for the current month to calculate percentage-based budgets
        const currentMonthIncome = await base44.entities.Transaction.filter({
            type: 'income',
            date: { $gte: monthStart, $lte: monthEnd },
            created_by: userEmail
        }).then(txs => txs.reduce((sum, t) => sum + t.amount, 0));

        // Create the current month's budgets
        await ensureSystemBudgetsExist(
            userEmail,
            monthStart,
            monthEnd,
            allGoals,
            settings,
            currentMonthIncome
        );

        // Re-fetch budgets after ensuring they exist
        budgetsToUpdate = await base44.entities.SystemBudget.filter({
            systemBudgetType: updatedGoal.priority,
            startDate: { $gte: currentMonthStart }
        });
    }

    if (budgetsToUpdate.length === 0) return;

    // 4. Pre-fetch transactions if we are in Percentage mode (to calculate income)
    let transactions = [];
    if (settings.budgetSystem === 'percentage') {
        // Fetch enough history to cover likely current month
        // DEPRECATING THE USE OF .list(): transactions = await base44.entities.Transaction.list('date', 1000);

        // Optimization: Only fetch INCOME transactions from the horizon onwards
        transactions = await base44.entities.Transaction.filter({
            type: 'income',
            date: { $gte: currentMonthStart }
        });
    }

    // 5. Process updates
    const updatePromises = budgetsToUpdate.map(async (budget) => {
        let newAmount = 0;

        if (settings.budgetSystem === 'absolute') {
            // SCENARIO A: Absolute Amount
            newAmount = updatedGoal.target_amount || 0;
        }
        else {
            // SCENARIO B: Percentage Based
            const bDate = parseDate(budget.startDate);

            // Calculate Income specifically for this budget's month
            const monthIncome = transactions
                .filter(t => {
                    if (t.type !== 'income') return false;
                    const tDate = parseDate(t.date);
                    return tDate.getMonth() === bDate.getMonth() &&
                        tDate.getFullYear() === bDate.getFullYear();
                })
                .reduce((sum, t) => sum + t.amount, 0);

            newAmount = (monthIncome * (updatedGoal.target_percentage / 100));
        }

        // Only update if the amount actually changed
        if (Math.abs((budget.budgetAmount || 0) - newAmount) > 0.01) {
            return base44.entities.SystemBudget.update(budget.id, {
                budgetAmount: newAmount,
                target_amount: settings.budgetSystem === 'absolute' ? updatedGoal.target_amount : 0,
                target_percentage: settings.budgetSystem === 'percentage' ? updatedGoal.target_percentage : 0
            });
        }
    });

    await Promise.all(updatePromises);
};