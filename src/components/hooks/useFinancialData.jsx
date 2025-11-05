
import { useState, useMemo, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  calculateRemainingBudget,
  getCurrentMonthTransactions,
  getFirstDayOfMonth,
  getLastDayOfMonth,
  getUnpaidExpensesForMonth,
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
