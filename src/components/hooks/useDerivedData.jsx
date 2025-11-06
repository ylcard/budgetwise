
import { useMemo, useState } from "react";
import {
  calculateRemainingBudget,
  getCurrentMonthTransactions,
  getFirstDayOfMonth,
  getLastDayOfMonth,
  getUnpaidExpensesForMonth,
  getSystemBudgetStats,
  getMiniBudgetStats,
  getDirectUnpaidExpenses,
  createEntityMap, // Added import
} from "../utils/budgetCalculations";
import { iconMap } from "../utils/iconMapConfig";
import { Circle } from "lucide-react";

// Hook for filtering paid transactions
export const usePaidTransactions = (transactions) => {
  return useMemo(() => {
    return transactions.filter(t => {
      if (t.type === 'income') return true;
      return t.isPaid === true;
    }).sort((a, b) => new Date(b.date) - new Date(a.date));
  }, [transactions]);
};

// Hook for transaction display logic (icon, colors, status)
export const useTransactionDisplay = (transaction, category) => {
  return useMemo(() => {
    const isIncome = transaction.type === 'income';
    const isPaid = transaction.isPaid;
    const IconComponent = category?.icon && iconMap[category.icon] ? iconMap[category.icon] : Circle;
    const iconColor = isIncome ? '#10B981' : (category?.color || '#94A3B8');
    const iconBgColor = `${iconColor}20`;
    
    return {
      isIncome,
      isPaid,
      IconComponent,
      iconColor,
      iconBgColor,
    };
  }, [transaction, category]);
};

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

// Hook for budget bars data calculations
export const useBudgetBarsData = (
  systemBudgets,
  miniBudgets,
  allMiniBudgets,
  transactions,
  categories,
  goals,
  monthlyIncome
) => {
  return useMemo(() => {
    const system = systemBudgets.sort((a, b) => {
      const order = { needs: 0, wants: 1, savings: 2 };
      return order[a.systemBudgetType] - order[b.systemBudgetType];
    });
    
    const custom = miniBudgets.filter(mb => mb.status === 'active' || mb.status === 'completed');
    
    const goalMap = goals.reduce((acc, goal) => {
      acc[goal.priority] = goal.target_percentage;
      return acc;
    }, {});
    
    const activeCustom = custom.filter(mb => mb.status === 'active');
        
    // Process system budgets
    const systemBudgetsData = system.map(sb => {
      const budgetForStats = {
        ...sb,
        allocatedAmount: sb.budgetAmount
      };
      
      const stats = getSystemBudgetStats(budgetForStats, transactions, categories, allMiniBudgets);
      const targetPercentage = goalMap[sb.systemBudgetType] || 0;
      const targetAmount = sb.budgetAmount;
      
      let expectedAmount = 0;
      
      if (sb.systemBudgetType === 'wants') {
        const directUnpaid = getDirectUnpaidExpenses(budgetForStats, transactions, categories, allMiniBudgets);
        
        const activeCustomExpected = activeCustom.reduce((sum, cb) => {
          const cbStats = getMiniBudgetStats(cb, transactions);
          return sum + (cb.allocatedAmount - cbStats.paidAmount);
        }, 0);
        
        expectedAmount = directUnpaid + activeCustomExpected;
      } else if (sb.systemBudgetType === 'needs') {
        expectedAmount = getDirectUnpaidExpenses(budgetForStats, transactions, categories, allMiniBudgets);
      } else if (sb.systemBudgetType === 'savings') {
        expectedAmount = 0;
      }
      
      const actualTotal = expectedAmount + stats.paidAmount;
      const maxHeight = Math.max(targetAmount, actualTotal);
      const isOverBudget = actualTotal > targetAmount;
      const overBudgetAmount = isOverBudget ? actualTotal - targetAmount : 0;
      
      return {
        ...sb,
        stats,
        targetAmount,
        targetPercentage,
        expectedAmount,
        maxHeight,
        isOverBudget,
        overBudgetAmount
      };
    });
    
    // Process custom budgets
    const customBudgetsData = custom.map(mb => {
      const stats = getMiniBudgetStats(mb, transactions);
      const maxHeight = Math.max(mb.allocatedAmount, stats.totalSpent);
      const isOverBudget = stats.totalSpent > mb.allocatedAmount;
      const overBudgetAmount = isOverBudget ? stats.totalSpent - mb.allocatedAmount : 0;
      
      return {
        ...mb,
        originalAllocatedAmount: mb.originalAllocatedAmount || mb.allocatedAmount,
        stats,
        maxHeight,
        isOverBudget,
        overBudgetAmount
      };
    });
    
    // Calculate savings
    const savingsBudget = systemBudgetsData.find(sb => sb.systemBudgetType === 'savings');
    const savingsTargetAmount = savingsBudget ? savingsBudget.targetAmount : 0;
    
    const needsBudget = systemBudgetsData.find(sb => sb.systemBudgetType === 'needs');
    const wantsBudget = systemBudgetsData.find(sb => sb.systemBudgetType === 'wants');
    
    const totalSpent = 
      (needsBudget ? needsBudget.stats.paidAmount + needsBudget.expectedAmount : 0) +
      (wantsBudget ? wantsBudget.stats.paidAmount + wantsBudget.expectedAmount : 0);
    
    const automaticSavings = Math.max(0, monthlyIncome - totalSpent);
    const manualSavings = savingsBudget ? savingsBudget.stats.paidAmount : 0;
    const totalActualSavings = automaticSavings + manualSavings;
    const savingsShortfall = Math.max(0, savingsTargetAmount - totalActualSavings);
    
    if (savingsBudget) {
      savingsBudget.actualSavings = totalActualSavings;
      savingsBudget.savingsTarget = savingsTargetAmount;
      savingsBudget.maxHeight = Math.max(savingsTargetAmount, totalActualSavings);
    }
    
    return { 
      systemBudgetsData, 
      customBudgetsData,
      totalActualSavings,
      savingsTarget: savingsTargetAmount,
      savingsShortfall
    };
  }, [systemBudgets, miniBudgets, allMiniBudgets, transactions, categories, goals, monthlyIncome]);
};

// Hook for monthly breakdown calculations
export const useMonthlyBreakdown = (transactions, categories, monthlyIncome) => {
  return useMemo(() => {
    const categoryMap = categories.reduce((acc, cat) => {
      acc[cat.id] = cat;
      return acc;
    }, {});

    const expensesByCategory = transactions
      .filter(t => t.type === 'expense')
      .reduce((acc, t) => {
        const categoryId = t.category_id || 'uncategorized';
        acc[categoryId] = (acc[categoryId] || 0) + t.amount;
        return acc;
      }, {});

    const totalExpenses = Object.values(expensesByCategory).reduce((sum, val) => sum + val, 0);

    const categoryBreakdown = Object.entries(expensesByCategory)
      .filter(([_, amount]) => amount > 0)
      .map(([categoryId, amount]) => {
        const category = categoryMap[categoryId];
        return {
          name: category?.name || 'Uncategorized',
          icon: category?.icon,
          color: category?.color || '#94A3B8',
          amount,
          percentage: monthlyIncome > 0 ? (amount / monthlyIncome) * 100 : 0,
          expensePercentage: totalExpenses > 0 ? (amount / totalExpenses) * 100 : 0
        };
      })
      .sort((a, b) => b.amount - a.amount);

    return {
      categoryBreakdown,
      totalExpenses
    };
  }, [transactions, categories, monthlyIncome]);
};

// Hook for priority chart data calculations
export const usePriorityChartData = (transactions, categories, goals, monthlyIncome) => {
  return useMemo(() => {
    const categoryMap = categories.reduce((acc, cat) => {
      acc[cat.id] = cat;
      return acc;
    }, {});

    const goalMap = goals.reduce((acc, goal) => {
      acc[goal.priority] = goal.target_percentage;
      return acc;
    }, {});

    const expensesByPriority = transactions
      .filter(t => t.type === 'expense' && t.category_id)
      .reduce((acc, t) => {
        const category = categoryMap[t.category_id];
        if (category) {
          const priority = category.priority;
          acc[priority] = (acc[priority] || 0) + t.amount;
        }
        return acc;
      }, {});

    const priorityConfig = {
      needs: { label: "Needs", color: "#EF4444" },
      wants: { label: "Wants", color: "#F59E0B" },
      savings: { label: "Savings", color: "#10B981" }
    };

    const chartData = Object.entries(priorityConfig)
      .map(([key, config]) => {
        const amount = expensesByPriority[key] || 0;
        const actual = monthlyIncome > 0 ? (amount / monthlyIncome) * 100 : 0;
        const target = goalMap[key] || 0;
        
        return {
          name: config.label,
          actual,
          target,
          color: config.color
        };
      })
      .filter(item => item.actual > 0 || item.target > 0);

    return chartData;
  }, [transactions, categories, goals, monthlyIncome]);
};
