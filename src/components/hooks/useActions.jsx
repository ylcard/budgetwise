import { useState, useEffect, useMemo } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { base44 } from "@/api/base44Client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { showToast } from "@/components/ui/use-toast";
import { useCreateEntity } from "./useCreateEntity";
import { useUpdateEntity } from "./useUpdateEntity";
import { useDeleteEntity } from "./useDeleteEntity";
import { QUERY_KEYS } from "./queryKeys";
import { parseDate } from "../utils/dateUtils";
import { snapshotFutureBudgets, ensureSystemBudgetsExist } from "../utils/budgetInitialization";
import { getMonthBoundaries } from "../utils/dateUtils";
import { getHistoricalAverageIncome } from "../utils/financialCalculations";
import { createPageUrl } from "@/utils";
import { useSettings } from "../utils/SettingsContext";
import { fetchWithRetry } from "../utils/generalUtils";
import { calculateNextOccurrence } from "../utils/recurringUtils";
import { useStateUI } from "./useStateUI";

// Hook for transaction actions (CRUD operations - Transactions page)
export const useTransactionActions = (options = {}) => {
  const queryClient = useQueryClient();
  const { settings, user } = useSettings();
  const ui = useStateUI();

  // Helper to sync budgets when income changes
  const syncBudgetsAfterIncomeChange = async (dateString) => {
    if (!user?.email) return;
    const date = parseDate(dateString);
    const { monthStart, monthEnd } = getMonthBoundaries(date.getMonth(), date.getFullYear());

    const cachedTransactions = queryClient.getQueryData([QUERY_KEYS.TRANSACTIONS]) || [];
    let allTransactions = cachedTransactions.filter(t =>
      t.type === 'income' && t.date >= monthStart && t.date <= monthEnd
    );

    if (allTransactions.length === 0) {
      allTransactions = await fetchWithRetry(() => base44.entities.Transaction.filter({
        created_by: user.email,
        type: 'income',
        date: { $gte: monthStart, $lte: monthEnd }
      }));
    }

    const monthlyIncome = allTransactions.reduce((sum, t) => sum + (t.amount || 0), 0);

    const budgetGoals = await fetchWithRetry(() => base44.entities.BudgetGoal.filter({ user_email: user.email }));
    const histAvg = getHistoricalAverageIncome(allTransactions, date.getMonth(), date.getFullYear());

    // 2. Force the budget engine to update allocations
    await ensureSystemBudgetsExist(user.email, monthStart, monthEnd, budgetGoals, settings, monthlyIncome, {
      allowUpdates: true,
      historicalAverage: histAvg
    });

    queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.SYSTEM_BUDGETS] });
  };

  // CREATE: Use generic hook with cash wallet preprocessing + optimistic updates
  const createMutation = useCreateEntity({
    entityName: 'Transaction',
    queryKeysToInvalidate: [QUERY_KEYS.SYSTEM_BUDGETS], // Removed TRANSACTIONS to prevent background refetch
    // ADDED 03-Feb-2026: Optimistic create - immediately add to cache
    onMutate: async (newTransaction) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: [QUERY_KEYS.TRANSACTIONS] });

      // Snapshot previous value
      const previousQueries = queryClient.getQueriesData({ queryKey: [QUERY_KEYS.TRANSACTIONS] });

      // Optimistically add new transaction with temporary ID
      queryClient.setQueriesData({ queryKey: [QUERY_KEYS.TRANSACTIONS] }, (old = []) => [
        { ...newTransaction, id: `temp-${Date.now()}`, _optimistic: true },
        ...old
      ]);

      return { previousQueries };
    },
    onError: (_, __, context) => {
      // Rollback on error
      context.previousQueries.forEach(([queryKey, oldData]) => {
        queryClient.setQueryData(queryKey, oldData);
      });
    },
    onAfterSuccess: async (newDoc) => {
      // Swap temporary optimistic transaction with the real database record
      queryClient.setQueriesData({ queryKey: [QUERY_KEYS.TRANSACTIONS] }, (old = []) => {
        if (!old) return [newDoc];
        return old.map(t => (t._optimistic && t.id.startsWith('temp-')) ? newDoc : t);
      });

      if (newDoc?.type === 'income') await syncBudgetsAfterIncomeChange(newDoc.date);
      ui.closeForm();
      if (options.onSuccess) options.onSuccess();
    }
  });

  // UPDATE: Use generic hook with complex cash transaction handling + optimistic updates
  const updateMutation = useUpdateEntity({
    entityName: 'Transaction',
    queryKeysToInvalidate: [], // Removed TRANSACTIONS to prevent background refetch
    // ADDED 03-Feb-2026: Optimistic update - immediately update cache
    onMutate: async ({ id, data }) => {
      await queryClient.cancelQueries({ queryKey: [QUERY_KEYS.TRANSACTIONS] });

      const previousQueries = queryClient.getQueriesData({ queryKey: [QUERY_KEYS.TRANSACTIONS] });

      // Optimistically update transaction
      queryClient.setQueriesData({ queryKey: [QUERY_KEYS.TRANSACTIONS] }, (old = []) =>
        old.map(t => t.id === id ? { ...t, ...data, _optimistic: true } : t)
      );

      return { previousQueries };
    },
    onError: (_, __, context) => {
      context.previousQueries.forEach(([queryKey, oldData]) => {
        queryClient.setQueryData(queryKey, oldData);
      });
    },
    onAfterSuccess: async (updatedDoc) => {
      // Replace with real data from server
      queryClient.setQueriesData({ queryKey: [QUERY_KEYS.TRANSACTIONS] }, (old = []) => {
        if (!old) return [];
        return old.map(t => t.id === updatedDoc.id ? updatedDoc : t);
      });

      if (updatedDoc?.type === 'income') await syncBudgetsAfterIncomeChange(updatedDoc.date);
      ui.closeForm();
    }
  });

  // DELETE: Use generic hook with cash wallet reversal + optimistic updates
  const { handleDelete: handleDeleteTransaction } = useDeleteEntity({
    entityName: 'Transaction',
    queryKeysToInvalidate: [], // Removed TRANSACTIONS to prevent background refetch
    confirmTitle: "Delete Transaction",
    confirmMessage: "Are you sure you want to delete this transaction? This action cannot be undone.",
    // ADDED 03-Feb-2026: Optimistic delete - immediately remove from cache
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: [QUERY_KEYS.TRANSACTIONS] });

      const previousQueries = queryClient.getQueriesData({ queryKey: [QUERY_KEYS.TRANSACTIONS] });

      // Optimistically remove transaction
      queryClient.setQueriesData({ queryKey: [QUERY_KEYS.TRANSACTIONS] }, (old = []) =>
        old.filter(t => t.id !== id)
      );

      return { previousQueries };
    },
    onError: (_, __, context) => {
      context.previousQueries.forEach(([queryKey, oldData]) => {
        queryClient.setQueryData(queryKey, oldData);
      });
    },
    onAfterSuccess: async (deletedDoc) => {
      if (deletedDoc?.type === 'income') await syncBudgetsAfterIncomeChange(deletedDoc.date);
    }
  });

  // NEW: Handle confirming a fuzzy match between a raw TX and a Recurring Template
  const handleConfirmMatch = async (transaction, template) => {
    try {
      // 1. Link the transaction to the template
      await updateMutation.mutateAsync({
        id: transaction.id,
        data: {
          recurringTransactionId: template.id,
          isPaid: true,
          category_id: transaction.category_id || template.category_id
        },
        oldEntity: transaction
      });

      // 2. Advance the recurring template to its next occurrence
      const nextDate = calculateNextOccurrence(template, transaction.date);
      await fetchWithRetry(() => base44.entities.RecurringTransaction.update(template.id, {
        nextOccurrence: nextDate,
        lastProcessedDate: transaction.date
      }));

      queryClient.invalidateQueries({ queryKey: ['RECURRING_TRANSACTIONS'] });
      showToast({ title: "Match Confirmed", description: `Linked to ${template.title}` });
    } catch (error) {
      console.error("Match confirmation failed:", error);
      showToast({ title: "Error", description: "Failed to confirm match.", variant: "destructive" });
    }
  };

  const handleSubmit = (data, editingTransaction) => {
    const activeItem = editingTransaction || ui.editingItem;
    activeItem
      ? updateMutation.mutate({ id: activeItem.id, data, oldEntity: activeItem })
      : createMutation.mutate(data);
  };

  return {
    ...ui,
    handleSubmit,
    handleEdit: ui.openForm,
    handleConfirmMatch,
    handleDelete: handleDeleteTransaction,
    isSubmitting: createMutation.isPending || updateMutation.isPending,
  };
};

// Hook for category actions (CRUD operations)
export const useCategoryActions = () => {
  const ui = useStateUI();

  const createMutation = useCreateEntity({
    entityName: 'Category',
    queryKeysToInvalidate: [QUERY_KEYS.CATEGORIES],
    onAfterSuccess: ui.closeForm
  });

  const updateMutation = useUpdateEntity({
    entityName: 'Category',
    queryKeysToInvalidate: [QUERY_KEYS.CATEGORIES],
    onAfterSuccess: ui.closeForm
  });

  const updateSystemMutation = useUpdateEntity({
    entityName: 'SystemCategory',
    queryKeysToInvalidate: [QUERY_KEYS.SYSTEM_CATEGORIES, QUERY_KEYS.CATEGORIES], // Invalidate both to be safe
    onAfterSuccess: ui.closeForm
  });

  // DELETE: Use generic hook (no dependencies to handle)
  // We map deleteDirect to handleBulkDelete to bypass the single-item dialog
  const { handleDelete: deleteCustomCategory, deleteDirect: bulkDeleteCustomCategories } = useDeleteEntity({
    entityName: 'Category',
    queryKeysToInvalidate: [QUERY_KEYS.CATEGORIES],
    confirmTitle: "Delete Category",
    confirmMessage: "Are you sure you want to delete this category? This will not delete associated transactions.",
  });

  // Delete hook for System Categories (Admin only)
  const { handleDelete: deleteSystemCategory } = useDeleteEntity({
    entityName: 'SystemCategory',
    queryKeysToInvalidate: [QUERY_KEYS.SYSTEM_CATEGORIES, QUERY_KEYS.CATEGORIES],
    confirmTitle: "Delete System Category",
    confirmMessage: "Warning: This is a system default. Deleting it will affect all users relying on it.",
  });

  const handleSubmit = (data, editingCategory) => {
    const activeItem = editingCategory || ui.editingItem;
    if (activeItem) {
      activeItem.isSystemCategory
        ? updateSystemMutation.mutate({ id: activeItem.id, data })
        : updateMutation.mutate({ id: activeItem.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const handleDeleteWrapper = (category) => {
    if (category.isSystemCategory) {
      deleteSystemCategory(category.id);
    } else {
      deleteCustomCategory(category.id);
    }
  };

  return {
    ...ui,
    handleSubmit,
    handleEdit: ui.openForm,
    handleDelete: handleDeleteWrapper,
    handleBulkDelete: bulkDeleteCustomCategories,
    isSubmitting: createMutation.isPending || updateMutation.isPending || updateSystemMutation.isPending,
  };
};

// Hook for goal actions (mutations)
export const useGoalActions = (user, goals) => {
  const queryClient = useQueryClient();
  const { settings } = useSettings();

  const updateGoalMutation = useMutation({
    mutationFn: ({ id, data }) => fetchWithRetry(() => base44.entities.BudgetGoal.update(id, data)),
    onSuccess: async (_, variables) => {
      const allGoals = await fetchWithRetry(() => base44.entities.BudgetGoal.filter({ created_by: user?.email }));
      await snapshotFutureBudgets(
        { ...variables.data, priority: variables.priority },
        settings,
        user?.email,
        allGoals
      );
      await queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.GOALS] });
      await queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.SYSTEM_BUDGETS] });
    },
    onError: (error) => {
      console.error('Error updating goal:', error);
    },
  });

  const createGoalMutation = useMutation({
    mutationFn: (data) => fetchWithRetry(() => base44.entities.BudgetGoal.create(data)),
    onSuccess: async (_, variables) => {
      const allGoals = await fetchWithRetry(() => base44.entities.BudgetGoal.filter({ created_by: user?.email }));
      await snapshotFutureBudgets(variables, settings, user?.email, allGoals);
      await queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.GOALS] });
      await queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.SYSTEM_BUDGETS] });
    },
    onError: (error) => {
      console.error('Error creating goal:', error);
    },
  });

  const handleGoalUpdate = async (priority, percentage, extraData = {}) => {
    const existingGoal = goals.find(g => g.priority === priority);

    try {
      if (existingGoal) {
        return updateGoalMutation.mutateAsync({
          id: existingGoal.id,
          priority,
          data: {
            target_percentage: percentage,
            ...extraData
          }
        });
      } else if (user) {
        return createGoalMutation.mutateAsync({
          priority,
          target_percentage: percentage,
          created_by: user.email,
          ...extraData
        });
      }

    } catch (error) {
      console.error('Error in handleGoalUpdate:', error);
      // Re-throw the error so any Promise.allSettled wrapper knows it failed
      throw error;
    }

    // If no action was taken (e.g., no existing goal and no user), return gracefully
    return Promise.resolve();
  };

  return {
    handleGoalUpdate,
    isSaving: updateGoalMutation.isPending || createGoalMutation.isPending,
  };
};

// Hook for custom budget actions (CRUD operations)
export const useCustomBudgetActions = (config = {}) => {
  const { user } = useSettings();
  const { ...options } = config;
  const ui = useStateUI();

  // CREATE: Use generic hook with intelligent status assignment and cash allocation
  const createMutation = useCreateEntity({
    entityName: 'CustomBudget',
    queryKeysToInvalidate: [QUERY_KEYS.CUSTOM_BUDGETS],
    onBeforeCreate: async (data) => {
      // CRITICAL: Determine status based on start date
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const startDate = parseDate(data.startDate);
      const status = startDate > today ? 'planned' : 'active';

      return {
        ...data,
        status,
        user_email: user.email,
        created_by: user.email,
        isSystemBudget: false
      };
    },
    onAfterSuccess: ui.closeForm
  });

  // UPDATE: Use generic hook with cash allocation change handling
  const updateMutation = useUpdateEntity({
    entityName: 'CustomBudget',
    queryKeysToInvalidate: [QUERY_KEYS.CUSTOM_BUDGETS, ['budget'], ['allBudgets']],
    onBeforeUpdate: async ({ id, data }) => {
      const existingBudget = await fetchWithRetry(() => base44.entities.CustomBudget.get(id));
      if (!existingBudget) {
        throw new Error('Budget not found');
      }
      return data;
    },
    onAfterSuccess: ui.closeForm
  });

  const { handleDelete: handleDeleteBudget, deleteDirect, isDeleting } = useDeleteEntity({
    entityName: 'CustomBudget',
    queryKeysToInvalidate: [QUERY_KEYS.CUSTOM_BUDGETS, QUERY_KEYS.TRANSACTIONS],
    confirmTitle: "Delete Budget",
    confirmMessage: "Are you sure you want to delete this budget? This will also delete all associated transactions and return cash allocations to your wallet.",
    onBeforeDelete: async (budgetId) => {
      const budget = await fetchWithRetry(() => base44.entities.CustomBudget.get(budgetId));
      if (!budget) {
        throw new Error('Budget not found for deletion');
      }
      await fetchWithRetry(() => base44.entities.Transaction.deleteMany({ budgetId: budgetId }));
    },
    onAfterSuccess: () => {
      // Redirect to Budgets page after successful deletion
      window.location.href = createPageUrl("Budgets");
    }
  });

  // STATUS CHANGE: Use generic update hook with special handling for completion/reactivation
  const updateStatusMutation = useUpdateEntity({
    entityName: 'CustomBudget',
    queryKeysToInvalidate: [QUERY_KEYS.CUSTOM_BUDGETS],
    onBeforeUpdate: async ({ id, data }) => {
      // CRITICAL: Use get() instead of list().find()
      const budget = await fetchWithRetry(() => base44.entities.CustomBudget.get(id));

      if (!budget) {
        throw new Error('Budget not found');
      }

      if (data.status === 'completed') {
        // Need to fetch transactions for completion sum since it's a specific logic requirement
        const budgetTransactions = await fetchWithRetry(() => base44.entities.Transaction.filter({ budgetId: id, isPaid: true }));
        const actualSpent = budgetTransactions.reduce((sum, t) => sum + t.amount, 0);

        return {
          status: 'completed',
          allocatedAmount: actualSpent,
          originalAllocatedAmount: budget.originalAllocatedAmount || budget.allocatedAmount,
        };
      } else if (data.status === 'active') {
        // When reactivating: restore original allocated amount, but do NOT restore cash allocations
        return {
          status: 'active',
          allocatedAmount: budget.originalAllocatedAmount || budget.allocatedAmount,
          originalAllocatedAmount: null,
        };
      } else {
        return data;
      }
    }
  });

  const handleSubmit = (data, budgetToEdit = null) => {
    const budgetForUpdate = budgetToEdit || ui.editingItem;
    if (budgetForUpdate) {
      updateMutation.mutate({ id: budgetForUpdate.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const handleStatusChange = (id, newStatus) => {
    updateStatusMutation.mutate({ id, data: { status: newStatus } });
  };

  return {
    ...ui,
    handleSubmit,
    handleEdit: ui.openForm,
    handleDelete: handleDeleteBudget,
    handleDeleteDirect: deleteDirect,
    handleStatusChange,
    isSubmitting: createMutation.isPending || updateMutation.isPending || isDeleting,
  };
};

// Hook for settings form state and submission
// Define schema based on your settings structure
const settingsSchema = z.object({
  currency: z.string().min(1, "Currency is required"),
  goalMode: z.boolean().default(true),
  monthlyIncome: z.number().nonnegative().optional(),
  // Add other specific settings fields here
}).passthrough(); // passthrough allows fields not explicitly defined

export const useSettingsForm = (initialSettings, updateSettings) => {
  const [saveSuccess, setSaveSuccess] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    control,
    formState: { isSubmitting, isDirty, errors },
    setValue,
    watch
  } = useForm({
    resolver: zodResolver(settingsSchema),
    defaultValues: initialSettings,
  });

  useEffect(() => {
    if (initialSettings && !isDirty) {
      reset(initialSettings);
    }
  }, [initialSettings, reset, isDirty]);

  const onSubmit = async (data) => {
    setSaveSuccess(false);
    try {
      await updateSettings(data);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
      showToast({
        title: "Success",
        description: "Settings saved successfully",
      });
    } catch (error) {
      console.error('Error saving settings:', error);
      showToast({
        title: "Error",
        description: error?.message || "Failed to save settings. Please try again.",
        variant: "destructive",
      });
    }
  };

  return {
    register,
    control,
    setValue,
    watch,
    handleSubmit: handleSubmit(onSubmit),
    isSaving: isSubmitting,
    saveSuccess,
    isDirty,
    errors,
    reset,
  };
};