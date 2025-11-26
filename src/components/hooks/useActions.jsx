import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { showToast } from "@/components/ui/use-toast";
import { useCreateEntity } from "./useCreateEntity";
import { useUpdateEntity } from "./useUpdateEntity";
import { useDeleteEntity } from "./useDeleteEntity";
import { QUERY_KEYS } from "./queryKeys";
// import {
//     allocateCashFromWallet,
//     returnCashToWallet,
//     calculateAllocationChanges,
//     calculateRemainingCashAllocations,
//     updateCurrencyBalance,
// } from "../utils/cashAllocationUtils";
import { parseDate } from "../utils/dateUtils";
import { createPageUrl } from "@/utils";

// Hook for transaction actions (CRUD operations - Transactions page)
// export const useTransactionActions = (setShowForm, setEditingTransaction, cashWallet, options = {}) => {
export const useTransactionActions = (config = {}) => {
    const { setShowForm, setEditingTransaction, ...options } = config;

    // CREATE: Use generic hook with cash wallet preprocessing
    const createMutation = useCreateEntity({
        entityName: 'Transaction',
        // queryKeysToInvalidate: [QUERY_KEYS.TRANSACTIONS, QUERY_KEYS.CASH_WALLET, QUERY_KEYS.SYSTEM_BUDGETS],
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
        /* queryKeysToInvalidate: [QUERY_KEYS.TRANSACTIONS, QUERY_KEYS.CASH_WALLET],
        onBeforeUpdate: async ({ id, data, oldTransaction }) => {
            // Handle complex cash transaction status changes
            if (cashWallet && oldTransaction) {
                const balances = cashWallet.balances || [];
                let updatedBalances = [...balances];
                let needsWalletUpdate = false;

                const wasDigital = !oldTransaction.isCashTransaction;
                const isNowDigital = !data.isCashTransaction;
                const wasCash = oldTransaction.isCashTransaction && oldTransaction.cashTransactionType === 'expense_from_wallet';
                const isNowCash = data.isCashTransaction && data.cashTransactionType === 'expense_from_wallet';

                // Scenario 1: Digital to Cash
                if (wasDigital && isNowCash) {
                    updatedBalances = updateCurrencyBalance(updatedBalances, data.cashCurrency, -data.cashAmount);
                    needsWalletUpdate = true;
                }
                // Scenario 2: Cash to Digital
                else if (wasCash && isNowDigital) {
                    updatedBalances = updateCurrencyBalance(updatedBalances, oldTransaction.cashCurrency, oldTransaction.cashAmount);
                    needsWalletUpdate = true;
                }
                // Scenario 3: Cash Transaction Update (amount or currency change)
                else if (wasCash && isNowCash) {
                    const oldAmount = oldTransaction.cashAmount;
                    const newAmount = data.cashAmount;
                    const oldCurrency = oldTransaction.cashCurrency;
                    const newCurrency = data.cashCurrency;

                    if (oldAmount !== newAmount || oldCurrency !== newCurrency) {
                        updatedBalances = updateCurrencyBalance(updatedBalances, oldCurrency, oldAmount);
                        updatedBalances = updateCurrencyBalance(updatedBalances, newCurrency, -newAmount);
                        needsWalletUpdate = true;
                    }
                }

                // Update wallet if changes were made
                if (needsWalletUpdate) {
                    await base44.entities.CashWallet.update(cashWallet.id, {
                        balances: updatedBalances
                    });
                }
            }

            return data;
        }, */

        queryKeysToInvalidate: [QUERY_KEYS.TRANSACTIONS],
        onAfterSuccess: () => {
            if (setShowForm) setShowForm(false);
            if (setEditingTransaction) setEditingTransaction(null);
        }
    });

    // DELETE: Use generic hook with cash wallet reversal
    const { handleDelete: handleDeleteTransaction } = useDeleteEntity({
        entityName: 'Transaction',
        // queryKeysToInvalidate: [QUERY_KEYS.TRANSACTIONS, QUERY_KEYS.CASH_WALLET],
        queryKeysToInvalidate: [QUERY_KEYS.TRANSACTIONS],
        confirmTitle: "Delete Transaction",
        confirmMessage: "Are you sure you want to delete this transaction? This action cannot be undone.",
        /* onBeforeDelete: async (transaction) => {
            // Handle cash wallet balance adjustment for cash transactions
            if (transaction.isCashTransaction && transaction.cashAmount && transaction.cashCurrency && cashWallet) {
                const balances = cashWallet.balances || [];
                let updatedBalances = [...balances];

                // Reverse the transaction effect on wallet
                if (transaction.cashTransactionType === 'withdrawal_to_wallet') {
                    updatedBalances = updateCurrencyBalance(updatedBalances, transaction.cashCurrency, -transaction.cashAmount);
                } else if (transaction.cashTransactionType === 'deposit_from_wallet_to_bank' || transaction.cashTransactionType === 'expense_from_wallet') {
                    updatedBalances = updateCurrencyBalance(updatedBalances, transaction.cashCurrency, transaction.cashAmount);
                }

                await base44.entities.CashWallet.update(cashWallet.id, {
                    balances: updatedBalances
                });
            }
        } */
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

    const handleGoalUpdate = async (priority, percentage) => {
        const existingGoal = goals.find(g => g.priority === priority);

        try {
            if (existingGoal) {
                // Return the promise directly, allowing the caller (GoalSettings) to handle resolution status
                return updateGoalMutation.mutateAsync({
                    id: existingGoal.id,
                    data: { target_percentage: percentage }
                });
            } else if (user) {
                // Return the promise directly
                return createGoalMutation.mutateAsync({
                    priority,
                    target_percentage: percentage,
                    user_email: user.email
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
    const { transactions, ...options } = config;
    const [showForm, setShowForm] = useState(false);
    const [editingBudget, setEditingBudget] = useState(null);

    // CREATE: Use generic hook with intelligent status assignment and cash allocation
    const createMutation = useCreateEntity({
        entityName: 'CustomBudget',
        // queryKeysToInvalidate: [QUERY_KEYS.CUSTOM_BUDGETS, QUERY_KEYS.CASH_WALLET],
        queryKeysToInvalidate: [QUERY_KEYS.CUSTOM_BUDGETS],
        onBeforeCreate: async (data) => {
            // CRITICAL: Determine status based on start date
            const today = new Date();
            today.setHours(0, 0, 0, 0);

            const startDate = parseDate(data.startDate);
            const status = startDate > today ? 'planned' : 'active';

            // // Handle cash allocations if any
            // if (data.cashAllocations && data.cashAllocations.length > 0 && user) {
            //     await allocateCashFromWallet(
            //         user.email,
            //         data.cashAllocations
            //     );
            // }

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
        // queryKeysToInvalidate: [QUERY_KEYS.CUSTOM_BUDGETS, QUERY_KEYS.CASH_WALLET, ['budget'], ['allBudgets']],
        queryKeysToInvalidate: [QUERY_KEYS.CUSTOM_BUDGETS, ['budget'], ['allBudgets']],
        onBeforeUpdate: async ({ id, data }) => {
            // CRITICAL: Use get() instead of list().find() for efficiency
            const existingBudget = await base44.entities.CustomBudget.get(id);

            if (!existingBudget) {
                throw new Error('Budget not found');
            }

            // Handle cash allocation changes
            /* if (user) {
                const oldAllocations = existingBudget.cashAllocations || [];
                const newAllocations = data.cashAllocations || [];

                const changes = calculateAllocationChanges(oldAllocations, newAllocations);

                for (const change of changes) {
                    if (change.isIncrease) {
                        await allocateCashFromWallet(
                            user.email,
                            [{ currencyCode: change.currencyCode, amount: change.amount }]
                        );
                    } else {
                        await returnCashToWallet(
                            user.email,
                            [{ currencyCode: change.currencyCode, amount: change.amount }]
                        );
                    }
                }
            } */

            return data;
        },
        onAfterSuccess: () => {
            setShowForm(false);
            setEditingBudget(null);
        }
    });

    const { handleDelete: handleDeleteBudget, deleteDirect, isDeleting } = useDeleteEntity({
        entityName: 'CustomBudget',
        // queryKeysToInvalidate: [QUERY_KEYS.CUSTOM_BUDGETS, QUERY_KEYS.TRANSACTIONS, QUERY_KEYS.CASH_WALLET],
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
            console.log(`Deleting ${budgetTransactions.length} transactions for budget ${budgetId}`);

            for (const transaction of budgetTransactions) {
                await base44.entities.Transaction.delete(transaction.id);
            }

            // Return any remaining cash allocations to wallet
            /* if (budget.cashAllocations && budget.cashAllocations.length > 0 && user) {
                const remaining = calculateRemainingCashAllocations(budget, transactions);
                if (remaining.length > 0) {
                    console.log(`Returning ${remaining.length} cash allocations to wallet for budget ${budgetId}`);
                    await returnCashToWallet(
                        user.email,
                        remaining
                    );
                }
            } */
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
        // queryKeysToInvalidate: [QUERY_KEYS.CUSTOM_BUDGETS, QUERY_KEYS.CASH_WALLET],
        queryKeysToInvalidate: [QUERY_KEYS.CUSTOM_BUDGETS],
        onBeforeUpdate: async ({ id, data }) => {
            // CRITICAL: Use get() instead of list().find()
            const budget = await base44.entities.CustomBudget.get(id);

            if (!budget) {
                throw new Error('Budget not found');
            }

            if (data.status === 'completed') {
                // When completing: return remaining cash to wallet
                /* if (budget.cashAllocations && budget.cashAllocations.length > 0 && user) {
                    const remaining = calculateRemainingCashAllocations(budget, transactions);
                    if (remaining.length > 0) {
                        await returnCashToWallet(
                            user.email,
                            remaining
                        );
                    }
                } */

                // Calculate actual spent amount
                const budgetTransactions = transactions.filter(t => t.customBudgetId === id && t.isPaid);
                const actualSpent = budgetTransactions.reduce((sum, t) => sum + t.amount, 0);

                return {
                    status: 'completed',
                    allocatedAmount: actualSpent,
                    originalAllocatedAmount: budget.originalAllocatedAmount || budget.allocatedAmount,
                    // cashAllocations: []
                };
            } else if (data.status === 'active') {
                // When reactivating: restore original allocated amount, but do NOT restore cash allocations
                return {
                    status: 'active',
                    allocatedAmount: budget.originalAllocatedAmount || budget.allocatedAmount,
                    originalAllocatedAmount: null,
                    // cashAllocations: []
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
        handleSubmit,
        isSaving,
        saveSuccess,
    };
};
