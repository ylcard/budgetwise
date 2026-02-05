import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import { addDays, addWeeks, addMonths, addYears, setDate, startOfDay, parseISO, isBefore, isAfter, format } from 'npm:date-fns@3.6.0';

/**
 * Backend function to process recurring transactions.
 * UPDATED: 17-Jan-2026 - Added max iterations safety guard for catch-up loop
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

        // ADDED: 17-Jan-2026 - Safety guard to prevent infinite loops
        const MAX_ITERATIONS_PER_RECURRING = 100;

        for (const recurring of activeRecurring) {
            let iterationCount = 0;
            
            try {
                let nextDate = startOfDay(parseISO(recurring.nextOccurrence));

                // MODIFIED: 17-Jan-2026 - Added while loop for catch-up with safety guard
                while (
                    !isAfter(nextDate, today) && 
                    iterationCount < MAX_ITERATIONS_PER_RECURRING
                ) {
                    iterationCount++;

                    // Check if end date has passed
                    if (recurring.endDate) {
                        const endDate = startOfDay(parseISO(recurring.endDate));
                        if (isBefore(endDate, today)) {
                            // Deactivate the recurring transaction
                            await base44.asServiceRole.entities.RecurringTransaction.update(recurring.id, {
                                isActive: false,
                                nextOccurrence: null,
                            });
                            break;
                        }
                    }

                    // Find appropriate system budget for expenses
                    let budgetId = null;
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
                            budgetId = matchingBudget.id;
                        }
                    }

                    // Create the transaction
                    const currentOccurrenceStr = format(nextDate, 'yyyy-MM-dd');
                    const transactionData = {
                        title: recurring.title,
                        amount: recurring.amount,
                        originalAmount: recurring.originalAmount || recurring.amount,
                        originalCurrency: recurring.originalCurrency || 'USD',
                        type: recurring.type,
                        date: currentOccurrenceStr,
                        notes: recurring.notes ? `${recurring.notes} (Auto-generated)` : 'Auto-generated from recurring transaction',
                        recurringTransactionId: recurring.id,
                    };

                    if (recurring.type === 'expense') {
                        transactionData.category_id = recurring.category_id || null;
                        transactionData.financial_priority = recurring.financial_priority || null;
                        transactionData.budgetId = budgetId;
                        transactionData.isPaid = recurring.autoMarkPaid || false;
                        transactionData.paidDate = recurring.autoMarkPaid ? currentOccurrenceStr : null;
                        transactionData.isCashTransaction = false;
                    }

                    await base44.asServiceRole.entities.Transaction.create(transactionData);
                    processed++;

                    // Calculate next occurrence for the next iteration
                    const newNextOccurrence = calculateNextOccurrence(recurring, nextDate);
                    
                    if (!newNextOccurrence) {
                        // No more occurrences - deactivate
                        await base44.asServiceRole.entities.RecurringTransaction.update(recurring.id, {
                            lastProcessedDate: currentOccurrenceStr,
                            nextOccurrence: null,
                            isActive: false,
                        });
                        break;
                    }

                    // Move to next date for the loop
                    nextDate = startOfDay(parseISO(newNextOccurrence));
                }

                // ADDED: 17-Jan-2026 - If we exited the loop normally (not because of end date)
                if (iterationCount > 0 && iterationCount < MAX_ITERATIONS_PER_RECURRING) {
                    // Update the recurring transaction with the final nextOccurrence
                    const finalNextOccurrence = format(nextDate, 'yyyy-MM-dd');
                    await base44.asServiceRole.entities.RecurringTransaction.update(recurring.id, {
                        lastProcessedDate: format(addDays(nextDate, -1), 'yyyy-MM-dd'),
                        nextOccurrence: finalNextOccurrence,
                        isActive: true,
                    });
                } else if (iterationCount === 0) {
                    // Not yet due - skip
                    skipped++;
                } else if (iterationCount >= MAX_ITERATIONS_PER_RECURRING) {
                    // Safety limit reached - log error
                    errors.push({ 
                        id: recurring.id, 
                        title: recurring.title, 
                        error: `Safety limit reached (${MAX_ITERATIONS_PER_RECURRING} iterations)` 
                    });
                }
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