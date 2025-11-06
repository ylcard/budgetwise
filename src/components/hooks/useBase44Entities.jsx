import { useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { QUERY_KEYS } from "./queryKeys";
import { getCurrentMonthTransactions } from "../utils/budgetCalculations";

// Hook for fetching transactions
export const useTransactions = () => {
  const { data: transactions = [], isLoading } = useQuery({
    queryKey: [QUERY_KEYS.TRANSACTIONS],
    queryFn: () => base44.entities.Transaction.list('-date'),
    initialData: [],
  });

  return { transactions, isLoading };
};

// Hook for fetching categories
export const useCategories = () => {
  const { data: categories = [], isLoading } = useQuery({
    queryKey: [QUERY_KEYS.CATEGORIES],
    queryFn: () => base44.entities.Category.list(),
    initialData: [],
  });

  return { categories, isLoading };
};

// Hook for fetching budget goals
export const useGoals = (user) => {
  const { data: goals = [], isLoading } = useQuery({
    queryKey: [QUERY_KEYS.GOALS],
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

// Hook for fetching all mini budgets for a user
export const useMiniBudgetsAll = (user) => {
  const { data: allMiniBudgets = [], isLoading } = useQuery({
    queryKey: [QUERY_KEYS.MINI_BUDGETS],
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

// Hook for fetching all system budgets for a user
export const useSystemBudgetsAll = (user) => {
  const { data: allSystemBudgets = [], isLoading } = useQuery({
    queryKey: [QUERY_KEYS.ALL_SYSTEM_BUDGETS],
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

// Hook for fetching system budgets for a specific period
export const useSystemBudgetsForPeriod = (user, monthStart, monthEnd) => {
  const { data: systemBudgets = [], isLoading } = useQuery({
    queryKey: [QUERY_KEYS.SYSTEM_BUDGETS, monthStart, monthEnd],
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
    enabled: !!user && !!monthStart && !!monthEnd,
  });

  return { systemBudgets, isLoading };
};

// Hook for fetching allocations for a budget
export const useAllocations = (budgetId) => {
  const { data: allocations = [], isLoading } = useQuery({
    queryKey: [QUERY_KEYS.ALLOCATIONS, budgetId],
    queryFn: async () => {
      const all = await base44.entities.MiniBudgetAllocation.list();
      return all.filter(a => a.miniBudgetId === budgetId);
    },
    initialData: [],
    enabled: !!budgetId,
  });

  return { allocations, isLoading };
};

// Hook for managing system budgets (create/update logic)
// IMPORTANT: This hook's duplicate detection logic must NOT be modified
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
          queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.SYSTEM_BUDGETS] });
          queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.ALL_SYSTEM_BUDGETS] });
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