import { useEffect, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { QUERY_KEYS } from "./queryKeys";
import { getMonthlyIncome, getHistoricalAverageIncome, snapshotFutureBudgets } from "../utils/financialCalculations";
import { ensureSystemBudgetsExist } from "../utils/budgetInitialization";
import { useSettings } from "../utils/SettingsContext";
import { DEFAULT_SYSTEM_CATEGORIES, DEFAULT_SYSTEM_GOALS } from "../utils/constants";
import { subDays, format } from "date-fns";
import { showToast } from "@/components/ui/use-toast";

// Hook for initial system setup
export const useSystemActions = (user) => {
    const queryClient = useQueryClient();
    const { settings } = useSettings();

    const initializeSystem = async () => {
        if (!user?.email || !settings) return;

        try {
            showToast({ title: "Initializing...", description: "Setting up your 50/30/20 budget..." });

            // 1. Create Categories
            const categoryPromises = DEFAULT_SYSTEM_CATEGORIES.map(cat =>
                base44.entities.Category.create({ ...cat, user_email: user.email })
            );

            // 2. Create Goals and trigger snapshots
            const goalPromises = DEFAULT_SYSTEM_GOALS.map(async (goal) => {
                const newGoal = await base44.entities.BudgetGoal.create({
                    ...goal,
                    user_email: user.email
                });
                // This ensures SystemBudgets are generated for the current/future months
                return snapshotFutureBudgets(newGoal, settings, user.email, [newGoal]);
            });

            await Promise.all([...categoryPromises, ...goalPromises]);

            // 3. Refresh everything
            await queryClient.invalidateQueries();

            showToast({
                title: "Setup Complete",
                description: "Your categories and 50/30/20 goals are ready.",
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

    return { initializeSystem };
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
            return await base44.entities.BudgetGoal.filter({ user_email: user.email });
        },
        initialData: [],
        enabled: !!user,
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
        initialData: [],
    });

    return { customBudgets, isLoading };
};

// Hook for fetching transactions associated with specific custom budgets
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
        initialData: [],
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
                    user_email: user.email,
                    startDate: { $lte: monthEnd },
                    endDate: { $gte: monthStart }
                });
            }
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
            return await base44.entities.SystemBudget.filter({
                user_email: user.email,
                startDate: monthStart,
                endDate: monthEnd
            });
        },
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
            const isCurrentMonth = selectedYear === now.getFullYear() && selectedMonth === now.getMonth();
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

                // PROACTIVE TRIGGER: If viewing current month, ensure the 12-month horizon is synced.
                // This fixes the "empty future months" issue without waiting for a goal update.
                if (isCurrentMonth && goals.length > 0) {
                    snapshotFutureBudgets(goals[0], settings, user.email, goals);
                }

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