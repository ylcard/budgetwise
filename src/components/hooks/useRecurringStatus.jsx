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

      const allRelevantTxs = [...linkedTxs];
      if (matchCandidate) allRelevantTxs.push(matchCandidate);

      const dbNextDate = parseISO(template.nextOccurrence);
      // Your logic: Subtract the frequency to find what the PREVIOUS due date was
      const prevDate = calculatePreviousDate(dbNextDate, template.frequency);

      const totalPaid = allRelevantTxs.reduce((acc, t) => {

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
          suggestedTransactions: matchCandidate ? [matchCandidate] : [],
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
