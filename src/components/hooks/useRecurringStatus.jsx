import { useMemo } from 'react';
import { parseISO, isSameMonth, isPast } from 'date-fns';

/**
 * Calculates the status of recurring templates by matching them against
 * actual transactions from the current month.
 */
export function useRecurringStatus(recurringTransactions, currentMonthTransactions) {
  return useMemo(() => {
    if (!recurringTransactions || !currentMonthTransactions) return [];

    const unlinkedTransactions = [...currentMonthTransactions];
    const now = new Date();

    // 2. Process each recurring template
    return recurringTransactions.map(template => {
      const targetDate = parseISO(template.nextOccurrence);

      // STEP 1: STRICT GATEKEEPING
      // Intelligently check if we are even expecting this bill this month.
      // If it's a quarterly bill due next month, it fails this check instantly.
      const isExpectedThisMonth = isSameMonth(targetDate, now) || isPast(targetDate);

      if (!isExpectedThisMonth) {
        return {
          ...template,
          status: 'ignored', // Tag it so the UI knows to hide it
          linkedTransaction: null
        };
      }

      // STEP 2: EFFICIENT MATCHING
      // Only templates strictly due this month get to search the transaction pool
      let bestMatch = null;
      let bestMatchIndex = -1;
      let smallestDiff = Infinity;

      for (let i = 0; i < unlinkedTransactions.length; i++) {
        const tx = unlinkedTransactions[i];

        if (template.type && tx.type !== template.type) continue;
        if (tx.category_id !== template.category_id) continue;

        const txAmount = Math.abs(tx.amount);
        const tmplAmount = Math.abs(template.amount);
        const margin = tmplAmount * 0.20; // 20% margin
        const diff = Math.abs(txAmount - tmplAmount);

        if (diff <= margin && diff < smallestDiff) {
          bestMatch = tx;
          bestMatchIndex = i;
          smallestDiff = diff;
        }
      }

      // STEP 3: ASSIGN STATUS
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
