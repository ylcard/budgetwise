
import React, { useMemo, useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Plus, DollarSign, TrendingDown, CheckCircle, Clock, Trash2, AlertCircle } from "lucide-react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { useSettings } from "../components/utils/SettingsContext";
import { formatCurrency } from "../components/utils/formatCurrency";
import { formatDate } from "../components/utils/formatDate";
import { getCustomBudgetStats, getSystemBudgetStats, getCustomBudgetAllocationStats } from "../components/utils/budgetCalculations";
import QuickAddTransaction from "../components/transactions/QuickAddTransaction";
import TransactionCard from "../components/transactions/TransactionCard";
import TransactionForm from "../components/transactions/TransactionForm";
import AllocationManager from "../components/custombudgets/AllocationManager";
import CustomBudgetCard from "../components/custombudgets/CustomBudgetCard";

export default function BudgetDetail() {
    const { settings } = useSettings();
    const queryClient = useQueryClient();
    const [showQuickAdd, setShowQuickAdd] = useState(false);
    const [editingTransaction, setEditingTransaction] = useState(null);
    const [showEditForm, setShowEditForm] = useState(false);

    const urlParams = new URLSearchParams(window.location.search);
    const budgetId = urlParams.get('id');

    const { data: budget, isLoading: budgetLoading } = useQuery({
        queryKey: ['budget', budgetId],
        queryFn: async () => {
            if (!budgetId) return null;

            // Try to find in CustomBudget first
            const allCustomBudgets = await base44.entities.CustomBudget.list();
            const customBudget = allCustomBudgets.find(cb => cb.id === budgetId);

            if (customBudget) {
                return { ...customBudget, isSystemBudget: customBudget.isSystemBudget || false };
            }

            // If not found, try SystemBudget
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
        queryFn: () => base44.entities.Transaction.list('-date'),
        initialData: [],
    });

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

    const createTransactionMutation = useMutation({
        mutationFn: (data) => base44.entities.Transaction.create(data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['transactions'] });
            setShowQuickAdd(false);
        },
    });

    const updateTransactionMutation = useMutation({
        mutationFn: ({ id, data }) => base44.entities.Transaction.update(id, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['transactions'] });
            setShowEditForm(false);
            setEditingTransaction(null);
        },
    });

    const deleteTransactionMutation = useMutation({
        mutationFn: (id) => base44.entities.Transaction.delete(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['transactions'] });
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

    const { data: customBudgets = [] } = useQuery({
        queryKey: ['customBudgets'],
        queryFn: () => base44.entities.CustomBudget.list(),
        initialData: [],
    });

    const budgetTransactions = useMemo(() => {
        if (!budget) return [];

        if (budget.isSystemBudget) {
            const budgetStart = new Date(budget.startDate);
            const budgetEnd = new Date(budget.endDate);

            // Get IDs of ALL custom budgets (regardless of status) to exclude their transactions
            const allCustomBudgetIds = allCustomBudgets.map(cb => cb.id);

            // Filter transactions: exclude those from ANY custom budgets
            return transactions.filter(t => {
                if (t.type !== 'expense' || !t.category_id) return false;

                const category = categories.find(c => c.id === t.category_id);
                if (!category || category.priority !== budget.systemBudgetType) return false;

                // Exclude transactions from ANY custom budget (active, completed, or archived)
                if (t.customBudgetId && allCustomBudgetIds.includes(t.customBudgetId)) {
                    return false;
                }

                // Check date range
                if (t.isPaid && t.paidDate) {
                    const paidDate = new Date(t.paidDate);
                    return paidDate >= budgetStart && paidDate <= budgetEnd;
                }

                if (!t.isPaid) {
                    const transactionDate = new Date(t.date);
                    return transactionDate >= budgetStart && transactionDate <= budgetEnd;
                }

                return false;
            });
        } else {
            // For custom budgets, filter by customBudgetId
            return transactions.filter(t => t.customBudgetId === budgetId);
        }
    }, [transactions, budgetId, budget, categories, allCustomBudgets]);

    const relatedCustomBudgetsForDisplay = useMemo(() => {
        if (!budget || !budget.isSystemBudget) return [];

        // NEW LOGIC: If it's a 'needs' system budget, no custom budgets should be shown.
        // Custom budgets are inherently 'wants'.
        if (budget.systemBudgetType === 'needs') {
            return [];
        }

        // If it's a 'wants' system budget, then we should display relevant custom budgets.
        if (budget.systemBudgetType === 'wants') {
            const budgetStart = new Date(budget.startDate);
            const budgetEnd = new Date(budget.endDate);

            return allCustomBudgets.filter(cb => {
                // Only consider active or completed custom budgets
                if (cb.status !== 'active' && cb.status !== 'completed') return false;

                // Crucially, filter out any actual SystemBudgets from this list
                if (cb.isSystemBudget) return false;

                // Check date overlap
                const cbStart = new Date(cb.startDate);
                const cbEnd = new Date(cb.endDate);
                return cbStart <= budgetEnd && cbEnd >= budgetStart;
            });
        }

        return [];
    }, [budget, allCustomBudgets]);

    const stats = useMemo(() => {
        if (!budget) return null;

        if (budget.isSystemBudget) {
            return getSystemBudgetStats(budget, transactions, categories, allCustomBudgets);
        } else {
            return getCustomBudgetStats(budget, transactions);
        }
    }, [budget, transactions, categories, allCustomBudgets]);

    const allocationStats = useMemo(() => {
        if (!budget || budget.isSystemBudget) return null;
        return getCustomBudgetAllocationStats(budget, allocations, transactions);
    }, [budget, allocations, transactions]);

    const categoryMap = categories.reduce((acc, cat) => {
        acc[cat.id] = cat;
        return acc;
    }, {});

    const handleEditTransaction = (transaction) => {
        setEditingTransaction(transaction);
        setShowEditForm(true);
    };

    const handleUpdateTransaction = (data) => {
        if (editingTransaction) {
            updateTransactionMutation.mutate({ id: editingTransaction.id, data });
        }
    };

    const handleDeleteTransaction = (id) => {
        if (confirm('Are you sure you want to delete this transaction?')) {
            deleteTransactionMutation.mutate(id);
        }
    };

    const handleDeleteBudget = async () => {
        if (confirm('Are you sure you want to delete this budget? All associated transactions will also be deleted.')) {
            for (const transaction of budgetTransactions) {
                await base44.entities.Transaction.delete(transaction.id);
            }

            await base44.entities.CustomBudget.delete(budgetId);
            window.location.href = createPageUrl("Budgets");
        }
    };

    const completeBudgetMutation = useMutation({
        mutationFn: async (id) => {
            const budgetToComplete = budget;
            if (!budgetToComplete) return;

            const actualSpent = stats.totalSpent;

            await base44.entities.CustomBudget.update(id, {
                status: 'completed',
                allocatedAmount: actualSpent,
                originalAllocatedAmount: budgetToComplete.originalAllocatedAmount || budgetToComplete.allocatedAmount
            });
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['budget', budgetId] });
            queryClient.invalidateQueries({ queryKey: ['customBudgets'] });
        },
    });

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

    return (
        <div className="min-h-screen p-4 md:p-8">
            <div className="max-w-7xl mx-auto space-y-6">
                <div className="flex items-center gap-4">
                    <Link to={createPageUrl("Budgets")}>
                        <Button variant="ghost" size="icon">
                            <ArrowLeft className="w-5 h-5" />
                        </Button>
                    </Link>
                    <div className="flex-1">
                        <div className="flex items-center gap-2">
                            <h1 className="text-3xl md:text-4xl font-bold text-gray-900">{budget.name}</h1>
                            {budget.isSystemBudget && (
                                <Badge variant="outline">System</Badge>
                            )}
                        </div>
                        <p className="text-gray-500 mt-1">
                            {formatDate(budget.startDate, settings.dateFormat)} - {formatDate(budget.endDate, settings.dateFormat)}
                        </p>
                    </div>
                    <div className="flex gap-2">
                        {!budget.isSystemBudget && budget.status === 'active' && (
                            <Button
                                onClick={() => completeBudgetMutation.mutate(budgetId)}
                                disabled={completeBudgetMutation.isPending}
                                className="bg-green-600 hover:bg-green-700 text-white"
                            >
                                <CheckCircle className="w-4 h-4 mr-2" />
                                Complete
                            </Button>
                        )}
                        {canDelete && (
                            <Button
                                onClick={handleDeleteBudget}
                                variant="outline"
                                className="text-red-600 border-red-600 hover:bg-red-50"
                            >
                                <Trash2 className="w-4 h-4 mr-2" />
                                Delete
                            </Button>
                        )}
                        <Button
                            onClick={() => setShowQuickAdd(true)}
                            className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 shadow-lg"
                        >
                            <Plus className="w-4 h-4 mr-2" />
                            Add Expense
                        </Button>
                    </div>
                </div>

                <div className="grid md:grid-cols-5 gap-4">
                    <Card className="border-none shadow-lg" style={{ backgroundColor: '#EFF6FF' }}>
                        <CardContent className="p-6 flex flex-col items-center justify-center text-center h-full">
                            <div className="flex items-center gap-2 mb-2">
                                <DollarSign className="w-5 h-5 text-blue-600" />
                                <p className="text-sm font-medium text-gray-600">Total Budget</p>
                            </div>
                            <p className="text-2xl font-bold text-gray-900">
                                {formatCurrency(budget.allocatedAmount, settings)}
                            </p>
                        </CardContent>
                    </Card>

                    <Card className="border-none shadow-lg" style={{ backgroundColor: '#FEF2F2' }}>
                        <CardContent className="p-6 flex flex-col items-center justify-center text-center h-full">
                            <div className="flex items-center gap-2 mb-2">
                                <TrendingDown className="w-5 h-5 text-red-600" />
                                <p className="text-sm font-medium text-gray-600">Total Expenses</p>
                            </div>
                            <p className="text-2xl font-bold text-gray-900">
                                {formatCurrency(stats.totalSpent, settings)}
                            </p>
                            <p className="text-xs text-gray-500 mt-1">
                                {((stats.totalSpent / budget.allocatedAmount) * 100).toFixed(1)}% of budget
                            </p>
                        </CardContent>
                    </Card>

                    <Card className="border-none shadow-lg" style={{ backgroundColor: '#F0FDF4' }}>
                        <CardContent className="p-6 flex flex-col items-center justify-center text-center h-full">
                            <div className="flex items-center gap-2 mb-2">
                                <CheckCircle className="w-5 h-5 text-green-600" />
                                <p className="text-sm font-medium text-gray-600">Paid</p>
                            </div>
                            <p className="text-2xl font-bold text-green-600">
                                {formatCurrency(stats.paidAmount, settings)}
                            </p>
                        </CardContent>
                    </Card>

                    <Card className="border-none shadow-lg" style={{ backgroundColor: '#FFFBEB' }}>
                        <CardContent className="p-6 flex flex-col items-center justify-center text-center h-full">
                            <div className="flex items-center gap-2 mb-2">
                                <Clock className="w-5 h-5 text-orange-600" />
                                <p className="text-sm font-medium text-gray-600">Expected</p>
                            </div>
                            <p className="text-2xl font-bold text-orange-600">
                                {formatCurrency(stats.unpaidAmount, settings)}
                            </p>
                        </CardContent>
                    </Card>

                    <Card className="border-none shadow-lg" style={{ backgroundColor: '#F9FAFB' }}>
                        <CardContent className="p-6 flex flex-col items-center justify-center text-center h-full">
                            <div className="flex items-center gap-2 mb-2">
                                <Badge
                                    variant={stats.percentageUsed > 100 ? "destructive" : stats.percentageUsed > 80 ? "warning" : "default"}
                                    className="text-xs"
                                >
                                    {stats.percentageUsed.toFixed(0)}%
                                </Badge>
                                <p className="text-sm font-medium text-gray-600">Remaining</p>
                            </div>
                            <p className={`text-2xl font-bold ${stats.remaining < 0 ? 'text-red-600' : 'text-gray-900'}`}>
                                {formatCurrency(stats.remaining, settings)}
                            </p>
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
                            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                                {relatedCustomBudgetsForDisplay.map((customBudget) => {
                                    const customBudgetStats = getCustomBudgetStats(customBudget, transactions);

                                    return (
                                        <CustomBudgetCard
                                            key={customBudget.id}
                                            budget={{
                                                ...customBudget,
                                                preCalculatedStats: customBudgetStats
                                            }}
                                            transactions={transactions}
                                            settings={settings}
                                            onEdit={() => {}}
                                            onDelete={() => {}}
                                            onStatusChange={() => {}}
                                        />
                                    );
                                })}
                            </div>
                        </CardContent>
                    </Card>
                )}

                <Card className="border-none shadow-lg">
                    <CardHeader>
                        <CardTitle>
                            {budget.isSystemBudget ? 'Direct Expenses' : 'Expenses'} ({budgetTransactions.length})
                        </CardTitle>
                        {budget.isSystemBudget && (
                            <p className="text-sm text-gray-500 mt-1">
                                Expenses not part of any custom budget
                            </p>
                        )}
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
                                        onEdit={handleEditTransaction}
                                        onDelete={handleDeleteTransaction}
                                    />
                                ))}
                            </div>
                        )}
                    </CardContent>
                </Card>

                {showEditForm && (
                    <TransactionForm
                        transaction={editingTransaction}
                        categories={categories}
                        onSubmit={handleUpdateTransaction}
                        onCancel={() => {
                            setShowEditForm(false);
                            setEditingTransaction(null);
                        }}
                        isSubmitting={updateTransactionMutation.isPending}
                    />
                )}

                <QuickAddTransaction
                    open={showQuickAdd}
                    onOpenChange={setShowQuickAdd}
                    categories={categories}
                    customBudgets={allBudgets}
                    defaultCustomBudgetId={budgetId}
                    onSubmit={(data) => createTransactionMutation.mutate(data)}
                    isSubmitting={createTransactionMutation.isPending}
                />
            </div>
        </div>
    );
}
