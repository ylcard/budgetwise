/**
 * @file Financial Calculations Utilities
 * @description Centralized functions for calculating expenses, income, and budget statistics.
 * @created 11-Nov-2025
 * @updated 17-Jan-2026 - OPTIMIZED: snapshotFutureBudgets now creates budgets proactively for the next 12 months
 */

import { base44 } from "@/api/base44Client";
import { parseDate, getFirstDayOfMonth, isDateInRange, getMonthBoundaries, getLastDayOfMonth } from "./dateUtils";
import { ensureSystemBudgetsExist } from "./budgetInitialization";

/**
 * Helper to check if a transaction falls within a date range.
 * CRITICAL FIX 05-Feb-2026: For expenses, ALWAYS use paidDate if available, regardless of isPaid status.
 * This ensures expenses that were incurred in one month but paid in another are counted in the correct month.
 */
export const isTransactionInDateRange = (transaction, startDate, endDate) => {
    if (transaction.type === 'income') {
        return isDateInRange(transaction.date, startDate, endDate);
    }
    // CRITICAL FIX 05-Feb-2026: For expenses, use paidDate if it exists (bank processing date),
    // otherwise fall back to transaction date. This handles cases where an expense from October
    // is paid in November - it should count toward November's budget.
    const effectiveDate = transaction.paidDate || transaction.date;

    return isDateInRange(effectiveDate, startDate, endDate);
};

/**
 * Helper to determine if a budget ID corresponds to an actual custom budget.
 * UPDATED 05-Feb-2026: Renamed parameter from customBudgetId to budgetId
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
 * UPDATED 05-Feb-2026: Added export for external use in budgetInitialization
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
 * Returns the resolved target amount for a specific goal priority.
 */
export const getMonthlyTarget = (allGoals, priority, monthlyIncome, settings, historicalAverage = 0) => {
    const goal = allGoals.find(g => g.priority === priority);
    if (!goal) return 0;
    return resolveBudgetLimit(goal, monthlyIncome, settings, historicalAverage);
};

/**
 * CORE AGGREGATOR: Calculates granular breakdown of expenses in one pass.
 * Replaces getPaidNeedsExpenses, getDirectPaidWantsExpenses, etc.
 * * @returns {Object} { needs: { paid, unpaid, total }, wants: { directPaid, directUnpaid, customPaid, customUnpaid, total } }
 */
export const getFinancialBreakdown = (transactions, categories, allCustomBudgets, startDate, endDate, dayLimit = null) => {
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

        // UNIFIED DATE LOGIC: Use the same effective date as the range check for pacing
        const effectiveDate = (t.isPaid && t.paidDate) ? t.paidDate : t.date;
        if (dayLimit && parseDate(effectiveDate).getDate() > dayLimit) return;

        // UPDATED 05-Feb-2026: Renamed customBudgetId to budgetId
        const isCustom = isActualCustomBudget(t.budgetId, allCustomBudgets);
        const category = categories ? categories.find(c => c.id === t.category_id) : null;
        // Priority hierarchy: Transaction > Category > Default 'wants'
        const priority = t.financial_priority || category?.priority || 'wants';

        // CRITICAL FIX 05-Feb-2026: Expenses in Custom Budgets should NEVER appear in System Budget "DIRECT" calculations
        // UPDATED 05-Feb-2026: Renamed customBudgetId references to budgetId
        // The word "DIRECT" means expenses directly assigned to that priority, NOT via a custom budget.
        // Custom Budget expenses are aggregated separately and shown only in the Custom Budget views.
        if (isCustom) {
            // These are "Indirect" expenses (via Custom Budgets like Vacations, Trips, Events)
            // They count toward the overall Wants total but NOT toward "Direct Wants"
            if (t.isPaid) result.wants.customPaid += t.amount;
            else result.wants.customUnpaid += t.amount;
            return; // CRITICAL: Exit early to prevent these from being counted as "direct" expenses
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

    // Add top-level total for unified consumption by Health Algorithms
    return {
        ...result,
        totalExpenses: result.needs.total + result.wants.total
    };
};

/**
 * CRITICAL FIX 15-Jan-2026: Calculates statistics for a single custom budget.
 * UPDATED 05-Feb-2026: Renamed customBudgetId references to budgetId
 * 
 * UNIFIED CALCULATION LOGIC:
 * - Aggregates ALL transactions linked to the custom budget (by budgetId)
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
 * @param {Array} transactions - ALL transactions (will be filtered by budgetId)
 * @param {string} monthStart - IGNORED (kept for API compatibility)
 * @param {string} monthEnd - IGNORED (kept for API compatibility)
 * @param {string} baseCurrency - Base currency for display (default: 'USD')
 * @returns {Object} Budget statistics with paid, unpaid, spent, remaining amounts
 */
export const getCustomBudgetStats = (customBudget, transactions) => {
    // CRITICAL: Filter ONLY by budgetId - NO date filtering
    // Custom budgets show ALL expenses linked to them, regardless of when they were paid
    const budgetTransactions = transactions.filter(t => t.budgetId === customBudget.id);

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
 * UPDATED 05-Feb-2026: Renamed customBudgetId to budgetId
 */
export const getCustomBudgetAllocationStats = (customBudget, allocations, transactions) => {
    const budgetTransactions = transactions.filter(t => t.budgetId === customBudget.id);
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
    const needsBudget = systemBudgets.find(sb => sb.systemBudgetType === 'needs');
    const wantsBudget = systemBudgets.find(sb => sb.systemBudgetType === 'wants');

    // Use the persisted budgetAmount from the database schema
    const needsLimit = needsBudget?.budgetAmount || 0;
    const wantsLimit = wantsBudget?.budgetAmount || 0;
    const totalLimit = needsLimit + wantsLimit;

    // Get total spending for this month (using the existing simple function)
    // We use getMonthlyPaidExpenses because efficiency is based on what you actually paid.
    const actualSpent = getMonthlyPaidExpenses(transactions, startDate, endDate);

    // Bonus = What you were allowed to spend - What you actually spent
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
 * OPTIMIZED 17-Jan-2026: Creates budgets for the next 12 months proactively to prevent duplicates.
 * @param {Object} updatedGoal - The specific goal updated (e.g., { priority: 'needs', target_percentage: 50 })
 * @param {Object} settings - App settings (to determine if we are in 'absolute' or 'percentage' mode)
 * @param {string} userEmail - User's email to ensure budgets exist for
 * @param {Array} allGoals - All budget goals for calculating amounts
 */
export const snapshotFutureBudgets = async (updatedGoal, settings, userEmail = null, allGoals = []) => {
    if (!updatedGoal || !settings || !userEmail) return;

    const now = new Date();
    const currentMonthStart = getFirstDayOfMonth(now.getMonth(), now.getFullYear());

    // ATOMIC CHANGE: Only update budgets that the user has already "activated" 
    // by viewing or adding transactions to.
    const activeSystemBudgets = await base44.entities.SystemBudget.filter({
        user_email: userEmail,
        startDate: { $gte: currentMonthStart }
    });

    const updatePromises = activeSystemBudgets.map(async (budget) => {
        // We trigger a re-sync for existing future budgets to reflect the new goal
        return ensureSystemBudgetsExist(
            userEmail,
            budget.startDate,
            budget.endDate,
            allGoals,
            settings,
            0, // Income will be handled by the Dashboard sync
            { allowUpdates: true }
        );
    });

    await Promise.all(updatePromises);
};

/**
 * HELPER: Math Utils for Projection
 */
const calculateMedian = (values) => {
    if (values.length === 0) return 0;
    const sorted = [...values].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    return sorted.length % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
};

const calculateStandardDeviation = (values, mean) => {
    if (values.length < 2) return 0;
    const squareDiffs = values.map(value => Math.pow(value - mean, 2));
    const avgSquareDiff = squareDiffs.reduce((a, b) => a + b, 0) / values.length;
    return Math.sqrt(avgSquareDiff);
};

/**
 * Calculates a smart income projection based on a provided slice of historical transactions.
 * Expects the caller (Dashboard) to provide ONLY the relevant historical period (e.g. past 6 months).
 * + * @param {Array} historicalTransactions - Filtered list of income transactions from the lookback period
 * @param {Date} referenceDate - The anchor date (usually today) to determine "recency" for weighting
 * @returns {Object} { projectedIncome, reliability, cv }
 */
export const calculateIncomeProjection = (historicalTransactions, referenceDate = new Date()) => {
    if (!historicalTransactions || historicalTransactions.length === 0) return { projectedIncome: 0, reliability: 'low', cv: 0 };

    // 1. Bucket transactions by month relative to reference date
    // We map 1..6 (months ago) to totals
    const monthlyTotals = {};

    historicalTransactions.forEach(t => {
        const tDate = new Date(t.date);
        // Calculate how many months ago this was (approximate is fine for bucketing)
        const monthDiff = (referenceDate.getFullYear() - tDate.getFullYear()) * 12 + (referenceDate.getMonth() - tDate.getMonth());

        // Only care about buckets 1 to 6
        if (monthDiff >= 1 && monthDiff <= 6) {
            monthlyTotals[monthDiff] = (monthlyTotals[monthDiff] || 0) + t.amount;
        }
    });

    const values = Object.values(monthlyTotals).filter(v => v > 0);

    // Not enough data points for statistical analysis
    if (values.length < 3) {
        const simpleAvg = values.reduce((a, b) => a + b, 0) / (values.length || 1);
        return { projectedIncome: simpleAvg, reliability: 'low', cv: 0 };
    }

    // 2. IQR Method (Tukey's Fences) to remove anomalies
    const sorted = [...values].sort((a, b) => a - b);
    const q1 = sorted[Math.floor((sorted.length / 4))];
    const q3 = sorted[Math.ceil((sorted.length * (3 / 4))) - 1];
    const iqr = q3 - q1;

    const lowerFence = q1 - (1.5 * iqr);
    const upperFence = q3 + (1.5 * iqr);

    // 3. Filter Outliers & Calculate Simple Mean
    let cleanValues = [];

    // Iterate 1 to 6 to handle empty months correctly (as 0 if needed, or skip)
    // Financial preference: Skip months with 0 income rather than treating them as $0 salary days? 
    // For salary projection, usually we only care about months where money came in.
    Object.values(monthlyTotals).forEach((amount) => {
        if (amount === 0) return; // Ignore months with no activity
        if (amount >= lowerFence && amount <= upperFence) {
            cleanValues.push(amount);
        }
    });

    // Fallback: If IQR killed everything (rare), return Median
    if (cleanValues.length === 0) {
        return { projectedIncome: calculateMedian(values), reliability: 'low', cv: 0 };
    }

    const projectedIncome = cleanValues.reduce((a, b) => a + b, 0) / cleanValues.length;

    // 4. Calculate CV for Reliability
    const mean = cleanValues.reduce((a, b) => a + b, 0) / cleanValues.length;
    const stdDev = calculateStandardDeviation(cleanValues, mean);
    const cv = mean > 0 ? (stdDev / mean) * 100 : 0;

    let reliability = 'high';
    if (cv > 10) reliability = 'medium';
    if (cv > 25) reliability = 'low';

    return {
        projectedIncome,
        reliability,
        cv
    };
};
