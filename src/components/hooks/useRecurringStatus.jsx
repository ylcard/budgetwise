import { useMemo, useEffect, useRef } from 'react';
import { isSameMonth, parseISO, differenceInDays, addMonths, addWeeks, addDays, addYears, format } from 'date-fns';
import Big from 'big.js';
import { useSettings } from '../utils/SettingsContext';
import { notifyRecurringDue, notifyRecurringOverdue } from '../utils/notificationHelpers';

export function useRecurringStatus(recurringTransactions = [], realTransactions = []) {
  const { user } = useSettings();
  const notifiedRefs = useRef(new Set());

  const data = useMemo(() => {
    const today = new Date();
    const currentMonthItems = [];
    const timelineItems = [];

    recurringTransactions.forEach(recurring => {
      if (!recurring.isActive) return;

      // 1. Intelligent Matching: Find real transactions linked to this recurring ID in the current month
      const currentMonthTxs = realTransactions.filter(t =>
        t.recurringTransactionId === recurring.id &&
        isSameMonth(parseISO(t.date), today)
      );

      // 2. Accurate summation using big.js to check if fully paid
      const totalPaid = currentMonthTxs.reduce((acc, t) => acc.plus(new Big(t.amount || 0)), new Big(0));
      const isPaid = totalPaid.gte(new Big(recurring.amount));

      const nextDate = parseISO(recurring.nextOccurrence);
      const daysUntilDue = differenceInDays(nextDate, today);

      // 3. Status Determination
      let status = 'upcoming';
      if (isPaid) status = 'paid';
      else if (daysUntilDue < 0) status = 'overdue';
      else if (daysUntilDue <= 3) status = 'due_soon';

      const enrichedItem = {
        ...recurring,
        isPaid,
        paidAmount: totalPaid.toNumber(),
        daysUntilDue,
        status,
      };

      // 4. Current Month View
      if (isSameMonth(nextDate, today) || status === 'overdue') {
        currentMonthItems.push(enrichedItem);
      }

      // 5. Timeline Projection (Next 3 occurrences)
      let projDate = nextDate;
      for (let i = 0; i < 3; i++) {
        timelineItems.push({
          ...enrichedItem,
          projectedDate: projDate.toISOString(),
          // Mark the first instance as accurate to reality, future ones as purely projections
          isProjection: i > 0 || isPaid
        });

        switch (recurring.frequency) {
          case 'monthly': projDate = addMonths(projDate, 1); break;
          case 'weekly': projDate = addWeeks(projDate, 1); break;
          case 'biweekly': projDate = addWeeks(projDate, 2); break;
          case 'yearly': projDate = addYears(projDate, 1); break;
          case 'daily': projDate = addDays(projDate, 1); break;
          default: projDate = addMonths(projDate, 1);
        }
      }
    });

    currentMonthItems.sort((a, b) => new Date(a.nextOccurrence) - new Date(b.nextOccurrence));
    timelineItems.sort((a, b) => new Date(a.projectedDate) - new Date(b.projectedDate));

    return { currentMonthItems, timelineItems };
  }, [recurringTransactions, realTransactions]);

  // 6. Notification System Integration
  useEffect(() => {
    if (!user?.email || !data.currentMonthItems.length) return;

    data.currentMonthItems.forEach(async (item) => {
      const notifKey = `${item.id}-${item.nextOccurrence}-${item.status}`;
      if (notifiedRefs.current.has(notifKey)) return;

      if (item.status === 'due_soon') {
        await notifyRecurringDue(user.email, item.title, format(parseISO(item.nextOccurrence), 'MMM d'));
        notifiedRefs.current.add(notifKey);
      } else if (item.status === 'overdue') {
        await notifyRecurringOverdue(user.email, item.title);
        notifiedRefs.current.add(notifKey);
      }
    });
  }, [data.currentMonthItems, user]);

  return data;
}
