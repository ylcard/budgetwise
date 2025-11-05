
import { useState, useMemo, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  calculateRemainingBudget,
  getCurrentMonthTransactions,
  getFirstDayOfMonth,
  getLastDayOfMonth,
  getUnpaidExpensesForMonth,
  getSystemBudgetStats // Assuming this utility function is available in budgetCalculations.ts
} from "../utils/budgetCalculations";

// Hook for managing month/year navigation state
export const useMonthNavigation = () => {
  const now = new Date();
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth());
  const [selectedYear, setSelectedYear] = useState(now.getFullYear());

  return {
    selectedMonth,
    selectedYear,
    setSelectedMonth,
    setSelectedYear,
  };
};

// Hook for fetching transactions and categories
export const useTransactionsData = () => {
  const { data: transactions = [], isLoading: transactionsLoading } = useQuery({
    queryKey: ['transactions'],
    queryFn: () => base44.entities.Transaction.list('-date'),
    initialData: [],
  });

  const { data: categories = [], isLoading: categoriesLoading } = useQuery({
    queryKey: ['categories'],
    queryFn: () => base44.entities.Category.list(),
    initialData: [],
  });

  return {
    transactions,
    categories,
    isLoading: transactionsLoading || categoriesLoading,
  };
};

// Hook for fetching budget goals
export const useBudgetGoals = (user) => {
  const { data: goals = [], isLoading } = useQuery({
    queryKey: ['goals'],
    queryFn: async () => {
      if (!user) return [];
      const allGoals = await base44.entities.BudgetGoal.list();
      return allGoals.filter(g => g.user_email === user.email);
    },
    initialData: [],
    enabled: !!user,
  });

  return { goals, isLoading };
};

// Hook for fetching all mini budgets
export const useAllMiniBudgets = (user) => {
  const { data: allMiniBudgets = [], isLoading } = useQuery({
    queryKey: ['miniBudgets'],
    queryFn: async () => {
      if (!user) return [];
      const all = await base44.entities.MiniBudget.list('-startDate');
      return all.filter(mb => mb.user_email === user.email);
    },
    initialData: [],
    enabled: !!user,
  });

  return { allMiniBudgets, isLoading };
};

// Hook for fetching all system budgets
export const useAllSystemBudgets = (user) => {
  const { data: allSystemBudgets = [], isLoading } = useQuery({
    queryKey: ['allSystemBudgets'],
    queryFn: async () => {
      if (!user) return [];
      const all = await base44.entities.SystemBudget.list();
      return all.filter(sb => sb.user_email === user.email);
    },
    initialData: [],
    enabled: !!user,
  });

  return { allSystemBudgets, isLoading };
};

// Hook for fetching system budgets for a specific month
export const useSystemBudgets = (user, selectedMonth, selectedYear) => {
  const monthStart = useMemo(() => getFirstDayOfMonth(selectedMonth, selectedYear), [selectedMonth, selectedYear]);
  const monthEnd = useMemo(() => getLastDayOfMonth(selectedMonth, selectedYear), [selectedMonth, selectedYear]);

  const { data: systemBudgets = [], isLoading } = useQuery({
    queryKey: ['systemBudgets', selectedMonth, selectedYear],
    queryFn: async () => {
      if (!user) return [];
      const all = await base44.entities.SystemBudget.list();
      return all.filter(sb => 
        sb.user_email === user.email &&
        sb.startDate === monthStart && 
        sb.endDate === monthEnd
      );
    },
    initialData: [],
    enabled: !!user,
  });

  return { systemBudgets, monthStart, monthEnd, isLoading };
};

// Hook for managing system budgets (create/update logic)
export const useSystemBudgetManagement = (
  user,
  selectedMonth,
  selectedYear,
  goals,
  transactions,
  systemBudgets,
  monthStart,
  monthEnd
) => {
  const queryClient = useQueryClient();

  useEffect(() => {
    const ensureSystemBudgets = async () => {
      if (!user || goals.length === 0) return;
      
      try {
        const systemTypes = ['needs', 'wants', 'savings'];
        const colors = { needs: '#EF4444', wants: '#F59E0B', savings: '#10B981' };
        
        const currentMonthIncome = getCurrentMonthTransactions(transactions, selectedMonth, selectedYear)
          .filter(t => t.type === 'income')
          .reduce((sum, t) => sum + t.amount, 0);

        const goalMap = goals.reduce((acc, goal) => {
          acc[goal.priority] = goal.target_percentage;
          return acc;
        }, {});
        
        let needsInvalidation = false;

        for (const type of systemTypes) {
          const existingBudget = systemBudgets.find(sb => sb.systemBudgetType === type);
          const percentage = goalMap[type] || 0;
          const amount = parseFloat(((currentMonthIncome * percentage) / 100).toFixed(2));
          
          if (existingBudget) {
            if (Math.abs(existingBudget.budgetAmount - amount) > 0.01) {
              await base44.entities.SystemBudget.update(existingBudget.id, {
                budgetAmount: amount
              });
              needsInvalidation = true;
            }
          } else {
            const allSystemBudgetsCheck = await base44.entities.SystemBudget.list();
            const duplicateCheck = allSystemBudgetsCheck.find(sb => 
              sb.user_email === user.email &&
              sb.systemBudgetType === type &&
              sb.startDate === monthStart &&
              sb.endDate === monthEnd
            );
            
            if (!duplicateCheck) {
              await base44.entities.SystemBudget.create({
                name: type.charAt(0).toUpperCase() + type.slice(1),
                budgetAmount: amount,
                startDate: monthStart,
                endDate: monthEnd,
                color: colors[type],
                user_email: user.email,
                systemBudgetType: type
              });
              needsInvalidation = true;
            }
          }
        }
        
        if (needsInvalidation) {
          queryClient.invalidateQueries({ queryKey: ['systemBudgets'] });
          queryClient.invalidateQueries({ queryKey: ['allSystemBudgets'] });
        }
      } catch (error) {
        console.error('Error in ensureSystemBudgets:', error);
      }
    };
    
    if (user && goals.length > 0 && systemBudgets !== undefined) {
      ensureSystemBudgets();
    }
  }, [user, selectedMonth, selectedYear, goals, systemBudgets, monthStart, monthEnd, queryClient, transactions]);
};

// Hook for computing active budgets for the selected month
export const useActiveBudgets = (allMiniBudgets, allSystemBudgets, selectedMonth, selectedYear) => {
  const activeMiniBudgets = useMemo(() => {
    const monthStart = getFirstDayOfMonth(selectedMonth, selectedYear);
    const monthEnd = getLastDayOfMonth(selectedMonth, selectedYear);
    
    return allMiniBudgets.filter(mb => {
      if (mb.status !== 'active' && mb.status !== 'completed') return false;
      return mb.startDate <= monthEnd && mb.endDate >= monthStart;
    });
  }, [allMiniBudgets, selectedMonth, selectedYear]);

  const allActiveBudgets = useMemo(() => {
    const monthStart = getFirstDayOfMonth(selectedMonth, selectedYear);
    const monthEnd = getLastDayOfMonth(selectedMonth, selectedYear);
    
    const activeMini = allMiniBudgets.filter(mb => {
      if (mb.status !== 'active' && mb.status !== 'completed') return false;
      return mb.startDate <= monthEnd && mb.endDate >= monthStart;
    });
    
    const activeSystem = allSystemBudgets
      .filter(sb => sb.startDate === monthStart && sb.endDate === monthEnd)
      .map(sb => ({ 
        ...sb, 
        id: sb.id, 
        name: sb.name, 
        allocatedAmount: sb.budgetAmount, 
        color: sb.color, 
        isSystemBudget: true, 
        startDate: sb.startDate, 
        endDate: sb.endDate, 
        user_email: sb.user_email, 
        systemBudgetType: sb.systemBudgetType, 
        status: 'active' 
      }));
    
    return [...activeSystem, ...activeMini];
  }, [allMiniBudgets, allSystemBudgets, selectedMonth, selectedYear]);

  return { activeMiniBudgets, allActiveBudgets };
};

// Hook for transaction mutations
export const useTransactionMutations = (setShowQuickAdd, setShowQuickAddIncome) => {
  const queryClient = useQueryClient();

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Transaction.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      queryClient.invalidateQueries({ queryKey: ['systemBudgets'] });
      setShowQuickAdd(false);
      setShowQuickAddIncome(false);
    },
  });

  return {
    createTransaction: createMutation.mutate,
    isCreating: createMutation.isPending,
  };
};

// Hook for budget mutations
export const useBudgetMutations = (user, transactions, allMiniBudgets, setShowQuickAddBudget) => {
  const queryClient = useQueryClient();

  const createBudgetMutation = useMutation({
    mutationFn: (data) => base44.entities.MiniBudget.create({
      ...data,
      user_email: user.email,
      isSystemBudget: false
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['miniBudgets'] });
      setShowQuickAddBudget(false);
    },
  });

  const deleteBudgetMutation = useMutation({
    mutationFn: async (id) => {
      // Use transactions from closure
      const budgetTransactions = transactions.filter(t => t.miniBudgetId === id);
      
      for (const transaction of budgetTransactions) {
        await base44.entities.Transaction.delete(transaction.id);
      }
      
      await base44.entities.MiniBudget.delete(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['miniBudgets'] });
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
    },
  });

  const completeBudgetMutation = useMutation({
    mutationFn: async (id) => {
      // Use allMiniBudgets and transactions from closure
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
      queryClient.invalidateQueries({ queryKey: ['miniBudgets'] });
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
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

// Hook for dashboard summary calculations
export const useDashboardSummary = (transactions, selectedMonth, selectedYear) => {
  const remainingBudget = useMemo(() => {
    return calculateRemainingBudget(transactions, selectedMonth, selectedYear);
  }, [transactions, selectedMonth, selectedYear]);

  const currentMonthIncome = useMemo(() => {
    return getCurrentMonthTransactions(transactions, selectedMonth, selectedYear)
      .filter(t => t.type === 'income')
      .reduce((sum, t) => sum + t.amount, 0);
  }, [transactions, selectedMonth, selectedYear]);

  const currentMonthExpenses = useMemo(() => {
    const paidExpenses = getCurrentMonthTransactions(transactions, selectedMonth, selectedYear)
      .filter(t => t.type === 'expense')
      .reduce((sum, t) => sum + t.amount, 0);
    
    const unpaidExpenses = getUnpaidExpensesForMonth(transactions, selectedMonth, selectedYear)
      .reduce((sum, t) => sum + t.amount, 0);
    
    return paidExpenses + unpaidExpenses;
  }, [transactions, selectedMonth, selectedYear]);

  return {
    remainingBudget,
    currentMonthIncome,
    currentMonthExpenses,
  };
};

// ==========================================
// TRANSACTION PAGE HOOKS
// ==========================================

// Hook for transaction filtering state and logic
export const useTransactionFiltering = (transactions) => {
  const now = new Date();
  const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
  const currentMonthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0];
  
  const [filters, setFilters] = useState({ 
    type: 'all', 
    category: [],
    paymentStatus: 'all',
    startDate: currentMonthStart,
    endDate: currentMonthEnd
  });

  const filteredTransactions = useMemo(() => {
    return transactions.filter(t => {
      const typeMatch = filters.type === 'all' || t.type === filters.type;
      
      const categoryMatch = !filters.category || filters.category.length === 0 || filters.category.includes(t.category_id);
      
      const paymentStatusMatch = filters.paymentStatus === 'all' || 
        (filters.paymentStatus === 'paid' && t.isPaid) ||
        (filters.paymentStatus === 'unpaid' && !t.isPaid);
      
      let dateMatch = true;
      if (filters.startDate && filters.endDate) {
        const transactionDate = new Date(t.date);
        const start = new Date(filters.startDate);
        const end = new Date(filters.endDate);
        
        transactionDate.setHours(0, 0, 0, 0);
        start.setHours(0, 0, 0, 0);
        end.setHours(0, 0, 0, 0);

        dateMatch = transactionDate >= start && transactionDate <= end;
      }
      
      return typeMatch && categoryMatch && paymentStatusMatch && dateMatch;
    });
  }, [transactions, filters]);

  return {
    filters,
    setFilters,
    filteredTransactions,
  };
};

// Hook for transaction actions (CRUD operations)
export const useTransactionActions = (setShowForm, setEditingTransaction) => {
  const queryClient = useQueryClient();

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Transaction.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      setShowForm(false);
      setEditingTransaction(null);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Transaction.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      setShowForm(false);
      setEditingTransaction(null);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Transaction.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
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

// ==========================================
// CATEGORIES PAGE HOOKS
// ==========================================

// Hook for fetching categories data
export const useCategoryData = () => {
  const { data: categories = [], isLoading } = useQuery({
    queryKey: ['categories'],
    queryFn: () => base44.entities.Category.list(),
    initialData: [],
  });

  return {
    categories,
    isLoading,
  };
};

// Hook for category actions (CRUD operations)
export const useCategoryActions = (setShowForm, setEditingCategory) => {
  const queryClient = useQueryClient();

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Category.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] });
      setShowForm(false);
      setEditingCategory(null);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Category.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] });
      setShowForm(false);
      setEditingCategory(null);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Category.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] });
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

// ==========================================
// REPORTS PAGE HOOKS
// ==========================================

// Hook for fetching reports data
export const useReportData = (user) => {
  const { data: transactions = [], isLoading: loadingTransactions } = useQuery({
    queryKey: ['transactions'],
    queryFn: () => base44.entities.Transaction.list('-date'),
    initialData: [],
  });

  const { data: categories = [], isLoading: loadingCategories } = useQuery({
    queryKey: ['categories'],
    queryFn: () => base44.entities.Category.list(),
    initialData: [],
  });

  const { data: goals = [], isLoading: loadingGoals } = useQuery({
    queryKey: ['goals'],
    queryFn: async () => {
      if (!user) return [];
      const allGoals = await base44.entities.BudgetGoal.list();
      return allGoals.filter(g => g.user_email === user.email);
    },
    initialData: [],
    enabled: !!user,
  });

  return {
    transactions,
    categories,
    goals,
    isLoading: loadingTransactions || loadingCategories || loadingGoals,
  };
};

// Hook for report period state and derived data
export const useReportPeriodState = (transactions) => {
  const now = new Date();
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth());
  const [selectedYear, setSelectedYear] = useState(now.getFullYear());

  const monthlyTransactions = useMemo(() => {
    return getCurrentMonthTransactions(transactions, selectedMonth, selectedYear);
  }, [transactions, selectedMonth, selectedYear]);

  const monthlyIncome = useMemo(() => {
    return monthlyTransactions
      .filter(t => t.type === 'income')
      .reduce((sum, t) => sum + t.amount, 0);
  }, [monthlyTransactions]);

  const displayDate = useMemo(() => {
    return new Date(selectedYear, selectedMonth);
  }, [selectedMonth, selectedYear]);

  return {
    selectedMonth,
    setSelectedMonth,
    selectedYear,
    setSelectedYear,
    monthlyTransactions,
    monthlyIncome,
    displayDate,
  };
};

// Hook for goal actions (mutations)
export const useGoalActions = (user, goals) => {
  const queryClient = useQueryClient();

  const updateGoalMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.BudgetGoal.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['goals'] });
    },
  });

  const createGoalMutation = useMutation({
    mutationFn: (data) => base44.entities.BudgetGoal.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['goals'] });
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

// ==========================================
// SETTINGS PAGE HOOKS
// ==========================================

// Hook for settings form state and submission
export const useSettingsForm = (settings, updateSettings) => {
  const [formData, setFormData] = useState(settings);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Synchronize formData with global settings when they change
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

// ==========================================
// MINI BUDGETS PAGE HOOKS
// ==========================================

// Hook for fetching and filtering mini budgets data
export const useMiniBudgetsData = (user, selectedMonth, selectedYear) => {
  const { data: allMiniBudgets = [], isLoading } = useQuery({
    queryKey: ['miniBudgets'],
    queryFn: async () => {
      if (!user) return [];
      const all = await base44.entities.MiniBudget.list('-startDate');
      return all.filter(mb => mb.user_email === user.email);
    },
    initialData: [],
    enabled: !!user,
  });

  const miniBudgets = useMemo(() => {
    const monthStart = getFirstDayOfMonth(selectedMonth, selectedYear);
    const monthEnd = getLastDayOfMonth(selectedMonth, selectedYear);
    
    return allMiniBudgets.filter(mb => {
      return mb.startDate <= monthEnd && mb.endDate >= monthStart;
    });
  }, [allMiniBudgets, selectedMonth, selectedYear]);

  return {
    allMiniBudgets,
    miniBudgets,
    isLoading,
  };
};

// Hook for mini budgets period state
export const useMiniBudgetsPeriod = () => {
  const now = new Date();
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth());
  const [selectedYear, setSelectedYear] = useState(now.getFullYear());

  const displayDate = useMemo(() => {
    return new Date(selectedYear, selectedMonth);
  }, [selectedMonth, selectedYear]);

  return {
    selectedMonth,
    setSelectedMonth,
    selectedYear,
    setSelectedYear,
    displayDate,
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
      queryClient.invalidateQueries({ queryKey: ['miniBudgets'] });
      setShowForm(false);
      setEditingBudget(null);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.MiniBudget.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['miniBudgets'] });
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
      queryClient.invalidateQueries({ queryKey: ['miniBudgets'] });
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
    },
  });

  const updateStatusMutation = useMutation({
    mutationFn: ({ id, status }) => base44.entities.MiniBudget.update(id, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['miniBudgets'] });
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
    // Note: Deletion confirmation should be handled by parent component
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


// ==========================================
// BUDGETS PAGE HOOKS
// ==========================================

// Hook for fetching and processing budgets data
export const useBudgetsData = (user, selectedMonth, selectedYear) => {
  const monthStart = useMemo(() => getFirstDayOfMonth(selectedMonth, selectedYear), [selectedMonth, selectedYear]);
  const monthEnd = useMemo(() => getLastDayOfMonth(selectedMonth, selectedYear), [selectedMonth, selectedYear]);

  const { data: transactions = [], isLoading: loadingTransactions } = useQuery({
    queryKey: ['transactions'],
    queryFn: () => base44.entities.Transaction.list(), // Using list() as per outline, consider using '-date' for consistency
    initialData: [],
  });

  const { data: categories = [], isLoading: loadingCategories } = useQuery({
    queryKey: ['categories'],
    queryFn: () => base44.entities.Category.list(),
    initialData: [],
  });

  const { data: allMiniBudgets = [], isLoading: loadingMiniBudgets } = useQuery({
    queryKey: ['miniBudgets'],
    queryFn: async () => {
      if (!user) return [];
      const all = await base44.entities.MiniBudget.list('-startDate');
      return all.filter(mb => mb.user_email === user.email);
    },
    initialData: [],
    enabled: !!user,
  });

  const { data: systemBudgets = [], isLoading: loadingSystemBudgets } = useQuery({
    queryKey: ['systemBudgets', selectedMonth, selectedYear],
    queryFn: async () => {
      if (!user) return [];
      const all = await base44.entities.SystemBudget.list();
      return all.filter(sb => 
        sb.user_email === user.email &&
        sb.startDate === monthStart && 
        sb.endDate === monthEnd
      );
    },
    initialData: [],
    enabled: !!user,
  });

  // Filter custom budgets based on date overlap
  const customBudgets = useMemo(() => {
    return allMiniBudgets.filter(mb => {
      const start = new Date(mb.startDate);
      const end = new Date(mb.endDate);
      const selectedMonthStart = new Date(selectedYear, selectedMonth, 1);
      const selectedMonthEnd = new Date(selectedYear, selectedMonth + 1, 0);
      
      return (start <= selectedMonthEnd && end >= selectedMonthStart);
    });
  }, [allMiniBudgets, selectedMonth, selectedYear]);

  // Pre-calculate system budget stats
  const systemBudgetsWithStats = useMemo(() => {
    return systemBudgets.map(sb => {
      // getSystemBudgetStats is expected to be implemented in budgetCalculations.ts
      // It should calculate spent and remaining amounts for the system budget type
      // based on transactions and categories.
      const stats = getSystemBudgetStats(sb, transactions, categories, allMiniBudgets);
      return {
        ...sb,
        allocatedAmount: sb.budgetAmount,
        preCalculatedStats: stats
      };
    });
  }, [systemBudgets, transactions, categories, allMiniBudgets]);

  // Group custom budgets by status
  const groupedCustomBudgets = useMemo(() => {
    return customBudgets.reduce((acc, budget) => {
      const status = budget.status || 'active';
      if (status === 'archived') return acc; // Exclude archived budgets from grouping
      if (!acc[status]) acc[status] = [];
      acc[status].push(budget);
      return acc;
    }, {});
  }, [customBudgets]);

  return {
    transactions,
    categories,
    systemBudgetsWithStats,
    customBudgets,
    groupedCustomBudgets,
    isLoading: loadingTransactions || loadingCategories || loadingMiniBudgets || loadingSystemBudgets,
  };
};

// Hook for budget actions (CRUD operations and form state)
export const useBudgetActions = (user, transactions) => {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [editingBudget, setEditingBudget] = useState(null);

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.MiniBudget.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['miniBudgets'] });
      setShowForm(false);
      setEditingBudget(null);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.MiniBudget.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['miniBudgets'] });
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
      queryClient.invalidateQueries({ queryKey: ['miniBudgets'] });
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
    },
  });

  const updateStatusMutation = useMutation({
    mutationFn: ({ id, status }) => base44.entities.MiniBudget.update(id, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['miniBudgets'] });
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
    // Note: Deletion confirmation should be handled by parent component
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
