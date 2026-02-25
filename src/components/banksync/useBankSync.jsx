import { useState, useCallback } from "react";
import { base44 } from "@/api/base44Client";
import { addDays, format } from "date-fns";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "../ui/use-toast";
import { notifyBankSyncSuccess, notifyBankSyncWithReviews } from "../utils/notificationHelpers";

export function useBankSync(user) {
    const [syncing, setSyncing] = useState(null);
    const [syncStatus, setSyncStatus] = useState("");
    const [syncProgress, setSyncProgress] = useState(0);
    const { toast } = useToast();
    const queryClient = useQueryClient();

    const executeSync = useCallback(async (connection, dateFrom) => {
        setSyncing(connection.id);
        setSyncStatus("Initializing secure connection...");
        setSyncProgress(5);

        try {
           const now = new Date();
            const fromDate = new Date(dateFrom);

            // Calculate chunks to prevent timeouts (max 730 days per chunk)
            const chunks = [];
            let currentStart = fromDate;
            const MAX_CHUNK_DAYS = 730;

            while (currentStart < now) {
                let currentEnd = addDays(currentStart, MAX_CHUNK_DAYS);
                if (currentEnd > now) currentEnd = now;

                chunks.push({
                    from: format(currentStart, 'yyyy-MM-dd'),
                    to: format(currentEnd, 'yyyy-MM-dd')
                });

                currentStart = addDays(currentEnd, 1);
            }

            let totalImported = 0;
            let totalNeedsReview = 0;

            for (let i = 0; i < chunks.length; i++) {
                const chunk = chunks[i];
                const baseProgress = Math.floor((i / chunks.length) * 100);
                const nextBaseProgress = Math.floor(((i + 1) / chunks.length) * 100);

                setSyncProgress(baseProgress + 5);
                setSyncStatus(chunks.length > 1
                    ? `Retrieving transaction history (${Math.round((i / chunks.length) * 100)}%)...`
                    : "Syncing transactions..."
                );

                const response = await base44.functions.invoke('trueLayerSync', {
                    connectionId: connection.id,
                    dateFrom: chunk.from,
                    dateTo: chunk.to
                });

                setSyncProgress(nextBaseProgress);

                if (response.data?.importedCount) {
                    totalImported += response.data.importedCount;
                    totalNeedsReview += (response.data.needsReviewCount || 0);
                }
            }

            setSyncProgress(100);
            setSyncStatus("Finalizing...");

            if (totalImported > 0) {
                const dateStr = format(new Date(), 'MMM d, yyyy');
                if (totalNeedsReview > 0) {
                    await notifyBankSyncWithReviews(user.email, totalImported, totalNeedsReview, dateStr);
                } else {
                    await notifyBankSyncSuccess(user.email, totalImported, dateStr);
                }

                toast({
                    title: "Sync complete!",
                    description: `Successfully imported ${totalImported} new transactions.`,
                    variant: "success"
                });

                queryClient.invalidateQueries({ queryKey: ['transactions'] });
                queryClient.invalidateQueries({ queryKey: ['bankConnections'] });
            } else {
                toast({
                    title: "No new transactions",
                    description: "All transactions are up to date."
                });
                queryClient.invalidateQueries({ queryKey: ['bankConnections'] });
            }
        } catch (error) {
            toast({
                title: "Sync failed",
                description: error.message,
                variant: "destructive"
            });
            throw error; // Propagate so caller (Transactions page) can handle button state
        } finally {
            setSyncing(null);
            setSyncStatus("");
            setSyncProgress(0);
        }
    }, [toast, queryClient, user]);

    return { executeSync, syncing, syncStatus, syncProgress };
}
