import { useMemo } from 'react';
import { isSameMonth, differenceInDays, addMonths, addWeeks, addDays, addYears, subMonths, subWeeks, subDays, subYears, isBefore, startOfDay } from 'date-fns';
import Big from 'big.js';
import { useSettings } from '../utils/SettingsContext';
import { evaluateTransactionMatch } from '../utils/matchingEngine';
import { normalizeToMidnight, parseDate } from '../utils/dateUtils';

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

/**
 * Hook to analyze recurring transaction templates against real transactions.
 * Determines if a bill has been paid, is due soon, or is overdue for the current period.
 */
export function useRecurringStatus(recurringTransactions = [], realTransactions = []) {
  const { user } = useSettings();

  const data = useMemo(() => {
    // Use normalized local midnight for consistent status checks
    const today = normalizeToMidnight(new Date());
    const currentMonthStart = new Date(today.getFullYear(), today.getMonth(), 1);
    const currentMonthItems = [];
    const timelineItems = [];

    // TRACKER: Prevent identical transactions (same amt/desc) from being used by multiple templates
    const usedTransactionIds = new Set();

    const activeTemplates = recurringTransactions.filter(r => r.isActive);

    activeTemplates.forEach(template => {
      // 1. Find explicit links
      const linkedTxs = realTransactions.filter(t => t.recurringTransactionId === template.id && !usedTransactionIds.has(t.id));

      // 2. Find Potential Candidates (The Greedy Pool Approach)
      // Instead of finding just one "best" candidate, we gather ALL plausible unlinked 
      // transactions of the same type and let the "Magnet" date logic decide which one fits.
      const availableTxs = realTransactions.filter(t =>
        !t.recurringTransactionId &&
        !usedTransactionIds.has(t.id) &&
        t.type === template.type
      );

      const scoredCandidates = availableTxs
        .map(tx => ({ tx, result: evaluateTransactionMatch(tx, [template]) }))
        // Allow anything that isn't a 'no_match' into the pool
        .filter(item => item.result.status !== 'no_match');

      // 3. GATHER ALL HISTORY (The "Pool")
      // We construct the pool with match metadata attached
      const poolOfTransactions = [
        ...linkedTxs.map(t => ({ ...t, _matchStatus: 'linked' })),
        ...scoredCandidates.map(c => ({
          ...c.tx,
          _matchStatus: c.result.status,
          _matchScore: c.result.matchConfidenceScore
        }))
      ];

      // Sort pool by date (Oldest first) for FIFO filling
      poolOfTransactions.sort((a, b) => new Date(a.date) - new Date(b.date));

      const dbNextDate = parseDate(template.nextOccurrence);
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
        const txDate = parseDate(tx.date);

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
          // Only mark as "used" to block other templates if it matched
          usedTransactionIds.add(tx.id);
        }
      });

      // 6. DETERMINE CURRENT STATUS
      // FIX: Find the slot that belongs to THIS month. 
      // If DB advanced to April, we want the March slot.
      const currentMonthSlot = slots.find(s => isSameMonth(s.date, today));
      // Fallback: If no slot matches today's month (e.g. very overdue), use the last (upcoming) slot
      const currentSlot = currentMonthSlot || slots[slots.length - 1];
      const previousSlot = slots.find(s => isSameMonth(s.date, subMonths(today, 1))); // Useful for display context

      const payingTx = currentSlot?.filledBy;

      // Determine match metadata from the transaction that filled the slot
      const matchStatus = payingTx ? payingTx._matchStatus : 'none';
      const isReviewCandidate = matchStatus === 'needs_review';

      const totalPaid = payingTx ? new Big(Math.abs(payingTx.amount)) : new Big(0);

      const targetAmount = new Big(Math.abs(template.amount));
      const fuzzyThreshold = targetAmount.times(0.85);

      // Paid logic: Amount matches AND it's not just a suggestion waiting for review
      const paidThisMonth = totalPaid.gte(fuzzyThreshold) && !isReviewCandidate;

      // INCLUSION MATRIX 
      const isDueThisMonth = isSameMonth(dbNextDate, today); // Expected this month, unpaid

      // Logic check: If the backend advanced the date to next month, but the previous slot 
      // (which should be "this month" in that case) is NOT filled, we have a problem.
      // But for now, stick to standard visual logic.
      const isPrevDueThisMonth = isSameMonth(prevDate, today);

      const isOverdue = isBefore(dbNextDate, currentMonthStart); // Missed entirely
      const hasActivityThisMonth = linkedTxs.some(t => isSameMonth(parseDate(t.date), today));

      if (isDueThisMonth || isPrevDueThisMonth || isOverdue || hasActivityThisMonth || payingTx) {
        const isPaid = (payingTx && paidThisMonth) || false;

        // Flag for UI: It's found, but user needs to confirm
        const needsReview = payingTx && isReviewCandidate;

        // What date do we display? If it advanced to July, we want to show April's date.
        let displayDate = isPrevDueThisMonth ? prevDate : dbNextDate;

        if (hasActivityThisMonth && isPaid && !isPrevDueThisMonth && !isDueThisMonth && linkedTxs.length > 0) {
          displayDate = parseDate(linkedTxs[0].date);
        } else if (payingTx) {
          // If matched/paid, show the matched date
          displayDate = parseDate(payingTx.date);
        }

        const daysUntilDue = differenceInDays(startOfDay(displayDate), startOfDay(today));
        let status = 'upcoming';
        if (isPaid) status = 'paid';
        else if (daysUntilDue < 0 && !isPaid) status = 'overdue';
        else if (daysUntilDue <= 3) status = 'due_soon';

        // Enriched item to return to UI
        const enrichedItem = {
          ...template,
          isPaid,
          needsReview,
          matchStatus,
          suggestedTransactions: needsReview ? [payingTx] : [],
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
  }, [recurringTransactions, realTransactions, user]); // Added user dependency for safety

  return data;
}
