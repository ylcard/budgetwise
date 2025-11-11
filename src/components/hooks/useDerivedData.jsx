
import { useMemo, useState } from "react";
import {
  calculateRemainingBudget,
  getCurrentMonthTransactions,
  getFirstDayOfMonth,
  getLastDayOfMonth,
  getUnpaidExpensesForMonth,
  getSystemBudgetStats,
  getCustomBudgetStats,
  getDirectUnpaidExpenses,
  createEntityMap,
  filterActiveCustomBudgets,
  shouldCountTowardBudget,
  parseDate,
} from "../utils/budgetCalculations";
import { calculateAggregatedRemainingAmounts } from "../utils/budgetAggregations";
import { PRIORITY_ORDER, PRIORITY_CONFIG } from "../utils/constants";
import { iconMap } from "../utils/iconMapConfig";
import { Circle } from "lucide-react";

// Hook for filtering paid transactions
export const usePaidTransactions = (transactions, limit = 10) => {
  return useMemo(() => {
    return transactions.filter(t => {
      if (t.type === 'income') return true;
      return t.isPaid === true;
    }).sort((a, b) => new Date(b.date) - new Date(a.date))
      .slice(0, limit);
  }, [transactions, limit]);
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
export const useDashboardSummary = (transactions, selectedMonth, selectedYear, allCustomBudgets, systemBudgets) => {
  const remainingBudget = useMemo(() => {
    return calculateRemainingBudget(transactions, selectedMonth, selectedYear);
  }, [transactions, selectedMonth, selectedYear]);

  const currentMonthIncome = useMemo(() => {
    return getCurrentMonthTransactions(transactions, selectedMonth, selectedYear)
      .filter(t => t.type === 'income')
      .reduce((sum, t) => sum + t.amount, 0);
  }, [transactions, selectedMonth, selectedYear]);

  const currentMonthExpenses = useMemo(() => {
    const monthStart = getFirstDayOfMonth(selectedMonth, selectedYear);
    const monthEnd = getLastDayOfMonth(selectedMonth, selectedYear);
    const monthStartDate = parseDate(monthStart);
    const monthEndDate = parseDate(monthEnd);

    // Sum ALL transactional expenses for the current month
    // For paid expenses: count if paidDate is in the month
    // For unpaid expenses: count if date is in the month
    const allTransactionalExpenses = transactions
      .filter(t => {
        if (t.type !== 'expense') return false;
        if (!shouldCountTowardBudget(t)) return false;

        // If paid, check paidDate
        if (t.isPaid && t.paidDate) {
          const paidDate = parseDate(t.paidDate);
          return paidDate >= monthStartDate && paidDate <= monthEndDate;
        }

        // If unpaid, check transaction date
        if (!t.isPaid) {
          const transactionDate = parseDate(t.date);
          return transactionDate >= monthStartDate && transactionDate <= monthEndDate;
        }

        return false; // Should not reach here for expense transactions not meeting previous criteria
      })
      .reduce((sum, t) => sum + t.amount, 0);

    // Add remaining DIGITAL amounts from active custom budgets
    // DO NOT add cash remaining - it's already counted via withdrawal transactions
    const activeCustomBudgets = allCustomBudgets.filter(cb => {
      if (cb.status !== 'active') return false;
      const cbStart = parseDate(cb.startDate);
      const cbEnd = parseDate(cb.endDate);
      return cbStart <= monthEndDate && cbEnd >= monthStartDate;
    });

    const customBudgetRemaining = activeCustomBudgets.reduce((sum, cb) => {
      const stats = getCustomBudgetStats(cb, transactions);
      // ONLY count digital remaining (cash is already counted via withdrawal)
      const digitalRemaining = stats.digital.remaining;
      return sum + Math.max(0, digitalRemaining);
    }, 0);

    return allTransactionalExpenses + customBudgetRemaining;
  }, [transactions, selectedMonth, selectedYear, allCustomBudgets]);

  return {
    remainingBudget,
    currentMonthIncome,
    currentMonthExpenses,
  };
};

// CRITICAL ENHANCEMENT (2025-01-12): Include planned budgets that overlap with the month
export const useActiveBudgets = (allCustomBudgets, allSystemBudgets, selectedMonth, selectedYear) => {
  const activeCustomBudgets = useMemo(() => {
    const monthStart = getFirstDayOfMonth(selectedMonth, selectedYear);
    const monthEnd = getLastDayOfMonth(selectedMonth, selectedYear);
    const monthStartDate = parseDate(monthStart);
    const monthEndDate = parseDate(monthEnd);

    return allCustomBudgets.filter(cb => {
      // Include active, completed, AND planned budgets that overlap with the month
      if (cb.status !== 'active' && cb.status !== 'completed' && cb.status !== 'planned') return false;
      
      const cbStart = parseDate(cb.startDate);
      const cbEnd = parseDate(cb.endDate);
      
      // Check if budget period overlaps with the selected month
      return cbStart <= monthEndDate && cbEnd >= monthStartDate;
    });
  }, [allCustomBudgets, selectedMonth, selectedYear]);

  const allActiveBudgets = useMemo(() => {
    const monthStart = getFirstDayOfMonth(selectedMonth, selectedYear);
    const monthEnd = getLastDayOfMonth(selectedMonth, selectedYear);
    const monthStartDate = parseDate(monthStart);
    const monthEndDate = parseDate(monthEnd);

    const activeCustom = allCustomBudgets.filter(cb => {
      // Include active, completed, AND planned budgets
      if (cb.status !== 'active' && cb.status !== 'completed' && cb.status !== 'planned') return false;
      
      const cbStart = parseDate(cb.startDate);
      const cbEnd = parseDate(cb.endDate);
      
      return cbStart <= monthEndDate && cbEnd >= monthStartDate;
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

    return [...activeSystem, ...activeCustom];
  }, [allCustomBudgets, allSystemBudgets, selectedMonth, selectedYear]);

  return { activeCustomBudgets, allActiveBudgets };
};

// Hook for filtering custom budgets by period
export const useCustomBudgetsFiltered = (allCustomBudgets, selectedMonth, selectedYear) => {
  return useMemo(() => {
    const monthStart = getFirstDayOfMonth(selectedMonth, selectedYear);
    const monthEnd = getLastDayOfMonth(selectedMonth, selectedYear);

    return allCustomBudgets.filter(cb => {
      return cb.startDate <= monthEnd && cb.endDate >= monthStart;
    });
  }, [allCustomBudgets, selectedMonth, selectedYear]);
};

// Hook for processing budgets data (for Budgets page)
// CRITICAL FIX (2025-01-12): Pass includeAggregatedRemaining=false to prevent double-counting
export const useBudgetsAggregates = (
  transactions,
  categories,
  allCustomBudgets,
  systemBudgets,
  selectedMonth,
  selectedYear
) => {
  // Filter custom budgets based on date overlap
  const customBudgets = useMemo(() => {
    return allCustomBudgets.filter(cb => {
      const start = new Date(cb.startDate);
      const end = new Date(cb.endDate);
      const selectedMonthStart = new Date(selectedYear, selectedMonth, 1);
      const selectedMonthEnd = new Date(selectedYear, selectedMonth + 1, 0);

      return (start <= selectedMonthEnd && end >= selectedMonthStart);
    });
  }, [allCustomBudgets, selectedMonth, selectedYear]);

  // Pre-calculate system budget stats
  const systemBudgetsWithStats = useMemo(() => {
    return systemBudgets.map(sb => {
      const budgetForStats = {
        ...sb,
        allocatedAmount: sb.budgetAmount
      };

      // CRITICAL FIX: Pass false to prevent including aggregated remaining in Budgets page cards
      const stats = getSystemBudgetStats(
        budgetForStats, 
        transactions, 
        categories, 
        allCustomBudgets,
        'USD', // This will be overridden by user's baseCurrency from settings
        false  // includeAggregatedRemaining = false for Budgets page
      );
      return {
        ...sb,
        allocatedAmount: sb.budgetAmount,
        preCalculatedStats: stats
      };
    });
  }, [systemBudgets, transactions, categories, allCustomBudgets]);

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
// UPDATED: Now uses calculateAggregatedRemainingAmounts for expectedAmount calculation
// KEPT: useBudgetBarsData uses includeAggregatedRemaining=true (default) for Dashboard
export const useBudgetBarsData = (
  systemBudgets,
  customBudgets,
  allCustomBudgets,
  transactions,
  categories,
  goals,
  monthlyIncome,
  baseCurrency
) => {
  return useMemo(() => {
    const system = systemBudgets.sort((a, b) => {
      return PRIORITY_ORDER[a.systemBudgetType] - PRIORITY_ORDER[b.systemBudgetType];
    });

    const custom = customBudgets;

    // Create goal map using enhanced createEntityMap with value extractor
    const goalMap = createEntityMap(goals, 'priority', (goal) => goal.target_percentage);

    // Process system budgets
    const systemBudgetsData = system.map(sb => {
      const budgetForStats = {
        ...sb,
        allocatedAmount: sb.budgetAmount
      };

      // Dashboard: Use default includeAggregatedRemaining=true
      const stats = getSystemBudgetStats(budgetForStats, transactions, categories, allCustomBudgets, baseCurrency);
      const targetPercentage = goalMap[sb.systemBudgetType] || 0;
      const targetAmount = sb.budgetAmount;

      let expectedAmount = 0;
      let expectedSeparateCash = [];

      if (sb.systemBudgetType === 'wants') {
        // UPDATED: Use the new shared aggregation function
        const aggregatedRemaining = calculateAggregatedRemainingAmounts(
          allCustomBudgets,
          transactions,
          baseCurrency
        );
        expectedAmount = aggregatedRemaining.mainSum;
        expectedSeparateCash = aggregatedRemaining.separateCashAmounts;

        // Add direct unpaid digital expenses
        const directUnpaid = getDirectUnpaidExpenses(budgetForStats, transactions, categories, allCustomBudgets);
        expectedAmount += directUnpaid;
      } else if (sb.systemBudgetType === 'needs') {
        expectedAmount = getDirectUnpaidExpenses(budgetForStats, transactions, categories, allCustomBudgets);
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
        expectedSeparateCash,
        maxHeight,
        isOverBudget,
        overBudgetAmount
      };
    });

    // Process custom budgets
    const customBudgetsData = custom.map(cb => {
      const stats = getCustomBudgetStats(cb, transactions);

      // Safely calculate total budget from digital and cash allocations
      let totalBudget = stats?.digital?.allocated || 0;
      if (stats?.cashByCurrency) {
        Object.values(stats.cashByCurrency).forEach(cashData => {
          totalBudget += cashData?.allocated || 0;
        });
      }

      // Calculate paid amount (digital spent + cash spent)
      // Cash expenses are always paid, digital can be paid or unpaid
      let paidAmount = (stats?.digital?.spent || 0) - (stats?.digital?.unpaid || 0);
      if (stats?.cashByCurrency) {
        Object.values(stats.cashByCurrency).forEach(cashData => {
          paidAmount += cashData?.spent || 0;
        });
      }

      // Calculate expected/unpaid amount (digital only, cash is always paid)
      const expectedAmount = stats?.digital?.unpaid || 0;

      // Calculate total spent (paid + unpaid)
      const totalSpent = paidAmount + expectedAmount;

      // Max height is the larger of allocated budget or total spent
      const maxHeight = Math.max(totalBudget, totalSpent);
      const isOverBudget = totalSpent > totalBudget;
      const overBudgetAmount = isOverBudget ? totalSpent - totalBudget : 0;

      return {
        ...cb,
        originalAllocatedAmount: cb.originalAllocatedAmount || cb.allocatedAmount,
        stats: {
          ...stats,
          paidAmount,
          totalBudget
        },
        targetAmount: totalBudget,
        expectedAmount,
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
  }, [systemBudgets, customBudgets, allCustomBudgets, transactions, categories, goals, monthlyIncome, baseCurrency]);
};

// Hook for monthly breakdown calculations
export const useMonthlyBreakdown = (transactions, categories, monthlyIncome) => {
  return useMemo(() => {
    const categoryMap = createEntityMap(categories);

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
    const categoryMap = createEntityMap(categories);
    const goalMap = createEntityMap(goals, 'priority', (goal) => goal.target_percentage);

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

    const chartData = Object.entries(PRIORITY_CONFIG)
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

// CRITICAL ENHANCEMENT (2025-01-12): Modified useActiveBudgets to include planned budgets
// Planned budgets that overlap with the selected month are now shown in Dashboard
