// COMMENTED OUT 12-Jan-2025: This file has been renamed to financialCalculations.jsx
// All imports should now use: import { ... } from '../utils/financialCalculations' (without extension)
// The .jsx version is the active file.
// This .js version is scheduled to be deleted after confirming all builds work with the .jsx version.

/*
// CREATED: 2025-01-12
// Centralized financial calculation functions for both expenses and income
// This file provides granular calculation functions for financial data across budgets

import { parseDate } from './dateUtils';

const isCashExpense = (transaction) => {
  return transaction.isCashTransaction && transaction.cashTransactionType === 'expense_from_wallet';
};

const isWithinDateRange = (transaction, startDate, endDate, usePaidDate = false) => {
  const dateToCheck = usePaidDate && transaction.isPaid && transaction.paidDate 
    ? parseDate(transaction.paidDate)
    : parseDate(transaction.date);
  
  if (!dateToCheck) return false;
  
  const rangeStart = parseDate(startDate);
  const rangeEnd = parseDate(endDate);
  
  return dateToCheck >= rangeStart && dateToCheck <= rangeEnd;
};

const isActualCustomBudget = (budgetId, allCustomBudgets) => {
  if (!budgetId || !allCustomBudgets) return false;
  
  const budget = allCustomBudgets.find(cb => cb.id === budgetId);
  
  return budget && !budget.isSystemBudget;
};

export const getMonthlyIncome = (transactions, startDate, endDate) => {
  return transactions
    .filter(t => {
      if (t.type !== 'income') return false;
      return isWithinDateRange(t, startDate, endDate, false);
    })
    .reduce((sum, t) => sum + t.amount, 0);
};

export const getMonthlyIncomeTransactions = (transactions, startDate, endDate) => {
  return transactions.filter(t => {
    if (t.type !== 'income') return false;
    return isWithinDateRange(t, startDate, endDate, false);
  });
};

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
      
      if (t.customBudgetId && allCustomBudgetIds.includes(t.customBudgetId)) return false;
      
      if (categoryPriorityMap[t.category_id] !== 'needs') return false;
      
      return isWithinDateRange(t, startDate, endDate, true);
    })
    .reduce((sum, t) => sum + t.amount, 0);
};

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
      if (t.isPaid) return false;
      
      if (t.customBudgetId && allCustomBudgetIds.includes(t.customBudgetId)) return false;
      
      if (categoryPriorityMap[t.category_id] !== 'needs') return false;
      
      return isWithinDateRange(t, startDate, endDate, false);
    })
    .reduce((sum, t) => sum + t.amount, 0);
};

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
      
      if (t.customBudgetId && allCustomBudgetIds.includes(t.customBudgetId)) return false;
      
      if (categoryPriorityMap[t.category_id] !== 'wants') return false;
      
      return isWithinDateRange(t, startDate, endDate, true);
    })
    .reduce((sum, t) => sum + t.amount, 0);
};

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
      if (t.isPaid) return false;
      
      if (t.customBudgetId && allCustomBudgetIds.includes(t.customBudgetId)) return false;
      
      if (categoryPriorityMap[t.category_id] !== 'wants') return false;
      
      return isWithinDateRange(t, startDate, endDate, false);
    })
    .reduce((sum, t) => sum + t.amount, 0);
};

export const getPaidCustomBudgetExpenses = (transactions, allCustomBudgets, startDate, endDate) => {
  return transactions
    .filter(t => {
      if (t.type !== 'expense') return false;
      if (isCashExpense(t)) return false;
      if (!t.isPaid || !t.paidDate) return false;
      
      if (!isActualCustomBudget(t.customBudgetId, allCustomBudgets)) return false;
      
      return isWithinDateRange(t, startDate, endDate, true);
    })
    .reduce((sum, t) => sum + t.amount, 0);
};

export const getUnpaidCustomBudgetExpenses = (transactions, allCustomBudgets, startDate, endDate) => {
  return transactions
    .filter(t => {
      if (t.type !== 'expense') return false;
      if (isCashExpense(t)) return false;
      if (t.isPaid) return false;
      
      if (!isActualCustomBudget(t.customBudgetId, allCustomBudgets)) return false;
      
      return isWithinDateRange(t, startDate, endDate, false);
    })
    .reduce((sum, t) => sum + t.amount, 0);
};

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
      
      if (t.customBudgetId && allCustomBudgetIds.includes(t.customBudgetId)) return false;
      
      if (categoryPriorityMap[t.category_id] !== 'savings') return false;
      
      return isWithinDateRange(t, startDate, endDate, true);
    })
    .reduce((sum, t) => sum + t.amount, 0);
};

export const getAllCashExpenses = (transactions, startDate, endDate) => {
  return transactions
    .filter(t => {
      if (t.type !== 'expense') return false;
      if (!isCashExpense(t)) return false;
      
      const dateToCheck = t.isPaid && t.paidDate ? t.paidDate : t.date;
      return isWithinDateRange({ ...t, date: dateToCheck }, startDate, endDate, false);
    })
    .reduce((sum, t) => sum + t.amount, 0);
};

export const getTotalMonthExpenses = (transactions, categories, allCustomBudgets, startDate, endDate) => {
  const paidNeeds = getPaidNeedsExpenses(transactions, categories, startDate, endDate, allCustomBudgets);
  const unpaidNeeds = getUnpaidNeedsExpenses(transactions, categories, startDate, endDate, allCustomBudgets);
  const paidWants = getDirectPaidWantsExpenses(transactions, categories, startDate, endDate, allCustomBudgets);
  const unpaidWants = getDirectUnpaidWantsExpenses(transactions, categories, startDate, endDate, allCustomBudgets);
  const paidCustom = getPaidCustomBudgetExpenses(transactions, allCustomBudgets, startDate, endDate);
  const unpaidCustom = getUnpaidCustomBudgetExpenses(transactions, allCustomBudgets, startDate, endDate);

  return paidNeeds + unpaidNeeds + paidWants + unpaidWants + paidCustom + unpaidCustom;
};

export const getMonthlyPaidExpenses = (transactions, startDate, endDate) => {
  return transactions
    .filter(t => {
      if (t.type !== 'expense') return false;
      if (!t.isPaid || !t.paidDate) return false;
      return isWithinDateRange(t, startDate, endDate, true);
    })
    .reduce((sum, t) => sum + t.amount, 0);
};
*/