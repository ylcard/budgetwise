/**
 * @file Financial Calculations Utilities
 * @description Centralized functions for calculating expenses, income, and budget statistics.
 * @created 11-Nov-2025 - Consolidated from expenseCalculations
 * @updated 15-Nov-2025 - Exported isCashExpense helper function for use in other modules
 */

import { isDateInRange, parseDate } from "./dateUtils";

/**
 * Helper function to check if a transaction falls within a date range.
 * For paid expenses, uses paidDate; for unpaid expenses, uses transaction date.
 * @param {object} transaction - The transaction object.
 * @param {string} startDate - The start date of the range (inclusive).
 * @param {string} endDate - The end date of the range (inclusive).
 * @returns {boolean} True if the transaction falls within the range.
 */
export const isTransactionInDateRange = (transaction, startDate, endDate) => {
    // Income always uses the transaction date
    if (transaction.type === 'income') {
        return isDateInRange(transaction.date, startDate, endDate);
    }

    // Paid transactions use paidDate, fallback to transaction date if missing
    if (transaction.isPaid) {
        return isDateInRange(transaction.paidDate || transaction.date, startDate, endDate);
    } else {
        // Unpaid transactions use transaction date
        return isDateInRange(transaction.date, startDate, endDate);
    }
};

/**
 * Helper function to determine if a budget ID corresponds to an actual custom budget (not a system budget).
 * @param {string} budgetId - The ID of the custom budget.
 * @param {Array<object>} allCustomBudgets - List of all custom budget objects.
 * @returns {boolean} True if the budget is a non-system custom budget.
 */
const isActualCustomBudget = (budgetId, allCustomBudgets) => {
    if (!budgetId) return false;
    const budget = allCustomBudgets.find(cb => cb.id === budgetId);
    return budget && !budget.isSystemBudget;
};

/**
 * Helper function for centralized expense filter logic.
 * @private
 * @param {object} transaction - The transaction object.
 * @param {Array<object>} categories - List of all category objects.
 * @param {string} startDate - The start date of the range.
 * @param {string} endDate - The end date of the range.
 * @param {Array<object>} allCustomBudgets - List of all custom budget objects.
 * @param {object} options - Filtering options.
 * @param {boolean} [options.isPaid=undefined] - Filter by payment status (true/false) or ignore.
 * @param {('needs'|'wants'|'savings')} [options.priority=undefined] - Filter by category priority or ignore.
 * @param {boolean} [options.isCustomBudget=undefined] - Filter by custom budget assignment status or ignore.
 * @returns {boolean} True if the transaction passes all filters.
 */
const filterExpenses = (transaction, categories, startDate, endDate, allCustomBudgets, options = {}) => {
    const {
        isPaid = undefined,
        priority = undefined,
        isCustomBudget = undefined
    } = options;

    if (transaction.type !== 'expense') return false;

    // Exclude "Withdrawals" (Transfers) so they don't count as spending
    // Only needed if you have legacy data or still log withdrawals for some reason
    if (transaction.cashTransactionType === 'withdrawal_to_wallet') return false

    // Filter by payment status
    if (isPaid !== undefined) {
        // Relaxed check: Just check isPaid status. Date range check will handle the date fallback.
        if (isPaid && !transaction.isPaid) return false;
        if (!isPaid && transaction.isPaid) return false;
    }

    // Filter by custom budget assignment
    const actualCustomBudget = isActualCustomBudget(transaction.customBudgetId, allCustomBudgets);
    if (isCustomBudget !== undefined) {
        if (isCustomBudget && !actualCustomBudget) return false;
        if (!isCustomBudget && actualCustomBudget) return false;
    }

    // Filter by category priority (only if not a custom budget transaction)
    if (priority !== undefined && !actualCustomBudget) {
        // CHECK TRANSACTION PRIORITY FIRST (Override), then fallback to Category default
        const category = categories ? categories.find(c => c.id === transaction.category_id) : null;
        const effectivePriority = transaction.financial_priority || category?.priority;

        if (effectivePriority !== priority) return false;
    }

    return isTransactionInDateRange(transaction, startDate, endDate);
};

/**
 * Calculates paid "needs" expenses within a date range.
 * Excludes cash expenses and expenses assigned to custom budgets.
 * @param {Array<object>} transactions - List of all transaction objects.
 * @param {Array<object>} categories - List of all category objects.
 * @param {string} startDate - The start date of the range.
 * @param {string} endDate - The end date of the range.
 * @param {Array<object>} [allCustomBudgets=[]] - List of all custom budget objects.
 * @returns {number} The total sum of paid needs expenses.
 */
export const getPaidNeedsExpenses = (transactions, categories, startDate, endDate, allCustomBudgets = []) => {
    return transactions
        .filter(t => {
            return filterExpenses(t, categories, startDate, endDate, allCustomBudgets, {
                isPaid: true,
                priority: 'needs',
                isCustomBudget: false
            });
        })
        .reduce((sum, t) => sum + t.amount, 0);
};

/**
 * Calculates unpaid "needs" expenses within a date range.
 * Excludes cash expenses and expenses assigned to custom budgets.
 * @param {Array<object>} transactions - List of all transaction objects.
 * @param {Array<object>} categories - List of all category objects.
 * @param {string} startDate - The start date of the range.
 * @param {string} endDate - The end date of the range.
 * @param {Array<object>} [allCustomBudgets=[]] - List of all custom budget objects.
 * @returns {number} The total sum of unpaid needs expenses.
 */
export const getUnpaidNeedsExpenses = (transactions, categories, startDate, endDate, allCustomBudgets = []) => {
    return transactions
        .filter(t => {
            return filterExpenses(t, categories, startDate, endDate, allCustomBudgets, {
                isPaid: false,
                priority: 'needs',
                isCustomBudget: false
            });
        })
        .reduce((sum, t) => sum + t.amount, 0);
};

/**
 * Calculates DIRECT paid "wants" expenses (not part of any custom budget).
 * Excludes cash expenses and expenses assigned to custom budgets.
 * @param {Array<object>} transactions - List of all transaction objects.
 * @param {Array<object>} categories - List of all category objects.
 * @param {string} startDate - The start date of the range.
 * @param {string} endDate - The end date of the range.
 * @param {Array<object>} [allCustomBudgets=[]] - List of all custom budget objects.
 * @returns {number} The total sum of direct paid wants expenses.
 */
export const getDirectPaidWantsExpenses = (transactions, categories, startDate, endDate, allCustomBudgets = []) => {
    return transactions
        .filter(t => {
            return filterExpenses(t, categories, startDate, endDate, allCustomBudgets, {
                isPaid: true,
                priority: 'wants',
                isCustomBudget: false
            });
        })
        .reduce((sum, t) => sum + t.amount, 0);
};

/**
 * Calculates DIRECT unpaid "wants" expenses (not part of any custom budget).
 * Excludes cash expenses and expenses assigned to custom budgets.
 * @param {Array<object>} transactions - List of all transaction objects.
 * @param {Array<object>} categories - List of all category objects.
 * @param {string} startDate - The start date of the range.
 * @param {string} endDate - The end date of the range.
 * @param {Array<object>} [allCustomBudgets=[]] - List of all custom budget objects.
 * @returns {number} The total sum of direct unpaid wants expenses.
 */
export const getDirectUnpaidWantsExpenses = (transactions, categories, startDate, endDate, allCustomBudgets = []) => {
    return transactions
        .filter(t => {
            return filterExpenses(t, categories, startDate, endDate, allCustomBudgets, {
                isPaid: false,
                priority: 'wants',
                isCustomBudget: false
            });
        })
        .reduce((sum, t) => sum + t.amount, 0);
};

/**
 * Calculates paid expenses within actual custom budgets (during a date range).
 * Excludes cash expenses and system budgets.
 * @param {Array<object>} transactions - List of all transaction objects.
 * @param {Array<object>} allCustomBudgets - List of all custom budget objects.
 * @param {string} startDate - The start date of the range.
 * @param {string} endDate - The end date of the range.
 * @returns {number} The total sum of paid custom budget expenses.
 */
export const getPaidCustomBudgetExpenses = (transactions, allCustomBudgets, startDate, endDate) => {
    return transactions
        .filter(t => {
            return filterExpenses(t, null, startDate, endDate, allCustomBudgets, {
                isPaid: true,
                isCustomBudget: true
            });
        })
        .reduce((sum, t) => sum + t.amount, 0);
};

/**
 * Calculates unpaid expenses within actual custom budgets (during a date range).
 * Excludes cash expenses and system budgets.
 * @param {Array<object>} transactions - List of all transaction objects.
 * @param {Array<object>} allCustomBudgets - List of all custom budget objects.
 * @param {string} startDate - The start date of the range.
 * @param {string} endDate - The end date of the range.
 * @returns {number} The total sum of unpaid custom budget expenses.
 */
export const getUnpaidCustomBudgetExpenses = (transactions, allCustomBudgets, startDate, endDate) => {
    return transactions
        .filter(t => {
            return filterExpenses(t, null, startDate, endDate, allCustomBudgets, {
                isPaid: false,
                isCustomBudget: true
            });
        })
        .reduce((sum, t) => sum + t.amount, 0);
};

/**
 * Calculates paid "savings" expenses within a date range.
 * Excludes cash expenses and expenses assigned to custom budgets.
 * @param {Array<object>} transactions - List of all transaction objects.
 * @param {Array<object>} categories - List of all category objects.
 * @param {string} startDate - The start date of the range.
 * @param {string} endDate - The end date of the range.
 * @param {Array<object>} [allCustomBudgets=[]] - List of all custom budget objects.
 * @returns {number} The total sum of paid savings expenses.
 */
export const getPaidSavingsExpenses = (transactions, categories, startDate, endDate, allCustomBudgets = []) => {
    return transactions
        .filter(t => {
            return filterExpenses(t, categories, startDate, endDate, allCustomBudgets, {
                isPaid: true,
                priority: 'savings',
                isCustomBudget: false
            });
        })
        .reduce((sum, t) => sum + t.amount, 0);
};

/**
 * Calculates total monthly expenses (paid + unpaid, excluding cash).
 * Aggregates all non-cash expenses within the date range for a total figure.
 * @param {Array<object>} transactions - List of all transaction objects.
 * @param {Array<object>} categories - List of all category objects.
 * @param {Array<object>} allCustomBudgets - List of all custom budget objects.
 * @param {string} startDate - The start date of the range.
 * @param {string} endDate - The end date of the range.
 * @returns {number} The total sum of non-cash expenses.
 */
export const getTotalMonthExpenses = (transactions, startDate, endDate) => {
    const allExpenses = transactions.filter(t =>
        t.type === 'expense' &&
        t.cashTransactionType !== 'withdrawal_to_wallet' &&
        isTransactionInDateRange(t, startDate, endDate)
    );
    return allExpenses.reduce((sum, t) => {
        return sum + t.amount;
    }, 0);
};

/**
 * Calculates total monthly income within a date range.
 * @param {Array<object>} transactions - List of all transaction objects.
 * @param {string} startDate - The start date of the range.
 * @param {string} endDate - The end date of the range.
 * @returns {number} The total sum of income transactions.
 */
export const getMonthlyIncome = (transactions, startDate, endDate) => {
    return transactions
        .filter(t => {
            if (t.type !== 'income') return false;
            return isTransactionInDateRange(t, startDate, endDate);
        })
        .reduce((sum, t) => sum + t.amount, 0);
};

/**
 * Calculates total monthly PAID expenses (excludes unpaid and cash expenses).
 * Filters based on the paidDate falling within the range.
 * @param {Array<object>} transactions - List of all transaction objects.
 * @param {string} startDate - The start date of the range.
 * @param {string} endDate - The end date of the range.
 * @returns {number} The total sum of paid, non-cash expenses.
 */
export const getMonthlyPaidExpenses = (transactions, startDate, endDate) => {
    return transactions
        .filter(t => {
            return filterExpenses(t, null, startDate, endDate, [], {
                isPaid: true
            });
        })
        .reduce((sum, t) => sum + t.amount, 0);
};

/**
 * Calculates total monthly income and paid expenses within a date range.
 * This summary is optimized for use in trend visualizations.
 * @param {Array<object>} transactions - List of all transaction objects.
 * @param {string} startDate - The start date of the range.
 * @param {string} endDate - The end date of the range.
 * @returns {{income: number, expense: number}} Object containing total income and total paid expenses (as a positive number).
 */
export const getMonthlyFinancialSummary = (transactions, startDate, endDate) => {
    const income = getMonthlyIncome(transactions, startDate, endDate);

    // Note: getMonthlyPaidExpenses returns a negative number for total expenses.
    const expenseSum = getMonthlyPaidExpenses(transactions, startDate, endDate);

    return {
        income: income,
        // Return absolute value for expense so it's ready for subtraction/comparison in the chart component
        expense: Math.abs(expenseSum),
    };
};

/**
 * Calculates statistics for a single custom budget, filtering paid expenses by the selected month.
 * Unpaid expenses are totaled regardless of date (encumbrance view).
 * @param {object} customBudget - The custom budget object.
 * @param {Array<object>} transactions - List of all transactions.
 * @param {string|Date} monthStart - Start of the month (YYYY-MM-DD or Date).
 * @param {string|Date} monthEnd - End of the month (YYYY-MM-DD or Date).
 * @returns {object} Detailed statistics including allocated, spent, unpaid, and currency breakdown.
 */
export const getCustomBudgetStats = (customBudget, transactions, monthStart, monthEnd, baseCurrency = 'USD') => {
    const budgetTransactions = transactions.filter(t => t.customBudgetId === customBudget.id);

    const expenses = budgetTransactions.filter(t => t.type === 'expense');

    const allocated = customBudget.allocatedAmount || 0;

    // Calculate totals
    const spent = expenses.reduce((sum, t) => sum + (t.originalAmount || t.amount), 0);
    const unpaid = expenses.filter(t => !t.isPaid).reduce((sum, t) => sum + (t.originalAmount || t.amount), 0);

    // For compatibility with System Budget stats shape
    const paidBase = expenses.filter(t => t.isPaid).reduce((sum, t) => sum + (t.originalAmount || t.amount), 0);

    return {
        allocated,
        spent,
        unpaid,
        remaining: allocated - spent,
        paid: {
            totalBaseCurrencyAmount: paidBase,
            foreignCurrencyDetails: []
        },
        unpaid: {
            totalBaseCurrencyAmount: unpaid,
            foreignCurrencyDetails: []
        },
        totalAllocatedUnits: allocated,
        totalSpentUnits: spent,
        totalUnpaidUnits: unpaid,
        totalTransactionCount: expenses.length
    };
};

/**
 * Calculates statistics for a system budget.
 * Leverages existing granular functions (getPaidNeedsExpenses, etc.) for consistency.
 */
export const getSystemBudgetStats = (systemBudget, transactions, categories, allCustomBudgets, startDate, endDate, monthlyIncome = 0) => {
    let paidAmount = 0;
    let unpaidAmount = 0;

    if (systemBudget.systemBudgetType === 'needs') {
        paidAmount = getPaidNeedsExpenses(transactions, categories, startDate, endDate, allCustomBudgets);
        unpaidAmount = getUnpaidNeedsExpenses(transactions, categories, startDate, endDate, allCustomBudgets);
    } else if (systemBudget.systemBudgetType === 'wants') {
        const directPaid = getDirectPaidWantsExpenses(transactions, categories, startDate, endDate, allCustomBudgets);
        const customPaid = getPaidCustomBudgetExpenses(transactions, allCustomBudgets, startDate, endDate);
        paidAmount = directPaid + customPaid;

        const directUnpaid = getDirectUnpaidWantsExpenses(transactions, categories, startDate, endDate, allCustomBudgets);
        const customUnpaid = getUnpaidCustomBudgetExpenses(transactions, allCustomBudgets, startDate, endDate);
        unpaidAmount = directUnpaid + customUnpaid;
    } else if (systemBudget.systemBudgetType === 'savings') {

        const totalNeeds =
            getPaidNeedsExpenses(transactions, categories, startDate, endDate, allCustomBudgets) +
            getUnpaidNeedsExpenses(transactions, categories, startDate, endDate, allCustomBudgets);

        const totalWants =
            getDirectPaidWantsExpenses(transactions, categories, startDate, endDate, allCustomBudgets) +
            getDirectUnpaidWantsExpenses(transactions, categories, startDate, endDate, allCustomBudgets) +
            getPaidCustomBudgetExpenses(transactions, allCustomBudgets, startDate, endDate) +
            getUnpaidCustomBudgetExpenses(transactions, allCustomBudgets, startDate, endDate);

        // "Paid" in this context means "Actual Savings Achieved"
        paidAmount = Math.max(0, monthlyIncome - totalNeeds - totalWants);
        unpaidAmount = 0;
    }

    const totalBudget = systemBudget.budgetAmount || 0;
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
        transactionCount: 0
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
        const spent = budgetTransactions.filter(t => t.type === 'expense' && t.category_id === allocation.categoryId).reduce((sum, t) => sum + t.amount, 0);
        const remaining = allocation.allocatedAmount - spent;
        categorySpending[allocation.categoryId] = { allocated: allocation.allocatedAmount, spent, remaining, percentageUsed: allocation.allocatedAmount > 0 ? (spent / allocation.allocatedAmount) * 100 : 0 };
    });
    const allocatedCategoryIds = allocations.map(a => a.categoryId);
    const unallocatedSpent = budgetTransactions.filter(t => t.type === 'expense' && (!t.category_id || !allocatedCategoryIds.includes(t.category_id))).reduce((sum, t) => sum + t.amount, 0);
    return { totalAllocated, unallocated, unallocatedSpent, unallocatedRemaining: unallocated - unallocatedSpent, categorySpending };
};