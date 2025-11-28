import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { showToast } from "@/components/ui/use-toast";
import { useCreateEntity } from "./useCreateEntity";
import { useUpdateEntity } from "./useUpdateEntity";
import { useDeleteEntity } from "./useDeleteEntity";
import { QUERY_KEYS } from "./queryKeys";
import { parseDate } from "../utils/dateUtils";
import { createPageUrl } from "@/utils";
import { useSettings } from "../utils/SettingsContext";

// Hook for transaction actions (CRUD operations - Transactions page)
export const useTransactionActions = (config = {}) => {
    const { setShowForm, setEditingTransaction, ...options } = config;

    // CREATE: Use generic hook with cash wallet preprocessing
    const createMutation = useCreateEntity({
        entityName: 'Transaction',
        queryKeysToInvalidate: [QUERY_KEYS.TRANSACTIONS, QUERY_KEYS.SYSTEM_BUDGETS],
        onAfterSuccess: () => {
            if (setShowForm) setShowForm(false);
            if (setEditingTransaction) setEditingTransaction(null);
            if (options.onSuccess) options.onSuccess();
        }
    });

    // UPDATE: Use generic hook with complex cash transaction handling
    const updateMutation = useUpdateEntity({
        entityName: 'Transaction',
        queryKeysToInvalidate: [QUERY_KEYS.TRANSACTIONS],
        onAfterSuccess: () => {
            if (setShowForm) setShowForm(false);
            if (setEditingTransaction) setEditingTransaction(null);
        }
    });

    // DELETE: Use generic hook with cash wallet reversal
    const { handleDelete: handleDeleteTransaction } = useDeleteEntity({
        entityName: 'Transaction',
        queryKeysToInvalidate: [QUERY_KEYS.TRANSACTIONS],
        confirmTitle: "Delete Transaction",
        confirmMessage: "Are you sure you want to delete this transaction? This action cannot be undone.",
    });

    const handleSubmit = (data, editingTransaction) => {
        if (editingTransaction) {
            updateMutation.mutate({
                id: editingTransaction.id,
                data,
                oldEntity: editingTransaction
            });
        } else {
            createMutation.mutate(data);
        }
    };

    const handleEdit = (transaction) => {
        if (setEditingTransaction) setEditingTransaction(transaction);
        if (setShowForm) setShowForm(true);
    };

    return {
        handleSubmit,
        handleEdit,
        handleDelete: handleDeleteTransaction,
        isSubmitting: createMutation.isPending || updateMutation.isPending,
    };
};

// Uses generic useCreateEntity, useUpdateEntity, and useDeleteEntity hooks
// Hook for category actions (CRUD operations)
export const useCategoryActions = (setShowForm, setEditingCategory) => {
    // CREATE: Use generic hook (no preprocessing needed)
    const createMutation = useCreateEntity({
        entityName: 'Category',
        queryKeysToInvalidate: [QUERY_KEYS.CATEGORIES],
        onAfterSuccess: () => {
            if (setShowForm) setShowForm(false);
            if (setEditingCategory) setEditingCategory(null);
        }
    });

    // UPDATE: Use generic hook (no preprocessing needed)
    const updateMutation = useUpdateEntity({
        entityName: 'Category',
        queryKeysToInvalidate: [QUERY_KEYS.CATEGORIES],
        onAfterSuccess: () => {
            if (setShowForm) setShowForm(false);
            if (setEditingCategory) setEditingCategory(null);
        }
    });

    // DELETE: Use generic hook (no dependencies to handle)
    const { handleDelete: handleDeleteCategory } = useDeleteEntity({
        entityName: 'Category',
        queryKeysToInvalidate: [QUERY_KEYS.CATEGORIES],
        confirmTitle: "Delete Category",
        confirmMessage: "Are you sure you want to delete this category? This will not delete associated transactions.",
    });

    const handleSubmit = (data, editingCategory) => {
        if (editingCategory) {
            updateMutation.mutate({ id: editingCategory.id, data });
        } else {
            createMutation.mutate(data);
        }
    };

    const handleEdit = (category) => {
        if (setEditingCategory) setEditingCategory(category);
        if (setShowForm) setShowForm(true);
    };

    return {
        handleSubmit,
        handleEdit,
        handleDelete: handleDeleteCategory,
        isSubmitting: createMutation.isPending || updateMutation.isPending,
    };
};

// Hook for goal actions (mutations)
export const useGoalActions = (user, goals) => {
    const queryClient = useQueryClient();

    const updateGoalMutation = useMutation({
        mutationFn: ({ id, data }) => base44.entities.BudgetGoal.update(id, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.GOALS] });
        },
        onError: (error) => {
            console.error('Error updating goal:', error);
        },
    });

    const createGoalMutation = useMutation({
        mutationFn: (data) => base44.entities.BudgetGoal.create(data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.GOALS] });
        },
        onError: (error) => {
            console.error('Error creating goal:', error);
        },
    });

    const handleGoalUpdate = async (priority, percentage, extraData = {}) => {
        const existingGoal = goals.find(g => g.priority === priority);

        try {
            if (existingGoal) {
                // Return the promise directly, allowing the caller (GoalSettings) to handle resolution status
                return updateGoalMutation.mutateAsync({
                    id: existingGoal.id,
                    data: {
                        target_percentage: percentage,
                        ...extraData
                    }
                });
            } else if (user) {
                // Return the promise directly
                return createGoalMutation.mutateAsync({
                    priority,
                    target_percentage: percentage,
                    user_email: user.email,
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
// export const useCustomBudgetActions = (user, transactions, options = {}) => {
export const useCustomBudgetActions = (config = {}) => {
    const { user } = useSettings();
    const { transactions, ...options } = config;
    const [showForm, setShowForm] = useState(false);
    const [editingBudget, setEditingBudget] = useState(null);

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
                isSystemBudget: false
            };
        },
        onAfterSuccess: () => {
            setShowForm(false);
            setEditingBudget(null);
            if (options.onSuccess) options.onSuccess();
        }
    });

    // UPDATE: Use generic hook with cash allocation change handling
    const updateMutation = useUpdateEntity({
        entityName: 'CustomBudget',
        queryKeysToInvalidate: [QUERY_KEYS.CUSTOM_BUDGETS, ['budget'], ['allBudgets']],
        onBeforeUpdate: async ({ id, data }) => {
            // CRITICAL: Use get() instead of list().find() for efficiency
            const existingBudget = await base44.entities.CustomBudget.get(id);

            if (!existingBudget) {
                throw new Error('Budget not found');
            }

            return data;
        },
        onAfterSuccess: () => {
            setShowForm(false);
            setEditingBudget(null);
        }
    });

    const { handleDelete: handleDeleteBudget, deleteDirect, isDeleting } = useDeleteEntity({
        entityName: 'CustomBudget',
        queryKeysToInvalidate: [QUERY_KEYS.CUSTOM_BUDGETS, QUERY_KEYS.TRANSACTIONS],
        confirmTitle: "Delete Budget",
        confirmMessage: "Are you sure you want to delete this budget? This will also delete all associated transactions and return cash allocations to your wallet.",
        onBeforeDelete: async (budgetId) => {
            // CRITICAL5: Use efficient get() instead of list().find()
            const budget = await base44.entities.CustomBudget.get(budgetId);

            if (!budget) {
                throw new Error('Budget not found for deletion');
            }

            // Delete all associated transactions
            const budgetTransactions = transactions.filter(t => t.customBudgetId === budgetId);

            for (const transaction of budgetTransactions) {
                await base44.entities.Transaction.delete(transaction.id);
            }
        },
        onAfterSuccess: () => {
            // Redirect to Budgets page after successful deletion
            // Potentially refactor this to intelligently go back to whatever was the location before entering the budget
            window.location.href = createPageUrl("Budgets");
        }
    });

    // STATUS CHANGE: Use generic update hook with special handling for completion/reactivation
    const updateStatusMutation = useUpdateEntity({
        entityName: 'CustomBudget',
        queryKeysToInvalidate: [QUERY_KEYS.CUSTOM_BUDGETS],
        onBeforeUpdate: async ({ id, data }) => {
            // CRITICAL: Use get() instead of list().find()
            const budget = await base44.entities.CustomBudget.get(id);

            if (!budget) {
                throw new Error('Budget not found');
            }

            if (data.status === 'completed') {
                // Calculate actual spent amount
                const budgetTransactions = transactions.filter(t => t.customBudgetId === id && t.isPaid);
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
        const budgetForUpdate = budgetToEdit || editingBudget;

        if (budgetForUpdate) {
            updateMutation.mutate({ id: budgetForUpdate.id, data });
        } else {
            createMutation.mutate(data);
        }
    };

    const handleEdit = (budget) => {
        setEditingBudget(budget);
        setShowForm(true);
    };

    const handleStatusChange = (id, newStatus) => {
        updateStatusMutation.mutate({ id, data: { status: newStatus } });
    };

    return {
        showForm,
        setShowForm,
        editingBudget,
        setEditingBudget,
        handleSubmit,
        handleEdit,
        handleDelete: handleDeleteBudget,
        handleDeleteDirect: deleteDirect,
        handleStatusChange,
        isSubmitting: createMutation.isPending || updateMutation.isPending || isDeleting,
    };
};

// Hook for settings form state and submission
export const useSettingsForm = (settings, updateSettings) => {
    const [formData, setFormData] = useState(settings);
    const [isSaving, setIsSaving] = useState(false);
    const [saveSuccess, setSaveSuccess] = useState(false);

    useEffect(() => {
        setFormData(settings);
    }, [settings]);

    const handleFormChange = (field, value) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    const resetForm = (newValues) => {
        setFormData(newValues);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsSaving(true);
        setSaveSuccess(false);

        try {
            await updateSettings(formData);
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
        } finally {
            setIsSaving(false);
        }
    };

    return {
        formData,
        handleFormChange,
        resetForm,
        handleSubmit,
        isSaving,
        saveSuccess,
    };
};
