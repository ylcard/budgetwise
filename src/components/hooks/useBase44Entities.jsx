import { useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useQueryClient, keepPreviousData } from "@tanstack/react-query";
import { QUERY_KEYS } from "./queryKeys";
import { getMonthlyIncome, getHistoricalAverageIncome } from "../utils/financialCalculations";
import { ensureSystemBudgetsExist } from "../utils/budgetInitialization";
import { useSettings } from "../utils/SettingsContext";

// Hook to fetch transactions
// DEPRECATED: export const useTransactions = () => {
// OPTIMIZATION: Accepts start/end date for server-side range filtering
export const useTransactions = (startDate = null, endDate = null) => {
    const { data: transactions = [], isLoading, error } = useQuery({
        // DEPRECATED: queryKey: [QUERY_KEYS.TRANSACTIONS],
        // DEPRECATED: queryFn: () => base44.entities.Transaction.list('date', 1000),
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
            // DEPRECATED: const allGoals = await base44.entities.BudgetGoal.list();
            // DEPRECATED: return allGoals.filter(g => g.user_email === user.email);
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
// DEPRECATED: export const useSystemBudgetsAll = (user) => {
// OPTIMIZATION: Added date filtering
export const useSystemBudgetsAll = (user, monthStart = null, monthEnd = null) => {
    const { data: allSystemBudgets = [], isLoading } = useQuery({
        // DEPRECATED: queryKey: [QUERY_KEYS.ALL_SYSTEM_BUDGETS],
        queryKey: [QUERY_KEYS.ALL_SYSTEM_BUDGETS, monthStart, monthEnd],
        queryFn: async () => {
            if (!user) return [];
            // DEPRECATED: const all = await base44.entities.SystemBudget.list();
            // DEPRECATED: return all.filter(sb => sb.user_email === user.email);

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
        // initialData: [],
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
            // DEPRECATED: const all = await base44.entities.CustomBudgetAllocation.list();
            // DEPRECATED: return all.filter(a => a.customBudgetId === budgetId);

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

            // DEPRECATED: const customBudgets = await base44.entities.CustomBudget.list();
            // DEPRECATED: const systemBudgets = await base44.entities.SystemBudget.list();

            // OPTIMIZATION: Filter by email at source
            const customBudgets = await base44.entities.CustomBudget.filter({ user_email: user.email });
            const systemBudgets = await base44.entities.SystemBudget.filter({ user_email: user.email });

            // BLOCK DEPRECATED
            // Include ALL custom budgets (both active and completed) - removed status filter
            // const userCustomBudgets = customBudgets.filter(cb => cb.user_email === user.email);
            // const userSystemBudgets = systemBudgets
            // .filter(sb => sb.user_email === user.email)
            // .map(sb => ({
            //     ...sb,
            //     isSystemBudget: true,
            //     allocatedAmount: sb.budgetAmount
            // }));

            const formattedSystem = systemBudgets.map(sb => ({
                ...sb, isSystemBudget: true, allocatedAmount: sb.budgetAmount
            }));
            // DEPRECATED: return [...userSystemBudgets, ...userCustomBudgets];
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
            // DEPRECATED: const allRules = await base44.entities.CategoryRule.list();
            // Filter by user and sort by priority (ascending)

            // OPTIMIZATION: Filter by email
            const allRules = await base44.entities.CategoryRule.filter({ user_email: user.email })

            return allRules
                // DEPRECATED .filter(r => r.user_email === user.email)
                .sort((a, b) => (a.priority || 0) - (b.priority || 0));
        },
        initialData: [],
        enabled: !!user,
    });

    return { rules, isLoading };
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
    const { settings } = useSettings();

    useEffect(() => {
        const sync = async () => {
            if (!user || goals.length === 0 || systemBudgets === undefined) return;

            const now = new Date();
            const isPastMonth = selectedYear < now.getFullYear() ||
                (selectedYear === now.getFullYear() && selectedMonth < now.getMonth());

            try {
                const income = getMonthlyIncome(transactions, monthStart, monthEnd);
                const history = getHistoricalAverageIncome(transactions, selectedMonth, selectedYear);

                // Orchestrate the call to the Engine (Single Source of Truth)
                await ensureSystemBudgetsExist(
                    user.email,
                    monthStart,
                    monthEnd,
                    goals,
                    settings,
                    income,
                    { allowUpdates: !isPastMonth, historicalAverage: history }
                );

                // Centralized Invalidation
                queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.SYSTEM_BUDGETS] });
                queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.ALL_SYSTEM_BUDGETS] });
            } catch (err) {
                console.error('System Budget Sync Failed:', err);
            }
        };

        sync();
    }, [user, selectedMonth, selectedYear, goals, transactions, settings, monthStart, monthEnd, queryClient, systemBudgets]);
};