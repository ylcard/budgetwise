import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { showToast } from "@/components/ui/use-toast";
import { useConfirm } from "@/components/ui/ConfirmDialogProvider";
import { QUERY_KEYS } from "./queryKeys";
import {
  allocateCashFromWallet,
  returnCashToWallet,
  calculateAllocationChanges,
  calculateRemainingCashAllocations,
  updateCurrencyBalance,
} from "../utils/cashAllocationUtils";
// UPDATED 11-Nov-2025: Changed import from budgetCalculations to dateUtils
import { parseDate } from "../utils/dateUtils";

// Hook for transaction mutations (Dashboard)
export const useTransactionMutationsDashboard = (setShowQuickAdd, setShowQuickAddIncome) => {
  const queryClient = useQueryClient();

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Transaction.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.TRANSACTIONS] });
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.SYSTEM_BUDGETS] });
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.CASH_WALLET] });
      setShowQuickAdd(false);
      setShowQuickAddIncome(false);
      showToast({
        title: "Success",
        description: "Transaction added successfully",
      });
    },
    onError: (error) => {
      console.error('Error creating transaction:', error);
      showToast({
        title: "Error",
        description: error?.message || "Failed to create transaction. Please try again.",
        variant: "destructive",
      });
    },
  });

  return {
    createTransaction: createMutation.mutate,
    isCreating: createMutation.isPending,
  };
};

// Hook for budget mutations (Dashboard)
export const useBudgetMutationsDashboard = (user, transactions, allCustomBudgets, setShowQuickAddBudget) => {
  const queryClient = useQueryClient();

  const createBudgetMutation = useMutation({
    mutationFn: (data) => base44.entities.CustomBudget.create({
      ...data,
      user_email: user.email,
      isSystemBudget: false
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.CUSTOM_BUDGETS] });
      setShowQuickAddBudget(false);
      showToast({
        title: "Success",
        description: "Budget created successfully",
      });
    },
    onError: (error) => {
      console.error('Error creating budget:', error);
      showToast({
        title: "Error",
        description: error?.message || "Failed to create budget. Please try again.",
        variant: "destructive",
      });
    },
  });

  const deleteBudgetMutation = useMutation({
    mutationFn: async (id) => {
      const budgetTransactions = transactions.filter(t => t.customBudgetId === id);
      
      for (const transaction of budgetTransactions) {
        await base44.entities.Transaction.delete(transaction.id);
      }
      
      await base44.entities.CustomBudget.delete(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.CUSTOM_BUDGETS] });
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.TRANSACTIONS] });
      showToast({
        title: "Success",
        description: "Budget deleted successfully",
      });
    },
    onError: (error) => {
      console.error('Error deleting budget:', error);
      showToast({
        title: "Error",
        description: error?.message || "Failed to delete budget. Please try again.",
        variant: "destructive",
      });
    },
  });

  const completeBudgetMutation = useMutation({
    mutationFn: async (id) => {
      const budget = allCustomBudgets.find(cb => cb.id === id);
      if (!budget) return;
      
      const budgetTransactions = transactions.filter(t => t.customBudgetId === id && t.isPaid);
      const actualSpent = budgetTransactions.reduce((sum, t) => sum + t.amount, 0);
      
      await base44.entities.CustomBudget.update(id, { 
        status: 'completed',
        allocatedAmount: actualSpent,
        originalAllocatedAmount: budget.originalAllocatedAmount || budget.allocatedAmount
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.CUSTOM_BUDGETS] });
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.TRANSACTIONS] });
      showToast({
        title: "Success",
        description: "Budget marked as completed",
      });
    },
    onError: (error) => {
      console.error('Error completing budget:', error);
      showToast({
        title: "Error",
        description: error?.message || "Failed to complete budget. Please try again.",
        variant: "destructive",
      });
    },
  });

  return {
    createBudget: createBudgetMutation.mutate,
    deleteBudget: deleteBudgetMutation.mutate,
    completeBudget: completeBudgetMutation.mutate,
    isCreating: createBudgetMutation.isPending,
    isDeleting: deleteBudgetMutation.isPending,
    isCompleting: completeBudgetMutation.isPending,
  };
};

// Hook for transaction actions (CRUD operations - Transactions page)
// ENHANCED: Now handles complex cash transaction changes
// UPDATED 15-Jan-2025: Removed ConfirmDialog state management, now uses useConfirm hook
export const useTransactionActions = (setShowForm, setEditingTransaction, cashWallet) => {
  const queryClient = useQueryClient();
  const { confirmAction } = useConfirm();

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Transaction.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.TRANSACTIONS] });
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.CASH_WALLET] });
      if (setShowForm) setShowForm(false);
      if (setEditingTransaction) setEditingTransaction(null);
      showToast({
        title: "Success",
        description: "Transaction created successfully",
      });
    },
    onError: (error) => {
      console.error('Error creating transaction:', error);
      showToast({
        title: "Error",
        description: error?.message || "Failed to create transaction. Please try again.",
        variant: "destructive",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data, oldTransaction }) => {
      // ENHANCED: Handle complex cash transaction status changes
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
          // Deduct new cash amount from wallet
          updatedBalances = updateCurrencyBalance(updatedBalances, data.cashCurrency, -data.cashAmount);
          needsWalletUpdate = true;
        }
        // Scenario 2: Cash to Digital
        else if (wasCash && isNowDigital) {
          // Return old cash amount to wallet
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
            // Return old amount to wallet
            updatedBalances = updateCurrencyBalance(updatedBalances, oldCurrency, oldAmount);
            // Deduct new amount from wallet
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
      
      return await base44.entities.Transaction.update(id, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.TRANSACTIONS] });
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.CASH_WALLET] });
      if (setShowForm) setShowForm(false);
      if (setEditingTransaction) setEditingTransaction(null);
      showToast({
        title: "Success",
        description: "Transaction updated successfully",
      });
    },
    onError: (error) => {
      console.error('Error updating transaction:', error);
      showToast({
        title: "Error",
        description: error?.message || "Failed to update transaction. Please try again.",
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (transaction) => {
      // Handle cash wallet balance adjustment for cash transactions
      if (transaction.isCashTransaction && transaction.cashAmount && transaction.cashCurrency && cashWallet) {
        const balances = cashWallet.balances || [];
        let updatedBalances = [...balances];
        
        // Reverse the transaction effect on wallet
        if (transaction.cashTransactionType === 'withdrawal_to_wallet') {
          // Was added to wallet, so subtract it
          updatedBalances = updateCurrencyBalance(updatedBalances, transaction.cashCurrency, -transaction.cashAmount);
        } else if (transaction.cashTransactionType === 'deposit_from_wallet_to_bank' || transaction.cashTransactionType === 'expense_from_wallet') {
          // Was removed/spent from wallet, so add it back
          updatedBalances = updateCurrencyBalance(updatedBalances, transaction.cashCurrency, transaction.cashAmount);
        }
        
        await base44.entities.CashWallet.update(cashWallet.id, {
          balances: updatedBalances
        });
      }
      
      // Delete the transaction
      await base44.entities.Transaction.delete(transaction.id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.TRANSACTIONS] });
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.CASH_WALLET] });
      showToast({
        title: "Success",
        description: "Transaction deleted successfully",
      });
    },
    onError: (error) => {
      console.error('Error deleting transaction:', error);
      showToast({
        title: "Error",
        description: error?.message || "Failed to delete transaction. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (data, editingTransaction) => {
    if (editingTransaction) {
      updateMutation.mutate({ 
        id: editingTransaction.id, 
        data,
        oldTransaction: editingTransaction 
      });
    } else {
      createMutation.mutate(data);
    }
  };

  const handleEdit = (transaction) => {
    if (setEditingTransaction) setEditingTransaction(transaction);
    if (setShowForm) setShowForm(true);
  };

  // UPDATED 15-Jan-2025: Now uses useConfirm hook for confirmation dialog
  const handleDelete = (transaction) => {
    confirmAction(
      "Delete Transaction",
      "Are you sure you want to delete this transaction? This action cannot be undone.",
      () => deleteMutation.mutate(transaction),
      { destructive: true }
    );
  };

  return {
    handleSubmit,
    handleEdit,
    handleDelete,
    isSubmitting: createMutation.isPending || updateMutation.isPending,
  };
};

// Hook for category actions (CRUD operations)
// UPDATED 15-Jan-2025: Removed ConfirmDialog state management, now uses useConfirm hook
export const useCategoryActions = (setShowForm, setEditingCategory) => {
  const queryClient = useQueryClient();
  const { confirmAction } = useConfirm();

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Category.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.CATEGORIES] });
      if (setShowForm) setShowForm(false);
      if (setEditingCategory) setEditingCategory(null);
      showToast({
        title: "Success",
        description: "Category created successfully",
      });
    },
    onError: (error) => {
      console.error('Error creating category:', error);
      showToast({
        title: "Error",
        description: error?.message || "Failed to create category. Please try again.",
        variant: "destructive",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Category.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.CATEGORIES] });
      if (setShowForm) setShowForm(false);
      if (setEditingCategory) setEditingCategory(null);
      showToast({
        title: "Success",
        description: "Category updated successfully",
      });
    },
    onError: (error) => {
      console.error('Error updating category:', error);
      showToast({
        title: "Error",
        description: error?.message || "Failed to update category. Please try again.",
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Category.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.CATEGORIES] });
      showToast({
        title: "Success",
        description: "Category deleted successfully",
      });
    },
    onError: (error) => {
      console.error('Error deleting category:', error);
      showToast({
        title: "Error",
        description: error?.message || "Failed to delete category. Please try again.",
        variant: "destructive",
      });
    },
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

  // UPDATED 15-Jan-2025: Now uses useConfirm hook for confirmation dialog
  const handleDelete = (id) => {
    confirmAction(
      "Delete Category",
      "Are you sure you want to delete this category? This will not delete associated transactions.",
      () => deleteMutation.mutate(id),
      { destructive: true }
    );
  };

  return {
    handleSubmit,
    handleEdit,
    handleDelete,
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
      showToast({
        title: "Success",
        description: "Goal updated successfully",
      });
    },
    onError: (error) => {
      console.error('Error updating goal:', error);
      showToast({
        title: "Error",
        description: error?.message || "Failed to update goal. Please try again.",
        variant: "destructive",
      });
    },
  });

  const createGoalMutation = useMutation({
    mutationFn: (data) => base44.entities.BudgetGoal.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.GOALS] });
      showToast({
        title: "Success",
        description: "Goal created successfully",
      });
    },
    onError: (error) => {
      console.error('Error creating goal:', error);
      showToast({
        title: "Error",
        description: error?.message || "Failed to create goal. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleGoalUpdate = async (priority, percentage) => {
    const existingGoal = goals.find(g => g.priority === priority);
    
    try {
      if (existingGoal) {
        await updateGoalMutation.mutateAsync({
          id: existingGoal.id,
          data: { target_percentage: percentage }
        });
      } else if (user) {
        await createGoalMutation.mutateAsync({
          priority,
          target_percentage: percentage,
          user_email: user.email
        });
      }
    } catch (error) {
      // Error already handled by mutation's onError
      console.error('Error in handleGoalUpdate:', error);
    }
  };

  return {
    handleGoalUpdate,
    isSaving: updateGoalMutation.isPending || createGoalMutation.isPending,
  };
};

// Hook for custom budget actions (CRUD operations)
// FIXED: handleSubmit now accepts budget parameter directly to avoid async state issues
// CRITICAL ENHANCEMENT (2025-01-12): Intelligent status setting for new budgets
export const useCustomBudgetActions = (user, transactions, cashWallet) => {
  const queryClient = useQueryClient();
  const { confirmAction } = useConfirm();
  const [showForm, setShowForm] = useState(false);
  const [editingBudget, setEditingBudget] = useState(null);

  const createMutation = useMutation({
    mutationFn: async (data) => {
      // CRITICAL: Determine status based on start date
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const startDate = parseDate(data.startDate);
      const status = startDate > today ? 'planned' : 'active';

      // Create the budget first
      const newBudget = await base44.entities.CustomBudget.create({
        ...data,
        status, // Intelligent status assignment
        user_email: user.email,
        isSystemBudget: false
      });

      // Handle cash allocations if any
      if (data.cashAllocations && data.cashAllocations.length > 0 && user) {
        await allocateCashFromWallet(
          user.email,
          data.cashAllocations
        );
      }

      return newBudget;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.CUSTOM_BUDGETS] });
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.CASH_WALLET] });
      setShowForm(false);
      setEditingBudget(null);
      showToast({
        title: "Success",
        description: "Budget created successfully",
      });
    },
    onError: (error) => {
      console.error('Error creating budget:', error);
      showToast({
        title: "Error",
        description: error?.message || "Failed to create budget. Please try again.",
        variant: "destructive",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }) => {
      const allBudgets = await base44.entities.CustomBudget.list();
      const existingBudget = allBudgets.find(b => b.id === id);
      
      if (!existingBudget) {
        throw new Error('Budget not found');
      }

      // Handle cash allocation changes
      if (user) {
        const oldAllocations = existingBudget.cashAllocations || [];
        const newAllocations = data.cashAllocations || [];
        
        const changes = calculateAllocationChanges(oldAllocations, newAllocations);
        
        for (const change of changes) {
          if (change.isIncrease) {
            // Allocate more cash from wallet
            await allocateCashFromWallet(
              user.email,
              [{ currencyCode: change.currencyCode, amount: change.amount }]
            );
          } else {
            // Return cash to wallet
            await returnCashToWallet(
              user.email,
              [{ currencyCode: change.currencyCode, amount: change.amount }]
            );
          }
        }
      }

      // Update the budget
      return await base44.entities.CustomBudget.update(id, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.CUSTOM_BUDGETS] });
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.CASH_WALLET] });
      queryClient.invalidateQueries({ queryKey: ['budget'] });
      queryClient.invalidateQueries({ queryKey: ['allBudgets'] });
      setShowForm(false);
      setEditingBudget(null);
      showToast({
        title: "Success",
        description: "Budget updated successfully",
      });
    },
    onError: (error) => {
      console.error('Error updating budget:', error);
      showToast({
        title: "Error",
        description: error?.message || "Failed to update budget. Please try again.",
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id) => {
      // Get the budget first
      const allBudgets = await base44.entities.CustomBudget.list();
      const budget = allBudgets.find(b => b.id === id);
      
      if (!budget) {
        throw new Error('Budget not found');
      }

      // Delete associated transactions
      const budgetTransactions = transactions.filter(t => t.customBudgetId === id);
      for (const transaction of budgetTransactions) {
        await base44.entities.Transaction.delete(transaction.id);
      }

      // Return any remaining cash allocations to wallet
      if (budget.cashAllocations && budget.cashAllocations.length > 0 && user) {
        const remaining = calculateRemainingCashAllocations(budget, transactions);
        if (remaining.length > 0) {
          await returnCashToWallet(
            user.email,
            remaining
          );
        }
      }
      
      // Delete the budget
      await base44.entities.CustomBudget.delete(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.CUSTOM_BUDGETS] });
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.TRANSACTIONS] });
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.CASH_WALLET] });
      showToast({
        title: "Success",
        description: "Budget deleted successfully",
      });
    },
    onError: (error) => {
      console.error('Error deleting budget:', error);
      showToast({
        title: "Error",
        description: error?.message || "Failed to delete budget. Please try again.",
        variant: "destructive",
      });
    },
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status }) => {
      const allBudgets = await base44.entities.CustomBudget.list();
      const budget = allBudgets.find(b => b.id === id);
      
      if (!budget) {
        throw new Error('Budget not found');
      }

      if (status === 'completed') {
        // When completing: return remaining cash to wallet
        if (budget.cashAllocations && budget.cashAllocations.length > 0 && user) {
          const remaining = calculateRemainingCashAllocations(budget, transactions);
          if (remaining.length > 0) {
            await returnCashToWallet(
              user.email,
              remaining
            );
          }
        }

        // Calculate actual spent amount
        const budgetTransactions = transactions.filter(t => t.customBudgetId === id && t.isPaid);
        const actualSpent = budgetTransactions.reduce((sum, t) => sum + t.amount, 0);

        return await base44.entities.CustomBudget.update(id, {
          status: 'completed',
          allocatedAmount: actualSpent,
          originalAllocatedAmount: budget.originalAllocatedAmount || budget.allocatedAmount,
          cashAllocations: [] // Clear cash allocations when completing
        });
      } else if (status === 'active') {
        // When reactivating: restore original allocated amount, but do NOT restore cash allocations
        return await base44.entities.CustomBudget.update(id, {
          status: 'active',
          allocatedAmount: budget.originalAllocatedAmount || budget.allocatedAmount,
          originalAllocatedAmount: null,
          cashAllocations: [] // Clear cash allocations on reactivation
        });
      } else {
        return await base44.entities.CustomBudget.update(id, { status });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.CUSTOM_BUDGETS] });
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.CASH_WALLET] });
      showToast({
        title: "Success",
        description: "Budget status updated successfully",
      });
    },
    onError: (error) => {
      console.error('Error updating budget status:', error);
      showToast({
        title: "Error",
        description: error?.message || "Failed to update budget status. Please try again.",
        variant: "destructive",
      });
    },
  });

  // FIXED: Accept budgetToEdit parameter to avoid async state issues
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

  // UPDATED 15-Jan-2025: Now uses useConfirm hook for confirmation dialog
  const handleDelete = (id) => {
    confirmAction(
      "Delete Budget",
      "Are you sure you want to delete this budget? This will also delete all associated transactions and return cash allocations to your wallet.",
      () => deleteMutation.mutate(id),
      { destructive: true }
    );
  };

  const handleStatusChange = (id, newStatus) => {
    updateStatusMutation.mutate({ id, status: newStatus });
  };

  return {
    showForm,
    setShowForm,
    editingBudget,
    setEditingBudget,
    handleSubmit,
    handleEdit,
    handleDelete,
    handleStatusChange,
    isSubmitting: createMutation.isPending || updateMutation.isPending,
  };
};

// UPDATED 15-Jan-2025: Major refactoring to use centralized useConfirm hook
// - Removed all showDeleteConfirm, setShowDeleteConfirm, and onDeleteConfirm parameters
// - All handleDelete functions now use confirmAction from useConfirm hook
// - Removed window.confirm() fallback logic (no longer needed with global provider)
// - All confirmation dialogs now use consistent UI and behavior across the app
// - useTransactionActions, useCategoryActions, and useCustomBudgetActions updated
// UPDATED 11-Nov-2025: Changed parseDate import from budgetCalculations.js to dateUtils.js