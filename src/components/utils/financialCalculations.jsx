/**
 * @file Financial Calculations Utilities
 * @description Centralized functions for calculating expenses, income, and budget statistics.
 * @created 11-Nov-2025 - Consolidated from expenseCalculations
 * @updated 15-Nov-2025 - Exported isCashExpense helper function for use in other modules
 */

import { isDateInRange } from "./dateUtils";

/**
 * Helper function to identify cash expenses to be excluded from budget calculations.
 * Cash expenses are tracked separately in the cash wallet system.
 * @param {object} transaction - The transaction object.
 * @returns {boolean} True if the transaction is a cash expense from the wallet.
 */
export const isCashExpense = (transaction) => {
    return transaction.isCashTransaction && transaction.cashTransactionType === 'expense_from_wallet';
};

/**
 * Helper function to check if a transaction falls within a date range.
 * For paid expenses, uses paidDate; for unpaid expenses, uses transaction date.
 * @param {object} transaction - The transaction object.
 * @param {string} startDate - The start date of the range (inclusive).
 * @param {string} endDate - The end date of the range (inclusive).
 * @returns {boolean} True if the transaction falls within the range.
 */
export const isTransactionInDateRange = (transaction, startDate, endDate) => {
    if (transaction.isPaid && transaction.paidDate) {
        return isDateInRange(transaction.paidDate, startDate, endDate);
    } else if (!transaction.isPaid) {
        return isDateInRange(transaction.date, startDate, endDate);
    }

    return false;
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
    if (isCashExpense(transaction)) return false;

    // Filter by payment status
    if (isPaid !== undefined) {
        if (isPaid && (!transaction.isPaid || !transaction.paidDate)) return false;
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
        if (!categories) return false;
        const category = categories.find(c => c.id === transaction.category_id);
        if (!category || category.priority !== priority) return false;
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
 * Calculates all cash expenses within a date range.
 * Used specifically for cash wallet tracking purposes.
 * @param {Array<object>} transactions - List of all transaction objects.
 * @param {string} startDate - The start date of the range.
 * @param {string} endDate - The end date of the range.
 * @returns {number} The total sum of cash expenses.
 */
export const getCashExpenses = (transactions, startDate, endDate) => {
    return transactions
        .filter(t => {
            if (t.type !== 'expense') return false;
            if (!isCashExpense(t)) return false;
            return isTransactionInDateRange(t, startDate, endDate);
        })
        .reduce((sum, t) => sum + (t.cashAmount || 0), 0);
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
export const getTotalMonthExpenses = (transactions, categories, allCustomBudgets, startDate, endDate) => {
    const allExpenses = transactions.filter(t =>
        t.type === 'expense' && !isCashExpense(t) && isTransactionInDateRange(t, startDate, endDate)
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
