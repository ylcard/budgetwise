
/**
 * Financial Calculations Utilities
 * Centralized functions for calculating expenses, income, and budget statistics
 * Created: 11-Nov-2025 - Consolidated from expenseCalculations.js
 * Updated: 13-Jan-2025 - Renamed from .jsx to .js (correct extension)
 */

import { parseDate } from "./dateUtils";

/**
 * Helper: Identify cash expenses to be excluded from budget calculations
 * Cash expenses are tracked separately in the cash wallet system
 */
const isCashExpense = (transaction) => {
  return transaction.isCashTransaction && transaction.cashTransactionType === 'expense_from_wallet';
};

/**
 * Helper: Check if a transaction falls within a date range
 * For paid expenses, uses paidDate; for unpaid expenses, uses transaction date
 */
const isWithinDateRange = (transaction, startDate, endDate) => {
  const start = parseDate(startDate);
  const end = parseDate(endDate);
  
  if (transaction.isPaid && transaction.paidDate) {
    const paidDate = parseDate(transaction.paidDate);
    return paidDate >= start && paidDate <= end;
  } else if (!transaction.isPaid) {
    const transactionDate = parseDate(transaction.date);
    return transactionDate >= start && transactionDate <= end;
  }
  
  return false;
};

/**
 * Helper: Determine if a budget ID corresponds to an actual custom budget (not a system budget)
 */
const isActualCustomBudget = (budgetId, allCustomBudgets) => {
  if (!budgetId) return false;
  const budget = allCustomBudgets.find(cb => cb.id === budgetId);
  return budget && !budget.isSystemBudget;
};

/**
 * Calculate paid "needs" expenses within a date range
 * Excludes:
 * - Cash expenses (tracked separately)
 * - Expenses assigned to custom budgets
 */
export const getPaidNeedsExpenses = (transactions, categories, startDate, endDate, allCustomBudgets = []) => {
  return transactions
    .filter(t => {
      if (t.type !== 'expense') return false;
      if (isCashExpense(t)) return false;
      if (!t.isPaid || !t.paidDate) return false;
      
      const category = categories.find(c => c.id === t.category_id);
      if (!category || category.priority !== 'needs') return false;
      
      if (isActualCustomBudget(t.customBudgetId, allCustomBudgets)) return false;
      
      return isWithinDateRange(t, startDate, endDate);
    })
    .reduce((sum, t) => sum + t.amount, 0);
};

/**
 * Calculate unpaid "needs" expenses within a date range
 * Excludes:
 * - Cash expenses (tracked separately)
 * - Expenses assigned to custom budgets
 */
export const getUnpaidNeedsExpenses = (transactions, categories, startDate, endDate, allCustomBudgets = []) => {
  return transactions
    .filter(t => {
      if (t.type !== 'expense') return false;
      if (isCashExpense(t)) return false;
      if (t.isPaid) return false;
      
      const category = categories.find(c => c.id === t.category_id);
      if (!category || category.priority !== 'needs') return false;
      
      if (isActualCustomBudget(t.customBudgetId, allCustomBudgets)) return false;
      
      return isWithinDateRange(t, startDate, endDate);
    })
    .reduce((sum, t) => sum + t.amount, 0);
};

/**
 * Calculate DIRECT paid "wants" expenses (not part of any custom budget)
 * Excludes:
 * - Cash expenses (tracked separately)
 * - Expenses assigned to custom budgets
 */
export const getDirectPaidWantsExpenses = (transactions, categories, startDate, endDate, allCustomBudgets = []) => {
  return transactions
    .filter(t => {
      if (t.type !== 'expense') return false;
      if (isCashExpense(t)) return false;
      if (!t.isPaid || !t.paidDate) return false;
      
      const category = categories.find(c => c.id === t.category_id);
      if (!category || category.priority !== 'wants') return false;
      
      if (isActualCustomBudget(t.customBudgetId, allCustomBudgets)) return false;
      
      return isWithinDateRange(t, startDate, endDate);
    })
    .reduce((sum, t) => sum + t.amount, 0);
};

/**
 * Calculate DIRECT unpaid "wants" expenses (not part of any custom budget)
 * Excludes:
 * - Cash expenses (tracked separately)
 * - Expenses assigned to custom budgets
 */
export const getDirectUnpaidWantsExpenses = (transactions, categories, startDate, endDate, allCustomBudgets = []) => {
  return transactions
    .filter(t => {
      if (t.type !== 'expense') return false;
      if (isCashExpense(t)) return false;
      if (t.isPaid) return false;
      
      const category = categories.find(c => c.id === t.category_id);
      if (!category || category.priority !== 'wants') return false;
      
      if (isActualCustomBudget(t.customBudgetId, allCustomBudgets)) return false;
      
      return isWithinDateRange(t, startDate, endDate);
    })
    .reduce((sum, t) => sum + t.amount, 0);
};

/**
 * Calculate paid expenses within custom budgets (during a date range)
 * Excludes:
 * - Cash expenses (tracked separately)
 * - System budgets
 */
export const getPaidCustomBudgetExpenses = (transactions, allCustomBudgets, startDate, endDate) => {
  return transactions
    .filter(t => {
      if (t.type !== 'expense') return false;
      if (isCashExpense(t)) return false;
      if (!t.isPaid || !t.paidDate) return false;
      if (!isActualCustomBudget(t.customBudgetId, allCustomBudgets)) return false;
      
      return isWithinDateRange(t, startDate, endDate);
    })
    .reduce((sum, t) => sum + t.amount, 0);
};

/**
 * Calculate unpaid expenses within custom budgets (during a date range)
 * Excludes:
 * - Cash expenses (tracked separately)
 * - System budgets
 */
export const getUnpaidCustomBudgetExpenses = (transactions, allCustomBudgets, startDate, endDate) => {
  return transactions
    .filter(t => {
      if (t.type !== 'expense') return false;
      if (isCashExpense(t)) return false;
      if (t.isPaid) return false;
      if (!isActualCustomBudget(t.customBudgetId, allCustomBudgets)) return false;
      
      return isWithinDateRange(t, startDate, endDate);
    })
    .reduce((sum, t) => sum + t.amount, 0);
};

/**
 * Calculate paid "savings" expenses within a date range
 * Savings are manually tracked expenses categorized as "savings"
 * Excludes:
 * - Cash expenses (tracked separately)
 * - Expenses assigned to custom budgets
 */

export const getPaidSavingsExpenses = (transactions, categories, startDate, endDate, allCustomBudgets = []) => {
  return transactions
    .filter(t => {
      if (t.type !== 'expense') return false;
      if (isCashExpense(t)) return false;
      if (!t.isPaid || !t.paidDate) return false;
      
      const category = categories.find(c => c.id === t.category_id);
      if (!category || category.priority !== 'savings') return false;
      
      if (isActualCustomBudget(t.customBudgetId, allCustomBudgets)) return false;
      
      return isWithinDateRange(t, startDate, endDate);
    })
    .reduce((sum, t) => sum + t.amount, 0);
};

/**
 * Calculate all cash expenses within a date range
 * Used for cash wallet tracking
 */
export const getCashExpenses = (transactions, startDate, endDate) => {
  return transactions
    .filter(t => {
      if (t.type !== 'expense') return false;
      if (!isCashExpense(t)) return false;
      
      return isWithinDateRange(t, startDate, endDate);
    })
    .reduce((sum, t) => sum + (t.cashAmount || 0), 0);
};

/**
 * Calculate total monthly expenses (paid + unpaid, excluding cash)
 * This is a convenience function that aggregates all expense types
 */
export const getTotalMonthExpenses = (transactions, categories, allCustomBudgets, startDate, endDate) => {
  const paidNeeds = getPaidNeedsExpenses(transactions, categories, startDate, endDate, allCustomBudgets);
  const unpaidNeeds = getUnpaidNeedsExpenses(transactions, categories, startDate, endDate, allCustomBudgets);
  
  const directPaidWants = getDirectPaidWantsExpenses(transactions, categories, startDate, endDate, allCustomBudgets);
  const directUnpaidWants = getDirectUnpaidWantsExpenses(transactions, categories, startDate, endDate, allCustomBudgets);
  
  const customPaid = getPaidCustomBudgetExpenses(transactions, allCustomBudgets, startDate, endDate);
  const customUnpaid = getUnpaidCustomBudgetExpenses(transactions, allCustomBudgets, startDate, endDate);
  
  const paidSavings = getPaidSavingsExpenses(transactions, categories, startDate, endDate, allCustomBudgets);
  
  return paidNeeds + unpaidNeeds + directPaidWants + directUnpaidWants + customPaid + customUnpaid + paidSavings;
};

/**
 * Calculate monthly income within a date range
 */
export const getMonthlyIncome = (transactions, startDate, endDate) => {
  const start = parseDate(startDate);
  const end = parseDate(endDate);
  
  return transactions
    .filter(t => {
      if (t.type !== 'income') return false;
      const transactionDate = parseDate(t.date);
      return transactionDate >= start && transactionDate <= end;
    })
    .reduce((sum, t) => sum + t.amount, 0);
};

/**
 * Calculate monthly PAID expenses (excludes unpaid and cash expenses)
 */
export const getMonthlyPaidExpenses = (transactions, startDate, endDate) => {
  const start = parseDate(startDate);
  const end = parseDate(endDate);
  
  return transactions
    .filter(t => {
      if (t.type !== 'expense') return false;
      if (isCashExpense(t)) return false;
      if (!t.isPaid || !t.paidDate) return false;
      
      const paidDate = parseDate(t.paidDate);
      return paidDate >= start && paidDate <= end;
    })
    .reduce((sum, t) => sum + t.amount, 0);
};
