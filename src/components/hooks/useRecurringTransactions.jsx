import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useConfirm } from "../ui/ConfirmDialogProvider";
import { calculateNextOccurrence } from "../utils/recurringUtils";
import { fetchWithRetry } from "../utils/generalUtils";

// Query key for recurring transactions
export const RECURRING_QUERY_KEY = 'RECURRING_TRANSACTIONS';

// Hook to fetch recurring transactions
export const useRecurringTransactions = (user) => {
  const { data: recurringTransactions = [], isLoading, error } = useQuery({
    queryKey: [RECURRING_QUERY_KEY],
    queryFn: async () => {
      if (!user) return [];
      const all = await fetchWithRetry(() => base44.entities.RecurringTransaction.list('-created_date'));
      return all.filter(rt => rt.user_email === user.email);
    },
    // initialData: [],
    enabled: !!user,
    staleTime: 1000 * 60 * 5,
  });

  return { recurringTransactions, isLoading, error };
};

// Hook for CRUD actions on recurring transactions
export const useRecurringTransactionActions = (user) => {
  const queryClient = useQueryClient();
  const { confirmAction } = useConfirm();

  // CREATE
  const createMutation = useMutation({
    mutationFn: async (data) => {
      // Calculate initial nextOccurrence
      const nextOccurrence = calculateNextOccurrence(data);
      return fetchWithRetry(() => base44.entities.RecurringTransaction.create({
        ...data,
        nextOccurrence,
        user_email: user.email,
      }));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [RECURRING_QUERY_KEY] });
      toast.success("Recurring transaction created.");
    },
    onError: (error) => {
      console.error("Create recurring error:", error);
      toast.error("Failed to create recurring transaction.");
    },
  });

  // UPDATE
  const updateMutation = useMutation({
    mutationFn: async ({ id, data }) => {
      // Safe recalculation: if the user only updated the title/amount, the date payload might be missing.
      let nextOccurrence;
      try {
        nextOccurrence = calculateNextOccurrence(data);
      } catch (error) {
        // Fallback to the existing database value if recalculation fails
        const existing = await fetchWithRetry(() => base44.entities.RecurringTransaction.get(id));
        nextOccurrence = existing.nextOccurrence;
      }

      return fetchWithRetry(() => base44.entities.RecurringTransaction.update(id, {
        ...data,
        nextOccurrence,
      }));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [RECURRING_QUERY_KEY] });
      toast.success("Recurring transaction updated.");
    },
    onError: (error) => {
      console.error("Update recurring error:", error);
      toast.error("Failed to update recurring transaction.");
    },
  });

  // DELETE
  const deleteMutation = useMutation({
    mutationFn: (id) => fetchWithRetry(() => base44.entities.RecurringTransaction.delete(id)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [RECURRING_QUERY_KEY] });
      toast.success("Recurring transaction deleted.");
    },
    onError: (error) => {
      console.error("Delete recurring error:", error);
      toast.error("Failed to delete recurring transaction.");
    },
  });

  // TOGGLE ACTIVE
  const toggleActiveMutation = useMutation({
    mutationFn: async ({ id, isActive }) => {
      const updates = { isActive: !isActive };
      // If reactivating, recalculate nextOccurrence
      if (!isActive) {
        const existing = await fetchWithRetry(() => base44.entities.RecurringTransaction.get(id));
        updates.nextOccurrence = calculateNextOccurrence(existing);
      }
      return fetchWithRetry(() => base44.entities.RecurringTransaction.update(id, updates));
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: [RECURRING_QUERY_KEY] });
      toast.success(variables.isActive ? "Recurring transaction paused." : "Recurring transaction resumed.");
    },
    onError: (error) => {
      console.error("Toggle recurring error:", error);
      toast.error("Failed to update status.");
    },
  });

  const handleCreate = (data) => {
    createMutation.mutate(data);
  };

  const handleUpdate = (id, data) => {
    updateMutation.mutate({ id, data });
  };

  const handleDelete = (recurring) => {
    confirmAction(
      "Delete Recurring Transaction",
      `Are you sure you want to delete "${recurring.title}"? This will not delete previously generated transactions.`,
      () => deleteMutation.mutate(recurring.id),
      { destructive: true }
    );
  };

  const handleToggleActive = (recurring) => {
    toggleActiveMutation.mutate({ id: recurring.id, isActive: recurring.isActive });
  };

  return {
    handleCreate,
    handleUpdate,
    handleDelete,
    handleToggleActive,
    isSubmitting: createMutation.isPending || updateMutation.isPending,
    isDeleting: deleteMutation.isPending,
    isToggling: toggleActiveMutation.isPending,
  };
};