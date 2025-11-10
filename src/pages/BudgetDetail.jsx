
import React, { useMemo, useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Plus, DollarSign, TrendingDown, CheckCircle, Clock, Trash2, AlertCircle } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { useSettings } from "../components/utils/SettingsContext";
import { formatCurrency } from "../components/utils/formatCurrency";
import { formatDate } from "../components/utils/formatDate";
import { getCustomBudgetStats, getSystemBudgetStats, getCustomBudgetAllocationStats } from "../components/utils/budgetCalculations";
import { useCashWallet } from "../components/hooks/useBase44Entities";
import { calculateRemainingCashAllocations, returnCashToWallet } from "../components/utils/cashAllocationUtils";
import { useCustomBudgetActions } from "../components/hooks/useActions";
import QuickAddTransaction from "../components/transactions/QuickAddTransaction";
import TransactionCard from "../components/transactions/TransactionCard";
import TransactionForm from "../components/transactions/TransactionForm";
import AllocationManager from "../components/custombudgets/AllocationManager";
import CustomBudgetCard from "../components/custombudgets/CustomBudgetCard";
import CustomBudgetForm from "../components/custombudgets/CustomBudgetForm";
import { QUERY_KEYS } from "../components/hooks/queryKeys";

// Helper to get currency symbol
const getCurrencySymbol = (currencyCode) => {
  const currencySymbols = {
    'USD': '$', 'EUR': '€', 'GBP': '£', 'JPY': '¥', 'CAD': 'CA$', 'AUD': 'A$',
    'CHF': 'CHF', 'CNY': '¥', 'INR': '₹', 'MXN': 'MX$', 'BRL': 'R$', 'ZAR': 'R',
    'KRW': '₩', 'SGD': 'S$', 'NZD': 'NZ$', 'HKD': 'HK$', 'SEK': 'kr', 'NOK': 'kr',
    'DKK': 'kr', 'PLN': 'zł', 'THB': '฿', 'MYR': 'RM', 'IDR': 'Rp', 'PHP': '₱',
    'CZK': 'Kč', 'ILS': '₪', 'CLP': 'CLP$', 'AED': 'د.إ', 'SAR': '﷼', 'TWD': 'NT$', 'TRY': '₺'
  };
  return currencySymbols[currencyCode] || currencyCode;
};

export default function BudgetDetail() {
    const { settings, user } = useSettings();
    const queryClient = useQueryClient();
    const location = useLocation();
    const [showQuickAdd, setShowQuickAdd] = useState(false);
    const [editingTransaction, setEditingTransaction] = useState(null);
    const [showEditForm, setShowEditForm] = useState(false);

    const urlParams = new URLSearchParams(window.location.search);
    const budgetId = urlParams.get('id');

    const { cashWallet } = useCashWallet(user);

    // Force query refetch when URL changes
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

    // Use proper budget actions hook with cash allocation handling
    const budgetActions = useCustomBudgetActions(user, transactions, cashWallet);

    const createTransactionMutation = useMutation({
        mutationFn: (data) => base44.entities.Transaction.create(data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['transactions'] });
            queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.CASH_WALLET] });
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

    const completeBudgetMutation = useMutation({
        mutationFn: async (id) => {
            const budgetToComplete = budget;
            if (!budgetToComplete) return;

            // Return remaining cash to wallet if any
            if (budgetToComplete.cashAllocations && budgetToComplete.cashAllocations.length > 0 && user) {
              const remaining = calculateRemainingCashAllocations(budgetToComplete, transactions);
              if (remaining.length > 0) {
                await returnCashToWallet(
                  user.email,
                  remaining
                );
              }
            }

            const actualSpent = getCustomBudgetStats(budgetToComplete, transactions).totalSpent;

            await base44.entities.CustomBudget.update(id, {
                status: 'completed',
                allocatedAmount: actualSpent,
                originalAllocatedAmount: budgetToComplete.originalAllocatedAmount || budgetToComplete.allocatedAmount,
                cashAllocations: [] // Clear cash allocations
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
                cashAllocations: [] // Do not restore cash allocations
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
            const budgetStart = new Date(budget.startDate);
            const budgetEnd = new Date(budget.endDate);

            const allCustomBudgetIds = allCustomBudgets.map(cb => cb.id);

            return transactions.filter(t => {
                if (t.type !== 'expense' || !t.category_id) return false;

                const category = categories.find(c => c.id === t.category_id);
                if (!category || category.priority !== budget.systemBudgetType) return false;

                if (t.customBudgetId && allCustomBudgetIds.includes(t.customBudgetId)) {
                    return false;
                }

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

            return allCustomBudgets.filter(cb => {
                if (cb.status !== 'active' && cb.status !== 'completed') return false;

                if (cb.isSystemBudget) return false;

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
            await budgetActions.handleDelete(budgetId);
            window.location.href = createPageUrl("Budgets");
        }
    };

    // FIXED: Pass budget directly to handleSubmit to avoid async state issues
    const handleEditBudget = (data) => {
        budgetActions.handleSubmit(data, budget);
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

    // Calculate totals for display with safety checks
    let totalBudget = 0;
    let totalSpent = 0;
    let totalRemaining = 0;
    let totalUnpaid = 0;
    
    if (budget.isSystemBudget) {
        totalBudget = budget.budgetAmount || 0;
        totalSpent = stats.totalSpent || 0;
        totalRemaining = stats.remaining || 0;
        totalUnpaid = stats.unpaidAmount || 0;
    } else {
        // For custom budgets, aggregate digital and cash with safety checks
        totalBudget = stats?.digital?.allocated || 0;
        totalSpent = stats?.digital?.spent || 0;
        totalRemaining = stats?.digital?.remaining || 0;
        totalUnpaid = stats?.digital?.unpaid || 0; // Cash transactions are always paid, so unpaid is digital only
        
        if (stats?.cashByCurrency) {
            Object.values(stats.cashByCurrency).forEach(cashData => {
                totalBudget += cashData?.allocated || 0;
                totalSpent += cashData?.spent || 0;
                totalRemaining += cashData?.remaining || 0;
            });
        }
    }

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
                            <Button
                                onClick={() => budgetActions.setShowForm(true)}
                                variant="outline"
                            >
                                Edit Budget
                            </Button>
                        )}
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
                        {!budget.isSystemBudget && budget.status === 'completed' && (
                            <Button
                                onClick={() => reactivateBudgetMutation.mutate(budgetId)}
                                disabled={reactivateBudgetMutation.isPending}
                                className="bg-blue-600 hover:bg-blue-700 text-white"
                            >
                                Reactivate
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

                <div className="grid md:grid-cols-4 gap-4">
                    <Card className="border-none shadow-lg">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium text-gray-500">Budget</CardTitle>
                            <DollarSign className="w-4 h-4 text-blue-500" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold text-gray-900">
                                {formatCurrency(totalBudget, settings)}
                            </div>
                            {!budget.isSystemBudget && stats?.cashByCurrency && Object.keys(stats.cashByCurrency).length > 0 && (
                                <div className="mt-2 text-xs text-gray-600 space-y-1">
                                    <p>Digital: {formatCurrency(stats?.digital?.allocated || 0, settings)}</p>
                                    {Object.entries(stats.cashByCurrency).map(([currency, data]) => (
                                        <p key={currency}>
                                            Cash ({currency}): {formatCurrency(data?.allocated || 0, { ...settings, currencySymbol: getCurrencySymbol(currency) })}
                                        </p>
                                    ))}
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    <Card className="border-none shadow-lg">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium text-gray-500">Spent</CardTitle>
                            <TrendingDown className="w-4 h-4 text-red-500" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold text-red-600">
                                {formatCurrency(totalSpent, settings)}
                            </div>
                            <p className="text-xs text-gray-500 mt-1">
                                {((totalSpent / (totalBudget || 1)) * 100).toFixed(1)}% used
                            </p>
                            {!budget.isSystemBudget && stats?.cashByCurrency && Object.keys(stats.cashByCurrency).length > 0 && (
                                <div className="mt-2 text-xs text-gray-600 space-y-1">
                                    <p>Digital: {formatCurrency(stats?.digital?.spent || 0, settings)}</p>
                                    {Object.entries(stats.cashByCurrency).map(([currency, data]) => (
                                        <p key={currency}>
                                            Cash ({currency}): {formatCurrency(data?.spent || 0, { ...settings, currencySymbol: getCurrencySymbol(currency) })}
                                        </p>
                                    ))}
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    <Card className="border-none shadow-lg">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium text-gray-500">Remaining</CardTitle>
                            <CheckCircle className="w-4 h-4 text-green-500" />
                        </CardHeader>
                        <CardContent>
                            <div className={`text-2xl font-bold ${totalRemaining >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                {formatCurrency(totalRemaining, settings)}
                            </div>
                            {!budget.isSystemBudget && stats?.cashByCurrency && Object.keys(stats.cashByCurrency).length > 0 && (
                                <div className="mt-2 text-xs text-gray-600 space-y-1">
                                    <p>Digital: {formatCurrency(stats?.digital?.remaining || 0, settings)}</p>
                                    {Object.entries(stats.cashByCurrency).map(([currency, data]) => (
                                        <p key={currency}>
                                            Cash ({currency}): {formatCurrency(data?.remaining || 0, { ...settings, currencySymbol: getCurrencySymbol(currency) })}
                                        </p>
                                    ))}
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    <Card className="border-none shadow-lg">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium text-gray-500">Unpaid (Digital Only)</CardTitle>
                            <Clock className="w-4 h-4 text-orange-500" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold text-orange-600">
                                {formatCurrency(totalUnpaid, settings)}
                            </div>
                            <p className="text-xs text-gray-500 mt-1">
                                Cash expenses are always paid
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
                                            hideActions={true}
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

                {budgetActions.showForm && !budget.isSystemBudget && (
                    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                        <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
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
                    </div>
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
