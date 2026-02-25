import { useMemo, useEffect, useRef } from 'react';
import { isSameMonth, parseISO, differenceInDays, addMonths, addWeeks, addDays, addYears, subMonths, subWeeks, subDays, subYears, format, isBefore, startOfMonth, startOfDay } from 'date-fns';
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
  const notifiedRefs = useRef(new Set());

  const data = useMemo(() => {
    const today = new Date();
    const currentMonthStart = startOfMonth(today);
    const currentMonthItems = [];
    const timelineItems = [];

    const activeTemplates = recurringTransactions.filter(r => r.isActive);

    activeTemplates.forEach(template => {
      const currentMonthTxs = realTransactions.filter(t =>
        t.recurringTransactionId === template.id &&
        isSameMonth(parseISO(t.date), today)
      );

      const dbNextDate = parseISO(template.nextOccurrence);
      // Your logic: Subtract the frequency to find what the PREVIOUS due date was
      const prevDate = calculatePreviousDate(dbNextDate, template.frequency);

      // Flexible Amount Matching with Status Awareness
      const totalPaid = currentMonthTxs.reduce((acc, t) => {
        // Income counts automatically. Expenses must be explicitly cleared/paid.
        const isValidPayment = t.type === 'income' || t.isPaid === true;
        if (!isValidPayment) return acc;

        return acc.plus(new Big(Math.abs(t.amount || 0)));
      }, new Big(0));

      const targetAmount = new Big(Math.abs(template.amount));
      const fuzzyThreshold = targetAmount.times(0.85);
      const paidThisMonth = totalPaid.gte(fuzzyThreshold);

      // INCLUSION MATRIX 
      const isDueThisMonth = isSameMonth(dbNextDate, today); // Expected this month, unpaid
      const isPrevDueThisMonth = isSameMonth(prevDate, today); // Expected this month, but already paid & advanced!
      const isOverdue = isBefore(dbNextDate, currentMonthStart); // Missed entirely
      const hasActivityThisMonth = currentMonthTxs.length > 0; // Random manual payment

      if (isDueThisMonth || isPrevDueThisMonth || isOverdue || hasActivityThisMonth) {
        // It's considered paid if we paid it this month, OR if the backend already pushed the date past this month
        const isPaid = paidThisMonth || isPrevDueThisMonth;

        // What date do we display? If it advanced to July, we want to show April's date.
        let displayDate = isPrevDueThisMonth ? prevDate : dbNextDate;

        if (hasActivityThisMonth && isPaid && !isPrevDueThisMonth && !isDueThisMonth) {
          displayDate = parseISO(currentMonthTxs[0].date); // Failsafe for early payments
        }

        const daysUntilDue = differenceInDays(startOfDay(displayDate), startOfDay(today));
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
