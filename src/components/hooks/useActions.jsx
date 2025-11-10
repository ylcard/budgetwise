
import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { showToast } from "@/components/ui/use-toast";
import { QUERY_KEYS } from "./queryKeys";
import {
  allocateCashFromWallet,
  returnCashToWallet,
  calculateAllocationChanges,
  calculateRemainingCashAllocations,
} from "../utils/cashAllocationUtils";

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
export const useTransactionActions = (setShowForm, setEditingTransaction, cashWallet) => {
  const queryClient = useQueryClient();

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Transaction.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.TRANSACTIONS] });
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.CASH_WALLET] });
      setShowForm(false);
      setEditingTransaction(null);
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
      // Handle cash wallet balance adjustments for cash expense edits
      if (oldTransaction?.isCashTransaction && 
          oldTransaction?.cashTransactionType === 'expense_from_wallet' &&
          oldTransaction?.cashAmount && 
          oldTransaction?.cashCurrency &&
          cashWallet) {
        
        const oldAmount = oldTransaction.cashAmount;
        const newAmount = data.cashAmount || oldAmount;
        const oldCurrency = oldTransaction.cashCurrency;
        const newCurrency = data.cashCurrency || oldCurrency;
        
        // If amount or currency changed
        if (oldAmount !== newAmount || oldCurrency !== newCurrency) {
          const balances = cashWallet.balances || [];
          let updatedBalances = [...balances];
          
          // Return old amount to wallet (reversing the previous expense)
          updatedBalances = updateCurrencyBalance(updatedBalances, oldCurrency, oldAmount);
          
          // Deduct new amount from wallet (applying the new expense)
          updatedBalances = updateCurrencyBalance(updatedBalances, newCurrency, -newAmount);
          
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
      setShowForm(false);
      setEditingTransaction(null);
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
    setEditingTransaction(transaction);
    setShowForm(true);
  };

  const handleDelete = (transaction) => {
    if (window.confirm('Are you sure you want to delete this transaction?')) {
      deleteMutation.mutate(transaction);
    }
  };

  return {
    handleSubmit,
    handleEdit,
    handleDelete,
    isSubmitting: createMutation.isPending || updateMutation.isPending,
  };
};

// Helper function to update balance for a specific currency (used in transaction updates)
const updateCurrencyBalance = (balances, currencyCode, amountChange) => {
  const existingBalanceIndex = balances.findIndex(b => b.currencyCode === currencyCode);
  
  if (existingBalanceIndex !== -1) {
    const updatedBalances = balances.map((b, index) => 
      index === existingBalanceIndex 
        ? { ...b, amount: b.amount + amountChange }
        : b
    );
    // Filter out balances that become zero or negative (considering floating point precision)
    return updatedBalances.filter(b => b.amount > 0.01); 
  } else if (amountChange > 0) { // Only add if it's a positive amount
    return [...balances, { currencyCode, amount: amountChange }];
  }
  return balances;
};

// Hook for category actions (CRUD operations)
export const useCategoryActions = (setShowForm, setEditingCategory) => {
  const queryClient = useQueryClient();

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Category.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.CATEGORIES] });
      setShowForm(false);
      setEditingCategory(null);
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
      setShowForm(false);
      setEditingCategory(null);
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
    setEditingCategory(category);
    setShowForm(true);
  };

  const handleDelete = (id) => {
    if (window.confirm('Are you sure you want to delete this category? This will not delete associated transactions.')) {
      deleteMutation.mutate(id);
    }
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
export const useCustomBudgetActions = (user, transactions, cashWallet) => {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [editingBudget, setEditingBudget] = useState(null);

  const createMutation = useMutation({
    mutationFn: async (data) => {
      // Create the budget first
      const newBudget = await base44.entities.CustomBudget.create({
        ...data,
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

  const handleDelete = (id) => {
    deleteMutation.mutate(id);
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

// DEPRECATED: This hook is scheduled to be removed. Use useCustomBudgetActions instead.
// This hook lacks cash allocation logic and should not be used for budget management.
// Keeping for now to avoid breaking changes, but all usages should be migrated to useCustomBudgetActions.
export const useBudgetActions = (user, transactions) => {
  console.warn('DEPRECATED: useBudgetActions is deprecated. Use useCustomBudgetActions instead for proper cash allocation handling.');
  
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [editingBudget, setEditingBudget] = useState(null);

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.CustomBudget.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.CUSTOM_BUDGETS] });
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
    mutationFn: ({ id, data }) => base44.entities.CustomBudget.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.CUSTOM_BUDGETS] });
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

  const updateStatusMutation = useMutation({
    mutationFn: ({ id, status }) => base44.entities.CustomBudget.update(id, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.CUSTOM_BUDGETS] });
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

  const handleSubmit = (data) => {
    const budgetData = {
      ...data,
      user_email: user.email,
      isSystemBudget: false
    };

    if (editingBudget) {
      updateMutation.mutate({ id: editingBudget.id, data: budgetData });
    } else {
      createMutation.mutate(budgetData);
    }
  };

  const handleEdit = (budget) => {
    setEditingBudget(budget);
    setShowForm(true);
  };

  const handleDelete = (id) => {
    deleteMutation.mutate(id);
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
