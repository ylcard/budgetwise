import { useMemo, useEffect, useRef } from 'react';
import { isSameMonth, parseISO, differenceInDays, addMonths, addWeeks, addDays, addYears, format, max, isBefore, startOfMonth } from 'date-fns';
import Big from 'big.js';
import { useSettings } from '../utils/SettingsContext';
import { notifyRecurringDue, notifyRecurringOverdue } from '../utils/notificationHelpers';

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

      // 3. Find the MOST RECENT payment date from historical data
      let lastPaymentDate = null;
      if (templateHistory.length > 0) {
        const dates = templateHistory.map(t => parseISO(t.date));
        lastPaymentDate = max(dates);
      }

      // 4. Calculate the TRUE next expected date based on frequency
      let expectedNextDate;
      if (lastPaymentDate) {
        switch (template.frequency) {
          case 'monthly': expectedNextDate = addMonths(lastPaymentDate, 1); break;
          case 'weekly': expectedNextDate = addWeeks(lastPaymentDate, 1); break;
          case 'biweekly': expectedNextDate = addWeeks(lastPaymentDate, 2); break;
          case 'quarterly': expectedNextDate = addMonths(lastPaymentDate, 3); break;
          case 'yearly': expectedNextDate = addYears(lastPaymentDate, 1); break;
          case 'daily': expectedNextDate = addDays(lastPaymentDate, 1); break;
          default: expectedNextDate = addMonths(lastPaymentDate, 1);
        }
      } else {
        // Fallback for brand new templates with no history
        expectedNextDate = parseISO(template.nextOccurrence);
      }

      // 5. Check if it has been paid THIS month
      const currentMonthTxs = templateHistory.filter(t => isSameMonth(parseISO(t.date), today));
      const totalPaid = currentMonthTxs.reduce((acc, t) => acc.plus(new Big(t.amount || 0)), new Big(0));
      const isPaid = totalPaid.gte(new Big(template.amount));

      // 6. Status Determination
      const daysUntilDue = differenceInDays(expectedNextDate, today);
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
        calculatedNextDate: expectedNextDate.toISOString()
      };

      // 7. Inclusion Logic: Only show if expected THIS month, or strictly overdue from a past month, or paid this month
      const isExpectedThisMonth = isSameMonth(expectedNextDate, today);
      const isOverdueFromPast = isBefore(expectedNextDate, currentMonthStart) && !isPaid;

      if (isExpectedThisMonth || isOverdueFromPast || isPaid) {
        currentMonthItems.push(enrichedItem);
      }

      // 8. Timeline Projection (Next 3 occurrences based on calculated reality)
      let projDate = expectedNextDate;
      for (let i = 0; i < 3; i++) {
        timelineItems.push({
          ...enrichedItem,
          projectedDate: projDate.toISOString(),
          isProjection: i > 0 || isPaid
        });

        switch (template.frequency) {
          case 'monthly': projDate = addMonths(projDate, 1); break;
          case 'weekly': projDate = addWeeks(projDate, 1); break;
          case 'biweekly': projDate = addWeeks(projDate, 2); break;
          case 'quarterly': projDate = addMonths(projDate, 3); break;
          case 'yearly': projDate = addYears(projDate, 1); break;
          case 'daily': projDate = addDays(projDate, 1); break;
          default: projDate = addMonths(projDate, 1);
        }
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
