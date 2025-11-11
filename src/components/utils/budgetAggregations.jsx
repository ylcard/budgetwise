// PARTIALLY DEPRECATED 2025-01-12
// This file contains aggregation utilities for budget calculations
// calculateAggregatedRemainingAmounts has been deprecated in favor of granular expense functions

import { parseDate } from './budgetCalculations';
import { getCurrencySymbol } from './currencyUtils';

// COMMENTED OUT 2025-01-12: Deprecated function - replaced by granular expense functions in expenseCalculations.js
// This function was calculating "ghost amounts" (remaining allocated funds) which are no longer used
// Keeping for reference but should not be called anywhere in the app
/*
export const calculateAggregatedRemainingAmounts = (
  allCustomBudgets,
  transactions,
  baseCurrency = 'USD'
) => {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  
  const activeCustomBudgets = allCustomBudgets.filter(cb => {
    if (cb.status !== 'active') return false;
    
    const endDate = parseDate(cb.endDate);
    return endDate >= now;
  });

  let totalDigitalRemaining = 0;
  const cashRemainingByCurrency = {};

  activeCustomBudgets.forEach(budget => {
    const budgetTransactions = transactions.filter(t => t.customBudgetId === budget.id);
    
    const digitalAllocated = budget.allocatedAmount || 0;
    const digitalSpent = budgetTransactions
      .filter(t => t.type === 'expense' && (!t.isCashTransaction || t.cashTransactionType !== 'expense_from_wallet'))
      .reduce((sum, t) => sum + t.amount, 0);
    const digitalRemaining = Math.max(0, digitalAllocated - digitalSpent);
    
    totalDigitalRemaining += digitalRemaining;

    const cashAllocations = budget.cashAllocations || [];
    cashAllocations.forEach(allocation => {
      const currencyCode = allocation.currencyCode;
      const allocated = allocation.amount || 0;
      
      const spent = budgetTransactions
        .filter(t => t.type === 'expense' && t.isCashTransaction && t.cashTransactionType === 'expense_from_wallet' && t.cashCurrency === currencyCode)
        .reduce((sum, t) => sum + (t.cashAmount || 0), 0);
      
      const remaining = Math.max(0, allocated - spent);
      
      if (remaining > 0) {
        if (!cashRemainingByCurrency[currencyCode]) {
          cashRemainingByCurrency[currencyCode] = 0;
        }
        cashRemainingByCurrency[currencyCode] += remaining;
      }
    });
  });

  const separateCashAmounts = Object.entries(cashRemainingByCurrency)
    .map(([currencyCode, amount]) => ({
      currencyCode,
      amount,
      symbol: getCurrencySymbol(currencyCode)
    }));

  return {
    mainSum: totalDigitalRemaining,
    separateCashAmounts
  };
};
*/

// TEMPORARY NOTE 2025-01-12: This file may be deleted in the future if no other aggregation functions are needed
// For now, keeping it as a placeholder in case we need to add new aggregation utilities