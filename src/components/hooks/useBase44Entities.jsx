import { useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { QUERY_KEYS } from "./queryKeys";
import { getMonthlyIncome, resolveBudgetLimit } from "../utils/financialCalculations";
import { ensureSystemBudgetsExist } from "../utils/budgetInitialization";
import { useSettings } from "../utils/SettingsContext";

// Hook to fetch transactions
// OPTIMIZATION: Accepts start/end date for server-side range filtering
export const useTransactions = (startDate = null, endDate = null) => {
    const { data: transactions = [], isLoading, error } = useQuery({
        queryKey: [QUERY_KEYS.TRANSACTIONS, startDate, endDate],
        queryFn: async () => {
            if (startDate && endDate) {
                // When a range is requested (for Reports/Health), we need 
                // the full set for mathematical accuracy.
                return await base44.entities.Transaction.filter({
                    date: { $gte: startDate, $lte: endDate }
                }, '-date', 5000); // Increased limit to cover extreme high-frequency users
            }
            return await base44.entities.Transaction.list('-date', 500); // Smaller default list for general views
        },
        keepPreviousData: true, // Keeps "January" data visible while fetching "February"
    });

    return { transactions, isLoading, error };
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
            // OPTIMIZATION: Server-side email filter
            return await base44.entities.BudgetGoal.filter({ user_email: user.email });
        },
        initialData: [],
        enabled: !!user,
    });

    return { goals, isLoading };
};

// Hook for fetching custom budgets filtered by period
// RENAMED: 03-Feb-2026 - Was useCustomBudgetsAll, now useCustomBudgetsForPeriod for clarity
export const useCustomBudgetsForPeriod = (user, monthStart = null, monthEnd = null) => {
    const { data: customBudgets = [], isLoading } = useQuery({
        queryKey: [QUERY_KEYS.CUSTOM_BUDGETS, user?.email, monthStart, monthEnd],
        queryFn: async () => {
            if (!user) return [];

            if (monthStart && monthEnd) {
                // Overlap Logic: Start <= EndSelected AND End >= StartSelected
                return await base44.entities.CustomBudget.filter({
                    user_email: user.email,
                    startDate: { $lte: monthEnd },
                    endDate: { $gte: monthStart }
                });
            }

            return await base44.entities.CustomBudget.filter(
                { user_email: user.email },
                '-startDate',
                100
            );
        },
        keepPreviousData: true,
        enabled: !!user,
        initialData: [], // ADDED: 03-Feb-2026 - Prevent undefined returns
    });

    return { customBudgets, isLoading };
};

// Hook for fetching transactions associated with specific custom budgets
// CREATED: 03-Feb-2026 - Fetches all transactions for given custom budget IDs (no date filtering)
// UPDATED: 05-Feb-2026 - Renamed customBudgetId to budgetId
export const useTransactionsForCustomBudgets = (customBudgetIds = []) => {
    const { data: transactions = [], isLoading } = useQuery({
        queryKey: [QUERY_KEYS.TRANSACTIONS, 'custom-budgets', customBudgetIds],
        queryFn: async () => {
            if (!customBudgetIds || customBudgetIds.length === 0) return [];
            return await base44.entities.Transaction.filter({
                budgetId: { $in: customBudgetIds }
            });
        },
        keepPreviousData: true,
        enabled: customBudgetIds && customBudgetIds.length > 0,
        initialData: [], // ADDED: 03-Feb-2026 - Prevent undefined returns when query is disabled
    });

    return { transactions, isLoading };
};

// Hook for fetching all system budgets for a user
// OPTIMIZATION: Added date filtering
export const useSystemBudgetsAll = (user, monthStart = null, monthEnd = null) => {
    const { data: allSystemBudgets = [], isLoading } = useQuery({
        queryKey: [QUERY_KEYS.ALL_SYSTEM_BUDGETS, monthStart, monthEnd],
        queryFn: async () => {
            if (!user) return [];

            if (monthStart && monthEnd) {
                return await base44.entities.SystemBudget.filter({
                    user_email: user.email,
                    startDate: { $lte: monthEnd },
                    endDate: { $gte: monthStart }
                });
            }

            // OPTIMIZATION: Server-side email filter
            return await base44.entities.SystemBudget.filter({ user_email: user.email });
        },
        keepPreviousData: true,
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

            // OPTIMIZATION: Exact match filter
            return await base44.entities.SystemBudget.filter({
                user_email: user.email,
                startDate: monthStart,
                endDate: monthEnd
            });
        },
        // initialData: [],
        keepPreviousData: true,
        enabled: !!user && !!monthStart && !!monthEnd,
    });

    return { systemBudgets, isLoading };
};

// Hook for fetching allocations for a budget
export const useAllocations = (budgetId) => {
    const { data: allocations = [], isLoading } = useQuery({
        queryKey: [QUERY_KEYS.ALLOCATIONS, budgetId],
        queryFn: async () => {
            // OPTIMIZATION: Server-side ID filter
            return await base44.entities.CustomBudgetAllocation.filter({ customBudgetId: budgetId });
        },
        initialData: [],
        enabled: !!budgetId,
    });

    return { allocations, isLoading };
};

// Hook for fetching all budgets (custom + system) for a user
export const useAllBudgets = (user) => {
    const { data: allBudgets = [], isLoading } = useQuery({
        queryKey: [QUERY_KEYS.ALL_BUDGETS],
        queryFn: async () => {
            if (!user) return [];

            // OPTIMIZATION: Filter by email at source
            const customBudgets = await base44.entities.CustomBudget.filter({ user_email: user.email });
            const systemBudgets = await base44.entities.SystemBudget.filter({ user_email: user.email });

            const formattedSystem = systemBudgets.map(sb => ({
                ...sb, isSystemBudget: true, allocatedAmount: sb.budgetAmount
            }));
            return [...formattedSystem, ...customBudgets];
        },
        initialData: [],
        enabled: !!user,
    });

    return { allBudgets, isLoading };
};

// Hook for fetching category rules
export const useCategoryRules = (user) => {
    const { data: rules = [], isLoading } = useQuery({
        queryKey: ['CATEGORY_RULES'],
        queryFn: async () => {
            if (!user) return [];

            // OPTIMIZATION: Filter by email
            const allRules = await base44.entities.CategoryRule.filter({ user_email: user.email })

            return allRules
                .sort((a, b) => (a.priority || 0) - (b.priority || 0));
        },
        initialData: [],
        enabled: !!user,
    });

    return { rules, isLoading };
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
    const { settings } = useSettings();

    useEffect(() => {
        const ensureSystemBudgets = async () => {
            if (!user || goals.length === 0) return;

            // CRITICAL: Only create system budgets for the CURRENT month/year
            const now = new Date();
            const currentMonth = now.getMonth();
            const currentYear = now.getFullYear();

            // Allow CREATION for past months if missing, but restrict UPDATES to current month
            // This ensures historical data exists but preserves history from being overwritten by current goal changes
            // const isCurrentMonth = selectedMonth === currentMonth && selectedYear === currentYear;
            // Allow CREATION for past months if missing.
            // Allow UPDATES for Current and Future months (Planning Mode).
            // Lock UPDATES for Past months to preserve history.
            const isPastMonth =
                selectedYear < currentYear ||
                (selectedYear === currentYear && selectedMonth < currentMonth);

            const allowUpdates = !isPastMonth;

            try {
                // Use getMonthlyIncome from financialCalculations
                const currentMonthIncome = getMonthlyIncome(transactions, monthStart, monthEnd);

                // SINGLE SOURCE OF TRUTH: delegate creation and existence check
                const budgets = await ensureSystemBudgetsExist(
                    user.email,
                    monthStart,
                    monthEnd,
                    goals,
                    settings,
                    currentMonthIncome
                );

                let needsInvalidation = false;

                // Check for necessary updates on existing budgets
                for (const budget of Object.values(budgets)) {
                    const goal = goals.find(g => g.priority === budget.systemBudgetType);
                    const targetAmount = resolveBudgetLimit(goal, currentMonthIncome, settings);

                    const shouldUpdate = (allowUpdates || budget.budgetAmount === 0) &&
                        Math.abs((budget.budgetAmount || 0) - targetAmount) > 0.01;

                    if (shouldUpdate) {
                        await base44.entities.SystemBudget.update(budget.id, {
                            budgetAmount: parseFloat(targetAmount.toFixed(2))
                        });
                        needsInvalidation = true;
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

        // Only run if user, goals are loaded, and systemBudgets data has been fetched (not undefined)
        if (user && goals.length > 0 && systemBudgets !== undefined) {
            ensureSystemBudgets();
        }
    }, [user, selectedMonth, selectedYear, goals, systemBudgets, monthStart, monthEnd, queryClient, transactions]);
};