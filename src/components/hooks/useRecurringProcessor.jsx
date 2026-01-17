import { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useSettings } from '../utils/SettingsContext';
import { format, parseISO, startOfMonth } from 'date-fns';
import { toast } from 'sonner';

/**
 * CREATED 17-Jan-2026: Frontend hook to trigger processRecurringTransactions backend function.
 * Checks if the current month is different from lastProcessedRecurringDate.
 * If so, triggers the backend function and displays user feedback.
 */

export function useRecurringProcessor() {
    const { settings } = useSettings();
    const [isProcessing, setIsProcessing] = useState(false);

    useEffect(() => {
        const processRecurring = async () => {
            if (isProcessing || !settings) return;

            const currentDate = new Date();
            const currentMonthStart = startOfMonth(currentDate);
            const currentMonthYear = format(currentMonthStart, 'yyyy-MM');

            // Check if lastProcessedRecurringDate exists
            const lastProcessed = settings.lastProcessedRecurringDate;

            // Determine if processing is needed
            let shouldProcess = false;
            if (!lastProcessed) {
                // First time - process
                shouldProcess = true;
            } else {
                const lastProcessedDate = parseISO(lastProcessed);
                const lastProcessedMonthYear = format(startOfMonth(lastProcessedDate), 'yyyy-MM');
                
                // Process if current month is different from last processed month
                if (currentMonthYear !== lastProcessedMonthYear) {
                    shouldProcess = true;
                }
            }

            if (!shouldProcess) return;

            setIsProcessing(true);

            // Show loading toast
            const toastId = toast.loading('Synchronizing recurring transactions...');

            try {
                const userLocalDate = format(currentDate, 'yyyy-MM-dd');
                const response = await base44.functions.invoke('processRecurringTransactions', {
                    lastProcessedDate: lastProcessed || null,
                    userLocalDate
                });

                if (response.data.success) {
                    const { processed, skipped, errors } = response.data;
                    
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
    }, [settings, isProcessing]);

    return { isProcessing };
}