import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import { addDays, addWeeks, addMonths, addYears, setDate, startOfDay, parseISO, isBefore, isAfter, format } from 'npm:date-fns@3.6.0';

/**
 * Backend function to process recurring transactions.
 * This should be called daily by a scheduled task.
 * It generates transactions for all due recurring items and updates their nextOccurrence.
 */

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();

        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Admin-only check for scheduled task execution
        if (user.role !== 'admin') {
            return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
        }

        const today = startOfDay(new Date());
        const todayStr = format(today, 'yyyy-MM-dd');

        // Fetch all active recurring transactions
        const allRecurring = await base44.asServiceRole.entities.RecurringTransaction.list();
        const activeRecurring = allRecurring.filter(r => r.isActive && r.nextOccurrence);

        // Fetch all system budgets for budget assignment
        const allSystemBudgets = await base44.asServiceRole.entities.SystemBudget.list();

        let processed = 0;
        let skipped = 0;
        const errors = [];

        for (const recurring of activeRecurring) {
            try {
                const nextDate = startOfDay(parseISO(recurring.nextOccurrence));

                // Check if due (nextOccurrence is today or in the past)
                if (isAfter(nextDate, today)) {
                    skipped++;
                    continue;
                }

                // Check if end date has passed
                if (recurring.endDate) {
                    const endDate = startOfDay(parseISO(recurring.endDate));
                    if (isBefore(endDate, today)) {
                        // Deactivate the recurring transaction
                        await base44.asServiceRole.entities.RecurringTransaction.update(recurring.id, {
                            isActive: false,
                            nextOccurrence: null,
                        });
                        continue;
                    }
                }

                // Find appropriate system budget for expenses
                let customBudgetId = null;
                if (recurring.type === 'expense' && recurring.financial_priority) {
                    // Find the system budget for the transaction's month that matches the priority
                    const txMonth = nextDate.getMonth();
                    const txYear = nextDate.getFullYear();
                    const monthStart = format(new Date(txYear, txMonth, 1), 'yyyy-MM-dd');
                    const monthEnd = format(new Date(txYear, txMonth + 1, 0), 'yyyy-MM-dd');

                    const matchingBudget = allSystemBudgets.find(sb =>
                        sb.user_email === recurring.user_email &&
                        sb.systemBudgetType === recurring.financial_priority &&
                        sb.startDate === monthStart &&
                        sb.endDate === monthEnd
                    );

                    if (matchingBudget) {
                        customBudgetId = matchingBudget.id;
                    }
                }

                // Create the transaction
                const transactionData = {
                    title: recurring.title,
                    amount: recurring.amount,
                    originalAmount: recurring.originalAmount || recurring.amount,
                    originalCurrency: recurring.originalCurrency || 'USD',
                    type: recurring.type,
                    date: recurring.nextOccurrence,
                    notes: recurring.notes ? `${recurring.notes} (Auto-generated)` : 'Auto-generated from recurring transaction',
                };

                if (recurring.type === 'expense') {
                    transactionData.category_id = recurring.category_id || null;
                    transactionData.financial_priority = recurring.financial_priority || null;
                    transactionData.customBudgetId = customBudgetId;
                    transactionData.isPaid = recurring.autoMarkPaid || false;
                    transactionData.paidDate = recurring.autoMarkPaid ? recurring.nextOccurrence : null;
                    transactionData.isCashTransaction = false;
                }

                await base44.asServiceRole.entities.Transaction.create(transactionData);

                // Calculate next occurrence
                const newNextOccurrence = calculateNextOccurrence(recurring, nextDate);

                // Update recurring transaction
                await base44.asServiceRole.entities.RecurringTransaction.update(recurring.id, {
                    lastProcessedDate: recurring.nextOccurrence,
                    nextOccurrence: newNextOccurrence,
                    // If no more occurrences, deactivate
                    isActive: newNextOccurrence !== null,
                });

                processed++;
            } catch (err) {
                errors.push({ id: recurring.id, title: recurring.title, error: err.message });
            }
        }

        return Response.json({
            success: true,
            processed,
            skipped,
            errors: errors.length > 0 ? errors : undefined,
            timestamp: todayStr,
        });
    } catch (error) {
        console.error('Process recurring error:', error);
        return Response.json({ error: error.message }, { status: 500 });
    }
});

/**
 * Calculate the next occurrence date for a recurring transaction.
 */
function calculateNextOccurrence(recurring, fromDate) {
    const { frequency, dayOfMonth, dayOfWeek, endDate } = recurring;
    const end = endDate ? startOfDay(parseISO(endDate)) : null;

    let nextDate = calculateNextFromBase(fromDate, frequency, dayOfMonth, dayOfWeek);

    // Check if next date exceeds end date
    if (end && isAfter(nextDate, end)) {
        return null;
    }

    return format(nextDate, 'yyyy-MM-dd');
}

/**
 * Calculate the next date from a base date based on frequency.
 */
function calculateNextFromBase(baseDate, frequency, dayOfMonth, dayOfWeek) {
    switch (frequency) {
        case 'daily':
            return addDays(baseDate, 1);

        case 'weekly': {
            let next = addDays(baseDate, 1);
            while (next.getDay() !== (dayOfWeek ?? 1)) {
                next = addDays(next, 1);
            }
            return next;
        }

        case 'biweekly': {
            let next = addDays(baseDate, 1);
            while (next.getDay() !== (dayOfWeek ?? 1)) {
                next = addDays(next, 1);
            }
            if (next.getTime() - baseDate.getTime() < 7 * 24 * 60 * 60 * 1000) {
                next = addWeeks(next, 2);
            }
            return next;
        }

        case 'monthly': {
            let next = addMonths(baseDate, 1);
            const daysInMonth = new Date(next.getFullYear(), next.getMonth() + 1, 0).getDate();
            const targetDay = Math.min(dayOfMonth || 1, daysInMonth);
            return setDate(next, targetDay);
        }

        case 'quarterly': {
            let next = addMonths(baseDate, 3);
            const daysInMonth = new Date(next.getFullYear(), next.getMonth() + 1, 0).getDate();
            const targetDay = Math.min(dayOfMonth || 1, daysInMonth);
            return setDate(next, targetDay);
        }

        case 'yearly': {
            let next = addYears(baseDate, 1);
            const daysInMonth = new Date(next.getFullYear(), next.getMonth() + 1, 0).getDate();
            const targetDay = Math.min(dayOfMonth || 1, daysInMonth);
            return setDate(next, targetDay);
        }

        default:
            return addMonths(baseDate, 1);
    }
}