import { useMemo } from "react";
import {
  calculateRemainingBudget,
  getCurrentMonthTransactions,
  getFirstDayOfMonth,
  getLastDayOfMonth,
  getUnpaidExpensesForMonth,
  getSystemBudgetStats,
} from "../utils/budgetCalculations";

// Hook for filtering transactions by current month
export const useMonthlyTransactions = (transactions, selectedMonth, selectedYear) => {
  return useMemo(() => {
    return getCurrentMonthTransactions(transactions, selectedMonth, selectedYear);
  }, [transactions, selectedMonth, selectedYear]);
};

// Hook for calculating monthly income
export const useMonthlyIncome = (monthlyTransactions) => {
  return useMemo(() => {
    return monthlyTransactions
      .filter(t => t.type === 'income')
      .reduce((sum, t) => sum + t.amount, 0);
  }, [monthlyTransactions]);
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

// Hook for computing active budgets for the selected period
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

// Hook for filtering custom budgets by period
export const useMiniBudgetsFiltered = (allMiniBudgets, selectedMonth, selectedYear) => {
  return useMemo(() => {
    const monthStart = getFirstDayOfMonth(selectedMonth, selectedYear);
    const monthEnd = getLastDayOfMonth(selectedMonth, selectedYear);
    
    return allMiniBudgets.filter(mb => {
      return mb.startDate <= monthEnd && mb.endDate >= monthStart;
    });
  }, [allMiniBudgets, selectedMonth, selectedYear]);
};

// Hook for processing budgets data (for Budgets page)
export const useBudgetsAggregates = (
  transactions,
  categories,
  allMiniBudgets,
  systemBudgets,
  selectedMonth,
  selectedYear
) => {
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
      if (status === 'archived') return acc;
      if (!acc[status]) acc[status] = [];
      acc[status].push(budget);
      return acc;
    }, {});
  }, [customBudgets]);

  return {
    customBudgets,
    systemBudgetsWithStats,
    groupedCustomBudgets,
  };
};

// Hook for transaction filtering
export const useTransactionFiltering = (transactions) => {
  const now = new Date();
  const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
  const currentMonthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0];
  
  const [filters, setFilters] = React.useState({ 
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