import { useMemo } from 'react';
import { isSameMonth, parseISO, differenceInDays, addMonths, addWeeks, addDays, addYears, subMonths, subWeeks, subDays, subYears, format, isBefore, startOfMonth, startOfDay } from 'date-fns';
import Big from 'big.js';
import { useSettings } from '../utils/SettingsContext';
import { evaluateTransactionMatch } from '../utils/matchingEngine';

function calculateNextDate(date, frequency) {
  switch (frequency) {
    case 'monthly': return addMonths(date, 1);
    case 'weekly': return addWeeks(date, 1);
    case 'biweekly': return addWeeks(date, 2);
    case 'quarterly': return addMonths(date, 3);
    case 'yearly': return addYears(date, 1);
    case 'daily': return addDays(date, 1);
    default: return addMonths(date, 1);
  }
}

// Helper to subtract frequency to find the PREVIOUS cycle
function calculatePreviousDate(date, frequency) {
  switch (frequency) {
    case 'monthly': return subMonths(date, 1);
    case 'weekly': return subWeeks(date, 1);
    case 'biweekly': return subWeeks(date, 2);
    case 'quarterly': return subMonths(date, 3);
    case 'yearly': return subYears(date, 1);
    case 'daily': return subDays(date, 1);
    default: return subMonths(date, 1);
  }
}

export function useRecurringStatus(recurringTransactions = [], realTransactions = []) {
  const { user } = useSettings();

  const data = useMemo(() => {
    const today = new Date();
    const currentMonthStart = startOfMonth(today);
    const currentMonthItems = [];
    const timelineItems = [];

    const activeTemplates = recurringTransactions.filter(r => r.isActive);

    activeTemplates.forEach(template => {
      // 1. Find explicit links
      const linkedTxs = realTransactions.filter(t => t.recurringTransactionId === template.id);

      // 2. Find Candidates: Analyze unlinked transactions
      let matchCandidate = null;
      let matchStatus = 'none';

      // Only look for matches if not already paid/linked this month
      if (linkedTxs.length === 0) {
        const availableTxs = realTransactions.filter(t => !t.recurringTransactionId);

        const bestMatch = availableTxs
          .map(tx => ({ tx, result: evaluateTransactionMatch(tx, [template]) }))
          .filter(item => item.result.status !== 'no_match')
          .sort((a, b) => b.result.matchConfidenceScore - a.result.matchConfidenceScore)[0];

        if (bestMatch) {
          matchCandidate = bestMatch.tx;
          matchStatus = bestMatch.result.status; // 'auto_match' or 'needs_review'
        }
      }

      // RESTORED: "All Relevant" includes suggestions (needs_review) to trigger UI "Activity" states
      const allRelevantTxs = [...linkedTxs];
      if (matchCandidate) allRelevantTxs.push(matchCandidate);

      // SEPARATE: "Paying" only includes confirmed links or high-confidence auto-matches
      // If they are 'needs_review', they should NOT contribute to 'totalPaid' until confirmed.
      const payingTransactions = [...linkedTxs];
      if (matchCandidate && matchStatus === 'auto_match') {
        payingTransactions.push(matchCandidate);
      }

      const dbNextDate = parseISO(template.nextOccurrence);
      // Your logic: Subtract the frequency to find what the PREVIOUS due date was
      const prevDate = calculatePreviousDate(dbNextDate, template.frequency);

      // FIX: Filter transactions to ensure they belong to the CURRENT cycle.
      // A transaction is only valid for the current month if it is temporally closer 
      // to the current due date (dbNextDate) than the previous due date (prevDate).
      // This prevents late payments for the previous month from being counted as "Paid" for this month.
      const validCurrentCycleTxs = payingTransactions.filter(tx => {
        // Always respect explicit ID links
        if (tx.recurringTransactionId === template.id) return true;

        const txDate = parseISO(tx.date);
        const distToCurrent = Math.abs(differenceInDays(txDate, dbNextDate));
        const distToPrev = Math.abs(differenceInDays(txDate, prevDate));

        // ANTI-HIJACK RULE: 
        // If the transaction is in the PREVIOUS month (relative to current due date),
        // verify if the previous month has "surplus" transactions.
        // If there is only 1 transaction in that previous month, it almost certainly belongs 
        // to the previous cycle (even if paid late), so don't steal it for the current cycle.
        if (isBefore(txDate, startOfMonth(dbNextDate))) {
          const previousMonthTxs = payingTransactions.filter(t =>
            isSameMonth(parseISO(t.date), txDate)
          );

          // If we only found ONE transaction in that previous month, assume it's for that month.
          if (previousMonthTxs.length < 2) return false;
        }

        return distToCurrent <= distToPrev;
      });

      const totalPaid = validCurrentCycleTxs.reduce((acc, t) => {

        return acc.plus(new Big(Math.abs(t.amount || 0)));
      }, new Big(0));

      const targetAmount = new Big(Math.abs(template.amount));
      const fuzzyThreshold = targetAmount.times(0.85);
      const paidThisMonth = totalPaid.gte(fuzzyThreshold);

      // INCLUSION MATRIX 
      const isDueThisMonth = isSameMonth(dbNextDate, today); // Expected this month, unpaid
      const isPrevDueThisMonth = isSameMonth(prevDate, today); // Expected this month, but already paid & advanced!
      const isOverdue = isBefore(dbNextDate, currentMonthStart); // Missed entirely
      const hasActivityThisMonth = allRelevantTxs.length > 0;
      const needsReview = matchStatus === 'needs_review' && !linkedTxs.length;

      if (isDueThisMonth || isPrevDueThisMonth || isOverdue || hasActivityThisMonth) {
        // It's considered paid if we paid it this month, OR if the backend already pushed the date past this month
        const isPaid = paidThisMonth || isPrevDueThisMonth;

        // What date do we display? If it advanced to July, we want to show April's date.
        let displayDate = isPrevDueThisMonth ? prevDate : dbNextDate;

        if (hasActivityThisMonth && isPaid && !isPrevDueThisMonth && !isDueThisMonth && linkedTxs[0]) {
          displayDate = parseISO(linkedTxs[0].date);
        }

        const daysUntilDue = differenceInDays(startOfDay(displayDate), startOfDay(today));
        let status = 'upcoming';
        if (isPaid) status = 'paid';
        else if (daysUntilDue < 0) status = 'overdue';
        else if (daysUntilDue <= 3) status = 'due_soon';

        const enrichedItem = {
          ...template,
          isPaid,
          needsReview,
          matchStatus,
          suggestedTransactions: (matchCandidate && !isPaid) ? [matchCandidate] : [],
          paidAmount: totalPaid.toNumber(),
          daysUntilDue,
          status,
          calculatedNextDate: displayDate.toISOString()
        };
        currentMonthItems.push(enrichedItem);
      }

      let projDate = dbNextDate;
      for (let i = 0; i < 3; i++) {
        timelineItems.push({
          ...template,
          projectedDate: projDate.toISOString(),
          isProjection: true
        });

        projDate = calculateNextDate(projDate, template.frequency);
      }
    });

    currentMonthItems.sort((a, b) => new Date(a.calculatedNextDate) - new Date(b.calculatedNextDate));
    timelineItems.sort((a, b) => new Date(a.projectedDate) - new Date(b.projectedDate));

    return { currentMonthItems, timelineItems };
  }, [recurringTransactions, realTransactions]);

  return data;
}
