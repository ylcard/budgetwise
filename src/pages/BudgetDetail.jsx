import { useMemo, useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CustomButton } from "@/components/ui/CustomButton";
import { Badge } from "@/components/ui/badge";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
import { ArrowLeft, DollarSign, TrendingDown, CheckCircle, Trash2, AlertCircle } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { useSettings } from "../components/utils/SettingsContext";
import { useConfirm } from "../components/ui/ConfirmDialogProvider";
import { formatCurrency, getCurrencySymbol } from "../components/utils/currencyUtils";
import { formatDate, parseDate } from "../components/utils/dateUtils";
import {
    getCustomBudgetStats,
    getSystemBudgetStats,
    getCustomBudgetAllocationStats,
} from "../components/utils/financialCalculations";
import { useCashWallet } from "../components/hooks/useBase44Entities";
import { useTransactionActions } from "../components/hooks/useActions";
import { calculateRemainingCashAllocations, returnCashToWallet } from "../components/utils/cashAllocationUtils";
import { useCustomBudgetActions } from "../components/hooks/useActions";
import { usePeriod } from "../components/hooks/usePeriod";
import { useMonthlyIncome } from "../components/hooks/useDerivedData";
import QuickAddTransaction from "../components/transactions/QuickAddTransaction";
import TransactionCard from "../components/transactions/TransactionCard";
import AllocationManager from "../components/custombudgets/AllocationManager";
import BudgetCard from "../components/budgets/BudgetCard";
import CustomBudgetForm from "../components/custombudgets/CustomBudgetForm";
import ExpensesCardContent from "../components/budgetdetail/ExpensesCardContent";
import { QUERY_KEYS } from "../components/hooks/queryKeys";

// Filters paid expenses by selected month
/* const getCustomBudgetStats = (customBudget, transactions, monthStart, monthEnd) => {
    const budgetTransactions = transactions.filter(t => t.customBudgetId === customBudget.id);

    // Parse month boundaries for filtering paid expenses
    const monthStartDate = parseDate(monthStart);
    const monthEndDate = parseDate(monthEnd);

    // Separate digital and cash transactions
    const digitalTransactions = budgetTransactions.filter(
        t => !t.isCashTransaction || t.cashTransactionType !== 'expense_from_wallet'
    );
    const cashTransactions = budgetTransactions.filter(
        t => t.isCashTransaction && t.cashTransactionType === 'expense_from_wallet'
    );

    // Calculate digital stats - ONLY include paid expenses that were paid within the selected month
    const digitalAllocated = customBudget.allocatedAmount || 0;
    const digitalSpent = digitalTransactions
        .filter(t => {
            if (t.type !== 'expense') return false;
            if (!t.isPaid || !t.paidDate) return false;

            // Filter by paidDate within selected month
            const paidDate = parseDate(t.paidDate);
            return paidDate >= monthStartDate && paidDate <= monthEndDate;
        })
        .reduce((sum, t) => sum + (t.originalAmount || t.amount), 0);

    const digitalUnpaid = digitalTransactions
        .filter(t => t.type === 'expense' && !t.isPaid)
        .reduce((sum, t) => sum + (t.originalAmount || t.amount), 0);
    const digitalRemaining = digitalAllocated - digitalSpent;

    // Calculate cash stats by currency - ONLY include paid expenses that were paid within the selected month
    const cashByCurrency = {};
    const cashAllocations = customBudget.cashAllocations || [];

    cashAllocations.forEach(allocation => {
        const currencyCode = allocation.currencyCode;
        const allocated = allocation.amount || 0;

        const spent = cashTransactions
            .filter(t => {
                if (t.type !== 'expense') return false;
                if (t.cashCurrency !== currencyCode) return false;
                if (!t.isPaid || !t.paidDate) return false;

                // Filter by paidDate within selected month
                const paidDate = parseDate(t.paidDate);
                return paidDate >= monthStartDate && paidDate <= monthEndDate;
            })
            .reduce((sum, t) => sum + (t.cashAmount || 0), 0);

        const remaining = allocated - spent;

        cashByCurrency[currencyCode] = {
            allocated,
            spent,
            remaining
        };
    });

    // Calculate unit-based totals
    const totalAllocatedUnits = digitalAllocated + cashAllocations.reduce((sum, alloc) => sum + alloc.amount, 0);
    const totalSpentUnits = digitalSpent + Object.values(cashByCurrency).reduce((sum, cashData) => sum + cashData.spent, 0);
    const totalUnpaidUnits = digitalUnpaid;

    return {
        digital: {
            allocated: digitalAllocated,
            spent: digitalSpent,
            unpaid: digitalUnpaid,
            remaining: digitalRemaining
        },
        cashByCurrency,
        totalAllocatedUnits,
        totalSpentUnits,
        totalUnpaidUnits,
        totalTransactionCount: budgetTransactions.length
    };
};

// Helper to calculate system budget stats using expenseCalculations functions
const getSystemBudgetStats = (systemBudget, transactions, categories, allCustomBudgets, startDate, endDate) => {
    let paidAmount = 0;
    let unpaidAmount = 0;

    if (systemBudget.systemBudgetType === 'needs') {
        paidAmount = getPaidNeedsExpenses(transactions, categories, startDate, endDate, allCustomBudgets);
        unpaidAmount = getUnpaidNeedsExpenses(transactions, categories, startDate, endDate, allCustomBudgets);
    } else if (systemBudget.systemBudgetType === 'wants') {
        const directPaid = getDirectPaidWantsExpenses(transactions, categories, startDate, endDate, allCustomBudgets);
        const customPaid = getPaidCustomBudgetExpenses(transactions, allCustomBudgets, startDate, endDate);
        paidAmount = directPaid + customPaid;

        const directUnpaid = getDirectUnpaidWantsExpenses(transactions, categories, startDate, endDate, allCustomBudgets);
        const customUnpaid = getUnpaidCustomBudgetExpenses(transactions, allCustomBudgets, startDate, endDate);
        unpaidAmount = directUnpaid + customUnpaid;
    } else if (systemBudget.systemBudgetType === 'savings') {
        paidAmount = getPaidSavingsExpenses(transactions, categories, startDate, endDate, allCustomBudgets);
        unpaidAmount = 0;
    }

    const totalBudget = systemBudget.budgetAmount || 0;
    const totalSpent = paidAmount + unpaidAmount;
    const remaining = totalBudget - totalSpent;
    const percentageUsed = totalBudget > 0 ? (totalSpent / totalBudget) * 100 : 0;

    return {
        paid: {
            totalBaseCurrencyAmount: paidAmount,
            foreignCurrencyDetails: []
        },
        unpaid: {
            totalBaseCurrencyAmount: unpaidAmount,
            foreignCurrencyDetails: []
        },
        totalSpent,
        paidAmount,
        unpaidAmount,
        remaining,
        percentageUsed,
        transactionCount: 0 // Could be calculated if needed
    };
};

// Helper for custom budget allocation stats
const getCustomBudgetAllocationStats = (customBudget, allocations, transactions) => {
    const budgetTransactions = transactions.filter(t => t.customBudgetId === customBudget.id);

    // Calculate total allocated
    const totalAllocated = allocations.reduce((sum, a) => sum + a.allocatedAmount, 0);
    const unallocated = customBudget.allocatedAmount - totalAllocated;

    // Calculate spending per category
    const categorySpending = {};
    allocations.forEach(allocation => {
        const spent = budgetTransactions
            .filter(t => t.type === 'expense' && t.category_id === allocation.categoryId)
            .reduce((sum, t) => sum + t.amount, 0);

        const remaining = allocation.allocatedAmount - spent;

        categorySpending[allocation.categoryId] = {
            allocated: allocation.allocatedAmount,
            spent,
            remaining,
            percentageUsed: allocation.allocatedAmount > 0 ? (spent / allocation.allocatedAmount) * 100 : 0
        };
    });

    // Calculate unallocated spending
    const allocatedCategoryIds = allocations.map(a => a.categoryId);
    const unallocatedSpent = budgetTransactions
        .filter(t => t.type === 'expense' && (!t.category_id || !allocatedCategoryIds.includes(t.category_id)))
        .reduce((sum, t) => sum + t.amount, 0);

    return {
        totalAllocated,
        unallocated,
        unallocatedSpent,
        unallocatedRemaining: unallocated - unallocatedSpent,
        categorySpending
    };
}; */

export default function BudgetDetail() {
    const { settings, user } = useSettings();
    const queryClient = useQueryClient();
    const location = useLocation();
    const [showQuickAdd, setShowQuickAdd] = useState(false);
    const { confirmAction } = useConfirm();

    const { monthStart, monthEnd } = usePeriod();

    // const urlParams = new URLSearchParams(window.location.search);
    const urlParams = new URLSearchParams(location.search);
    const budgetId = urlParams.get('id');

    const { cashWallet } = useCashWallet(user);

    useEffect(() => {
        if (budgetId) {
            queryClient.invalidateQueries({ queryKey: ['budget', budgetId] });
        }
    }, [budgetId, location, queryClient]);

    const { data: budget, isLoading: budgetLoading } = useQuery({
        queryKey: ['budget', budgetId],
        queryFn: async () => {
            if (!budgetId) return null;

            const allCustomBudgets = await base44.entities.CustomBudget.list();
            const customBudget = allCustomBudgets.find(cb => cb.id === budgetId);

            if (customBudget) {
                return { ...customBudget, isSystemBudget: customBudget.isSystemBudget || false };
            }

            const allSystemBudgets = await base44.entities.SystemBudget.list();
            const systemBudget = allSystemBudgets.find(sb => sb.id === budgetId);

            if (systemBudget) {
                return {
                    ...systemBudget,
                    isSystemBudget: true,
                    allocatedAmount: systemBudget.budgetAmount
                };
            }

            return null;
        },
        enabled: !!budgetId,
        retry: false,
    });

    const { data: transactions = [] } = useQuery({
        queryKey: ['transactions'],
        queryFn: () => base44.entities.Transaction.list('date', 1000),
        initialData: [],
    });

    // Fetch income for savings calculation
    const monthlyIncome = useMonthlyIncome(transactions, new Date(monthStart).getMonth(), new Date(monthStart).getFullYear());

    const { data: categories = [] } = useQuery({
        queryKey: ['categories'],
        queryFn: () => base44.entities.Category.list(),
        initialData: [],
    });

    const { data: allBudgets = [] } = useQuery({
        queryKey: ['allBudgets'],
        queryFn: async () => {
            const customB = await base44.entities.CustomBudget.list();
            const sysB = await base44.entities.SystemBudget.list();
            return [...customB, ...sysB.map(sb => ({ ...sb, isSystemBudget: true, allocatedAmount: sb.budgetAmount }))];
        },
        initialData: [],
    });

    const { data: allCustomBudgets = [] } = useQuery({
        queryKey: ['allCustomBudgets'],
        queryFn: async () => {
            const all = await base44.entities.CustomBudget.list();
            return all;
        },
        initialData: [],
    });

    const { data: allocations = [] } = useQuery({
        queryKey: ['allocations', budgetId],
        queryFn: async () => {
            const all = await base44.entities.CustomBudgetAllocation.list();
            return all.filter(a => a.customBudgetId === budgetId);
        },
        initialData: [],
        enabled: !!budgetId && budget && !budget.isSystemBudget,
    });

    const budgetActions = useCustomBudgetActions(user, transactions, cashWallet);

    const transactionActions = useTransactionActions(null, null, cashWallet);

    const createTransactionMutation = useMutation({
        mutationFn: (data) => base44.entities.Transaction.create(data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['transactions'] });
            queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.CASH_WALLET] });
            setShowQuickAdd(false);
        },
    });

    const createAllocationMutation = useMutation({
        mutationFn: (data) => base44.entities.CustomBudgetAllocation.create(data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['allocations', budgetId] });
        },
    });

    const updateAllocationMutation = useMutation({
        mutationFn: ({ id, data }) => base44.entities.CustomBudgetAllocation.update(id, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['allocations', budgetId] });
        },
    });

    const deleteAllocationMutation = useMutation({
        mutationFn: (id) => base44.entities.CustomBudgetAllocation.delete(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['allocations', budgetId] });
        },
    });

    const completeBudgetMutation = useMutation({
        mutationFn: async (id) => {
            const budgetToComplete = budget;
            if (!budgetToComplete) return;

            if (budgetToComplete.cashAllocations && budgetToComplete.cashAllocations.length > 0 && user) {
                const remaining = calculateRemainingCashAllocations(budgetToComplete, transactions);
                if (remaining.length > 0) {
                    await returnCashToWallet(
                        user.email,
                        remaining
                    );
                }
            }

            // Calculate the TOTAL original budget (Digital + All Cash Allocations) before we wipe them
            const currentDigitalAllocation = budgetToComplete.allocatedAmount || 0;
            const currentCashAllocation = (budgetToComplete.cashAllocations || []).reduce((sum, a) => sum + (a.amount || 0), 0);
            const totalOriginalBudget = currentDigitalAllocation + currentCashAllocation;

            const actualSpent = getCustomBudgetStats(budgetToComplete, transactions, monthStart, monthEnd).totalSpentUnits;

            await base44.entities.CustomBudget.update(id, {
                status: 'completed',
                allocatedAmount: actualSpent,
                // originalAllocatedAmount: budgetToComplete.originalAllocatedAmount || budgetToComplete.allocatedAmount,
                originalAllocatedAmount: budgetToComplete.originalAllocatedAmount || totalOriginalBudget,
                cashAllocations: []
            });
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['budget', budgetId] });
            queryClient.invalidateQueries({ queryKey: ['customBudgets'] });
            queryClient.invalidateQueries({ queryKey: ['cashWallet'] });
            queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.CASH_WALLET] });
        },
    });

    const reactivateBudgetMutation = useMutation({
        mutationFn: async (id) => {
            const budgetToReactivate = budget;
            if (!budgetToReactivate) return;

            await base44.entities.CustomBudget.update(id, {
                status: 'active',
                allocatedAmount: budgetToReactivate.originalAllocatedAmount || budgetToReactivate.allocatedAmount,
                originalAllocatedAmount: null,
                cashAllocations: []
            });
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['budget', budgetId] });
            queryClient.invalidateQueries({ queryKey: ['customBudgets'] });
        },
    });

    const budgetTransactions = useMemo(() => {
        if (!budget) return [];

        if (budget.isSystemBudget) {
            // 1. Ignore 'monthStart' (Global Context) because it overrides the specific 
            //    Budget ID we are viewing. If I view December Budget, I want Dec dates, 
            //    even if my global app state is November.
            // 2. Use 'parseDate' to ensure Local Midnight (00:00:00), fixing timezone bugs.

            const budgetStart = parseDate(budget.startDate);

            const budgetEnd = parseDate(budget.endDate);
            // Set end of day to ensure we catch expenses on the very last day
            if (budgetEnd) {
                budgetEnd.setHours(23, 59, 59, 999);
            }

            const allCustomBudgetIds = allCustomBudgets.map(cb => cb.id);

            return transactions.filter(t => {
                if (t.type !== 'expense' || !t.category_id) return false;

                const category = categories.find(c => c.id === t.category_id);
                if (!category || category.priority !== budget.systemBudgetType) return false;

                if (t.customBudgetId && allCustomBudgetIds.includes(t.customBudgetId)) {
                    return false;
                }

                if (t.isPaid && t.paidDate) {
                    const paidDate = parseDate(t.paidDate);
                    return paidDate >= budgetStart && paidDate <= budgetEnd;
                }

                if (!t.isPaid) {
                    const transactionDate = parseDate(t.date);
                    return transactionDate >= budgetStart && transactionDate <= budgetEnd;
                }

                return false;
            });
        } else {
            return transactions.filter(t => t.customBudgetId === budgetId);
        }
    }, [transactions, budgetId, budget, categories, allCustomBudgets]);

    const relatedCustomBudgetsForDisplay = useMemo(() => {
        if (!budget || !budget.isSystemBudget) return [];

        if (budget.systemBudgetType === 'needs') {
            return [];
        }

        if (budget.systemBudgetType === 'wants') {
            const budgetStart = new Date(budget.startDate);
            const budgetEnd = new Date(budget.endDate);
            const now = new Date();

            const filtered = allCustomBudgets.filter(cb => {
                if (cb.status !== 'active' && cb.status !== 'completed' && cb.status !== 'planned') return false;
                if (cb.isSystemBudget) return false;

                const cbStart = new Date(cb.startDate);
                const cbEnd = new Date(cb.endDate);
                return cbStart <= budgetEnd && cbEnd >= budgetStart;
            });

            return filtered.sort((a, b) => {
                if (a.status !== b.status) {
                    return a.status === 'active' ? -1 : 1;
                }

                const aStart = new Date(a.startDate);
                const bStart = new Date(b.startDate);
                const aDistance = Math.abs(aStart.getTime() - now.getTime());
                const bDistance = Math.abs(bStart.getTime() - now.getTime());

                return aDistance - bDistance;
            });
        }

        return [];
    }, [budget, allCustomBudgets]);

    const stats = useMemo(() => {
        if (!budget) return null;

        if (budget.isSystemBudget) {
            // return getSystemBudgetStats(budget, transactions, categories, allCustomBudgets, budget.startDate, budget.endDate);
            return getSystemBudgetStats(budget, transactions, categories, allCustomBudgets, budget.startDate, budget.endDate, monthlyIncome)
        } else {
            // return getCustomBudgetStats(budget, transactions, monthStart, monthEnd);
            return getCustomBudgetStats(budget, transactions, null, null);
        }
        // }, [budget, transactions, categories, allCustomBudgets, monthStart, monthEnd]);
    }, [budget, transactions, categories, allCustomBudgets, monthStart, monthEnd, monthlyIncome]);

    const allocationStats = useMemo(() => {
        if (!budget || budget.isSystemBudget) return null;
        return getCustomBudgetAllocationStats(budget, allocations, transactions);
    }, [budget, allocations, transactions]);

    const categoryMap = categories.reduce((acc, cat) => {
        acc[cat.id] = cat;
        return acc;
    }, {});

    const handleEditBudget = (data) => {
        budgetActions.handleSubmit(data, budget);
    };

    // Use handleDeleteDirect to avoid nested confirmation
    // Navigation now happens automatically via useDeleteEntity's onAfterSuccess callback in useCustomBudgetActions
    const handleDeleteBudget = () => {
        confirmAction(
            "Delete Budget",
            "This will delete the budget and all associated transactions. This action cannot be undone.",
            async () => {
                await budgetActions.handleDeleteDirect(budgetId);
                // Navigation moved to useDeleteEntity's onAfterSuccess to prevent premature redirect
                // The `budgetActions.handleDeleteDirect` (which wraps `useDeleteEntity`) is now responsible for navigation.
            },
            { destructive: true }
        );
    };

    useEffect(() => {
        if (!budgetId || (budget === null && !budgetLoading)) {
            const timer = setTimeout(() => {
                window.location.href = createPageUrl("Budgets");
            }, 2000);
            return () => clearTimeout(timer);
        }
    }, [budgetId, budget, budgetLoading]);

    if (!budgetId || (budget === null && !budgetLoading)) {
        return (
            <div className="min-h-screen p-4 md:p-8">
                <div className="max-w-7xl mx-auto">
                    <Card className="border-none shadow-lg">
                        <CardContent className="p-12 text-center">
                            <AlertCircle className="w-16 h-16 text-orange-500 mx-auto mb-4" />
                            <h2 className="text-2xl font-bold text-gray-900 mb-2">Budget Not Found</h2>
                            <p className="text-gray-600 mb-4">
                                The budget you're looking for doesn't exist or has been deleted.
                            </p>
                            <p className="text-sm text-gray-500">
                                Redirecting to budgets page...
                            </p>
                        </CardContent>
                    </Card>
                </div>
            </div>
        );
    }

    if (budgetLoading || !budget || !stats) {
        return (
            <div className="min-h-screen p-4 md:p-8">
                <div className="max-w-7xl mx-auto space-y-6">
                    <div className="flex items-center gap-4">
                        <div className="w-10 h-10 bg-gray-200 rounded animate-pulse" />
                        <div className="flex-1">
                            <div className="h-8 w-64 bg-gray-200 rounded animate-pulse mb-2" />
                            <div className="h-4 w-48 bg-gray-200 rounded animate-pulse" />
                        </div>
                    </div>

                    <div className="grid md:grid-cols-4 gap-4">
                        {[1, 2, 3, 4].map((i) => (
                            <Card key={i} className="border-none shadow-lg">
                                <CardContent className="p-6">
                                    <div className="h-4 w-24 bg-gray-200 rounded animate-pulse mb-2" />
                                    <div className="h-8 w-32 bg-gray-200 rounded animate-pulse" />
                                </CardContent>
                            </Card>
                        ))}
                    </div>

                    <Card className="border-none shadow-lg">
                        <CardContent className="p-6">
                            <div className="h-4 w-32 bg-gray-200 rounded animate-pulse mb-4" />
                            <div className="h-12 w-full bg-gray-200 rounded animate-pulse" />
                        </CardContent>
                    </Card>
                </div>
            </div>
        );
    }

    const canDelete = !budget.isSystemBudget;
    const isCompleted = budget.status === 'completed';
    const canEdit = !budget.isSystemBudget;

    let totalBudget = 0;
    let totalRemaining = 0;

    if (budget.isSystemBudget) {
        totalBudget = budget.budgetAmount || 0;
        totalRemaining = stats.remaining || 0;
    } else {
        totalBudget = stats?.totalAllocatedUnits || 0;

        // totalRemaining = stats?.digital?.remaining || 0;
        // if (stats?.cashByCurrency) {
        //     Object.values(stats.cashByCurrency).forEach(cashData => {
        //         totalRemaining += cashData?.remaining || 0;
        //     });
        // }
        totalRemaining = totalBudget - (stats?.totalSpentUnits || 0);
    }

    const hasBothDigitalAndCash = !budget.isSystemBudget &&
        stats?.digital !== undefined &&
        stats?.cashByCurrency &&
        Object.keys(stats.cashByCurrency).length > 0 &&
        (stats.digital.allocated > 0 || Object.values(stats.cashByCurrency).some(cashData => cashData.allocated > 0));

    return (
        <div className="min-h-screen p-4 md:p-8">
            <div className="max-w-7xl mx-auto space-y-6">
                <div className="flex items-center gap-4">
                    <Link to={createPageUrl("Budgets")}>
                        <CustomButton variant="ghost" size="icon">
                            <ArrowLeft className="w-5 h-5" />
                        </CustomButton>
                    </Link>
                    <div className="flex-1">
                        <div className="flex items-center gap-2">
                            <h1 className="text-3xl md:text-4xl font-bold text-gray-900">{budget.name}</h1>
                            {budget.isSystemBudget && (
                                <Badge variant="outline">System</Badge>
                            )}
                            {isCompleted && (
                                <Badge className="bg-green-100 text-green-800">Completed</Badge>
                            )}
                        </div>
                        <p className="text-gray-500 mt-1">
                            {formatDate(budget.startDate, settings.dateFormat)} - {formatDate(budget.endDate, settings.dateFormat)}
                        </p>
                    </div>
                    <div className="flex gap-2">
                        {canEdit && !isCompleted && (
                            <Popover open={budgetActions.showForm} onOpenChange={budgetActions.setShowForm}>
                                <PopoverTrigger asChild>
                                    <CustomButton variant="modify">
                                        Edit Budget
                                    </CustomButton>
                                </PopoverTrigger>
                                <PopoverContent
                                    className="w-[600px] max-h-[90vh] overflow-y-auto z-50"
                                    align="center"
                                    side="bottom"
                                    sideOffset={8}
                                >
                                    <div className="space-y-2">
                                        <h3 className="font-semibold text-lg">Edit Budget</h3>
                                        <CustomBudgetForm
                                            budget={budget}
                                            onSubmit={handleEditBudget}
                                            onCancel={() => budgetActions.setShowForm(false)}
                                            isSubmitting={budgetActions.isSubmitting}
                                            cashWallet={cashWallet}
                                            baseCurrency={settings.baseCurrency}
                                            settings={settings}
                                        />
                                    </div>
                                </PopoverContent>
                            </Popover>
                        )}
                        {!budget.isSystemBudget && budget.status === 'active' && (
                            <CustomButton
                                variant="success"
                                onClick={() => completeBudgetMutation.mutate(budgetId)}
                                disabled={completeBudgetMutation.isPending}
                            >
                                <CheckCircle className="w-4 h-4 mr-2" />
                                Complete
                            </CustomButton>
                        )}
                        {!budget.isSystemBudget && budget.status === 'completed' && (
                            <CustomButton
                                variant="success"
                                onClick={() => reactivateBudgetMutation.mutate(budgetId)}
                                disabled={reactivateBudgetMutation.isPending}
                            >
                                Reactivate
                            </CustomButton>
                        )}
                        {canDelete && (
                            <CustomButton
                                variant="delete"
                                onClick={handleDeleteBudget}
                            >
                                <Trash2 className="w-4 h-4 mr-2" />
                                Delete
                            </CustomButton>
                        )}
                    </div>
                </div>

                <div className="grid md:grid-cols-3 gap-4">
                    <Card className="border-none shadow-lg">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium text-gray-500">Budget</CardTitle>
                            <DollarSign className="w-4 h-4 text-blue-500" />
                        </CardHeader>
                        <CardContent>
                            {hasBothDigitalAndCash ? (
                                <div className="space-y-3">
                                    <div className="text-center pb-2 border-b">
                                        <p className="text-sm text-gray-500 mb-1">Total</p>
                                        <div className="text-lg font-bold text-gray-900">
                                            {formatCurrency(totalBudget, settings)}
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-2 gap-3">
                                        <div className="flex flex-col items-center justify-center">
                                            <p className="text-xs text-gray-500 mb-1">Card</p>
                                            <div className="text-base font-semibold text-gray-900">
                                                {formatCurrency(stats.digital.allocated, settings)}
                                            </div>
                                        </div>
                                        <div className="flex flex-col items-center justify-center">
                                            <p className="text-xs text-gray-500 mb-1">Cash</p>
                                            {Object.entries(stats.cashByCurrency).map(([currency, data]) => (
                                                <div key={currency} className="text-base font-semibold text-gray-900">
                                                    {formatCurrency(data.allocated, { ...settings, currencySymbol: getCurrencySymbol(currency) })}
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <div className="text-center">
                                    <div className="text-lg font-bold text-gray-900">
                                        {formatCurrency(totalBudget, settings)}
                                    </div>
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    <Card className="border-none shadow-lg">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium text-gray-500">Expenses</CardTitle>
                            <TrendingDown className="w-4 h-4 text-red-500" />
                        </CardHeader>
                        <CardContent>
                            <ExpensesCardContent budget={budget} stats={stats} settings={settings} />
                        </CardContent>
                    </Card>

                    <Card className="border-none shadow-lg">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium text-gray-500">Remaining</CardTitle>
                            <CheckCircle className="w-4 h-4 text-green-500" />
                        </CardHeader>
                        <CardContent>
                            {hasBothDigitalAndCash ? (
                                <div className="space-y-3">
                                    <div className="text-center pb-2 border-b">
                                        <p className="text-sm text-gray-500 mb-1">Total</p>
                                        <div className={`text-lg font-bold ${totalRemaining >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                            {formatCurrency(totalRemaining, settings)}
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-2 gap-3">
                                        <div className="flex flex-col items-center justify-center">
                                            <p className="text-xs text-gray-500 mb-1">Card</p>
                                            <div className={`text-base font-semibold ${stats.digital.remaining >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                                {formatCurrency(stats.digital.remaining, settings)}
                                            </div>
                                        </div>
                                        <div className="flex flex-col items-center justify-center">
                                            <p className="text-xs text-gray-500 mb-1">Cash</p>
                                            {Object.entries(stats.cashByCurrency).map(([currency, data]) => (
                                                <div key={currency} className={`text-base font-semibold ${data.remaining >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                                    {formatCurrency(data.remaining, { ...settings, currencySymbol: getCurrencySymbol(currency) })}
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <div className="text-center">
                                    <div className={`text-lg font-bold ${totalRemaining >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                        {formatCurrency(totalRemaining, settings)}
                                    </div>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>

                {budget.description && (
                    <Card className="border-none shadow-lg">
                        <CardHeader>
                            <CardTitle>Description</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <p className="text-gray-700">{budget.description}</p>
                        </CardContent>
                    </Card>
                )}

                {!budget.isSystemBudget && budget.status !== 'completed' && allocationStats && (
                    <AllocationManager
                        customBudget={budget}
                        allocations={allocations}
                        categories={categories}
                        allocationStats={allocationStats}
                        monthStart={monthStart}
                        monthEnd={monthEnd}
                        onCreateAllocation={(data) => createAllocationMutation.mutate(data)}
                        onUpdateAllocation={({ id, data }) => updateAllocationMutation.mutate({ id, data })}
                        onDeleteAllocation={(id) => deleteAllocationMutation.mutate(id)}
                        isSubmitting={createAllocationMutation.isPending || updateAllocationMutation.isPending}
                    />
                )}

                {budget.isSystemBudget && relatedCustomBudgetsForDisplay.length > 0 && (
                    <Card className="border-none shadow-lg">
                        <CardHeader>
                            <CardTitle>Custom Budgets ({relatedCustomBudgetsForDisplay.length})</CardTitle>
                            <p className="text-sm text-gray-500 mt-1">
                                Custom budgets containing {budget.systemBudgetType} expenses
                            </p>
                        </CardHeader>
                        <CardContent>
                            <div className="grid md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                                {relatedCustomBudgetsForDisplay.map((customBudget) => {
                                    const customBudgetStats = getCustomBudgetStats(customBudget, transactions, monthStart, monthEnd);

                                    return (
                                        <BudgetCard
                                            key={customBudget.id}
                                            budget={customBudget}
                                            stats={customBudgetStats}
                                            settings={settings}
                                        />
                                    );
                                })}
                            </div>
                        </CardContent>
                    </Card>
                )}

                <Card className="border-none shadow-lg">
                    <CardHeader className="flex flex-row items-center justify-between">
                        <div>
                            <CardTitle>
                                {budget.isSystemBudget ? 'Direct Expenses' : 'Expenses'} ({budgetTransactions.length})
                            </CardTitle>
                            {budget.isSystemBudget && (
                                <p className="text-sm text-gray-500 mt-1">
                                    Expenses not part of any custom budget
                                </p>
                            )}
                        </div>
                        <QuickAddTransaction
                            open={showQuickAdd}
                            onOpenChange={setShowQuickAdd}
                            categories={categories}
                            customBudgets={allBudgets}
                            defaultCustomBudgetId={budgetId}
                            onSubmit={(data) => createTransactionMutation.mutate(data)}
                            isSubmitting={createTransactionMutation.isPending}
                            transactions={transactions}
                            triggerSize="sm"
                            triggerClassName="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white shadow-md"
                        />
                    </CardHeader>
                    <CardContent>
                        {budgetTransactions.length === 0 ? (
                            <div className="h-40 flex items-center justify-center text-gray-400">
                                <p>No {budget.isSystemBudget ? 'direct ' : ''}expenses yet. Add your first one!</p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                                {budgetTransactions.map((transaction) => (
                                    <TransactionCard
                                        key={transaction.id}
                                        transaction={transaction}
                                        category={categoryMap[transaction.category_id]}
                                        onEdit={(t, data) => {
                                            transactionActions.handleSubmit(data, t);
                                        }}
                                        onDelete={() => transactionActions.handleDelete(transaction)}
                                    />
                                ))}
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
