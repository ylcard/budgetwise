import { useMemo, useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CustomButton } from "@/components/ui/CustomButton";
import { PullToRefresh } from "../components/ui/PullToRefresh";
import { QUERY_KEYS } from "../components/hooks/queryKeys";
import { Badge } from "@/components/ui/badge";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ArrowLeft, CheckCircle, Trash2, AlertCircle, Calendar, Target, CreditCard, Receipt, Layers } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { useSettings } from "../components/utils/SettingsContext";
import { useConfirm } from "../components/ui/ConfirmDialogProvider";
import { formatCurrency } from "../components/utils/currencyUtils";
import { formatDate, parseDate, doDateRangesOverlap, getDaysBetween, isDateInRange } from "../components/utils/dateUtils";
import {
  getCustomBudgetStats,
  getSystemBudgetStats,
  getCustomBudgetAllocationStats,
  getHistoricalAverageIncome
} from "../components/utils/financialCalculations";
import { useTransactionActions, useCustomBudgetActions } from "../components/hooks/useActions";
import { usePeriod } from "../components/hooks/usePeriod";
import { useMonthlyIncome } from "../components/hooks/useDerivedData";
import ExpenseFormDialog from "../components/transactions/dialogs/ExpenseFormDialog";
import TransactionList from "../components/transactions/TransactionList";
import TransactionFilters from "../components/transactions/TransactionFilters";
import { MassEditDrawer } from "../components/transactions/MassEditDrawer";
import AllocationManager from "../components/custombudgets/AllocationManager";
import BudgetHealthCircular from "../components/custombudgets/BudgetHealthCircular";
import CustomBudgetForm from "../components/custombudgets/CustomBudgetForm";
import BudgetPostMortem from "../components/budgetdetail/BudgetPostMortem";
import BudgetFeasibilityDisplay from "../components/custombudgets/BudgetFeasibilityDisplay";
import { useBudgetAnalysis } from "../components/hooks/useBudgetAnalysis";
import { fetchWithRetry } from "../components/utils/generalUtils";
import { useAdvancedTransactionFiltering } from "../components/hooks/useDerivedData";
import { useMergedCategories } from "../components/hooks/useMergedCategories";

export default function BudgetDetail() {
  const { settings, user } = useSettings();
  const queryClient = useQueryClient();
  const location = useLocation();
  const navigate = useNavigate();
  const [showQuickAdd, setShowQuickAdd] = useState(false);
  const { confirmAction } = useConfirm();
  const { triggerAnalysis } = useBudgetAnalysis();

  const { categories: mergedCategories } = useMergedCategories();

  // Advanced List & Filter State
  const [filters, setFilters] = useState({
    search: '', type: 'all', category: [], paymentStatus: 'all',
    cashStatus: 'all', financialPriority: 'all', budgetId: 'all',
    startDate: '', endDate: '', minAmount: '', maxAmount: ''
  });
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [sortConfig, setSortConfig] = useState({ key: 'date', direction: 'desc' });
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [isBulkDeleting, setIsBulkDeleting] = useState(false);
  const [showMassEdit, setShowMassEdit] = useState(false);

  const { monthStart, monthEnd } = usePeriod();

  const urlParams = new URLSearchParams(location.search);
  const budgetId = urlParams.get('id');

  useEffect(() => {
    if (budgetId) {
      queryClient.invalidateQueries({ queryKey: ['budget', budgetId] });
      setFilters(prev => ({ ...prev, budgetId: budgetId }));
    }
  }, [budgetId, location, queryClient]);

  // Reset page on filter change
  useEffect(() => { setCurrentPage(1); }, [filters]);

  // 1. Fetch the main budget
  const { data: budget, isLoading: budgetLoading } = useQuery({
    queryKey: ['budget', budgetId],
    queryFn: async () => {
      if (!budgetId) return null;
      try {
        const customBudget = await fetchWithRetry(() => base44.entities.CustomBudget.get(budgetId));
        if (customBudget) return { ...customBudget, isSystemBudget: false };
      } catch (error) { }

      try {
        const systemBudget = await fetchWithRetry(() => base44.entities.SystemBudget.get(budgetId));
        if (systemBudget) {
          const goals = await fetchWithRetry(() => base44.entities.BudgetGoal.filter({ priority: systemBudget.systemBudgetType }));
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
    staleTime: 1000 * 60 * 5,
  });

  // 2. Fetch Categories (Defined ONCE)
  const { data: categories = [] } = useQuery({
    queryKey: ['categories'],
    queryFn: () => fetchWithRetry(() => base44.entities.Category.list()),
    // initialData: [],
    staleTime: 1000 * 60 * 60,
  });

  // 3. Fetch all Custom Budgets to support cross-period links (e.g. June trip paid in Feb)
  const { data: allCustomBudgets = [] } = useQuery({
    queryKey: ['allCustomBudgets', user?.email],
    queryFn: async () => {
      if (!user?.email) return [];
      // return await fetchWithRetry(() => base44.entities.CustomBudget.filter({ created_by: user.email }));
      const res = await fetchWithRetry(() => base44.entities.CustomBudget.filter({ created_by: user.email }));
      return Array.isArray(res) ? res : []; // Force array type for downstream .map() calls
    },
    enabled: !!user?.email,
    staleTime: 1000 * 60 * 5,
  });

  // 4. Calculate related IDs
  const relatedCustomBudgetIds = useMemo(() => {
    if (!Array.isArray(allCustomBudgets)) return [];
    return allCustomBudgets.map(cb => cb.id);
  }, [allCustomBudgets]);

  // 5. Smart Transaction Fetch
  const { data: transactions = [] } = useQuery({
    queryKey: ['transactions', budget?.id, relatedCustomBudgetIds],
    queryFn: async () => {
      if (!budget.isSystemBudget) {
        return await fetchWithRetry(() => base44.entities.Transaction.filter({ budgetId: budgetId }));
      }
      return await fetchWithRetry(() => base44.entities.Transaction.filter({
        $or: [
          { paidDate: { $gte: budget.startDate, $lte: budget.endDate } },
          { budgetId: budgetId },
          { budgetId: { $in: relatedCustomBudgetIds } }
        ]
      }));
    },
    // initialData: [],
    enabled: !!budget,
    staleTime: 1000 * 60 * 5,
  });

  // 6. Monthly Income Hook
  const monthlyIncome = useMemo(() => {
    const d = parseDate(monthStart);
    return d ? { month: d.getMonth(), year: d.getFullYear() } : { month: 0, year: 2026 };
  }, [monthStart]);

  const incomeData = useMonthlyIncome(transactions, monthlyIncome.month, monthlyIncome.year);

  // 7. All Budgets (For dropdowns/QuickAdd)
  // CRITICAL FIX 17-Jan-2026: Fetch ALL budgets without date filtering
  // This ensures that when editing old transactions, their linked budget appears in the dropdown
  const { data: allBudgets = [] } = useQuery({
    queryKey: ['allBudgets', user?.email],
    queryFn: async () => {
      if (!user?.email) return [];
      // Fetch ALL custom budgets for this user
      const customB = await fetchWithRetry(() => base44.entities.CustomBudget.filter({ created_by: user.email }));
      // Fetch ALL system budgets for this user
      const sysB = await fetchWithRetry(() => base44.entities.SystemBudget.filter({ created_by: user.email }));
      return [...customB, ...sysB.map(sb => ({ ...sb, isSystemBudget: true, allocatedAmount: sb.budgetAmount }))];
    },
    // initialData: [],
    enabled: !!user?.email,
    staleTime: 1000 * 60 * 5,
  });

  // 8. Allocations specific to this budget
  const { data: allocations = [] } = useQuery({
    queryKey: ['allocations', budgetId],
    queryFn: async () => {
      return await fetchWithRetry(() => base44.entities.CustomBudgetAllocation.filter({ budgetId: budgetId }));
    },
    // initialData: [],
    enabled: !!budgetId && !!budget && !budget.isSystemBudget,
    staleTime: 1000 * 60 * 5,
  });

  // Actions & Mutation logic
  const budgetActions = useCustomBudgetActions({ transactions });
  const transactionActions = useTransactionActions();

  const createAllocationMutation = useMutation({
    mutationFn: (data) => fetchWithRetry(() => base44.entities.CustomBudgetAllocation.create(data)),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['allocations', budgetId] }),
  });

  const updateAllocationMutation = useMutation({
    mutationFn: ({ id, data }) => fetchWithRetry(() => base44.entities.CustomBudgetAllocation.update(id, data)),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['allocations', budgetId] }),
  });

  const deleteAllocationMutation = useMutation({
    mutationFn: (id) => fetchWithRetry(() => base44.entities.CustomBudgetAllocation.delete(id)),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['allocations', budgetId] }),
  });

  const completeBudgetMutation = useMutation({
    mutationFn: (id) => fetchWithRetry(() => base44.entities.CustomBudget.update(id, { status: 'completed' })),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['budget', budgetId] });
      queryClient.invalidateQueries({ queryKey: ['customBudgets'] });
      triggerAnalysis(true);
    },
  });

  const reactivateBudgetMutation = useMutation({
    mutationFn: (id) => fetchWithRetry(() => base44.entities.CustomBudget.update(id, { status: 'active' })),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['budget', budgetId] });
      queryClient.invalidateQueries({ queryKey: ['customBudgets'] });
    },
  });

  // Memos for data processing
  const budgetTransactions = useMemo(() => {
    if (!budget) return [];
    // const customBudgetIds = new Set(allCustomBudgets.map(cb => cb.id));
    const customBudgetIds = new Set((Array.isArray(allCustomBudgets) ? allCustomBudgets : []).map(cb => cb.id));

    if (budget.isSystemBudget) {

      return transactions.filter(t => {
        if (!t.isPaid) return false;
        const isInPeriod = isDateInRange(t.paidDate || t.date, budget.startDate, budget.endDate);
        if (!isInPeriod) return false;

        // Show if: explicitly assigned, matches priority, OR is a custom budget expense (for Lifestyle)
        const isDirect = t.budgetId === budget.id || t.financial_priority === budget.systemBudgetType;
        const isCustomWant = budget.systemBudgetType === 'wants' && customBudgetIds.has(t.budgetId);

        return isDirect || isCustomWant;
      });
    }
    return transactions.filter(t => t.budgetId === budgetId);
  }, [transactions, budgetId, budget, allCustomBudgets]);

  // 10. Use the shared advanced filtering logic
  const { filteredTransactions } = useAdvancedTransactionFiltering(budgetTransactions, filters, setFilters);

  const sortedTransactions = useMemo(() => {
    const sortableItems = [...filteredTransactions];
    if (sortConfig.key) {
      sortableItems.sort((a, b) => {
        let aValue = a[sortConfig.key], bValue = b[sortConfig.key];
        if (sortConfig.key === 'amount') { aValue = Number(aValue); bValue = Number(bValue); }
        if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
        if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      });
    }
    return sortableItems;
  }, [filteredTransactions, sortConfig]);

  const paginatedTransactions = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return sortedTransactions.slice(startIndex, startIndex + itemsPerPage);
  }, [sortedTransactions, currentPage, itemsPerPage]);

  const relatedCustomBudgetsForDisplay = useMemo(() => {
    if (!budget || !budget.isSystemBudget || budget.systemBudgetType !== 'wants') return [];

    // Only show custom budgets that have a transaction paid in THIS period
    const budgetIdsInPeriod = new Set(budgetTransactions.map(t => t.budgetId));
    return allCustomBudgets.filter(cb => budgetIdsInPeriod.has(cb.id));
  }, [budget, allCustomBudgets, budgetTransactions]);

  const stats = useMemo(() => {
    if (!budget) return null;
    if (budget.isSystemBudget) {
      return getSystemBudgetStats(budget, transactions, budget.startDate, budget.endDate, allCustomBudgets);
    }
    return getCustomBudgetStats(budget, transactions);
  }, [budget, transactions, allCustomBudgets]);

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
      "This will delete the budget and all associated transactions.",
      async () => await budgetActions.handleDeleteDirect(budgetId),
      { destructive: true }
    );
  };

  const handleMassUpdate = async (updates) => {
    try {
      const idsToUpdate = Array.from(selectedIds);
      await Promise.all(idsToUpdate.map(id =>
        fetchWithRetry(() => base44.entities.Transaction.update(id, updates))
      ));
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      setSelectedIds(new Set());
      setShowMassEdit(false);
    } catch (e) {
      console.error("Bulk update failed", e);
    }
  };

  // ADDED 03-Feb-2026: Pull-to-refresh handler
  const handleRefresh = async () => {
    await queryClient.invalidateQueries({ queryKey: ['budget', budgetId] });
    await queryClient.invalidateQueries({ queryKey: ['transactions'] });
    await queryClient.invalidateQueries({ queryKey: ['allocations', budgetId] });
    await queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.CATEGORIES] });
    await queryClient.invalidateQueries({ queryKey: ['allCustomBudgets'] });
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
    <PullToRefresh onRefresh={handleRefresh}>
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

          {/* Budget Insights - ADDED: 16-Jan-2026, MODIFIED: 16-Jan-2026 - Disabled for system budgets */}
          {!budget.isSystemBudget && (
            <>
              <BudgetPostMortem
                budget={budget}
                transactions={transactions}
                categories={categories}
                settings={settings}
              />

              {/* ADDED: 18-Jan-2026 - AI insights for existing budgets */}
              <BudgetFeasibilityDisplay
                feasibility={null}
                settings={settings}
                budgetData={{
                  ...budget,
                  transactions: budgetTransactions,
                  stats: stats,
                  allocations: allocations
                }}
              />
            </>
          )}

          {/* Unified Budget Overview Panel */}
          <Card className="border-none shadow-xl bg-gradient-to-br from-card to-muted/20 overflow-hidden">
            <div className="grid md:grid-cols-12 gap-0">
              {/* Left Side: Circular Health Visualization */}
              <div className="md:col-span-4 p-6 flex flex-col items-center justify-center border-b md:border-b-0 md:border-r border-border/50">
                <BudgetHealthCircular
                  budget={{
                    ...budget,
                    calculatedPaid: stats?.spent || 0,
                    calculatedUnpaid: stats?.unpaidAmount || 0,
                    calculatedTotal: totalBudget
                  }}
                  transactions={budgetTransactions}
                  settings={settings}
                />
              </div>

              {/* Right Side: Detailed Stats Grid */}
              <div className="md:col-span-8 p-6">
                <div className="grid grid-cols-2 lg:grid-cols-3 gap-6">
                  {/* Timeline Info */}
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Calendar className="w-4 h-4" />
                      <span className="text-xs font-semibold uppercase tracking-wider">Duration</span>
                    </div>
                    <p className="text-sm font-bold">{getDaysBetween(budget.startDate, budget.endDate)} Days</p>
                    <p className="text-[10px] text-muted-foreground leading-tight">
                      {formatDate(budget.startDate, settings.dateFormat)} - {formatDate(budget.endDate, settings.dateFormat)}
                    </p>
                  </div>

                  {/* Allocation Info */}
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Target className="w-4 h-4" />
                      <span className="text-xs font-semibold uppercase tracking-wider">Budgeted</span>
                    </div>
                    <p className="text-sm font-bold">{formatCurrency(totalBudget, settings)}</p>
                    <p className="text-[10px] text-muted-foreground">Total assigned limit</p>
                  </div>

                  {/* Payment Status Info */}
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Receipt className="w-4 h-4" />
                      <span className="text-xs font-semibold uppercase tracking-wider">Payments</span>
                    </div>
                    <p className="text-sm font-bold text-success">{formatCurrency(stats?.spent || 0, settings)} <span className="text-[10px] font-normal text-muted-foreground">Total Paid</span></p>
                    {stats?.unpaidAmount > 0 && (
                      <p className="text-[10px] font-bold text-warning flex items-center gap-1">
                        <AlertCircle className="w-3 h-3" />
                        {formatCurrency(stats?.unpaidAmount, settings)} Unpaid
                      </p>
                    )}
                  </div>

                  {/* Custom Budget Breakdown (Only for Lifestyle/Wants) */}
                  {budget.isSystemBudget && budget.systemBudgetType === 'wants' && (
                    <div className="col-span-full pt-4 mt-2 border-t border-border/50">
                      <div className="flex items-center gap-2 mb-3 text-muted-foreground">
                        <Layers className="w-4 h-4" />
                        <span className="text-xs font-semibold uppercase tracking-wider">Spend Differentiation</span>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="bg-background/50 rounded-lg p-3 border border-border/30">
                          <p className="text-[10px] uppercase text-muted-foreground font-bold">Direct Lifestyle</p>
                          <p className="text-lg font-black text-primary">
                            {formatCurrency(
                              budgetTransactions
                                .filter(t => t.budgetId === budget.id || !t.budgetId)
                                .reduce((acc, t) => acc + (t.amount || 0), 0),
                              settings
                            )}
                          </p>
                          <p className="text-[9px] text-muted-foreground">Unassigned expenses</p>
                        </div>
                        <div className="bg-background/50 rounded-lg p-3 border border-border/30">
                          <p className="text-[10px] uppercase text-muted-foreground font-bold">Custom Budgets</p>
                          <p className="text-lg font-black text-indigo-500">
                            {formatCurrency(
                              budgetTransactions
                                .filter(t => t.budgetId && t.budgetId !== budget.id)
                                .reduce((acc, t) => acc + (t.amount || 0), 0),
                              settings
                            )}
                          </p>
                          <p className="text-[9px] text-muted-foreground">Total of all sub-budgets</p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Direct Spending for Custom Budgets */}
                  {!budget.isSystemBudget && (
                    <div className="col-span-full pt-4 mt-2 border-t border-border/50">
                      <div className="flex items-center gap-2 mb-2 text-muted-foreground">
                        <CreditCard className="w-4 h-4" />
                        <span className="text-xs font-semibold uppercase tracking-wider">Spending Velocity</span>
                      </div>
                      <div className="w-full bg-muted h-2 rounded-full overflow-hidden flex">
                        <div
                          className="bg-primary h-full transition-all duration-500"
                          style={{ width: `${Math.min(100, (stats?.spent / totalBudget) * 100)}%` }}
                        />
                      </div>
                      <p className="text-[10px] mt-1 text-muted-foreground italic text-right">
                        {Math.round((stats?.spent / totalBudget) * 100)}% of limit reached
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </Card>

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
                <CardTitle>Linked Custom Budgets ({relatedCustomBudgetsForDisplay.length})</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-3 lg:grid-cols-5 gap-4">
                  {relatedCustomBudgetsForDisplay.map((cb) => {
                    const cbStats = getCustomBudgetStats(cb, transactions);
                    return (
                      <BudgetHealthCircular
                        key={cb.id}
                        budget={{
                          ...cb,
                          calculatedPaid: cbStats?.spent || 0,
                          calculatedUnpaid: cbStats?.unpaidAmount || 0,
                          calculatedTotal: cb.allocatedAmount || cb.budgetAmount || 0
                        }}
                        transactions={transactions.filter(t => t.budgetId === cb.id)}
                        settings={settings}
                      />
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold">
                {budget.isSystemBudget ? 'Direct Expenses' : 'Budget Transactions'}
              </h2>
              <ExpenseFormDialog
                open={showQuickAdd}
                onOpenChange={setShowQuickAdd}
                categories={mergedCategories}
                customBudgets={allBudgets}
                defaultCustomBudgetId={budgetId}
                onSubmit={(data) => transactionActions.handleSubmit(data)}
                isSubmitting={transactionActions.isSubmitting}
                transactions={transactions}
                triggerSize="sm"
              />
            </div>

            <TransactionFilters
              filters={filters}
              setFilters={setFilters}
              categories={mergedCategories}
              allCustomBudgets={allCustomBudgets}
              sortConfig={sortConfig}
              onSort={setSortConfig}
            />

            <TransactionList
              transactions={paginatedTransactions}
              categories={mergedCategories}
              onEdit={(t) => transactionActions.handleSubmit(null, t)}
              onDelete={(t) => transactionActions.handleDelete(t)}
              isLoading={budgetLoading}
              currentPage={currentPage}
              totalPages={Math.ceil(filteredTransactions.length / itemsPerPage) || 1}
              onPageChange={setCurrentPage}
              itemsPerPage={itemsPerPage}
              onItemsPerPageChange={setItemsPerPage}
              totalItems={filteredTransactions.length}
              selectedIds={selectedIds}
              onToggleSelection={(id, s) => {
                const n = new Set(selectedIds);
                s ? n.add(id) : n.delete(id);
                setSelectedIds(n);
              }}
              onSelectAll={(ids, s) => {
                const n = new Set(selectedIds);
                ids.forEach(id => s ? n.add(id) : n.delete(id));
                setSelectedIds(n);
              }}
              onClearSelection={() => setSelectedIds(new Set())}
              onEditSelected={() => setShowMassEdit(true)}
              sortConfig={sortConfig}
              onSort={setSortConfig}
            />
          </div>

          <MassEditDrawer
            open={showMassEdit}
            onOpenChange={setShowMassEdit}
            selectedCount={selectedIds.size}
            onSave={handleMassUpdate}
            categories={mergedCategories}
            customBudgets={allCustomBudgets}
          />
        </div>
      </div>
    </PullToRefresh>
  );
}