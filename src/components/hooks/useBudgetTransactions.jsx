import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { QUERY_KEYS } from "./queryKeys";

/**
 * Hook to fetch ALL transactions for a specific custom budget,
 * regardless of the date range or current period.
 */
export const useBudgetTransactions = (budgetId) => {
  return useQuery({
    queryKey: [QUERY_KEYS.TRANSACTIONS, "budget", budgetId],
    queryFn: async () => {
      if (!budgetId) return [];
      return await base44.entities.Transaction.filter(
        { budgetId: budgetId },
        "-date"
      );
    },
    enabled: !!budgetId,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
};
