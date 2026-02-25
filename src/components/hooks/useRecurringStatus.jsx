import { useMemo } from 'react';

/**
 * Calculates the status of recurring templates by matching them against
 * actual transactions from the current month.
 */
export function useRecurringStatus(recurringTransactions, currentMonthTransactions) {
  return useMemo(() => {
    if (!recurringTransactions || !currentMonthTransactions) return [];

    // 1. Create a map of transactions that are already explicitly linked via ID
    const linkedMap = new Map();
    const unlinkedTransactions = [];

    currentMonthTransactions.forEach(tx => {
      if (tx.recurringTransactionId) {
        linkedMap.set(tx.recurringTransactionId, tx);
      } else {
        unlinkedTransactions.push(tx);
      }
    });

    // 2. Process each recurring template
    return recurringTransactions.map(template => {
      // A. Check for Explicit Link (The "Golden" Link)
      if (linkedMap.has(template.id)) {
        return {
          ...template,
          status: 'paid',
          linkedTransaction: linkedMap.get(template.id),
          matchConfidence: 1.0,
          matchReason: 'explicit_link'
        };
      }

      // B. Find a "Smart Match" among unlinked transactions
      // Rules: Same Type, Same Category, Amount within 20% margin
      let bestMatch = null;
      let bestMatchIndex = -1;

      for (let i = 0; i < unlinkedTransactions.length; i++) {
        const tx = unlinkedTransactions[i];

        if (template.type && tx.type !== template.type) continue;
        if (tx.category_id !== template.category_id) continue;

        const txAmount = Math.abs(tx.amount);
        const tmplAmount = Math.abs(template.amount);
        const margin = tmplAmount * 0.20; // 20% margin

        if (Math.abs(txAmount - tmplAmount) <= margin) {
          bestMatch = tx;
          bestMatchIndex = i;
          break; // Found a match, stop looking
        }
      }

      // C. Match Found
      if (bestMatch) {
        unlinkedTransactions.splice(bestMatchIndex, 1);

        return {
          ...template,
          status: 'paid',
          linkedTransaction: bestMatch
        };
      }

      // D. No Match Found
      return {
        ...template,
        status: 'due',
        linkedTransaction: null
      };
    });

  }, [recurringTransactions, currentMonthTransactions]);
}
