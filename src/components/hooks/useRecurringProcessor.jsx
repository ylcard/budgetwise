import { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useSettings } from '../utils/SettingsContext';
import { format, parseISO, startOfMonth } from 'date-fns';
import { toast } from 'sonner';

/**
 * CREATED 17-Jan-2026: Frontend hook to trigger processRecurringTransactions backend function.
 * UPDATED: 17-Jan-2026 - Removed isProcessing from dependencies, added recurring check
 * Checks if the current month is different from lastProcessedRecurringDate.
 * If so, triggers the backend function and displays user feedback.
 */

export function useRecurringProcessor() {
    const { settings } = useSettings();
    const [isProcessing, setIsProcessing] = useState(false);

    useEffect(() => {
        const processRecurring = async () => {
            console.log('🔄 [FRONTEND] useRecurringProcessor triggered');
            // MODIFIED: 17-Jan-2026 - Guard prevents concurrent runs
            if (isProcessing || !settings) {
                console.log('⏸️ [FRONTEND] Skipping - isProcessing:', isProcessing, 'hasSettings:', !!settings);
                return;
            }

            const currentDate = new Date();
            const currentMonthStart = startOfMonth(currentDate);
            const currentMonthYear = format(currentMonthStart, 'yyyy-MM');
            console.log('📅 [FRONTEND] Current month-year:', currentMonthYear);

            // Check if lastProcessedRecurringDate exists
            const lastProcessed = settings.lastProcessedRecurringDate;
            console.log('📅 [FRONTEND] Last processed date:', lastProcessed || 'NONE');

            // Determine if processing is needed
            let shouldProcess = false;
            if (!lastProcessed) {
                console.log('🆕 [FRONTEND] No last processed date - checking for recurring transactions');
                // MODIFIED: 17-Jan-2026 - Check if user has any recurring transactions before processing
                try {
                    const recurringTransactions = await base44.entities.RecurringTransaction.list();
                    console.log('📋 [FRONTEND] Found', recurringTransactions?.length || 0, 'recurring transactions');
                    // Only process if user has recurring transactions
                    if (recurringTransactions && recurringTransactions.length > 0) {
                        shouldProcess = true;
                        console.log('✅ [FRONTEND] Will process - user has recurring transactions');
                    } else {
                        console.log('⏭️ [FRONTEND] Skipping - no recurring transactions');
                    }
                } catch (error) {
                    console.error('❌ [FRONTEND] Error fetching recurring transactions:', error);
                    return;
                }
            } else {
                const lastProcessedDate = parseISO(lastProcessed);
                const lastProcessedMonthYear = format(startOfMonth(lastProcessedDate), 'yyyy-MM');
                console.log('📅 [FRONTEND] Last processed month-year:', lastProcessedMonthYear);
                
                // Process if current month is different from last processed month
                if (currentMonthYear !== lastProcessedMonthYear) {
                    shouldProcess = true;
                    console.log('✅ [FRONTEND] Will process - different month');
                } else {
                    console.log('⏭️ [FRONTEND] Skipping - same month already processed');
                }
            }

            if (!shouldProcess) {
                console.log('⏭️ [FRONTEND] Final decision: SKIP processing');
                return;
            }
            console.log('✅ [FRONTEND] Final decision: PROCESS now');

            setIsProcessing(true);

            // Show loading toast
            const toastId = toast.loading('Synchronizing recurring transactions...');

            try {
                const userLocalDate = format(currentDate, 'yyyy-MM-dd');
                console.log('📤 [FRONTEND] Calling backend function with date:', userLocalDate);
                const response = await base44.functions.invoke('processRecurringTransactions', {
                    lastProcessedDate: lastProcessed || null,
                    userLocalDate
                });
                console.log('📥 [FRONTEND] Backend response:', JSON.stringify(response.data, null, 2));

                if (response.data.success) {
                    const { processed, skipped, errors } = response.data;
                    console.log('✅ [FRONTEND] Success - Processed:', processed, 'Skipped:', skipped, 'Errors:', errors?.length || 0);
                    
                    // Update toast to success
                    if (processed > 0) {
                        toast.success(`Sync complete: ${processed} transaction${processed !== 1 ? 's' : ''} added`, { id: toastId });
                    } else {
                        toast.success('Sync complete: No new transactions', { id: toastId });
                    }

                    // Log errors if any
                    if (errors && errors.length > 0) {
                        console.warn('Recurring transaction processing errors:', errors);
                    }
                } else {
                    toast.error('Failed to sync recurring transactions', { id: toastId });
                }
            } catch (error) {
                console.error('Recurring processor error:', error);
                toast.error('Error syncing recurring transactions', { id: toastId });
            } finally {
                setIsProcessing(false);
            }
        };

        processRecurring();
        // MODIFIED: 17-Jan-2026 - Removed isProcessing from dependency array to prevent re-trigger
    }, [settings]);

    return { isProcessing };
}