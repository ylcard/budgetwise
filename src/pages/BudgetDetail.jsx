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
import { useLocation, useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { useSettings } from "../components/utils/SettingsContext";
import { useConfirm } from "../components/ui/ConfirmDialogProvider";
import { formatCurrency } from "../components/utils/currencyUtils";
import { formatDate, parseDate, doDateRangesOverlap } from "../components/utils/dateUtils";
import {
    getCustomBudgetStats,
    getSystemBudgetStats,
    getCustomBudgetAllocationStats,
    getHistoricalAverageIncome
} from "../components/utils/financialCalculations";
import { useTransactionActions, useCustomBudgetActions } from "../components/hooks/useActions";
import { usePeriod } from "../components/hooks/usePeriod";
import { useMonthlyIncome } from "../components/hooks/useDerivedData";
import QuickAddTransaction from "../components/transactions/QuickAddTransaction";
import TransactionCard from "../components/transactions/TransactionCard";
import AllocationManager from "../components/custombudgets/AllocationManager";
import BudgetCard from "../components/budgets/BudgetCard";
import CustomBudgetForm from "../components/custombudgets/CustomBudgetForm";
import ExpensesCardContent from "../components/budgetdetail/ExpensesCardContent";

export default function BudgetDetail() {
    const { settings } = useSettings();
    const queryClient = useQueryClient();
    const location = useLocation();
    const navigate = useNavigate();
    const [showQuickAdd, setShowQuickAdd] = useState(false);
    const { confirmAction } = useConfirm();

    const { monthStart, monthEnd } = usePeriod();

    const urlParams = new URLSearchParams(location.search);
    const budgetId = urlParams.get('id');

    useEffect(() => {
        if (budgetId) {
            queryClient.invalidateQueries({ queryKey: ['budget', budgetId] });
        }
    }, [budgetId, location, queryClient]);

    // 1. Fetch the main budget
    const { data: budget, isLoading: budgetLoading } = useQuery({
        queryKey: ['budget', budgetId],
        queryFn: async () => {
            if (!budgetId) return null;
            try {
                const customBudget = await base44.entities.CustomBudget.get(budgetId);
                if (customBudget) return { ...customBudget, isSystemBudget: false };
            } catch (error) { }

            try {
                const systemBudget = await base44.entities.SystemBudget.get(budgetId);
                if (systemBudget) {
                    const goals = await base44.entities.BudgetGoal.filter({ priority: systemBudget.systemBudgetType });
                    const relatedGoal = goals[0];
                    return {
                        ...systemBudget,
                        isSystemBudget: true,
                        allocatedAmount: systemBudget.budgetAmount,
                        target_amount: systemBudget.budgetAmount,
                        target_percentage: relatedGoal ? relatedGoal.target_percentage : 0
                    };
                }
            } catch (error) {
                console.warn("Budget not found in System or Custom tables");
            }
            return null;
        },
        enabled: !!budgetId,
        retry: false,
    });

    // 2. Fetch Categories (Defined ONCE)
    const { data: categories = [] } = useQuery({
        queryKey: ['categories'],
        queryFn: () => base44.entities.Category.list(),
        initialData: [],
    });

    // 3. Fetch all Custom Budgets for the period (Defined ONCE)
    const { data: allCustomBudgets = [] } = useQuery({
        queryKey: ['allCustomBudgets', monthStart, monthEnd],
        queryFn: async () => {
            return await base44.entities.CustomBudget.filter({
                startDate: { $lte: monthEnd },
                endDate: { $gte: monthStart }
            });
        },
        initialData: [],
        enabled: !!budget
    });

    // 4. Calculate related IDs
    const relatedCustomBudgetIds = useMemo(() => {
        if (!budget || !budget.isSystemBudget || budget.systemBudgetType !== 'wants') return [];
        return allCustomBudgets
            .filter(cb => doDateRangesOverlap(cb.startDate, cb.endDate, budget.startDate, budget.endDate))
            .map(cb => cb.id);
    }, [budget, allCustomBudgets]);

    // 5. Smart Transaction Fetch
    const { data: transactions = [] } = useQuery({
        queryKey: ['transactions', budget?.id, relatedCustomBudgetIds],
        queryFn: async () => {
            if (!budget.isSystemBudget) {
                return await base44.entities.Transaction.filter({ customBudgetId: budgetId });
            }
            return await base44.entities.Transaction.filter({
                $or: [
                    { date: { $gte: budget.startDate, $lte: budget.endDate } },
                    // { customBudgetId: { $in: relatedCustomBudgetIds } }
                    { customBudgetId: budgetId },
                    { customBudgetId: { $in: relatedCustomBudgetIds } }
                ]
            });
        },
        initialData: [],
        enabled: !!budget
    });

    // 6. Monthly Income Hook
    const monthlyIncome = useMonthlyIncome(transactions, new Date(monthStart).getMonth(), new Date(monthStart).getFullYear());

    // 7. All Budgets (For dropdowns/QuickAdd)
    const { data: allBudgets = [] } = useQuery({
        queryKey: ['allBudgets', monthStart, monthEnd],
        queryFn: async () => {
            const overlapFilter = {
                startDate: { $lte: monthEnd },
                endDate: { $gte: monthStart }
            };
            const customB = await base44.entities.CustomBudget.filter(overlapFilter);
            const sysB = await base44.entities.SystemBudget.filter(overlapFilter);
            return [...customB, ...sysB.map(sb => ({ ...sb, isSystemBudget: true, allocatedAmount: sb.budgetAmount }))];
        },
        initialData: [],
        enabled: !!budget
    });

    // 8. Allocations specific to this budget
    const { data: allocations = [] } = useQuery({
        queryKey: ['allocations', budgetId],
        queryFn: async () => {
            return await base44.entities.CustomBudgetAllocation.filter({ customBudgetId: budgetId });
        },
        initialData: [],
        enabled: !!budgetId && !!budget && !budget.isSystemBudget,
    });

    // Actions & Mutation logic
    const budgetActions = useCustomBudgetActions({ transactions });
    const transactionActions = useTransactionActions();

    const createTransactionMutation = useMutation({
        mutationFn: (data) => base44.entities.Transaction.create(data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['transactions'] });
            setShowQuickAdd(false);
        },
    });

    const createAllocationMutation = useMutation({
        mutationFn: (data) => base44.entities.CustomBudgetAllocation.create(data),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['allocations', budgetId] }),
    });

    const updateAllocationMutation = useMutation({
        mutationFn: ({ id, data }) => base44.entities.CustomBudgetAllocation.update(id, data),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['allocations', budgetId] }),
    });

    const deleteAllocationMutation = useMutation({
        mutationFn: (id) => base44.entities.CustomBudgetAllocation.delete(id),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['allocations', budgetId] }),
    });

    const completeBudgetMutation = useMutation({
        mutationFn: (id) => base44.entities.CustomBudget.update(id, { status: 'completed' }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['budget', budgetId] });
            queryClient.invalidateQueries({ queryKey: ['customBudgets'] });
        },
    });

    const reactivateBudgetMutation = useMutation({
        mutationFn: (id) => base44.entities.CustomBudget.update(id, { status: 'active' }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['budget', budgetId] });
            queryClient.invalidateQueries({ queryKey: ['customBudgets'] });
        },
    });

    // Memos for data processing
    const budgetTransactions = useMemo(() => {
        if (!budget) return [];
        if (budget.isSystemBudget) {
            const budgetStart = parseDate(budget.startDate);
            const budgetEnd = parseDate(budget.endDate);
            if (budgetEnd) budgetEnd.setHours(23, 59, 59, 999);
            const allCustomBudgetIds = allCustomBudgets.map(cb => cb.id);

            return transactions.filter(t => {
                if (t.customBudgetId === budget.id) return true
                if (t.type !== 'expense' || !t.category_id) return false;
                const category = categories.find(c => c.id === t.category_id);
                const effectivePriority = t.financial_priority || (category ? category.priority : null);
                if (effectivePriority !== budget.systemBudgetType) return false;
                if (t.customBudgetId && allCustomBudgetIds.includes(t.customBudgetId)) return false;

                const compDate = t.isPaid && t.paidDate ? parseDate(t.paidDate) : parseDate(t.date);
                return compDate >= budgetStart && compDate <= budgetEnd;
            });
        }
        return transactions.filter(t => t.customBudgetId === budgetId);
    }, [transactions, budgetId, budget, categories, allCustomBudgets]);

    const relatedCustomBudgetsForDisplay = useMemo(() => {
        if (!budget || !budget.isSystemBudget || budget.systemBudgetType !== 'wants') return [];
        return allCustomBudgets
            .filter(cb => !cb.isSystemBudget && doDateRangesOverlap(cb.startDate, cb.endDate, budget.startDate, budget.endDate))
            .sort((a, b) => (a.status === 'active' ? -1 : 1));
    }, [budget, allCustomBudgets]);

    const stats = useMemo(() => {
        if (!budget) return null;
        if (budget.isSystemBudget) {
            const bDate = new Date(budget.startDate);
            const histAvg = getHistoricalAverageIncome(transactions, bDate.getMonth(), bDate.getFullYear());
            return getSystemBudgetStats(budget, transactions, categories, allCustomBudgets, budget.startDate, budget.endDate, monthlyIncome, settings, histAvg);
        }
        return getCustomBudgetStats(budget, transactions);
    }, [budget, transactions, categories, allCustomBudgets, monthlyIncome, settings]);

    const allocationStats = useMemo(() => {
        if (!budget || budget.isSystemBudget) return null;
        return getCustomBudgetAllocationStats(budget, allocations, transactions);
    }, [budget, allocations, transactions]);

    const categoryMap = useMemo(() => categories.reduce((acc, cat) => {
        acc[cat.id] = cat;
        return acc;
    }, {}), [categories]);

    const handleEditBudget = (data) => budgetActions.handleSubmit(data, budget);

    const handleDeleteBudget = () => {
        confirmAction(
            "Delete Budget",
            "This will delete the budget and all associated transactions. This action cannot be undone.",
            async () => await budgetActions.handleDeleteDirect(budgetId),
            { destructive: true }
        );
    };

    // Auto-redirect effect
    useEffect(() => {
        if (!budgetId || (budget === null && !budgetLoading)) {
            const timer = setTimeout(() => {
                window.location.href = createPageUrl("Budgets");
            }, 2000);
            return () => clearTimeout(timer);
        }
    }, [budgetId, budget, budgetLoading]);

    // Render logic
    if (!budgetId || (budget === null && !budgetLoading)) {
        return (
            <div className="min-h-screen p-4 md:p-8 flex items-center justify-center text-center">
                <Card className="border-none shadow-lg p-12">
                    <AlertCircle className="w-16 h-16 text-orange-500 mx-auto mb-4" />
                    <h2 className="text-2xl font-bold mb-2">Budget Not Found</h2>
                    <p className="text-gray-500">Redirecting to budgets page...</p>
                </Card>
            </div>
        );
    }

    if (budgetLoading || !budget || !stats) {
        return <div className="p-12 text-center animate-pulse">Loading budget data...</div>;
    }

    const isCompleted = budget.status === 'completed';
    const totalBudget = budget.isSystemBudget ? (budget.budgetAmount || 0) : (stats?.totalAllocatedUnits || 0);
    const totalRemaining = budget.isSystemBudget ? (stats.remaining || 0) : (totalBudget - (stats?.totalSpentUnits || 0));

    return (
        <div className="min-h-screen p-4 md:p-8">
            <div className="max-w-7xl mx-auto space-y-6">
                <div className="flex items-center gap-4">
                    <CustomButton variant="ghost" size="icon" onClick={() => navigate(location.state?.from || '/Budgets')}>
                        <ArrowLeft className="w-5 h-5" />
                    </CustomButton>
                    <div className="flex-1">
                        <div className="flex items-center gap-2">
                            <h1 className="text-3xl md:text-4xl font-bold text-gray-900">{budget.name}</h1>
                            {budget.isSystemBudget && <Badge variant="outline">System</Badge>}
                            {isCompleted && <Badge className="bg-green-100 text-green-800">Completed</Badge>}
                        </div>
                        <p className="text-gray-500 mt-1">
                            {formatDate(budget.startDate, settings.dateFormat)} - {formatDate(budget.endDate, settings.dateFormat)}
                        </p>
                    </div>
                    <div className="flex gap-2">
                        {!budget.isSystemBudget && !isCompleted && (
                            <Popover open={budgetActions.showForm} onOpenChange={budgetActions.setShowForm}>
                                <PopoverTrigger asChild>
                                    <CustomButton variant="modify">Edit Budget</CustomButton>
                                </PopoverTrigger>
                                <PopoverContent className="w-[600px] max-h-[90vh] overflow-y-auto">
                                    <CustomBudgetForm
                                        budget={budget}
                                        onSubmit={handleEditBudget}
                                        onCancel={() => budgetActions.setShowForm(false)}
                                        isSubmitting={budgetActions.isSubmitting}
                                        baseCurrency={settings.baseCurrency}
                                        settings={settings}
                                    />
                                </PopoverContent>
                            </Popover>
                        )}
                        {!budget.isSystemBudget && (
                            <>
                                {budget.status === 'active' ? (
                                    <CustomButton variant="success" onClick={() => completeBudgetMutation.mutate(budgetId)} disabled={completeBudgetMutation.isPending}>
                                        <CheckCircle className="w-4 h-4 mr-2" /> Complete
                                    </CustomButton>
                                ) : (
                                    <CustomButton variant="success" onClick={() => reactivateBudgetMutation.mutate(budgetId)} disabled={reactivateBudgetMutation.isPending}>
                                        Reactivate
                                    </CustomButton>
                                )}
                                <CustomButton variant="delete" onClick={handleDeleteBudget}>
                                    <Trash2 className="w-4 h-4 mr-2" /> Delete
                                </CustomButton>
                            </>
                        )}
                    </div>
                </div>

                <div className="grid md:grid-cols-3 gap-4">
                    <Card><CardContent className="pt-6 text-center">
                        <p className="text-sm font-medium text-gray-500">Budget</p>
                        <p className="text-lg font-bold">{formatCurrency(totalBudget, settings)}</p>
                    </CardContent></Card>
                    <Card><CardContent className="pt-6">
                        <ExpensesCardContent budget={budget} stats={stats} settings={settings} />
                    </CardContent></Card>
                    <Card><CardContent className="pt-6 text-center">
                        <p className="text-sm font-medium text-gray-500">Remaining</p>
                        <p className={`text-lg font-bold ${totalRemaining >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {formatCurrency(totalRemaining, settings)}
                        </p>
                    </CardContent></Card>
                </div>

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
                        </CardHeader>
                        <CardContent>
                            <div className="grid md:grid-cols-3 lg:grid-cols-5 gap-4">
                                {relatedCustomBudgetsForDisplay.map((cb) => (
                                    <BudgetCard
                                        key={cb.id}
                                        budget={cb}
                                        stats={getCustomBudgetStats(cb, transactions)}
                                        settings={settings}
                                    />
                                ))}
                            </div>
                        </CardContent>
                    </Card>
                )}

                <Card className="border-none shadow-lg">
                    <CardHeader className="flex flex-row items-center justify-between">
                        <div>
                            <CardTitle>{budget.isSystemBudget ? 'Direct Expenses' : 'Expenses'} ({budgetTransactions.length})</CardTitle>
                            {budget.isSystemBudget && <p className="text-sm text-gray-500">Expenses not part of any custom budget</p>}
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
                        />
                    </CardHeader>
                    <CardContent>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                            {budgetTransactions.map((t) => (
                                <TransactionCard
                                    key={t.id}
                                    transaction={t}
                                    category={categoryMap[t.category_id]}
                                    onEdit={(t, data) => transactionActions.handleSubmit(data, t)}
                                    onDelete={() => transactionActions.handleDelete(t)}
                                />
                            ))}
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}