
import { useState, useMemo, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  calculateRemainingBudget,
  getCurrentMonthTransactions,
  getFirstDayOfMonth,
  getLastDayOfMonth,
  getUnpaidExpensesForMonth,
  getSystemBudgetStats
} from "../utils/budgetCalculations";

// ==========================================
// GENERIC HELPER HOOKS
// ==========================================

/**
 * Generic hook for user-filtered queries
 * Reduces boilerplate for queries that need user email filtering
 */
export const useUserFilteredQuery = (queryKey, fetcher, options = {}) => {
  return useQuery({
    queryKey,
    queryFn: async () => {
      if (!options.user) return [];
      return await fetcher(options.user);
    },
    initialData: [],
    enabled: !!options.user,
    ...options.queryOptions,
  });
};

// ==========================================
// CORE DATA HOOKS
// ==========================================

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
export const useTransactionsData = (startDate, endDate) => {
  const { data: transactions = [], isLoading: transactionsLoading } = useQuery({
    queryKey: ['transactions', startDate, endDate],
    queryFn: async () => {
      // If date range provided, use server-side filtering
      if (startDate && endDate) {
        return await base44.entities.Transaction.filter(
          { date: { '$gte': startDate, '$lte': endDate } },
          '-date'
        );
      }
      return await base44.entities.Transaction.list('-date');
    },
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
  const { data: goals = [], isLoading } = useUserFilteredQuery(
    ['goals'],
    async (user) => {
      const allGoals = await base44.entities.BudgetGoal.list();
      return allGoals.filter(g => g.user_email === user.email);
    },
    { user }
  );

  return { goals, isLoading };
};

// Hook for fetching all mini budgets
export const useAllMiniBudgets = (user) => {
  const { data: allMiniBudgets = [], isLoading } = useUserFilteredQuery(
    ['miniBudgets'],
    async (user) => {
      const all = await base44.entities.MiniBudget.list('-startDate');
      return all.filter(mb => mb.user_email === user.email);
    },
    { user }
  );

  return { allMiniBudgets, isLoading };
};

// Hook for fetching all system budgets
export const useAllSystemBudgets = (user) => {
  const { data: allSystemBudgets = [], isLoading } = useUserFilteredQuery(
    ['allSystemBudgets'],
    async (user) => {
      const all = await base44.entities.SystemBudget.list();
      return all.filter(sb => sb.user_email === user.email);
    },
    { user }
  );

  return { allSystemBudgets, isLoading };
};

// Hook for fetching system budgets for a specific month
export const useSystemBudgets = (user, selectedMonth, selectedYear) => {
  const monthStart = useMemo(() => getFirstDayOfMonth(selectedMonth, selectedYear), [selectedMonth, selectedYear]);
  const monthEnd = useMemo(() => getLastDayOfMonth(selectedMonth, selectedYear), [selectedMonth, selectedYear]);

  const { data: systemBudgets = [], isLoading } = useUserFilteredQuery(
    ['systemBudgets', selectedMonth, selectedYear],
    async (user) => {
      const all = await base44.entities.SystemBudget.list();
      return all.filter(sb => 
        sb.user_email === user.email &&
        sb.startDate === monthStart && 
        sb.endDate === monthEnd
      );
    },
    { user }
  );

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
  monthEnd,
  isSystemBudgetsLoading
) => {
  const queryClient = useQueryClient();
  
  // Track which period has been synced to prevent duplicate operations
  const [syncedPeriod, setSyncedPeriod] = useState(null);
  
  // NEW: Track if initial sync attempt has been made for this period
  // This prevents the effect from running multiple times before the mutation completes
  const [hasAttemptedSync, setHasAttemptedSync] = useState(null);
  
  const currentPeriodKey = `${selectedMonth}-${selectedYear}`;

  // Reset flags when month/year changes
  useEffect(() => {
    setSyncedPeriod(null);
    setHasAttemptedSync(null);
  }, [selectedMonth, selectedYear]);

  // Mutation for synchronizing system budgets
  const synchronizeBudgetsMutation = useMutation({
    mutationFn: async ({ user, goals, currentMonthIncome, systemBudgets, monthStart, monthEnd }) => {
      const systemTypes = ['needs', 'wants', 'savings'];
      const colors = { needs: '#EF4444', wants: '#F59E0B', savings: '#10B981' };
      
      const goalMap = goals.reduce((acc, goal) => {
        acc[goal.priority] = goal.target_percentage;
        return acc;
      }, {});
      
      const updates = [];

      for (const type of systemTypes) {
        const existingBudget = systemBudgets.find(sb => sb.systemBudgetType === type);
        const percentage = goalMap[type] || 0;
        const amount = parseFloat(((currentMonthIncome * percentage) / 100).toFixed(2));
        
        if (existingBudget) {
          if (Math.abs(existingBudget.budgetAmount - amount) > 0.01) {
            updates.push(
              base44.entities.SystemBudget.update(existingBudget.id, {
                budgetAmount: amount
              })
            );
          }
        } else {
          updates.push(
            base44.entities.SystemBudget.create({
              name: type.charAt(0).toUpperCase() + type.slice(1),
              budgetAmount: amount,
              startDate: monthStart,
              endDate: monthEnd,
              color: colors[type],
              user_email: user.email,
              systemBudgetType: type
            })
          );
        }
      }

      if (updates.length > 0) {
        await Promise.all(updates);
      }

      return updates.length;
    },
    onSuccess: (updatesCount) => {
      if (updatesCount > 0) {
        queryClient.invalidateQueries({ queryKey: ['systemBudgets'] });
        queryClient.invalidateQueries({ queryKey: ['allSystemBudgets'] });
      }
      // Mark this period as successfully synced
      setSyncedPeriod(currentPeriodKey);
    },
    onError: (error) => {
      console.error('Error synchronizing system budgets:', error);
      // Reset attempt flag on error to allow retry
      setHasAttemptedSync(null);
    },
  });

  useEffect(() => {
    // CRITICAL: Wait for systemBudgets to finish loading before making any decisions
    if (isSystemBudgetsLoading) {
      return;
    }

    // Exit early if we've already attempted sync for this period
    // This prevents multiple rapid attempts before mutation completes
    if (hasAttemptedSync === currentPeriodKey) {
      return;
    }

    // Exit early if already synced this period via mutation success
    if (syncedPeriod === currentPeriodKey) {
      return;
    }

    // Exit early if prerequisites not met
    if (!user || goals.length === 0 || !Array.isArray(systemBudgets) || synchronizeBudgetsMutation.isPending) {
      return;
    }

    // Check if all three system budget types exist for this period
    const systemTypes = ['needs', 'wants', 'savings'];
    const missingTypes = systemTypes.filter(type => 
      !systemBudgets.some(sb => sb.systemBudgetType === type)
    );

    // Calculate current month income
    const currentMonthIncome = getCurrentMonthTransactions(transactions, selectedMonth, selectedYear)
      .filter(t => t.type === 'income')
      .reduce((sum, t) => sum + t.amount, 0);

    // Build goal map for comparison
    const goalMap = goals.reduce((acc, goal) => {
      acc[goal.priority] = goal.target_percentage;
      return acc;
    }, {});

    // Check if any existing budgets need amount updates
    const needsUpdate = systemBudgets.some(sb => {
      const percentage = goalMap[sb.systemBudgetType] || 0;
      const expectedAmount = parseFloat(((currentMonthIncome * percentage) / 100).toFixed(2));
      return Math.abs(sb.budgetAmount - expectedAmount) > 0.01;
    });

    // Mark that we've attempted sync IMMEDIATELY before doing anything
    // This prevents race conditions where the effect runs multiple times
    setHasAttemptedSync(currentPeriodKey);

    // Only trigger mutation if:
    // 1. There are missing budget types for this period, OR
    // 2. Existing budgets need amount updates
    if (missingTypes.length > 0 || needsUpdate) {
      synchronizeBudgetsMutation.mutate({
        user,
        goals,
        currentMonthIncome,
        systemBudgets,
        monthStart,
        monthEnd
      });
    } else {
      // All budgets exist and are up-to-date, mark as synced without mutation
      setSyncedPeriod(currentPeriodKey);
    }
  }, [user, selectedMonth, selectedYear, goals.length, systemBudgets?.length, monthStart, monthEnd, isSystemBudgetsLoading, hasAttemptedSync, currentPeriodKey, transactions, synchronizeBudgetsMutation.isPending, syncedPeriod]);
};

// Hook for computing active budgets for the selected month
export const useActiveBudgets = (allMiniBudgets, allSystemBudgets, selectedMonth, selectedYear) => {
  // Calculate month boundaries once
  const monthStart = useMemo(() => getFirstDayOfMonth(selectedMonth, selectedYear), [selectedMonth, selectedYear]);
  const monthEnd = useMemo(() => getLastDayOfMonth(selectedMonth, selectedYear), [selectedMonth, selectedYear]);

  const activeMiniBudgets = useMemo(() => {
    return allMiniBudgets.filter(mb => {
      if (mb.status !== 'active' && mb.status !== 'completed') return false;
      return mb.startDate <= monthEnd && mb.endDate >= monthStart;
    });
  }, [allMiniBudgets, monthStart, monthEnd]);

  const allActiveBudgets = useMemo(() => {
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
  }, [allMiniBudgets, allSystemBudgets, monthStart, monthEnd]);

  return { activeMiniBudgets, allActiveBudgets };
};

// ==========================================
// CONSOLIDATED MINI BUDGET MANAGER
// ==========================================

/**
 * Comprehensive hook for managing MiniBudget entities
 * Consolidates CRUD operations and form state management
 * Used by Dashboard, MiniBudgets, and Budgets pages
 */
export const useMiniBudgetManager = (user, transactions) => {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [editingBudget, setEditingBudget] = useState(null);

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.MiniBudget.create({
      ...data,
      user_email: user?.email,
      isSystemBudget: false
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['miniBudgets'] });
      setShowForm(false);
      setEditingBudget(null);
    },
    onError: (error) => {
      console.error('Error creating mini budget:', error);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.MiniBudget.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['miniBudgets'] });
      setShowForm(false);
      setEditingBudget(null);
    },
    onError: (error) => {
      console.error('Error updating mini budget:', error);
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
    onError: (error) => {
      console.error('Error deleting mini budget:', error);
    },
  });

  const updateStatusMutation = useMutation({
    mutationFn: ({ id, status }) => base44.entities.MiniBudget.update(id, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['miniBudgets'] });
    },
    onError: (error) => {
      console.error('Error updating budget status:', error);
    },
  });

  const completeMutation = useMutation({
    mutationFn: async (id) => {
      const budgets = await base44.entities.MiniBudget.list(); // Fetch all to find the specific budget
      const targetBudget = budgets.find(mb => mb.id === id);
      if (!targetBudget) return;
      
      const budgetTransactions = transactions.filter(t => t.miniBudgetId === id && t.isPaid);
      const actualSpent = budgetTransactions.reduce((sum, t) => sum + t.amount, 0);
      
      await base44.entities.MiniBudget.update(id, { 
        status: 'completed',
        allocatedAmount: actualSpent,
        originalAllocatedAmount: targetBudget.originalAllocatedAmount || targetBudget.allocatedAmount
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['miniBudgets'] });
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
    },
    onError: (error) => {
      console.error('Error completing mini budget:', error);
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

  const handleComplete = (id) => {
    completeMutation.mutate(id);
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
    handleComplete,
    isSubmitting: createMutation.isPending || updateMutation.isPending,
    isDeleting: deleteMutation.isPending,
    isCompleting: completeMutation.isPending,
  };
};

// ==========================================
// TRANSACTION MUTATIONS
// ==========================================

// Hook for transaction mutations (used in Dashboard quick add)
export const useTransactionMutations = (onSuccess) => {
  const queryClient = useQueryClient();

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Transaction.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      queryClient.invalidateQueries({ queryKey: ['systemBudgets'] });
      if (onSuccess) onSuccess();
    },
    onError: (error) => {
      console.error('Error creating transaction:', error);
    },
  });

  return {
    createTransaction: createMutation.mutate,
    isCreating: createMutation.isPending,
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
export const useTransactionActions = () => {
  const queryClient = useQueryClient();

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Transaction.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
    },
    onError: (error) => {
      console.error('Error creating transaction:', error);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Transaction.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
    },
    onError: (error) => {
      console.error('Error updating transaction:', error);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Transaction.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
    },
    onError: (error) => {
      console.error('Error deleting transaction:', error);
    },
  });

  const handleSubmit = (data, editingTransaction, onSuccess) => {
    if (editingTransaction) {
      updateMutation.mutate({ id: editingTransaction.id, data }, {
        onSuccess: () => {
          if (onSuccess) onSuccess();
        }
      });
    } else {
      createMutation.mutate(data, {
        onSuccess: () => {
          if (onSuccess) onSuccess();
        }
      });
    }
  };

  const handleEdit = (transaction, setEditingTransaction, setShowForm) => {
    setEditingTransaction(transaction);
    setShowForm(true);
  };

  const handleDelete = (id) => {
    deleteMutation.mutate(id);
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
    onError: (error) => {
      console.error('Error creating category:', error);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Category.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] });
      setShowForm(false);
      setEditingCategory(null);
    },
    onError: (error) => {
      console.error('Error updating category:', error);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Category.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] });
    },
    onError: (error) => {
      console.error('Error deleting category:', error);
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
    deleteMutation.mutate(id);
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

  const { data: goals = [], isLoading: loadingGoals } = useUserFilteredQuery(
    ['goals'],
    async (user) => {
      const allGoals = await base44.entities.BudgetGoal.list();
      return allGoals.filter(g => g.user_email === user.email);
    },
    { user }
  );

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
    onError: (error) => {
      console.error('Error updating goal:', error);
    },
  });

  const createGoalMutation = useMutation({
    mutationFn: (data) => base44.entities.BudgetGoal.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['goals'] });
    },
    onError: (error) => {
      console.error('Error creating goal:', error);
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
  const { data: allMiniBudgets = [], isLoading } = useUserFilteredQuery(
    ['miniBudgets'],
    async (user) => {
      const all = await base44.entities.MiniBudget.list('-startDate');
      return all.filter(mb => mb.user_email === user.email);
    },
    { user }
  );

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
  // Delegate to the consolidated manager
  return useMiniBudgetManager(user, transactions);
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
    queryFn: () => base44.entities.Transaction.list(),
    initialData: [],
  });

  const { data: categories = [], isLoading: loadingCategories } = useQuery({
    queryKey: ['categories'],
    queryFn: () => base44.entities.Category.list(),
    initialData: [],
  });

  const { data: allMiniBudgets = [], isLoading: loadingMiniBudgets } = useUserFilteredQuery(
    ['miniBudgets'],
    async (user) => {
      const all = await base44.entities.MiniBudget.list('-startDate');
      return all.filter(mb => mb.user_email === user.email);
    },
    { user }
  );

  const { data: systemBudgets = [], isLoading: loadingSystemBudgets } = useUserFilteredQuery(
    ['systemBudgets', selectedMonth, selectedYear],
    async (user) => {
      const all = await base44.entities.SystemBudget.list();
      return all.filter(sb => 
        sb.user_email === user.email &&
        sb.startDate === monthStart && 
        sb.endDate === monthEnd
      );
    },
    { user }
  );

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
      if (!acc[status]) acc = { ...acc }; // Ensure acc is treated as an object for mutation
      if (!acc[status]) acc[status] = []; // Initialize if not present
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
  // Delegate to the consolidated manager
  return useMiniBudgetManager(user, transactions);
};
