
/**
 * @fileoverview Hook for managing bank synchronization via Base44/TrueLayer.
 * Handles multi-year history by chunking requests to prevent timeouts and 
 * ensures timezone-safe date boundaries for transaction retrieval.
 */

import { useState, useCallback } from "react";
import { base44 } from "@/api/base44Client";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { notifyBankSyncSuccess, notifyBankSyncWithReviews } from "../utils/notificationHelpers";
import {
  addDays,
  formatDateString,
  formatDate,
  normalizeToMidnight
} from "../utils/dateUtils";
import { QUERY_KEYS } from "@/components/hooks/queryKeys";

/**
 * @param {Object} user The current authenticated user object.
 */
export function useBankSync(user) {
  const [syncing, setSyncing] = useState(null);
  const [syncStatus, setSyncStatus] = useState("");
  const [syncProgress, setSyncProgress] = useState(0);
  const queryClient = useQueryClient();

  /**
   * Executes the bank sync process for a specific connection.
   * @param {Object} connection The bank connection object.
   * @param {string} dateFrom ISO date string to start sync from.
   */
  const executeSync = useCallback(async (connection, dateFrom) => {
    setSyncing(connection.id);
    setSyncStatus("Initializing secure connection...");
    setSyncProgress(5);

    try {
      const now = normalizeToMidnight(new Date());
      const fromDate = normalizeToMidnight(dateFrom);

      const chunks = [];
      let currentStart = fromDate;
      const MAX_CHUNK_DAYS = 730;

      while (currentStart < now) {
        let currentEnd = addDays(currentStart, MAX_CHUNK_DAYS);
        if (currentEnd > now) currentEnd = now;

        chunks.push({
          from: formatDateString(currentStart),
          to: formatDateString(currentEnd)
        });

        // Next chunk starts exactly where previous ended to ensure no gaps
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
        const dateStr = formatDate(new Date(), 'MMM d, yyyy');
        if (totalNeedsReview > 0) {
          await notifyBankSyncWithReviews(user.email, totalImported, totalNeedsReview, dateStr);
        } else {
          await notifyBankSyncSuccess(user.email, totalImported, dateStr);
        }

        toast.success("Sync complete!", {
          description: `Successfully imported ${totalImported} new transactions.`,
        });

        queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.TRANSACTIONS] });
        queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.NOTIFICATIONS] });
        queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.BANK_CONNECTIONS] });
      } else {
        toast("No new transactions", {
          description: "All transactions are up to date."
        });
        queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.BANK_CONNECTIONS] });
      }
    } catch (error) {
      toast.error("Sync failed", {
        description: error.message,
      });
      throw error; // Propagate so caller (Transactions page) can handle button state
    } finally {
      setSyncing(null);
      setSyncStatus("");
      setSyncProgress(0);
    }
  }, [queryClient, user]);

  return { executeSync, syncing, syncStatus, syncProgress };
}
