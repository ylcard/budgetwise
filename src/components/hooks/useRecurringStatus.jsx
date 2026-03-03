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

      // HISTORY BOUNDARY:
      // Determine the earliest transaction in your entire history.
      // We shouldn't generate "expected" slots for dates before you even started using the app.
      // Default to 60 days ago if no history exists yet.
      const historyStart = realTransactions.length > 0
        ? realTransactions.reduce((min, t) => t.date < min ? t.date : min, realTransactions[0].date)
        : format(subMonths(new Date(), 2), 'yyyy-MM-dd');

      // 4. GENERATE SLOTS (Backlog)
      // Create expected due dates for the last X cycles (e.g. 5) + Current Cycle
      // This handles your "Electricity" case: Dec(Late) -> Jan(Late) -> Feb(On Time)
      const slots = [];
      let iterDate = dbNextDate;

      // Go back 5 cycles (arbitrary safe history depth)
      for (let i = 0; i < 5; i++) {
        iterDate = calculatePreviousDate(iterDate, template.frequency);
        // ONLY add this slot if it's within a reasonable window of the user's history (e.g. -45 days buffer)
        // This prevents a transaction today from paying off a "ghost" bill from 6 months ago
        if (differenceInDays(iterDate, parseISO(historyStart)) >= -45) {
          slots.unshift({ date: iterDate, filledBy: null });
        }
      }
      // Add current cycle
      slots.push({ date: dbNextDate, filledBy: null }); // Index 5 is current

      // 5. FILL SLOTS (FIFO)
      // Match oldest transaction to oldest *compatible* slot
      poolOfTransactions.forEach(tx => {
        const txDate = parseISO(tx.date);

        // Find the first empty slot where this transaction makes sense.
        // "Makes sense" = Transaction isn't wildly before the due date (e.g. 2 months early).
        // We allow late payments (infinity), but restrict early payments (e.g. max 20 days early).
        const validSlotIndex = slots.findIndex(slot => {
          if (slot.filledBy) return false; // Already paid
          const diff = differenceInDays(txDate, slot.date);
          // Allow paying up to 25 days early, or any time after.
          return diff >= -25;
        });

        if (validSlotIndex !== -1) {
          slots[validSlotIndex].filledBy = tx;
          // MARK AS USED so subsequent templates don't grab it
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
