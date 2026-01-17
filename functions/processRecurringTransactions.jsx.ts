import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import { addDays, startOfDay, parseISO, isBefore, isAfter, format } from 'npm:date-fns@3.6.0';

/**
 * MODIFIED 17-Jan-2026: User-triggered backend function to process recurring transactions.
 * Accepts lastProcessedDate and userLocalDate in payload.
 * Implements catch-up logic with bulk transaction fetching for performance.
 * Updates UserSettings.lastProcessedRecurringDate upon completion.
 */

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();

        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Parse payload
        const payload = await req.json();
        const { lastProcessedDate, userLocalDate } = payload;

        if (!userLocalDate) {
            return Response.json({ error: 'userLocalDate is required' }, { status: 400 });
        }

        // Use user's local date as the target date
        const targetDate = startOfDay(parseISO(userLocalDate));
        const targetDateStr = format(targetDate, 'yyyy-MM-dd');

        // Determine start date for catch-up loop
        const startDate = lastProcessedDate 
            ? addDays(startOfDay(parseISO(lastProcessedDate)), 1)
            : targetDate;

        // Fetch user-scoped data
        const allRecurring = await base44.entities.RecurringTransaction.filter({ user_email: user.email });
        const activeRecurring = allRecurring.filter(r => r.isActive && r.nextOccurrence);

        // Bulk fetch all system budgets for the user (for budget assignment)
        const allSystemBudgets = await base44.entities.SystemBudget.filter({ user_email: user.email });

        // PERFORMANCE OPTIMIZATION: Bulk fetch existing transactions in the gap period
        const existingTransactions = await base44.entities.Transaction.filter({
            user_email: user.email,
            date: { $gte: format(startDate, 'yyyy-MM-dd'), $lte: targetDateStr }
        });

        // Create a Set for fast duplicate checking: "recurringId:date"
        const existingTxSet = new Set(
            existingTransactions
                .filter(tx => tx.recurringTransactionId)
                .map(tx => `${tx.recurringTransactionId}:${tx.date}`)
        );

        let processed = 0;
        let skipped = 0;
        const errors = [];

        // Catch-up loop: iterate from startDate to targetDate
        let currentDate = startOfDay(startDate);
        while (isBefore(currentDate, targetDate) || currentDate.getTime() === targetDate.getTime()) {
            const currentDateStr = format(currentDate, 'yyyy-MM-dd');

            for (const recurring of activeRecurring) {
                try {
                    const nextOccurrence = recurring.nextOccurrence ? startOfDay(parseISO(recurring.nextOccurrence)) : null;

                    // Skip if not due yet
                    if (!nextOccurrence || isAfter(nextOccurrence, currentDate)) {
                        continue;
                    }

                    // Skip if already processed
                    if (recurring.lastProcessedDate) {
                        const lastProcessed = startOfDay(parseISO(recurring.lastProcessedDate));
                        if (!isBefore(lastProcessed, currentDate)) {
                            continue;
                        }
                    }

                    // Check if end date has passed
                    if (recurring.endDate) {
                        const endDate = startOfDay(parseISO(recurring.endDate));
                        if (isBefore(endDate, currentDate)) {
                            // Deactivate the recurring transaction
                            await base44.entities.RecurringTransaction.update(recurring.id, {
                                isActive: false,
                                nextOccurrence: null,
                            });
                            continue;
                        }
                    }

                    // Duplicate check using the Set
                    const txKey = `${recurring.id}:${currentDateStr}`;
                    if (existingTxSet.has(txKey)) {
                        skipped++;
                        continue;
                    }

                    // MONTH TRANSITION: Recalculate budget variables for current date
                    let customBudgetId = null;
                    if (recurring.type === 'expense' && recurring.financial_priority) {
                        const txMonth = currentDate.getMonth();
                        const txYear = currentDate.getFullYear();
                        const monthStart = format(new Date(txYear, txMonth, 1), 'yyyy-MM-dd');
                        const monthEnd = format(new Date(txYear, txMonth + 1, 0), 'yyyy-MM-dd');

                        const matchingBudget = allSystemBudgets.find(sb =>
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
                        date: currentDateStr,
                        notes: recurring.notes ? `${recurring.notes} (Auto-generated)` : 'Auto-generated from recurring transaction',
                        recurringTransactionId: recurring.id,
                    };

                    if (recurring.type === 'expense') {
                        transactionData.category_id = recurring.category_id || null;
                        transactionData.financial_priority = recurring.financial_priority || null;
                        transactionData.customBudgetId = customBudgetId;
                        transactionData.isPaid = recurring.autoMarkPaid || false;
                        transactionData.paidDate = recurring.autoMarkPaid ? currentDateStr : null;
                        transactionData.isCashTransaction = false;
                    }

                    await base44.entities.Transaction.create(transactionData);

                    // Add to Set to prevent re-creation in subsequent loop iterations
                    existingTxSet.add(txKey);

                    // Calculate next occurrence
                    const newNextOccurrence = calculateNextOccurrence(recurring, currentDate);

                    // Update recurring transaction
                    await base44.entities.RecurringTransaction.update(recurring.id, {
                        lastProcessedDate: currentDateStr,
                        nextOccurrence: newNextOccurrence,
                        isActive: newNextOccurrence !== null,
                    });

                    processed++;
                } catch (err) {
                    errors.push({ id: recurring.id, title: recurring.title, date: currentDateStr, error: err.message });
                }
            }

            currentDate = addDays(currentDate, 1);
        }

        // CRITICAL: Update UserSettings to mark completion
        const userSettings = await base44.entities.UserSettings.filter({ user_email: user.email });
        if (userSettings.length > 0) {
            await base44.entities.UserSettings.update(userSettings[0].id, {
                lastProcessedRecurringDate: targetDateStr
            });
        } else {
            await base44.entities.UserSettings.create({
                user_email: user.email,
                lastProcessedRecurringDate: targetDateStr
            });
        }

        return Response.json({
            success: true,
            processed,
            skipped,
            errors: errors.length > 0 ? errors : undefined,
            targetDate: targetDateStr,
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
    const { addWeeks, addMonths, addYears, setDate } = await import('npm:date-fns@3.6.0');
    
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