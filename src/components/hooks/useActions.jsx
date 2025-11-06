import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { QUERY_KEYS } from "./queryKeys";

// Hook for transaction mutations (Dashboard)
export const useTransactionMutationsDashboard = (setShowQuickAdd, setShowQuickAddIncome) => {
  const queryClient = useQueryClient();

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Transaction.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.TRANSACTIONS] });
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.SYSTEM_BUDGETS] });
      setShowQuickAdd(false);
      setShowQuickAddIncome(false);
    },
  });

  return {
    createTransaction: createMutation.mutate,
    isCreating: createMutation.isPending,
  };
};

// Hook for budget mutations (Dashboard)
export const useBudgetMutationsDashboard = (user, transactions, allMiniBudgets, setShowQuickAddBudget) => {
  const queryClient = useQueryClient();

  const createBudgetMutation = useMutation({
    mutationFn: (data) => base44.entities.MiniBudget.create({
      ...data,
      user_email: user.email,
      isSystemBudget: false
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.MINI_BUDGETS] });
      setShowQuickAddBudget(false);
    },
  });

  const deleteBudgetMutation = useMutation({
    mutationFn: async (id) => {
      const budgetTransactions = transactions.filter(t => t.miniBudgetId === id);
      
      for (const transaction of budgetTransactions) {
        await base44.entities.Transaction.delete(transaction.id);
      }
      
      await base44.entities.MiniBudget.delete(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.MINI_BUDGETS] });
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.TRANSACTIONS] });
    },
  });

  const completeBudgetMutation = useMutation({
    mutationFn: async (id) => {
      const budget = allMiniBudgets.find(mb => mb.id === id);
      if (!budget) return;
      
      const budgetTransactions = transactions.filter(t => t.miniBudgetId === id && t.isPaid);
      const actualSpent = budgetTransactions.reduce((sum, t) => sum + t.amount, 0);
      
      await base44.entities.MiniBudget.update(id, { 
        status: 'completed',
        allocatedAmount: actualSpent,
        originalAllocatedAmount: budget.originalAllocatedAmount || budget.allocatedAmount
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.MINI_BUDGETS] });
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.TRANSACTIONS] });
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
export const useTransactionActions = (setShowForm, setEditingTransaction) => {
  const queryClient = useQueryClient();

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Transaction.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.TRANSACTIONS] });
      setShowForm(false);
      setEditingTransaction(null);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Transaction.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.TRANSACTIONS] });
      setShowForm(false);
      setEditingTransaction(null);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Transaction.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.TRANSACTIONS] });
    },
  });

  const handleSubmit = (data, editingTransaction) => {
    if (editingTransaction) {
      updateMutation.mutate({ id: editingTransaction.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const handleEdit = (transaction) => {
    setEditingTransaction(transaction);
    setShowForm(true);
  };

  const handleDelete = (id) => {
    if (window.confirm('Are you sure you want to delete this transaction?')) {
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

// Hook for category actions (CRUD operations)
export const useCategoryActions = (setShowForm, setEditingCategory) => {
  const queryClient = useQueryClient();

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Category.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.CATEGORIES] });
      setShowForm(false);
      setEditingCategory(null);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Category.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.CATEGORIES] });
      setShowForm(false);
      setEditingCategory(null);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Category.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.CATEGORIES] });
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
    },
  });

  const createGoalMutation = useMutation({
    mutationFn: (data) => base44.entities.BudgetGoal.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.GOALS] });
    },
  });

  const handleGoalUpdate = async (priority, percentage) => {
    const existingGoal = goals.find(g => g.priority === priority);
    
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
  };

  return {
    handleGoalUpdate,
    isSaving: updateGoalMutation.isPending || createGoalMutation.isPending,
  };
};

// Hook for mini budget actions (CRUD operations)
export const useMiniBudgetActions = (user, transactions) => {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [editingBudget, setEditingBudget] = useState(null);

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.MiniBudget.create({
      ...data,
      user_email: user.email,
      isSystemBudget: false
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.MINI_BUDGETS] });
      setShowForm(false);
      setEditingBudget(null);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.MiniBudget.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.MINI_BUDGETS] });
      setShowForm(false);
      setEditingBudget(null);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id) => {
      const budgetTransactions = transactions.filter(t => t.miniBudgetId === id);
      
      for (const transaction of budgetTransactions) {
        await base44.entities.Transaction.delete(transaction.id);
      }
      
      await base44.entities.MiniBudget.delete(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.MINI_BUDGETS] });
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.TRANSACTIONS] });
    },
  });

  const updateStatusMutation = useMutation({
    mutationFn: ({ id, status }) => base44.entities.MiniBudget.update(id, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.MINI_BUDGETS] });
    },
  });

  const handleSubmit = (data) => {
    if (editingBudget) {
      updateMutation.mutate({ id: editingBudget.id, data });
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

// Hook for budget actions (for Budgets page)
export const useBudgetActions = (user, transactions) => {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [editingBudget, setEditingBudget] = useState(null);

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.MiniBudget.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.MINI_BUDGETS] });
      setShowForm(false);
      setEditingBudget(null);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.MiniBudget.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.MINI_BUDGETS] });
      setShowForm(false);
      setEditingBudget(null);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id) => {
      const budgetTransactions = transactions.filter(t => t.miniBudgetId === id);
      
      for (const transaction of budgetTransactions) {
        await base44.entities.Transaction.delete(transaction.id);
      }
      
      await base44.entities.MiniBudget.delete(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.MINI_BUDGETS] });
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.TRANSACTIONS] });
    },
  });

  const updateStatusMutation = useMutation({
    mutationFn: ({ id, status }) => base44.entities.MiniBudget.update(id, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.MINI_BUDGETS] });
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
    } catch (error) {
      console.error('Error saving settings:', error);
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