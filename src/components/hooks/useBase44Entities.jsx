import { useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { QUERY_KEYS } from "./queryKeys";
import { getMonthlyIncome, resolveBudgetLimit } from "../utils/financialCalculations";
import { useSettings } from "../utils/SettingsContext";

// Hook to fetch transactions
export const useTransactions = () => {
    const { data: transactions = [], isLoading, error } = useQuery({
        queryKey: [QUERY_KEYS.TRANSACTIONS],
        queryFn: () => base44.entities.Transaction.list('date', 1000),
        initialData: [],
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
            const allGoals = await base44.entities.BudgetGoal.list();
            return allGoals.filter(g => g.user_email === user.email);
        },
        initialData: [],
        enabled: !!user,
    });

    return { goals, isLoading };
};

// Hook for fetching all custom budgets for a user
export const useCustomBudgetsAll = (user) => {
    const { data: allCustomBudgets = [], isLoading } = useQuery({
        queryKey: [QUERY_KEYS.CUSTOM_BUDGETS],
        queryFn: async () => {
            if (!user) return [];
            const all = await base44.entities.CustomBudget.list('-startDate');
            return all.filter(cb => cb.user_email === user.email);
        },
        initialData: [],
        enabled: !!user,
    });

    return { allCustomBudgets, isLoading };
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
            const all = await base44.entities.CustomBudgetAllocation.list();
            return all.filter(a => a.customBudgetId === budgetId);
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

            const customBudgets = await base44.entities.CustomBudget.list();
            const systemBudgets = await base44.entities.SystemBudget.list();

            // Include ALL custom budgets (both active and completed) - removed status filter
            const userCustomBudgets = customBudgets.filter(cb => cb.user_email === user.email);
            const userSystemBudgets = systemBudgets
                .filter(sb => sb.user_email === user.email)
                .map(sb => ({
                    ...sb,
                    isSystemBudget: true,
                    allocatedAmount: sb.budgetAmount
                }));

            return [...userSystemBudgets, ...userCustomBudgets];
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
            const allRules = await base44.entities.CategoryRule.list();
            // Filter by user and sort by priority (ascending)
            return allRules
                .filter(r => r.user_email === user.email)
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
                const systemTypes = ['needs', 'wants', 'savings'];
                const colors = { needs: '#448eefff', wants: '#F59E0B', savings: '#10B981' };

                // Use getMonthlyIncome from financialCalculations
                const currentMonthIncome = getMonthlyIncome(transactions, monthStart, monthEnd);

                // DEPRECATED
                // const goalMap = goals.reduce((acc, goal) => {
                //     acc[goal.priority] = goal.target_percentage;
                //     return acc;
                // }, {});

                let needsInvalidation = false;

                // --- Fixed Lifestyle Logic ---
                // Calculate raw amounts based on current Settings Mode (Absolute vs Percentage)
                let amounts = {};
                systemTypes.forEach(type => {
                    const goal = goals.find(g => g.priority === type);

                    // DEPRECATED BLOCK
                    // ABSOLUTE MODE CHECK (From Entity)
                    // if (goal && goal.is_absolute) {
                    //     amounts[type] = parseFloat(goal.target_amount || 0);
                    // } else {
                    //     // STANDARD PERCENTAGE MODE
                    //     const percentage = goalMap[type] || 0;
                    //     amounts[type] = parseFloat(((currentMonthIncome * percentage) / 100).toFixed(2));
                    // }

                    // Use centralized helper to determine the amount based on settings.goalMode
                    const rawAmount = resolveBudgetLimit(goal, currentMonthIncome, settings.goalMode);
                    amounts[type] = parseFloat(rawAmount.toFixed(2));
                });

                // DEPRECATED BLOCK
                // If Mode is ON, check if we should cap 'needs' and move surplus to 'savings'
                // if (settings?.fixedLifestyleMode && systemBudgets) {
                // Only applies if 'needs' is NOT absolute
                // const needsGoal = goals.find(g => g.priority === 'needs');
                // if ((!needsGoal || !needsGoal.is_absolute) && settings?.fixedLifestyleMode && systemBudgets) {

                // This logic ONLY applies in Percentage Mode. In Absolute Mode, the budget is already fixed by definition.
                const isPercentageMode = settings.goalMode !== false; // Default to true
                if (isPercentageMode && settings?.fixedLifestyleMode && systemBudgets) {
                    const existingNeeds = systemBudgets.find(sb => sb.systemBudgetType === 'needs');

                    // Only apply logic if we have a previous budget to compare against and income > 0
                    if (existingNeeds && existingNeeds.budgetAmount > 0 && currentMonthIncome > 0) {
                        // If the NEW calculated needs is higher than OLD needs, cap it.
                        if (amounts['needs'] > existingNeeds.budgetAmount) {
                            const surplus = amounts['needs'] - existingNeeds.budgetAmount;
                            amounts['needs'] = existingNeeds.budgetAmount; // Cap Needs
                            amounts['savings'] += surplus; // Move surplus to Savings
                            // 'wants' stays as calculated (percentage based)
                        }
                    }
                }

                for (const type of systemTypes) {
                    const existingBudget = systemBudgets.find(sb => sb.systemBudgetType === type);
                    // const percentage = goalMap[type] || 0;
                    // const amount = parseFloat(((currentMonthIncome * percentage) / 100).toFixed(2));
                    const amount = amounts[type];

                    if (existingBudget) {
                        // Only update if the calculated amount significantly differs to avoid unnecessary writes
                        // AND only if it's the current month (preserve history), OR if the existing amount is 0 (fix uninitialized history)
                        // const shouldUpdate = (isCurrentMonth || existingBudget.budgetAmount === 0) && Math.abs(existingBudget.budgetAmount - amount) > 0.01;
                        // AND only if it's NOT a past month (preserve history), OR if the existing amount is 0 (fix uninitialized history)
                        const shouldUpdate = (allowUpdates || existingBudget.budgetAmount === 0) && Math.abs(existingBudget.budgetAmount - amount) > 0.01;

                        if (shouldUpdate) {
                            await base44.entities.SystemBudget.update(existingBudget.id, {
                                budgetAmount: amount
                            });
                            needsInvalidation = true;
                        }
                    } else {
                        // Check for duplicates before creating to prevent race conditions or multiple creations
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

        // Only run if user, goals are loaded, and systemBudgets data has been fetched (not undefined)
        if (user && goals.length > 0 && systemBudgets !== undefined) {
            ensureSystemBudgets();
        }
    }, [user, selectedMonth, selectedYear, goals, systemBudgets, monthStart, monthEnd, queryClient, transactions]);
};
