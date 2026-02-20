import { useEffect, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { QUERY_KEYS } from "./queryKeys";
import { getMonthlyIncome, getHistoricalAverageIncome } from "../utils/financialCalculations"; // Removed snapshot import
import { ensureSystemBudgetsExist, snapshotFutureBudgets } from "../utils/budgetInitialization";
import { useSettings } from "../utils/SettingsContext";
import { DEFAULT_SYSTEM_GOALS } from "../utils/constants";
import { subDays, format } from "date-fns";
import { showToast } from "@/components/ui/use-toast";
import { fetchWithRetry } from "../utils/generalUtils";

// Hook for initial system setup
export const useSystemActions = (user) => {
    const queryClient = useQueryClient();
    const { settings } = useSettings();

    const seedDefaults = async () => {
        if (!user?.email || !settings) return;

        try {
            showToast({ title: "Initializing...", description: "Setting up your 50/30/20 budget..." });

            // 0. SERVER-SIDE SAFETY CHECK
            // We fetch specific data for THIS user to prevent duplicates regardless of UI state
            const [existingGoals] = await Promise.all([
                fetchWithRetry(() => base44.entities.BudgetGoal.filter({ created_by: user.email }))
            ]);

            if (existingGoals.length > 0) {
                return;
            }

            // 1. Create Goals and trigger snapshots
            // Only create if specific priority doesn't exist
            const goalPromises = DEFAULT_SYSTEM_GOALS
                .filter(def => !existingGoals.some(ex => ex.priority === def.priority))
                .map(async (goal) => {
                    const newGoal = await fetchWithRetry(() => base44.entities.BudgetGoal.create({
                        ...goal,
                        created_by: user.email
                    }));
                    // This ensures SystemBudgets are generated for the current/future months
                    return snapshotFutureBudgets(newGoal, settings, user.email, [newGoal]);
                });

            await Promise.all([...goalPromises]);

            // 2. Refresh everything
            await queryClient.invalidateQueries();

            showToast({
                title: "Defaults Created",
                description: `Created ${goalPromises.length} goals.`,
            });
        } catch (error) {
            console.error("Initialization Failed:", error);
            showToast({
                title: "Setup Failed",
                description: "We couldn't initialize your defaults. Please try again.",
                variant: "destructive"
            });
        }
    };

    return { seedDefaults };
};

// Hook to fetch transactions
export const useTransactions = (startDate = null, endDate = null) => {
    const { data: transactions = [], isLoading, error } = useQuery({
        queryKey: [QUERY_KEYS.TRANSACTIONS, startDate, endDate],
        queryFn: async () => {
            if (startDate && endDate) {
                // SETTLEMENT VIEW FIX: Fetch 30 days prior to catch late-settling transactions
                // e.g. Transaction on Jan 31, Paid on Feb 2.
                const bufferStartDate = format(subDays(new Date(startDate), 30), 'yyyy-MM-dd');

                return await base44.entities.Transaction.filter({
                    date: { $gte: bufferStartDate, $lte: endDate }
                }, '-date', 5000);
            }
            return await base44.entities.Transaction.list('-date', 500);
        },
        keepPreviousData: true,
        staleTime: 1000 * 60 * 5,
    });

    return { transactions, isLoading, error };
};

// UPDATED 18-Feb-2026: Specialized hook for projection data
export const useHistoricalIncomeTransactions = (user) => {
    const { data: incomeTransactions = [] } = useQuery({
        queryKey: [QUERY_KEYS.TRANSACTIONS, 'history', user?.email],
        queryFn: async () => {
            if (!user) return [];
            // Fetch last 180 days (approx 6 months)
            const startDate = format(subDays(new Date(), 180), 'yyyy-MM-dd');
            return await base44.entities.Transaction.filter({
                type: 'income',
                date: { $gte: startDate }
            });
        },
        enabled: !!user,
        staleTime: 1000 * 60 * 60 * 24,
    });
    return { incomeTransactions };
};

// Hook for fetching budget goals
export const useGoals = (user) => {
    const { data: goals = [], isLoading } = useQuery({
        queryKey: [QUERY_KEYS.GOALS],
        queryFn: async () => {
            if (!user) return [];
            return await base44.entities.BudgetGoal.filter({ created_by: user.email });
        },
        enabled: !!user,
        staleTime: 1000 * 60 * 60,
    });

    return { goals, isLoading };
};

// Hook for fetching custom budgets filtered by period
export const useCustomBudgetsForPeriod = (user, monthStart = null, monthEnd = null) => {
    const { data: customBudgets = [], isLoading } = useQuery({
        queryKey: [QUERY_KEYS.CUSTOM_BUDGETS, user?.email, monthStart, monthEnd],
        queryFn: async () => {
            if (!user) return [];

            if (monthStart && monthEnd) {
                // Overlap Logic: Start <= EndSelected AND End >= StartSelected
                return await base44.entities.CustomBudget.filter({
                    created_by: user.email,
                    startDate: { $lte: monthEnd },
                    endDate: { $gte: monthStart }
                });
            }

            return await base44.entities.CustomBudget.filter(
                { created_by: user.email },
                '-startDate',
                100
            );
        },
        keepPreviousData: true,
        enabled: !!user,
        staleTime: 1000 * 60 * 5,
    });

    return { customBudgets, isLoading };
};

// Hook for fetching transactions associated with specific custom budgets
export const useTransactionsForCustomBudgets = (customBudgetIds = [], monthStart = null, monthEnd = null) => {
    const { data: transactions = [], isLoading } = useQuery({
        queryKey: [QUERY_KEYS.TRANSACTIONS, 'custom-budgets', customBudgetIds, monthStart, monthEnd],
        queryFn: async () => {
            if (!customBudgetIds || customBudgetIds.length === 0) return [];
            const filter = { budgetId: { $in: customBudgetIds } };
            if (monthStart && monthEnd) {
                filter.date = { $gte: monthStart, $lte: monthEnd };
            }
            return await base44.entities.Transaction.filter(filter);
        },
        keepPreviousData: true,
        enabled: customBudgetIds && customBudgetIds.length > 0,
        staleTime: 1000 * 60 * 5,
    });

    return { transactions, isLoading };
};

// Hook for fetching all system budgets for a user
export const useSystemBudgetsAll = (user, monthStart = null, monthEnd = null) => {
    const { data: allSystemBudgets = [], isLoading } = useQuery({
        queryKey: [QUERY_KEYS.ALL_SYSTEM_BUDGETS, monthStart, monthEnd],
        queryFn: async () => {
            if (!user) return [];
            if (monthStart && monthEnd) {
                return await base44.entities.SystemBudget.filter({
                    created_by: user.email,
                    startDate: { $lte: monthEnd },
                    endDate: { $gte: monthStart }
                });
            }
            return await base44.entities.SystemBudget.filter({ created_by: user.email });
        },
        keepPreviousData: true,
        enabled: !!user,
        staleTime: 1000 * 60 * 5,
    });

    return { allSystemBudgets, isLoading };
};

// Hook for fetching system budgets for a specific period
export const useSystemBudgetsForPeriod = (user, monthStart, monthEnd) => {
    const { data: systemBudgets = [], isLoading } = useQuery({
        queryKey: [QUERY_KEYS.SYSTEM_BUDGETS, monthStart, monthEnd],
        queryFn: async () => {
            if (!user) return [];
            return await base44.entities.SystemBudget.filter({
                created_by: user.email,
                startDate: monthStart,
                endDate: monthEnd
            });
        },
        keepPreviousData: true,
        enabled: !!user && !!monthStart && !!monthEnd,
        staleTime: 1000 * 60 * 5,
    });

    return { systemBudgets, isLoading };
};

// Hook for fetching allocations for a budget
export const useAllocations = (budgetId) => {
    const { data: allocations = [], isLoading } = useQuery({
        queryKey: [QUERY_KEYS.ALLOCATIONS, budgetId],
        queryFn: async () => {
            return await base44.entities.CustomBudgetAllocation.filter({ customBudgetId: budgetId });
        },
        enabled: !!budgetId,
        staleTime: 1000 * 60 * 5,
    });

    return { allocations, isLoading };
};

// Hook for fetching all budgets (custom + system) for a user
export const useAllBudgets = (user) => {
    const { data: allBudgets = [], isLoading } = useQuery({
        queryKey: [QUERY_KEYS.ALL_BUDGETS],
        queryFn: async () => {
            if (!user) return [];
            const customBudgets = await fetchWithRetry(() => base44.entities.CustomBudget.filter({ created_by: user.email }));
            const systemBudgets = await fetchWithRetry(() => base44.entities.SystemBudget.filter({ created_by: user.email }));

            const formattedSystem = systemBudgets.map(sb => ({
                ...sb, isSystemBudget: true, allocatedAmount: sb.budgetAmount
            }));
            return [...formattedSystem, ...customBudgets];
        },
        enabled: !!user,
        staleTime: 1000 * 60 * 5,
    });

    return { allBudgets, isLoading };
};

// Hook for fetching category rules
export const useCategoryRules = (user) => {
    const { data: rules = [], isLoading } = useQuery({
        queryKey: ['CATEGORY_RULES'],
        queryFn: async () => {
            if (!user) return [];
            const allRules = await base44.entities.CategoryRule.filter({ created_by: user.email })

            return allRules
                .sort((a, b) => (a.priority || 0) - (b.priority || 0));
        },
        enabled: !!user,
        staleTime: 1000 * 60 * 60,
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

    // ADDED: Prevent sync if one is already happening in this specific component instance
    const isSyncing = useRef(false);
    // ADDED: Track the last synced month/year to prevent redundant calls on re-renders
    const lastSyncedKey = useRef("");

    useEffect(() => {
        const sync = async () => {
            if (!user || goals.length === 0 || systemBudgets === undefined) return;

            const syncKey = `${selectedMonth}-${selectedYear}-${goals.length}-${settings.goalMode}-${settings.fixedLifestyleMode}`;

            // OPTIMIZATION: If we already synced this specific state, don't do it again
            // This prevents the "Invalidate -> Re-fetch -> Re-trigger" loop
            if (isSyncing.current || lastSyncedKey.current === syncKey) return;

            const now = new Date();
            const isPastMonth = selectedYear < now.getFullYear() ||
                (selectedYear === now.getFullYear() && selectedMonth < now.getMonth());

            try {
                isSyncing.current = true;

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

                lastSyncedKey.current = syncKey;

                // Centralized Invalidation
                // We only invalidate if there were NO budgets before, or if we allowed updates
                if (systemBudgets.length === 0 || !isPastMonth) {
                    queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.SYSTEM_BUDGETS] });
                    queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.ALL_SYSTEM_BUDGETS] });
                }
            } catch (err) {
                console.error('System Budget Sync Failed:', err);
            } finally {
                isSyncing.current = false;
            }
        };

        sync();
    }, [user, selectedMonth, selectedYear, goals, transactions, settings, monthStart, monthEnd, queryClient]);
};