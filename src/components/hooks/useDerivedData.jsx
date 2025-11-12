import { useMemo, useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
// UPDATED 13-Jan-2025: Added toLocalDateString and getMonthBoundaries imports for date standardization
import { parseDate, getFirstDayOfMonth, getLastDayOfMonth, toLocalDateString, getMonthBoundaries } from "../utils/dateUtils";
import { createEntityMap } from "../utils/generalUtils";
// UPDATED 12-Jan-2025: Changed import from expenseCalculations to financialCalculations
import {
    getTotalMonthExpenses,
    getPaidNeedsExpenses,
    getUnpaidNeedsExpenses,
    getDirectPaidWantsExpenses,
    getDirectUnpaidWantsExpenses,
    getPaidCustomBudgetExpenses,
    getUnpaidCustomBudgetExpenses,
    getMonthlyIncome,
    getMonthlyPaidExpenses,
} from "../utils/financialCalculations";
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
        // REFACTORED 13-Jan-2025: Use dateUtils functions instead of manual date creation
        const monthStart = new Date(selectedYear, selectedMonth, 1);
        const monthEnd = new Date(selectedYear, selectedMonth + 1, 0);

        return transactions.filter(t => {
            // For income, just check the date
            if (t.type === 'income') {
                const transactionDate = parseDate(t.date);
                return transactionDate >= monthStart && transactionDate <= monthEnd;
            }

            // For expenses, check if paid in this month
            if (!t.isPaid || !t.paidDate) return false;
            const paidDate = parseDate(t.paidDate);
            return paidDate >= monthStart && paidDate <= monthEnd;
        });
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

// REFACTORED 12-Jan-2025: Uses financialCalculations for income and expense aggregates
// REFACTORED 13-Jan-2025: Standardized month boundary calculation using dateUtils
export const useDashboardSummary = (transactions, selectedMonth, selectedYear, allCustomBudgets, systemBudgets, categories) => {
    const remainingBudget = useMemo(() => {
        // REFACTORED 13-Jan-2025: Use dateUtils functions for consistent month boundaries
        const monthStart = getFirstDayOfMonth(selectedMonth, selectedYear);
        const monthEnd = getLastDayOfMonth(selectedMonth, selectedYear);

        const income = getMonthlyIncome(transactions, monthStart, monthEnd);
        const paidExpenses = getMonthlyPaidExpenses(transactions, monthStart, monthEnd);

        // Add unpaid expenses for the month (exclude cash expenses from wallet)
        const unpaidExpenses = transactions
            .filter(t => {
                if (t.type !== 'expense') return false;
                if (t.isPaid) return false;
                if (t.isCashTransaction && t.cashTransactionType === 'expense_from_wallet') return false;

                const transactionDate = parseDate(t.date);
                const monthStartDate = parseDate(monthStart);
                const monthEndDate = parseDate(monthEnd);
                return transactionDate >= monthStartDate && transactionDate <= monthEndDate;
            })
            .reduce((sum, t) => sum + t.amount, 0);

        return income - paidExpenses - unpaidExpenses;
    }, [transactions, selectedMonth, selectedYear]);

    const currentMonthIncome = useMemo(() => {
        // REFACTORED 13-Jan-2025: Use dateUtils functions for consistent month boundaries
        const monthStart = getFirstDayOfMonth(selectedMonth, selectedYear);
        const monthEnd = getLastDayOfMonth(selectedMonth, selectedYear);
        return getMonthlyIncome(transactions, monthStart, monthEnd);
    }, [transactions, selectedMonth, selectedYear]);

    const currentMonthExpenses = useMemo(() => {
        // REFACTORED 13-Jan-2025: Use dateUtils functions for consistent month boundaries
        const monthStart = getFirstDayOfMonth(selectedMonth, selectedYear);
        const monthEnd = getLastDayOfMonth(selectedMonth, selectedYear);

        // Use centralized function that only counts actual expenses
        return getTotalMonthExpenses(transactions, categories, allCustomBudgets, monthStart, monthEnd);
    }, [transactions, selectedMonth, selectedYear, allCustomBudgets, categories]);

    return {
        remainingBudget,
        currentMonthIncome,
        currentMonthExpenses,
    };
};

// CRITICAL ENHANCEMENT (2025-01-12): Include planned budgets that overlap with the month
// REFACTORED 13-Jan-2025: Standardized month boundary calculation using dateUtils
export const useActiveBudgets = (allCustomBudgets, allSystemBudgets, selectedMonth, selectedYear) => {
    const activeCustomBudgets = useMemo(() => {
        // REFACTORED 13-Jan-2025: Use dateUtils functions for consistent month boundaries
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
        // REFACTORED 13-Jan-2025: Use dateUtils functions for consistent month boundaries
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
// REFACTORED 13-Jan-2025: Standardized month boundary calculation using dateUtils
export const useCustomBudgetsFiltered = (allCustomBudgets, selectedMonth, selectedYear) => {
    return useMemo(() => {
        // REFACTORED 13-Jan-2025: Use dateUtils functions for consistent month boundaries
        const monthStart = getFirstDayOfMonth(selectedMonth, selectedYear);
        const monthEnd = getLastDayOfMonth(selectedMonth, selectedYear);

        return allCustomBudgets.filter(cb => {
            return cb.startDate <= monthEnd && cb.endDate >= monthStart;
        });
    }, [allCustomBudgets, selectedMonth, selectedYear]);
};

// REFACTORED 12-Jan-2025: Updated to use granular expense functions from financialCalculations
// REFACTORED 13-Jan-2025: Standardized month boundary calculation using dateUtils
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

    // REFACTORED 12-Jan-2025: Calculate system budget stats using financialCalculations functions directly
    // REFACTORED 13-Jan-2025: Standardized month boundary calculation using dateUtils
    const systemBudgetsWithStats = useMemo(() => {
        // REFACTORED 13-Jan-2025: Use dateUtils functions for consistent month boundaries
        const monthStart = getFirstDayOfMonth(selectedMonth, selectedYear);
        const monthEnd = getLastDayOfMonth(selectedMonth, selectedYear);

        return systemBudgets.map(sb => {
            let paidAmount = 0;
            let unpaidAmount = 0;

            // Calculate paid and unpaid amounts using granular financialCalculations functions
            if (sb.systemBudgetType === 'needs') {
                paidAmount = getPaidNeedsExpenses(transactions, categories, monthStart, monthEnd, allCustomBudgets);
                unpaidAmount = getUnpaidNeedsExpenses(transactions, categories, monthStart, monthEnd, allCustomBudgets);
            } else if (sb.systemBudgetType === 'wants') {
                const directPaid = getDirectPaidWantsExpenses(transactions, categories, monthStart, monthEnd, allCustomBudgets);
                const customPaid = getPaidCustomBudgetExpenses(transactions, allCustomBudgets, monthStart, monthEnd);
                paidAmount = directPaid + customPaid;

                const directUnpaid = getDirectUnpaidWantsExpenses(transactions, categories, monthStart, monthEnd, allCustomBudgets);
                const customUnpaid = getUnpaidCustomBudgetExpenses(transactions, allCustomBudgets, monthStart, monthEnd);
                unpaidAmount = directUnpaid + customUnpaid;
            } else if (sb.systemBudgetType === 'savings') {
                // Savings uses needs calculation (manually track savings transfers)
                paidAmount = getPaidNeedsExpenses(transactions, categories, monthStart, monthEnd, allCustomBudgets);
                unpaidAmount = 0; // Savings typically doesn't have unpaid expenses
            }

            const totalSpent = paidAmount + unpaidAmount;
            const totalBudget = sb.budgetAmount;
            const remaining = totalBudget - totalSpent;
            const percentageUsed = totalBudget > 0 ? (totalSpent / totalBudget) * 100 : 0;

            const preCalculatedStats = {
                paidAmount,
                unpaidAmount,
                totalSpent,
                remaining,
                percentageUsed,
                paid: {
                    totalBaseCurrencyAmount: paidAmount,
                    foreignCurrencyDetails: []
                },
                unpaid: {
                    totalBaseCurrencyAmount: unpaidAmount,
                    foreignCurrencyDetails: []
                }
            };

            return {
                ...sb,
                allocatedAmount: sb.budgetAmount,
                preCalculatedStats
            };
        });
    }, [systemBudgets, transactions, categories, allCustomBudgets, selectedMonth, selectedYear]);

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
// REFACTORED 13-Jan-2025: Moved createLocalString logic to dateUtils.toLocalDateString
export const useTransactionFiltering = (transactions) => {
    const now = new Date();

    // REFACTORED 13-Jan-2025: Use toLocalDateString from dateUtils instead of inline function
    // This prevents timezone offset issues when converting dates to strings
    // DEPRECATED CODE (12-Nov-2025): Removed buggy toISOString() approach
    // const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
    // const currentMonthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0];

    // Calculate the first and last day of the current month (local time)
    const currentMonthStartDate = new Date(now.getFullYear(), now.getMonth(), 1);
    const currentMonthStart = toLocalDateString(currentMonthStartDate);

    const currentMonthEndDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    const currentMonthEnd = toLocalDateString(currentMonthEndDate);

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

// REFACTORED 13-Jan-2025: Updated to filter custom budget expenses by selected month's paidDate
// REFACTORED 13-Jan-2025: Standardized month boundary calculation using dateUtils
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

        const goalMap = createEntityMap(goals, 'priority', (goal) => goal.target_percentage);

        // Get date range from first system budget (they should all have the same range)
        const startDate = system.length > 0 ? system[0].startDate : null;
        const endDate = system.length > 0 ? system[0].endDate : null;

        // Parse month boundaries for filtering
        const monthStartDate = startDate ? parseDate(startDate) : null;
        const monthEndDate = endDate ? parseDate(endDate) : null;

        const systemBudgetsData = system.map(sb => {
            const targetPercentage = goalMap[sb.systemBudgetType] || 0;
            const targetAmount = sb.budgetAmount;

            let paidAmount = 0;
            let expectedAmount = 0;

            // Calculate using granular financialCalculations functions
            if (sb.systemBudgetType === 'wants') {
                const directPaid = getDirectPaidWantsExpenses(transactions, categories, startDate, endDate, allCustomBudgets);
                const customPaid = getPaidCustomBudgetExpenses(transactions, allCustomBudgets, startDate, endDate);
                paidAmount = directPaid + customPaid;

                const directUnpaid = getDirectUnpaidWantsExpenses(transactions, categories, startDate, endDate, allCustomBudgets);
                const customUnpaid = getUnpaidCustomBudgetExpenses(transactions, allCustomBudgets, startDate, endDate);
                expectedAmount = directUnpaid + customUnpaid;
            } else if (sb.systemBudgetType === 'needs') {
                paidAmount = getPaidNeedsExpenses(transactions, categories, startDate, endDate, allCustomBudgets);
                expectedAmount = getUnpaidNeedsExpenses(transactions, categories, startDate, endDate, allCustomBudgets);
            } else if (sb.systemBudgetType === 'savings') {
                paidAmount = getPaidNeedsExpenses(transactions, categories, startDate, endDate, allCustomBudgets);
                expectedAmount = 0;
            }

            const actualTotal = expectedAmount + paidAmount;
            const maxHeight = Math.max(targetAmount, actualTotal);
            const isOverBudget = actualTotal > targetAmount;
            const overBudgetAmount = isOverBudget ? actualTotal - targetAmount : 0;

            const stats = {
                paidAmount,
                unpaidAmount: expectedAmount,
                totalSpent: actualTotal,
                remaining: targetAmount - actualTotal
            };

            return {
                ...sb,
                stats,
                targetAmount,
                targetPercentage,
                expectedAmount,
                expectedSeparateCash: [],
                maxHeight,
                isOverBudget,
                overBudgetAmount
            };
        });

        // Custom budgets calculation - UPDATED to filter expenses by selected month's paidDate
        const customBudgetsData = custom.map(cb => {
            const budgetTransactions = transactions.filter(t => t.customBudgetId === cb.id);

            const digitalTransactions = budgetTransactions.filter(
                t => !t.isCashTransaction || t.cashTransactionType !== 'expense_from_wallet'
            );
            const cashTransactions = budgetTransactions.filter(
                t => t.isCashTransaction && t.cashTransactionType === 'expense_from_wallet'
            );

            const digitalAllocated = cb.allocatedAmount || 0;

            // UPDATED 13-Jan-2025: Filter by paidDate within selected month for paid expenses
            const digitalSpent = digitalTransactions
                .filter(t => {
                    if (t.type !== 'expense') return false;
                    if (!t.isPaid || !t.paidDate) return false;

                    // Filter by paidDate within selected month
                    if (monthStartDate && monthEndDate) {
                        const paidDate = parseDate(t.paidDate);
                        return paidDate >= monthStartDate && paidDate <= monthEndDate;
                    }
                    return true;
                })
                .reduce((sum, t) => sum + (t.originalAmount || t.amount), 0);

            const digitalUnpaid = digitalTransactions
                .filter(t => t.type === 'expense' && !t.isPaid)
                .reduce((sum, t) => sum + (t.originalAmount || t.amount), 0);

            const cashByCurrency = {};
            const cashAllocations = cb.cashAllocations || [];

            cashAllocations.forEach(allocation => {
                const currencyCode = allocation.currencyCode;
                const allocated = allocation.amount || 0;

                // UPDATED 13-Jan-2025: Filter by paidDate within selected month for paid expenses
                const spent = cashTransactions
                    .filter(t => {
                        if (t.type !== 'expense') return false;
                        if (t.cashCurrency !== currencyCode) return false;
                        if (!t.isPaid || !t.paidDate) return false;

                        // Filter by paidDate within selected month
                        if (monthStartDate && monthEndDate) {
                            const paidDate = parseDate(t.paidDate);
                            return paidDate >= monthStartDate && paidDate <= monthEndDate;
                        }
                        return true;
                    })
                    .reduce((sum, t) => sum + (t.cashAmount || 0), 0);

                cashByCurrency[currencyCode] = {
                    allocated,
                    spent,
                    remaining: allocated - spent
                };
            });

            let totalBudget = digitalAllocated;
            if (cashByCurrency) {
                Object.values(cashByCurrency).forEach(cashData => {
                    totalBudget += cashData?.allocated || 0;
                });
            }

            let paidAmount = digitalSpent; // Corrected: digitalSpent already represents paid transactions
            if (cashByCurrency) {
                Object.values(cashByCurrency).forEach(cashData => {
                    paidAmount += cashData?.spent || 0;
                });
            }

            const expectedAmount = digitalUnpaid;
            const totalSpent = paidAmount + expectedAmount;

            const maxHeight = Math.max(totalBudget, totalSpent);
            const isOverBudget = totalSpent > totalBudget;
            const overBudgetAmount = isOverBudget ? totalSpent - totalBudget : 0;

            return {
                ...cb,
                originalAllocatedAmount: cb.originalAllocatedAmount || cb.allocatedAmount,
                stats: {
                    paidAmount,
                    totalBudget,
                    digital: {
                        allocated: digitalAllocated,
                        spent: digitalSpent,
                        unpaid: digitalUnpaid
                    },
                    cashByCurrency
                },
                targetAmount: totalBudget,
                expectedAmount,
                maxHeight,
                isOverBudget,
                overBudgetAmount
            };
        });

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

// REFACTORED 13-Jan-2025: Major date handling standardization
// - Moved createLocalString logic to dateUtils.toLocalDateString
// - Replaced all manual month boundary calculations with dateUtils functions
// - Standardized use of getFirstDayOfMonth and getLastDayOfMonth throughout
// - Added getMonthBoundaries convenience function to dateUtils (not yet used here but available)
// - Removed inline date creation (new Date(year, month, ...)) where dateUtils functions can be used
// - This prevents timezone offset issues and ensures consistent date handling across the app