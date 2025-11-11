// CREATED: 2025-01-12
// Centralized financial calculation functions for both expenses and income
// This file provides granular calculation functions for financial data across budgets

import { parseDate } from './dateUtils';

/**
 * Helper to check if a transaction is a cash expense (which should be excluded from most calculations)
 */
const isCashExpense = (transaction) => {
  return transaction.isCashTransaction && transaction.cashTransactionType === 'expense_from_wallet';
};

/**
 * Helper to check if transaction falls within a date range
 */
const isWithinDateRange = (transaction, startDate, endDate, usePaidDate = false) => {
  const dateToCheck = usePaidDate && transaction.isPaid && transaction.paidDate 
    ? parseDate(transaction.paidDate)
    : parseDate(transaction.date);
  
  if (!dateToCheck) return false;
  
  const rangeStart = parseDate(startDate);
  const rangeEnd = parseDate(endDate);
  
  return dateToCheck >= rangeStart && dateToCheck <= rangeEnd;
};

/**
 * Helper to determine if a budget ID refers to an actual custom budget (not a system budget)
 * ADDED 2025-01-12: Fixes issue where customBudgetId can refer to both custom and system budgets
 * System budgets stored in CustomBudget entity have isSystemBudget: true
 */
const isActualCustomBudget = (budgetId, allCustomBudgets) => {
  if (!budgetId || !allCustomBudgets) return false;
  
  const budget = allCustomBudgets.find(cb => cb.id === budgetId);
  
  // Return true only if budget exists AND is not a system budget
  // (isSystemBudget should be false, undefined, or null for actual custom budgets)
  return budget && !budget.isSystemBudget;
};

// ============================================================================
// INCOME CALCULATION FUNCTIONS
// ============================================================================

/**
 * Get total income for a specific month
 * Returns sum of all income transactions within the date range
 */
export const getMonthlyIncome = (transactions, startDate, endDate) => {
  return transactions
    .filter(t => {
      if (t.type !== 'income') return false;
      return isWithinDateRange(t, startDate, endDate, false);
    })
    .reduce((sum, t) => sum + t.amount, 0);
};

/**
 * Get income transactions for a specific month (returns array)
 * Useful for displaying income transaction lists
 */
export const getMonthlyIncomeTransactions = (transactions, startDate, endDate) => {
  return transactions.filter(t => {
    if (t.type !== 'income') return false;
    return isWithinDateRange(t, startDate, endDate, false);
  });
};

// ============================================================================
// EXPENSE CALCULATION FUNCTIONS
// ============================================================================

/**
 * 1. Get Paid Expenses in the Needs budget
 * Returns sum of all paid, non-cash expenses with "needs" category priority for a given period
 */
export const getPaidNeedsExpenses = (transactions, categories, startDate, endDate, allCustomBudgets = []) => {
  const categoryPriorityMap = {};
  categories.forEach(cat => {
    categoryPriorityMap[cat.id] = cat.priority;
  });

  const allCustomBudgetIds = allCustomBudgets.map(cb => cb.id);

  return transactions
    .filter(t => {
      if (t.type !== 'expense' || !t.category_id) return false;
      if (isCashExpense(t)) return false;
      if (!t.isPaid || !t.paidDate) return false;
      
      // Exclude expenses tied to custom budgets
      if (t.customBudgetId && allCustomBudgetIds.includes(t.customBudgetId)) return false;
      
      // Check category priority
      if (categoryPriorityMap[t.category_id] !== 'needs') return false;
      
      // Check if paid within date range
      return isWithinDateRange(t, startDate, endDate, true);
    })
    .reduce((sum, t) => sum + t.amount, 0);
};

/**
 * 2. Get Unpaid Expenses in the Needs budget
 * Returns sum of all unpaid, non-cash expenses with "needs" category priority for a given period
 */
export const getUnpaidNeedsExpenses = (transactions, categories, startDate, endDate, allCustomBudgets = []) => {
  const categoryPriorityMap = {};
  categories.forEach(cat => {
    categoryPriorityMap[cat.id] = cat.priority;
  });

  const allCustomBudgetIds = allCustomBudgets.map(cb => cb.id);

  return transactions
    .filter(t => {
      if (t.type !== 'expense' || !t.category_id) return false;
      if (isCashExpense(t)) return false;
      if (t.isPaid) return false; // Only unpaid
      
      // Exclude expenses tied to custom budgets
      if (t.customBudgetId && allCustomBudgetIds.includes(t.customBudgetId)) return false;
      
      // Check category priority
      if (categoryPriorityMap[t.category_id] !== 'needs') return false;
      
      // Check if transaction date within range
      return isWithinDateRange(t, startDate, endDate, false);
    })
    .reduce((sum, t) => sum + t.amount, 0);
};

/**
 * 3. Get Direct Paid Expenses in the Wants budget
 * Returns sum of all paid, non-cash expenses with "wants" category priority NOT tied to custom budgets
 */
export const getDirectPaidWantsExpenses = (transactions, categories, startDate, endDate, allCustomBudgets = []) => {
  const categoryPriorityMap = {};
  categories.forEach(cat => {
    categoryPriorityMap[cat.id] = cat.priority;
  });

  const allCustomBudgetIds = allCustomBudgets.map(cb => cb.id);

  return transactions
    .filter(t => {
      if (t.type !== 'expense' || !t.category_id) return false;
      if (isCashExpense(t)) return false;
      if (!t.isPaid || !t.paidDate) return false;
      
      // Exclude expenses tied to custom budgets
      if (t.customBudgetId && allCustomBudgetIds.includes(t.customBudgetId)) return false;
      
      // Check category priority
      if (categoryPriorityMap[t.category_id] !== 'wants') return false;
      
      // Check if paid within date range
      return isWithinDateRange(t, startDate, endDate, true);
    })
    .reduce((sum, t) => sum + t.amount, 0);
};

/**
 * 4. Get Direct Unpaid Expenses in the Wants budget
 * Returns sum of all unpaid, non-cash expenses with "wants" category priority NOT tied to custom budgets
 */
export const getDirectUnpaidWantsExpenses = (transactions, categories, startDate, endDate, allCustomBudgets = []) => {
  const categoryPriorityMap = {};
  categories.forEach(cat => {
    categoryPriorityMap[cat.id] = cat.priority;
  });

  const allCustomBudgetIds = allCustomBudgets.map(cb => cb.id);

  return transactions
    .filter(t => {
      if (t.type !== 'expense' || !t.category_id) return false;
      if (isCashExpense(t)) return false;
      if (t.isPaid) return false; // Only unpaid
      
      // Exclude expenses tied to custom budgets
      if (t.customBudgetId && allCustomBudgetIds.includes(t.customBudgetId)) return false;
      
      // Check category priority
      if (categoryPriorityMap[t.category_id] !== 'wants') return false;
      
      // Check if transaction date within range
      return isWithinDateRange(t, startDate, endDate, false);
    })
    .reduce((sum, t) => sum + t.amount, 0);
};

/**
 * 5. Get Paid Expenses in all custom budgets
 * FIXED 2025-01-12: Removed budget date range filtering to allow pre-paid expenses
 * FIXED 2025-01-12: Added isActualCustomBudget check to exclude system budget expenses
 * Now includes all paid non-cash expenses linked to actual custom budgets (not system budgets),
 * regardless of the budget's own date range. The expense's paidDate determines when it impacts the month.
 */
export const getPaidCustomBudgetExpenses = (transactions, allCustomBudgets, startDate, endDate) => {
  return transactions
    .filter(t => {
      if (t.type !== 'expense') return false;
      if (isCashExpense(t)) return false;
      if (!t.isPaid || !t.paidDate) return false;
      
      // CRITICAL FIX 2025-01-12: Must be tied to an ACTUAL custom budget (not a system budget)
      // The customBudgetId field can point to both custom and system budgets
      if (!isActualCustomBudget(t.customBudgetId, allCustomBudgets)) return false;
      
      // Check if paid within the specified date range
      return isWithinDateRange(t, startDate, endDate, true);
    })
    .reduce((sum, t) => sum + t.amount, 0);
};

/**
 * 6. Get Unpaid Expenses in all custom budgets
 * FIXED 2025-01-12: Removed budget date range filtering to allow future expenses
 * FIXED 2025-01-12: Added isActualCustomBudget check to exclude system budget expenses
 * Now includes all unpaid non-cash expenses linked to actual custom budgets (not system budgets),
 * regardless of the budget's own date range. The expense's transaction date determines when it impacts the month.
 */
export const getUnpaidCustomBudgetExpenses = (transactions, allCustomBudgets, startDate, endDate) => {
  return transactions
    .filter(t => {
      if (t.type !== 'expense') return false;
      if (isCashExpense(t)) return false;
      if (t.isPaid) return false; // Only unpaid
      
      // CRITICAL FIX 2025-01-12: Must be tied to an ACTUAL custom budget (not a system budget)
      // The customBudgetId field can point to both custom and system budgets
      if (!isActualCustomBudget(t.customBudgetId, allCustomBudgets)) return false;
      
      // Check if transaction date within range
      return isWithinDateRange(t, startDate, endDate, false);
    })
    .reduce((sum, t) => sum + t.amount, 0);
};

/**
 * 7. Get Paid Expenses in the Savings budget
 * ADDED 2025-01-12: Needed by BudgetDetail.js for system budget calculations
 * Returns sum of all paid, non-cash expenses with "savings" category priority for a given period
 * NOTE: Savings budgets typically track manual transfers, so this uses the same logic as needs
 */
export const getPaidSavingsExpenses = (transactions, categories, startDate, endDate, allCustomBudgets = []) => {
  const categoryPriorityMap = {};
  categories.forEach(cat => {
    categoryPriorityMap[cat.id] = cat.priority;
  });

  const allCustomBudgetIds = allCustomBudgets.map(cb => cb.id);

  return transactions
    .filter(t => {
      if (t.type !== 'expense' || !t.category_id) return false;
      if (isCashExpense(t)) return false;
      if (!t.isPaid || !t.paidDate) return false;
      
      // Exclude expenses tied to custom budgets
      if (t.customBudgetId && allCustomBudgetIds.includes(t.customBudgetId)) return false;
      
      // Check category priority
      if (categoryPriorityMap[t.category_id] !== 'savings') return false;
      
      // Check if paid within date range
      return isWithinDateRange(t, startDate, endDate, true);
    })
    .reduce((sum, t) => sum + t.amount, 0);
};

/**
 * 8. Get All Cash Expenses
 * Returns sum of all cash expenses (from wallet) for a given period
 * Reserved for future use if needed
 */
export const getAllCashExpenses = (transactions, startDate, endDate) => {
  return transactions
    .filter(t => {
      if (t.type !== 'expense') return false;
      if (!isCashExpense(t)) return false;
      
      // For cash expenses, check based on paid date if paid, otherwise transaction date
      const dateToCheck = t.isPaid && t.paidDate ? t.paidDate : t.date;
      return isWithinDateRange({ ...t, date: dateToCheck }, startDate, endDate, false);
    })
    .reduce((sum, t) => sum + t.amount, 0);
};

/**
 * COMPOSITE FUNCTION: Get Total Month Expenses (excluding cash)
 * Convenience function that sums all paid and unpaid non-cash expenses for dashboard summary
 */
export const getTotalMonthExpenses = (transactions, categories, allCustomBudgets, startDate, endDate) => {
  const paidNeeds = getPaidNeedsExpenses(transactions, categories, startDate, endDate, allCustomBudgets);
  const unpaidNeeds = getUnpaidNeedsExpenses(transactions, categories, startDate, endDate, allCustomBudgets);
  const paidWants = getDirectPaidWantsExpenses(transactions, categories, startDate, endDate, allCustomBudgets);
  const unpaidWants = getDirectUnpaidWantsExpenses(transactions, categories, startDate, endDate, allCustomBudgets);
  const paidCustom = getPaidCustomBudgetExpenses(transactions, allCustomBudgets, startDate, endDate);
  const unpaidCustom = getUnpaidCustomBudgetExpenses(transactions, allCustomBudgets, startDate, endDate);

  return paidNeeds + unpaidNeeds + paidWants + unpaidWants + paidCustom + unpaidCustom;
};

/**
 * Get all paid expenses for a month (for dashboard paid transactions list)
 * Returns sum of all paid expenses within the date range
 */
export const getMonthlyPaidExpenses = (transactions, startDate, endDate) => {
  return transactions
    .filter(t => {
      if (t.type !== 'expense') return false;
      if (!t.isPaid || !t.paidDate) return false;
      return isWithinDateRange(t, startDate, endDate, true);
    })
    .reduce((sum, t) => sum + t.amount, 0);
};

// ARCHITECTURAL NOTES (2025-01-12):
// - This file consolidates both income and expense calculations
// - Replaces the old expenseCalculations.js (now commented out)
// - Eliminates redundant getCurrentMonthTransactions from generalUtils.js
// - Provides single source of truth for all financial aggregations
// - Added getPaidSavingsExpenses for system budget calculations (12-Jan-2025)