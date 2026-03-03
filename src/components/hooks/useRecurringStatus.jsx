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

    // TRACKER: Prevent identical transactions (same amt/desc) from being used by multiple templates
    const usedTransactionIds = new Set();

    const activeTemplates = recurringTransactions.filter(r => r.isActive);

    activeTemplates.forEach(template => {
      // 1. Find explicit links
      const linkedTxs = realTransactions.filter(t => t.recurringTransactionId === template.id && !usedTransactionIds.has(t.id));

      // 2. Find Candidates: Analyze unlinked transactions
      let matchCandidate = null;
      let matchStatus = 'none';

      // Only look for matches if we don't have a linked transaction for the *immediate* current period? 
      // Actually, we need to gather ALL potentials to solve the backlog, so let's check for candidates regardless, 
      // but prioritize linked ones.
      if (linkedTxs.length === 0) {
        // Filter out already used IDs from other templates
        const availableTxs = realTransactions.filter(t => !t.recurringTransactionId && !usedTransactionIds.has(t.id));

        const bestMatch = availableTxs
          .map(tx => ({ tx, result: evaluateTransactionMatch(tx, [template]) }))
          .filter(item => item.result.status !== 'no_match')
          .sort((a, b) => b.result.matchConfidenceScore - a.result.matchConfidenceScore)[0];

        if (bestMatch) {
          matchCandidate = bestMatch.tx;
          matchStatus = bestMatch.result.status; // 'auto_match' or 'needs_review'
        }
      }

      // 3. GATHER ALL HISTORY (The "Pool")
      // We need every transaction that *could* be this bill from the past ~6 months
      // to correctly fill the "slots" of unpaid previous months.
      const poolOfTransactions = [...linkedTxs];

      // Only add auto-matches to the "payment pool". 
      // 'needs_review' is for UI suggestions only, not for logic verification.
      if (matchCandidate && matchStatus === 'auto_match') {
        poolOfTransactions.push(matchCandidate);
      }

      // Sort pool by date (Oldest first) for FIFO filling
      poolOfTransactions.sort((a, b) => new Date(a.date) - new Date(b.date));

      const dbNextDate = parseISO(template.nextOccurrence);
      const prevDate = calculatePreviousDate(dbNextDate, template.frequency);

      // 4. GENERATE SLOTS (Magnets)
      // Create expected due dates for the last 5 cycles + Current Cycle
      const slots = [];
      let iterDate = dbNextDate;

      // Start with Current
      slots.push({ date: dbNextDate, filledBy: null });

      // Add 5 past slots to the beginning to handle late payments history
      for (let i = 0; i < 5; i++) {
        iterDate = calculatePreviousDate(iterDate, template.frequency);
        slots.unshift({ date: iterDate, filledBy: null });
      }

      // 5. FILL SLOTS (Best Fit / Greedy Magnet)
      // Let each transaction find its CLOSEST empty slot.
      poolOfTransactions.forEach(tx => {
        const txDate = parseISO(tx.date);

        let bestSlotIndex = -1;
        let minDiff = Infinity;

        slots.forEach((slot, index) => {
          if (slot.filledBy) return; // Slot already taken

          // Calculate ABSOLUTE distance (how far is this tx from this due date?)
          const diff = Math.abs(differenceInDays(txDate, slot.date));

          // MATCHING RULES:
          // 1. Threshold: If the transaction is > 25 days away from the due date, it's probably not for this bill.
          //    (This protects March bills from snatching January transactions)
          // 2. Proximity: It must be the closest slot found so far.
          if (diff < 25 && diff < minDiff) {
            minDiff = diff;
            bestSlotIndex = index;
          }
        });

        if (bestSlotIndex !== -1) {
          slots[bestSlotIndex].filledBy = tx;
          // CRITICAL: Mark this ID as used so other templates (like Apple Music) can't use it
          usedTransactionIds.add(tx.id);
        }
      });

      // 6. DETERMINE CURRENT STATUS
      // The "Current" slot is the last one in our array (based on dbNextDate)
      const currentSlot = slots[slots.length - 1];
      const previousSlot = slots[slots.length - 2];

      const payingTx = currentSlot.filledBy;
      const totalPaid = payingTx ? new Big(Math.abs(payingTx.amount)) : new Big(0);

      const targetAmount = new Big(Math.abs(template.amount));
      const fuzzyThreshold = targetAmount.times(0.85);
      const paidThisMonth = totalPaid.gte(fuzzyThreshold);

      // INCLUSION MATRIX 
      const isDueThisMonth = isSameMonth(dbNextDate, today); // Expected this month, unpaid

      // Logic check: If the backend advanced the date to next month, but the previous slot 
      // (which should be "this month" in that case) is NOT filled, we have a problem.
      // But for now, stick to standard visual logic.
      const isPrevDueThisMonth = isSameMonth(prevDate, today);

      const isOverdue = isBefore(dbNextDate, currentMonthStart); // Missed entirely
      const hasActivityThisMonth = linkedTxs.some(t => isSameMonth(parseISO(t.date), today));
      const needsReview = matchStatus === 'needs_review' && !linkedTxs.length;

      if (isDueThisMonth || isPrevDueThisMonth || isOverdue || hasActivityThisMonth) {
        const isPaid = paidThisMonth || isPrevDueThisMonth;

        // What date do we display? If it advanced to July, we want to show April's date.
        let displayDate = isPrevDueThisMonth ? prevDate : dbNextDate;

        if (hasActivityThisMonth && isPaid && !isPrevDueThisMonth && !isDueThisMonth && linkedTxs.length > 0) {
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
