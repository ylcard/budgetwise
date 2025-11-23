import { useMemo, useState } from "react";
import { parseDate, getFirstDayOfMonth, getLastDayOfMonth, getMonthBoundaries } from "../utils/dateUtils";
import { createEntityMap } from "../utils/generalUtils";
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
    getPaidSavingsExpenses,
    isCashExpense,
    getSystemBudgetStats,
    getCustomBudgetStats,
} from "../utils/financialCalculations";
import { FINANCIAL_PRIORITIES } from "../utils/constants";
import { getCategoryIcon } from "../utils/iconMapConfig";
import { Banknote } from "lucide-react";

/**
 * Hook for filtering and limiting paid transactions.
 * Paid transactions include all 'income' type transactions and any other transaction explicitly marked as paid (`isPaid: true`).
 * The results are sorted by date in descending order (latest first).
 *
 * @param {Array<Object>} transactions - The source array of all transactions.
 * @param {number} [limit=10] - The maximum number of transactions to return.
 * @returns {Array<Object>} A limited and sorted array of paid transactions.
 */
export const usePaidTransactions = (transactions, limit = 10) => {
    return useMemo(() => {
        if (!Array.isArray(transactions)) {
            return [];
        }
        return transactions.filter(t => {
            return t.type === 'income' || t.isPaid === true;
        }).sort((a, b) => new Date(b.date) - new Date(a.date))
            .slice(0, limit);
    }, [transactions, limit]);
};

/**
 * Hook for calculating and returning display properties (icon, colors, status) for a single transaction.
 *
 * @param {Object} transaction - The transaction object.
 * @param {Object} category - The associated category object.
 * @returns {{
 * isIncome: boolean,
 * isPaid: boolean,
 * IconComponent: React.ComponentType,
 * iconColor: string,
 * iconBgColor: string
 * }} Display configuration object.
 */
export const useTransactionDisplay = (transaction, category) => {
    return useMemo(() => {
        const isIncome = transaction.type === 'income';
        const isPaid = transaction.isPaid;

        const IconComponent = isIncome
            ? Banknote
            : getCategoryIcon(category?.icon);

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

/**
 * Hook for filtering transactions to include only those relevant to the selected month and year.
 * Income transactions are filtered by their primary date (`t.date`).
 * Expense transactions are filtered by their payment date (`t.paidDate`).
 * @param {Array<Object>} transactions - The source array of all transactions.
 * @param {number} selectedMonth - The zero-indexed month (0 for January, 11 for December).
 * @param {number} selectedYear - The four-digit year (e.g., 2025).
 * @returns {Array<Object>} An array of transactions relevant to the selected period.
 */
export const useMonthlyTransactions = (transactions, selectedMonth, selectedYear) => {
    return useMemo(() => {
        if (!Array.isArray(transactions) || selectedMonth === undefined || selectedYear === undefined) {
            return [];
        }

        const { monthStart: monthStartStr, monthEnd: monthEndStr } = getMonthBoundaries(selectedMonth, selectedYear);
        const start = parseDate(monthStartStr);
        const end = parseDate(monthEndStr);

        // Ensure start and end dates are valid before filtering
        if (!start || !end) return [];

        return transactions.filter((t) => {
            // For income, just check the date
            if (t.type === 'income') {
                const transactionDate = parseDate(t.date);

                return transactionDate >= start && transactionDate <= end;
            }

            // For expenses, check if paid in this month
            if (!t.isPaid || !t.paidDate) return false;
            const paidDate = parseDate(t.paidDate);

            return paidDate >= start && paidDate <= end;
        });
    }, [transactions, selectedMonth, selectedYear, getMonthBoundaries, parseDate]);
};

/**
 * Hook for calculating the total monthly income for a specific period.
 * This serves as a memoized wrapper around the financial utility function.
 * @param {Array<Object>} transactions - The source array of all transactions.
 * @param {number} selectedMonth - The zero-indexed month (0-11).
 * @param {number} selectedYear - The four-digit year (e.g., 2025).
 * @returns {number} The total sum of income transactions for the period.
 */
export const useMonthlyIncome = (transactions, selectedMonth, selectedYear) => {
    return useMemo(() => {
        if (!Array.isArray(transactions) || selectedMonth === undefined || selectedYear === undefined) {
            return 0;
        }
        const { monthStart, monthEnd } = getMonthBoundaries(selectedMonth, selectedYear);
        return getMonthlyIncome(transactions, monthStart, monthEnd);
    }, [transactions, selectedMonth, selectedYear, getMonthBoundaries, getMonthlyIncome]);
};

/**
 * Hook for calculating the key financial summary metrics for the dashboard view.
 * @param {Array<Object>} transactions - The source array of all transactions.
 * @param {number} selectedMonth - The zero-indexed month (0-11).
 * @param {number} selectedYear - The four-digit year (e.g., 2025).
 * @param {Array<Object>} allCustomBudgets - List of all custom budget objects.
 * @param {Array<Object>} systemBudgets - List of all system budget objects (unused in current logic, but passed).
 * @param {Array<Object>} categories - List of all category objects.
 * @returns {{
 * remainingBudget: number,
 * currentMonthIncome: number,
 * currentMonthExpenses: number
 * }} Dashboard summary metrics.
 */
export const useDashboardSummary = (transactions, selectedMonth, selectedYear, allCustomBudgets, systemBudgets, categories) => {
    // Centralized hook call for Income (must remain at top level)
    const currentMonthIncome = useMonthlyIncome(transactions, selectedMonth, selectedYear);

    // Memoize the month boundaries (used by all calculations)
    const { monthStartStr, monthEndStr, monthStartDate, monthEndDate } = useMemo(() => {
        if (selectedMonth === undefined || selectedYear === undefined) {
            return { monthStartStr: null, monthEndStr: null, monthStartDate: null, monthEndDate: null };
        }
        const { monthStart, monthEnd } = getMonthBoundaries(selectedMonth, selectedYear);

        return {
            monthStartStr: monthStart,
            monthEndStr: monthEnd,
            monthStartDate: parseDate(monthStart),
            monthEndDate: parseDate(monthEnd)
        };
    }, [selectedMonth, selectedYear, getMonthBoundaries, parseDate]);

    const remainingBudget = useMemo(() => {
        if (!Array.isArray(transactions) || selectedMonth === undefined || selectedYear === undefined) {
            return 0;
        }

        if (!monthStartStr || !monthEndStr || !monthStartDate || !monthEndDate) return 0;

        const income = currentMonthIncome;
        const paidExpenses = getMonthlyPaidExpenses(transactions, monthStartStr, monthEndStr);

        const unpaidExpenses = transactions
            .filter(t => {
                if (t.type !== 'expense') return false;
                if (t.isPaid) return false;
                if (isCashExpense(t)) return false;

                const transactionDate = parseDate(t.date);
                return transactionDate >= monthStartDate && transactionDate <= monthEndDate;
            })
            .reduce((sum, t) => sum + t.amount, 0);

        return income - paidExpenses - unpaidExpenses;
    }, [transactions, currentMonthIncome, monthStartStr, monthEndStr, monthStartDate, monthEndDate, getMonthlyPaidExpenses, parseDate, isCashExpense]);

    const currentMonthExpenses = useMemo(() => {
        if (!Array.isArray(transactions) || selectedMonth === undefined || selectedYear === undefined) {
            return 0;
        }

        if (!monthStartStr || !monthEndStr) return 0;

        return getTotalMonthExpenses(transactions, categories, allCustomBudgets, monthStartStr, monthEndStr);
    }, [transactions, allCustomBudgets, categories, monthStartStr, monthEndStr, getTotalMonthExpenses]);

    return {
        remainingBudget,
        currentMonthIncome,
        currentMonthExpenses,
    };
};

/**
 * Hook for filtering custom and system budgets that are active, completed, or planned
 * and overlap with the selected month/year.
 * @param {Array<Object>} allCustomBudgets - List of all custom budget objects.
 * @param {Array<Object>} allSystemBudgets - List of all system budget objects.
 * @param {number} selectedMonth - The zero-indexed month (0-11).
 * @param {number} selectedYear - The four-digit year (e.g., 2025).
 * @returns {{
 * activeCustomBudgets: Array<Object>,
 * allActiveBudgets: Array<Object>
 * }} Object containing filtered custom budgets and a combined list of all active budgets.
 */
export const useActiveBudgets = (allCustomBudgets, allSystemBudgets, selectedMonth, selectedYear) => {
    // 1. Memoize Month Boundaries (string and Date objects)
    const { monthStartStr, monthEndStr, monthStartDate, monthEndDate } = useMemo(() => {
        if (selectedMonth === undefined || selectedYear === undefined) {
            return { monthStartStr: null, monthEndStr: null, monthStartDate: null, monthEndDate: null };
        }
        const { monthStart, monthEnd } = getMonthBoundaries(selectedMonth, selectedYear);
        return {
            monthStartStr: monthStart,
            monthEndStr: monthEnd,
            monthStartDate: parseDate(monthStart),
            monthEndDate: parseDate(monthEnd)
        };
    }, [selectedMonth, selectedYear, getMonthBoundaries, parseDate]);

    const activeCustomBudgets = useMemo(() => {
        if (!Array.isArray(allCustomBudgets) || !monthStartDate || !monthEndDate) return [];

        return allCustomBudgets.filter(cb => {
            // Include active, completed, AND planned budgets that overlap with the month
            if (cb.status !== 'active' && cb.status !== 'completed' && cb.status !== 'planned') return false;

            const cbStart = parseDate(cb.startDate);
            const cbEnd = parseDate(cb.endDate);

            // Check if budget period overlaps with the selected month
            return cbStart <= monthEndDate && cbEnd >= monthStartDate;
        });
    }, [allCustomBudgets, monthStartDate, monthEndDate, parseDate]);

    const allActiveBudgets = useMemo(() => {
        if (!Array.isArray(allSystemBudgets) || !monthStartDate || !monthEndDate) {
            return activeCustomBudgets; // Return only customs if system array is invalid
        }

        const activeCustom = activeCustomBudgets;

        const activeSystem = allSystemBudgets
            .filter(sb => {
                // Ensure system budget dates are within the selected month's boundaries
                const sbStart = parseDate(sb.startDate);
                const sbEnd = parseDate(sb.endDate);
                // System budgets must be fully contained within the selected month
                return sbStart >= monthStartDate && sbEnd <= monthEndDate;
            })
            .map(sb => ({
                ...sb,
                allocatedAmount: sb.budgetAmount,
                isSystemBudget: true,
                status: 'active'
            }));

        return [...activeSystem, ...activeCustom];
    }, [activeCustomBudgets, allSystemBudgets, monthStartDate, monthEndDate, parseDate]);

    return { activeCustomBudgets, allActiveBudgets };
};

// Hook for filtering custom budgets by period
export const useCustomBudgetsFiltered = (allCustomBudgets, selectedMonth, selectedYear) => {
    return useMemo(() => {
        const monthStart = getFirstDayOfMonth(selectedMonth, selectedYear);
        const monthEnd = getLastDayOfMonth(selectedMonth, selectedYear);

        return allCustomBudgets.filter(cb => {
            const cbStart = parseDate(cb.startDate);
            const cbEnd = parseDate(cb.endDate);
            const monthStartDate = parseDate(monthStart);
            const monthEndDate = parseDate(monthEnd);

            return cbStart <= monthEndDate && cbEnd >= monthStartDate;
        });
    }, [allCustomBudgets, selectedMonth, selectedYear]);
};

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
        const { monthStart, monthEnd } = getMonthBoundaries(selectedMonth, selectedYear);
        const monthStartDate = parseDate(monthStart);
        const monthEndDate = parseDate(monthEnd);

        return allCustomBudgets.filter(cb => {
            const start = parseDate(cb.startDate);
            const end = parseDate(cb.endDate);

            // Comparing Date objects with Date objects (reliable comparison)
            return start <= monthEndDate && end >= monthStartDate;
        });
    }, [allCustomBudgets, selectedMonth, selectedYear]);

    // Get monthly income for savings calculation
    const monthlyIncome = useMonthlyIncome(transactions, selectedMonth, selectedYear);

    const systemBudgetsWithStats = useMemo(() => {
        const monthStart = getFirstDayOfMonth(selectedMonth, selectedYear);
        const monthEnd = getLastDayOfMonth(selectedMonth, selectedYear);

        return systemBudgets.map(sb => {
            /* let paidAmount = 0;
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
                paidAmount = getPaidSavingsExpenses(transactions, categories, monthStart, monthEnd, allCustomBudgets);
                unpaidAmount = 0; // Savings typically doesn't have unpaid expenses
            }*/
            // Use centralized calculation
            // const stats = getSystemBudgetStats(sb, transactions, categories, allCustomBudgets, monthStart, monthEnd);
            const stats = getSystemBudgetStats(sb, transactions, categories, allCustomBudgets, monthStart, monthEnd, monthlyIncome);

            /* const totalSpent = paidAmount + unpaidAmount;
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
            }; */
            // Extract values for backward compatibility if needed, or just pass the whole stats object
            const { paidAmount, unpaidAmount, totalSpent, remaining, percentageUsed } = stats;

            return {
                ...sb,
                allocatedAmount: sb.budgetAmount,
                // preCalculatedStats
                preCalculatedStats: stats
            };
        });
        // }, [systemBudgets, transactions, categories, allCustomBudgets, selectedMonth, selectedYear]);
    }, [systemBudgets, transactions, categories, allCustomBudgets, selectedMonth, selectedYear, monthlyIncome]);

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
    const { monthStart: currentMonthStart, monthEnd: currentMonthEnd } = getMonthBoundaries(now.getMonth(), now.getFullYear());

    const [filters, setFilters] = useState({
        type: 'all',
        category: [],
        paymentStatus: 'all',
        startDate: currentMonthStart,
        endDate: currentMonthEnd
    });

    const filteredTransactions = useMemo(() => {
        // Performance: Create Date objects once outside the loop
        let startFilterDate = null;
        let endFilterDate = null;

        if (filters.startDate && filters.endDate) {
            startFilterDate = new Date(filters.startDate);
            startFilterDate.setHours(0, 0, 0, 0);

            endFilterDate = new Date(filters.endDate);
            endFilterDate.setHours(0, 0, 0, 0);
        }
        return transactions.filter(t => {
            const typeMatch = filters.type === 'all' || t.type === filters.type;

            const categoryMatch = !filters.category || filters.category.length === 0 || filters.category.includes(t.category_id);

            const paymentStatusMatch = filters.paymentStatus === 'all' ||
                (filters.paymentStatus === 'paid' && t.isPaid) ||
                (filters.paymentStatus === 'unpaid' && !t.isPaid);

            let dateMatch = true;
            if (startFilterDate && endFilterDate) {
                const transactionDate = new Date(t.date);

                transactionDate.setHours(0, 0, 0, 0);

                dateMatch = transactionDate >= startFilterDate && transactionDate <= endFilterDate;
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
            const orderA = FINANCIAL_PRIORITIES[a.systemBudgetType]?.order ?? 99;
            const orderB = FINANCIAL_PRIORITIES[b.systemBudgetType]?.order ?? 99;
            return orderA - orderB;
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

            // Use centralized calculation
            // const stats = getSystemBudgetStats(sb, transactions, categories, allCustomBudgets, startDate, endDate);
            const stats = getSystemBudgetStats(sb, transactions, categories, allCustomBudgets, startDate, endDate, monthlyIncome);

            /* let paidAmount = 0;
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
                paidAmount = getPaidSavingsExpenses(transactions, categories, startDate, endDate, allCustomBudgets);
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
            }; */
            const maxHeight = Math.max(targetAmount, stats.totalSpent);
            const isOverBudget = stats.totalSpent > targetAmount;
            const overBudgetAmount = isOverBudget ? stats.totalSpent - targetAmount : 0;

            return {
                ...sb,
                // stats,
                stats: {
                    ...stats,
                    // Map keys to match BudgetBar expectations if different
                    unpaidAmount: stats.unpaidAmount
                },
                targetAmount,
                targetPercentage,
                // expectedAmount,
                expectedAmount: stats.unpaidAmount,
                expectedSeparateCash: [],
                maxHeight,
                isOverBudget,
                overBudgetAmount
            };
        });

        // Custom budgets calculation - UPDATED to filter expenses by selected month's paidDate
        const customBudgetsData = custom.map(cb => {
            /* const budgetTransactions = transactions.filter(t => t.customBudgetId === cb.id);
      
            const digitalTransactions = budgetTransactions.filter(
                t => !t.isCashTransaction || t.cashTransactionType !== 'expense_from_wallet'
            );
            const cashTransactions = budgetTransactions.filter(
                t => t.isCashTransaction && t.cashTransactionType === 'expense_from_wallet'
            );
      
            const digitalAllocated = cb.allocatedAmount || 0;
      
            // Filter by paidDate within selected month for paid expenses
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
      
                // Filter by paidDate within selected month for paid expenses
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
      
            let paidAmount = digitalSpent;
            if (cashByCurrency) {
                Object.values(cashByCurrency).forEach(cashData => {
                    paidAmount += cashData?.spent || 0;
                });
            }
      
            const expectedAmount = digitalUnpaid;
            const totalSpent = paidAmount + expectedAmount; */
            // Use centralized calculation
            const stats = getCustomBudgetStats(cb, transactions, monthStartDate, monthEndDate);

            // Calculate totals for BudgetBars
            let totalBudget = stats.digital.allocated;
            if (stats.cashByCurrency) {
                Object.values(stats.cashByCurrency).forEach(cashData => {
                    totalBudget += cashData?.allocated || 0;
                });
            }

            let paidAmount = stats.digital.spent;
            if (stats.cashByCurrency) {
                Object.values(stats.cashByCurrency).forEach(cashData => {
                    paidAmount += cashData?.spent || 0;
                });
            }

            const expectedAmount = stats.digital.unpaid;
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
                    /* digital: {
                        allocated: digitalAllocated,
                        spent: digitalSpent,
                        unpaid: digitalUnpaid
                    },
                    cashByCurrency */
                    totalAllocatedUnits: stats.totalAllocatedUnits,
                    totalSpentUnits: stats.totalSpentUnits,
                    totalUnpaidUnits: stats.totalUnpaidUnits,
                    digital: stats.digital,
                    cashByCurrency: stats.cashByCurrency
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

        // Properly integrate totalActualSavings into savingsBudget for BudgetBar rendering
        if (savingsBudget) {
            savingsBudget.actualSavings = totalActualSavings;
            savingsBudget.savingsTarget = savingsTargetAmount;
            savingsBudget.maxHeight = Math.max(savingsTargetAmount, totalActualSavings);

            // CRITICAL: Update stats.paidAmount to reflect total actual savings (automatic + manual)
            // This ensures the BudgetBar component renders the correct bar height and "Actual" label
            savingsBudget.stats.paidAmount = totalActualSavings;
            savingsBudget.stats.totalSpent = totalActualSavings;
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
export const useMonthlyBreakdown = (transactions, categories, monthlyIncome, allCustomBudgets = [], selectedMonth, selectedYear) => {
    return useMemo(() => {
        // 1. Get Date Boundaries for financial calculations
        // Default to current month if not provided (safeguard)
        const safeMonth = selectedMonth ?? new Date().getMonth();
        const safeYear = selectedYear ?? new Date().getFullYear();
        const { monthStart, monthEnd } = getMonthBoundaries(safeMonth, safeYear);

        // 2. Calculate Category Breakdown (Existing Logic)
        const categoryMap = createEntityMap(categories);

        const expensesByCategory = transactions
            .filter(t => t.type === 'expense')
            .reduce((acc, t) => {
                const categoryId = t.category_id || 'uncategorized';
                const amount = Number(t.amount) || 0;
                acc[categoryId] = (acc[categoryId] || 0) + amount;
                return acc;
            }, {});

        const totalExpenses = Object.values(expensesByCategory).reduce((sum, val) => sum + val, 0);

        const categoryBreakdown = Object.entries(expensesByCategory)
            .filter(([_, amount]) => amount > 0)
            .map(([categoryId, amount]) => {
                const category = categoryMap[categoryId];
                return {
                    id: categoryId,
                    name: category?.name || 'Uncategorized',
                    icon: category?.icon,
                    color: category?.color || '#94A3B8',
                    amount,
                    percentage: monthlyIncome > 0 ? (amount / monthlyIncome) * 100 : 0,
                    expensePercentage: totalExpenses > 0 ? (amount / totalExpenses) * 100 : 0
                };
            })
            .sort((a, b) => b.amount - a.amount);

        // 3. Calculate Needs & Wants using centralized financialCalculations
        // Needs = Paid + Unpaid Needs
        const paidNeeds = getPaidNeedsExpenses(transactions, categories, monthStart, monthEnd, allCustomBudgets);
        const unpaidNeeds = getUnpaidNeedsExpenses(transactions, categories, monthStart, monthEnd, allCustomBudgets);
        const needsTotal = paidNeeds + unpaidNeeds;

        // Wants = Direct Paid/Unpaid Wants + Custom Budgets (Paid/Unpaid)
        const directPaidWants = getDirectPaidWantsExpenses(transactions, categories, monthStart, monthEnd, allCustomBudgets);
        const directUnpaidWants = getDirectUnpaidWantsExpenses(transactions, categories, monthStart, monthEnd, allCustomBudgets);
        const customPaid = getPaidCustomBudgetExpenses(transactions, allCustomBudgets, monthStart, monthEnd);
        const customUnpaid = getUnpaidCustomBudgetExpenses(transactions, allCustomBudgets, monthStart, monthEnd);
        const wantsTotal = directPaidWants + directUnpaidWants + customPaid + customUnpaid;

        return {
            categoryBreakdown,
            totalExpenses,
            needsTotal,
            wantsTotal
        };
    }, [transactions, categories, monthlyIncome, allCustomBudgets, selectedMonth, selectedYear]);
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
                    const amount = Number(t.amount) || 0;
                    acc[priority] = (acc[priority] || 0) + amount;
                }
                return acc;
            }, {});

        const chartData = Object.entries(FINANCIAL_PRIORITIES)
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

/**
 * Hook for advanced transaction filtering including search, cash status, and multi-category.
 * @param {Array<Object>} transactions - The source array of all transactions.
 * @returns {{
 * filters: Object,
 * setFilters: Function,
 * filteredTransactions: Array<Object>
 * }}
 */
export const useAdvancedTransactionFiltering = (transactions) => {
    const now = new Date();
    const { monthStart: currentMonthStart, monthEnd: currentMonthEnd } = getMonthBoundaries(now.getMonth(), now.getFullYear());

    const [filters, setFilters] = useState({
        search: '',
        type: 'all',
        category: [], // Array for multi-select
        paymentStatus: 'all',
        cashStatus: 'all', // 'all', 'cash_only', 'exclude_cash'
        financialPriority: 'all', // 'all', 'needs', 'wants', 'savings'
        customBudgetId: 'all',
        startDate: currentMonthStart,
        endDate: currentMonthEnd
    });

    const filteredTransactions = useMemo(() => {
        let startFilterDate = null;
        let endFilterDate = null;

        if (filters.startDate && filters.endDate) {
            startFilterDate = new Date(filters.startDate);
            startFilterDate.setHours(0, 0, 0, 0);

            endFilterDate = new Date(filters.endDate);
            endFilterDate.setHours(0, 0, 0, 0);
        }

        const searchTerm = filters.search.toLowerCase().trim();

        return transactions.filter(t => {
            // 1. Search (Title)
            if (searchTerm && !t.title.toLowerCase().includes(searchTerm)) {
                return false;
            }

            // 2. Type
            if (filters.type !== 'all' && t.type !== filters.type) {
                return false;
            }

            // 3. Category (Multi-select)
            if (filters.category && filters.category.length > 0) {
                if (!filters.category.includes(t.category_id)) {
                    return false;
                }
            }

            // 4. Payment Status
            if (filters.paymentStatus !== 'all') {
                const isPaid = t.isPaid;
                if (filters.paymentStatus === 'paid' && !isPaid) return false;
                if (filters.paymentStatus === 'unpaid' && isPaid) return false;
            }

            // 5. Cash Status
            if (filters.cashStatus !== 'all') {
                const isCash = t.isCashTransaction;
                if (filters.cashStatus === 'cash_only' && !isCash) return false;
                if (filters.cashStatus === 'exclude_cash' && isCash) return false;
            }

            // 6. Financial Priority
            if (filters.financialPriority !== 'all') {
                if (t.financial_priority !== filters.financialPriority) return false;
            }

            // 7. Custom Budget
            if (filters.customBudgetId !== 'all') {
                if (t.customBudgetId !== filters.customBudgetId) return false;
            }

            // 8. Date Range
            if (startFilterDate && endFilterDate) {
                const transactionDate = new Date(t.date);
                transactionDate.setHours(0, 0, 0, 0);
                if (transactionDate < startFilterDate || transactionDate > endFilterDate) {
                    return false;
                }
            }

            return true;
        });
    }, [transactions, filters]);

    return {
        filters,
        setFilters,
        filteredTransactions,
    };
};
