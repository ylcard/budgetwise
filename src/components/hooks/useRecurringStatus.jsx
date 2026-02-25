import { useMemo, useEffect, useRef } from 'react';
import { isSameMonth, parseISO, differenceInDays, addMonths, addWeeks, addDays, addYears, format, max, isBefore, startOfMonth, startOfDay } from 'date-fns';
import Big from 'big.js';
import { useSettings } from '../utils/SettingsContext';
import { notifyRecurringDue, notifyRecurringOverdue } from '../utils/notificationHelpers';

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

export function useRecurringStatus(recurringTransactions = [], allTransactions = []) {
  const { user } = useSettings();
  const notifiedRefs = useRef(new Set());

  const data = useMemo(() => {
    const today = new Date();
    const currentMonthStart = startOfMonth(today);
    const currentMonthItems = [];
    const timelineItems = [];

    // 1. OPTIMIZATION: Get IDs of active templates to filter the massive transactions array once
    const activeTemplates = recurringTransactions.filter(r => r.isActive);
    const activeTemplateIds = new Set(activeTemplates.map(r => r.id));

    // 2. OPTIMIZATION: Keep only real transactions that are actually linked to our active templates
    const relevantTransactions = allTransactions.filter(t =>
      t.recurringTransactionId && activeTemplateIds.has(t.recurringTransactionId)
    );

    activeTemplates.forEach(template => {
      // Get all historical payments for this specific template
      const templateHistory = relevantTransactions.filter(t => t.recurringTransactionId === template.id);

      // 3. Split history: What happened THIS month vs PAST months
      const currentMonthTxs = [];
      const pastTxs = [];

      templateHistory.forEach(t => {
        const tDate = parseISO(t.date);
        if (isSameMonth(tDate, today)) {
          currentMonthTxs.push(t);
        } else if (isBefore(tDate, currentMonthStart)) {
          pastTxs.push(t);
        }
      });

      // 4. Determine what was SUPPOSED to happen this month based purely on past history
      let expectedDueThisCycle;
      if (pastTxs.length > 0) {
        const lastPastPaymentDate = max(pastTxs.map(t => parseISO(t.date)));
        expectedDueThisCycle = calculateNextDate(lastPastPaymentDate, template.frequency);
      } else {
        expectedDueThisCycle = parseISO(template.nextOccurrence);
      }

      // 5. Calculate dynamically if it was fulfilled THIS month (works for both income/expense)
      const totalPaid = currentMonthTxs.reduce((acc, t) => acc.plus(new Big(t.amount || 0)), new Big(0));
      const isPaid = totalPaid.gte(new Big(template.amount));

      // 6. Status Determination
      const daysUntilDue = differenceInDays(startOfDay(expectedDueThisCycle), startOfDay(today));
      let status = 'upcoming';
      if (isPaid) status = 'paid';
      else if (daysUntilDue < 0) status = 'overdue';
      else if (daysUntilDue <= 3) status = 'due_soon';

      const enrichedItem = {
        ...template,
        isPaid,
        paidAmount: totalPaid.toNumber(),
        daysUntilDue,
        status,
        calculatedNextDate: expectedDueThisCycle.toISOString()
      };

      // 7. Inclusion Logic: Show if expected this month, overdue from past, or fulfilled this month
      const isExpectedThisMonth = isSameMonth(expectedDueThisCycle, today);
      const isOverdueFromPast = isBefore(expectedDueThisCycle, currentMonthStart) && !isPaid;

      if (isExpectedThisMonth || isOverdueFromPast || isPaid) {
        currentMonthItems.push(enrichedItem);
      }

      // 8. Timeline Projection (Future occurrences)
      // If paid this month, the NEXT expected date in the timeline starts from the next cycle
      let projDate = isPaid ? calculateNextDate(expectedDueThisCycle, template.frequency) : expectedDueThisCycle;
      for (let i = 0; i < 3; i++) {
        timelineItems.push({
          ...enrichedItem,
          projectedDate: projDate.toISOString(),
          isProjection: i > 0 || isPaid
        });

        projDate = calculateNextDate(projDate, template.frequency);
      }
    });

    currentMonthItems.sort((a, b) => new Date(a.calculatedNextDate) - new Date(b.calculatedNextDate));
    timelineItems.sort((a, b) => new Date(a.projectedDate) - new Date(b.projectedDate));

    return { currentMonthItems, timelineItems };
  }, [recurringTransactions, allTransactions]);

  // Notification System Integration
  useEffect(() => {
    if (!user?.email || !data.currentMonthItems.length) return;

    data.currentMonthItems.forEach(async (item) => {
      const notifKey = `${item.id}-${item.calculatedNextDate}-${item.status}`;
      if (notifiedRefs.current.has(notifKey)) return;

      if (item.status === 'due_soon') {
        await notifyRecurringDue(user.email, item.title, format(parseISO(item.calculatedNextDate), 'MMM d'));
        notifiedRefs.current.add(notifKey);
      } else if (item.status === 'overdue') {
        await notifyRecurringOverdue(user.email, item.title);
        notifiedRefs.current.add(notifKey);
      }
    });
  }, [data.currentMonthItems, user]);

  return data;
}
