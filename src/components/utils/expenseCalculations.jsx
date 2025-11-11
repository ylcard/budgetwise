// CREATED: 2025-01-12
// Centralized expense calculation functions for granular control over expense data
// These functions provide specific sums for different types of expenses across budgets

import { parseDate } from './budgetCalculations';

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
 * Returns sum of all paid, non-cash expenses linked to custom budgets that overlap with the period
 */
export const getPaidCustomBudgetExpenses = (transactions, allCustomBudgets, startDate, endDate) => {
  const rangeStart = parseDate(startDate);
  const rangeEnd = parseDate(endDate);

  // Get custom budgets that overlap with the period
  const relevantBudgetIds = allCustomBudgets
    .filter(cb => {
      if (cb.status !== 'active' && cb.status !== 'completed' && cb.status !== 'planned') return false;
      const cbStart = parseDate(cb.startDate);
      const cbEnd = parseDate(cb.endDate);
      return cbStart <= rangeEnd && cbEnd >= rangeStart;
    })
    .map(cb => cb.id);

  return transactions
    .filter(t => {
      if (t.type !== 'expense') return false;
      if (isCashExpense(t)) return false;
      if (!t.isPaid || !t.paidDate) return false;
      
      // Must be tied to a relevant custom budget
      if (!t.customBudgetId || !relevantBudgetIds.includes(t.customBudgetId)) return false;
      
      // Check if paid within date range
      return isWithinDateRange(t, startDate, endDate, true);
    })
    .reduce((sum, t) => sum + t.amount, 0);
};

/**
 * 6. Get Unpaid Expenses in all custom budgets
 * Returns sum of all unpaid, non-cash expenses linked to custom budgets that overlap with the period
 */
export const getUnpaidCustomBudgetExpenses = (transactions, allCustomBudgets, startDate, endDate) => {
  const rangeStart = parseDate(startDate);
  const rangeEnd = parseDate(endDate);

  // Get custom budgets that overlap with the period
  const relevantBudgetIds = allCustomBudgets
    .filter(cb => {
      if (cb.status !== 'active' && cb.status !== 'completed' && cb.status !== 'planned') return false;
      const cbStart = parseDate(cb.startDate);
      const cbEnd = parseDate(cb.endDate);
      return cbStart <= rangeEnd && cbEnd >= rangeStart;
    })
    .map(cb => cb.id);

  return transactions
    .filter(t => {
      if (t.type !== 'expense') return false;
      if (isCashExpense(t)) return false;
      if (t.isPaid) return false; // Only unpaid
      
      // Must be tied to a relevant custom budget
      if (!t.customBudgetId || !relevantBudgetIds.includes(t.customBudgetId)) return false;
      
      // Check if transaction date within range
      return isWithinDateRange(t, startDate, endDate, false);
    })
    .reduce((sum, t) => sum + t.amount, 0);
};

/**
 * 7. Get All Cash Expenses
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