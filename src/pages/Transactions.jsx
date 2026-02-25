import { useState, useMemo, useEffect, useCallback } from "react";
import { useConfirm } from "../components/ui/ConfirmDialogProvider";
import { base44 } from "@/api/base44Client";
import { useQueryClient, useQuery } from "@tanstack/react-query";
import { showToast } from "@/components/ui/use-toast";
import { toast } from "sonner";
import { QUERY_KEYS } from "../components/hooks/queryKeys";
import { PullToRefresh } from "../components/ui/PullToRefresh";
import { useTransactions, useCustomBudgetsForPeriod } from "../components/hooks/useBase44Entities";
import { useMergedCategories } from "../components/hooks/useMergedCategories";
import { useRecurringTransactions, useRecurringTransactionActions } from "../components/hooks/useRecurringTransactions";
import { useFAB } from "../components/hooks/FABContext";
import { useAdvancedTransactionFiltering } from "../components/hooks/useDerivedData";
import { useTransactionActions } from "../components/hooks/useActions";
import { useSettings } from "../components/utils/SettingsContext";
import { usePeriod } from "../components/hooks/usePeriod";
import { chunkArray, fetchWithRetry } from "../components/utils/generalUtils";
import ExpenseFormDialog from "../components/transactions/dialogs/ExpenseFormDialog";
import IncomeFormDialog from "../components/transactions/dialogs/IncomeFormDialog";
import TransactionList from "../components/transactions/TransactionList";
import TransactionFilters from "../components/transactions/TransactionFilters";
import { ImportWizardDialog } from "../components/import/ImportWizard";
import RecurringTransactionList from "../components/recurring/RecurringTransactionList";
import RecurringFormDialog from "../components/recurring/dialogs/RecurringFormDialog";
import { format, subDays } from "date-fns";
import { useLocation } from "react-router-dom"; // Outlet/Context removed
import { MassEditDrawer } from "../components/transactions/MassEditDrawer";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AdminConsistencyChecker } from "../components/transactions/AdminConsistencyChecker";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Check, X, Loader2, Plus, RefreshCw, Upload, PlusCircle, MinusCircle, ChevronDown } from "lucide-react";

export default function TransactionsLayout() {
  const { user } = useSettings();
  const location = useLocation();
  // Initialize tab based on URL, but then handle locally
  const [activeTab, setActiveTab] = useState(location.pathname.includes("recurring") ? "recurring" : "history");

  // Shared Modals State
  const [showAddIncome, setShowAddIncome] = useState(false);
  const [showAddExpense, setShowAddExpense] = useState(false);
  const [showImportWizard, setShowImportWizard] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState(null); // ADDED

  const { monthStart, monthEnd } = usePeriod(); // Bound fetches to current month
  // Data for Modals
  const { transactions } = useTransactions(monthStart, monthEnd);
  const { categories } = useMergedCategories();
  const { customBudgets: allCustomBudgets } = useCustomBudgetsForPeriod(user);

  // Bank Sync State
  const [syncState, setSyncState] = useState('idle'); // 'idle' | 'syncing' | 'success' | 'error'
  const { data: connections = [] } = useQuery({
    queryKey: ['bankConnections'],
    queryFn: () => base44.entities.BankConnection.list(),
    staleTime: 1000 * 60 * 5,
  });

  const queryClient = useQueryClient();

  const { handleSubmit, isSubmitting } = useTransactionActions({
    onSuccess: () => {
      setShowAddIncome(false);
      setShowAddExpense(false);
      setEditingTransaction(null);
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.TRANSACTIONS] });
    }
  });

  // ADDED: Custom submit wrapper to pass the editing context
  const handleFormSubmit = (data) => {
    // The hook expects (data, existingEntity) for updates
    handleSubmit(data, editingTransaction);
  };

  // Quick Sync Logic (Defaults to last 30 days)
  const handleGlobalSync = async () => {
    const activeConnections = connections.filter(c => c.status === 'active');

    if (activeConnections.length === 0) {
      toast.error("No active bank connections found. Please connect a bank first.");
      return;
    }

    setSyncState('syncing');
    const dateFrom = format(subDays(new Date(), 30), 'yyyy-MM-dd');
    const dateTo = format(new Date(), 'yyyy-MM-dd');

    try {
      for (const conn of activeConnections) {
        await fetchWithRetry(() => base44.functions.invoke('trueLayerSync', {
          connectionId: conn.id,
          dateFrom,
          dateTo
        }));
      }

      setSyncState('success');
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.TRANSACTIONS] });
      setTimeout(() => setSyncState('idle'), 3000);
    } catch (error) {
      setSyncState('error');
      toast.error(`Sync failed: ${error.message}`);
      setTimeout(() => setSyncState('idle'), 3000);
    }
  };

  return (
    <>
      <div className="min-h-screen p-2 md:p-8">
        <div className="max-w-6xl mx-auto space-y-4 pb-24">
          {/* Header: Hidden on mobile, visible on desktop */}
          <div className="hidden md:flex flex-row justify-between items-center gap-4 px-2">
            <div>
              <h1 className="text-2xl md:text-4xl font-bold">Transactions</h1>
              <p className="text-xs text-muted-foreground">Monitor and automate your finances</p>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                className="h-9 gap-2 w-[110px] transition-all duration-300"
                onClick={handleGlobalSync}
                disabled={syncState === 'syncing'}
              >
                {syncState === 'idle' && <><RefreshCw className="h-4 w-4" /> Sync</>}
                {syncState === 'syncing' && <><Loader2 className="h-4 w-4 animate-spin" /> Syncing</>}
                {syncState === 'success' && <><Check className="h-4 w-4 text-emerald-500" /> Synced</>}
                {syncState === 'error' && <><X className="h-4 w-4 text-rose-500" /> Failed</>}
              </Button>

              <Button variant="outline" size="sm" className="h-9 gap-2" onClick={() => setShowImportWizard(true)}>
                <Upload className="h-4 w-4" /> Import
              </Button>

              <div className="h-6 w-[1px] bg-border mx-1" />

              <Button variant="default" size="sm" className="h-9 gap-2 bg-rose-500 hover:bg-rose-600 text-white" onClick={() => setShowAddExpense(true)}>
                <MinusCircle className="h-4 w-4" /> Expense
              </Button>

              <Button variant="default" size="sm" className="h-9 gap-2 bg-emerald-500 hover:bg-emerald-600 text-white" onClick={() => setShowAddIncome(true)}>
                <PlusCircle className="h-4 w-4" /> Income
              </Button>

            </div>

            <div className="flex items-center gap-3">
              <Button variant="outline" size="sm" className="h-9 gap-2">
                <RefreshCw className="h-4 w-4" />
                Bank Sync
              </Button>

              <Button
                variant="outline"
                size="sm"
                className="h-9 gap-2"
                onClick={() => setShowImportWizard(true)}
              >
                <Upload className="h-4 w-4" />
                Import
              </Button>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button size="sm" className="h-9 gap-2 px-4">
                    <Plus className="h-4 w-4" />
                    Add New
                    <ChevronDown className="h-3 w-3 opacity-50" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <DropdownMenuItem onClick={() => setShowAddIncome(true)} className="gap-2 text-emerald-600 dark:text-emerald-400">
                    <PlusCircle className="h-4 w-4" /> Add Income
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setShowAddExpense(true)} className="gap-2 text-rose-600 dark:text-rose-400">
                    <MinusCircle className="h-4 w-4" /> Add Expense
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

          </div>

          {/* Mobile/Desktop Navigation Tabs */}
          <Tabs
            value={activeTab}
            className="w-full"
            onValueChange={setActiveTab}
          >
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="history">History</TabsTrigger>
              <TabsTrigger value="recurring">Recurring</TabsTrigger>
            </TabsList>

            <div className="mt-4">
              {activeTab === 'history' ? (
                <TransactionHistory
                  setEditingTransaction={setEditingTransaction}
                  setShowAddIncome={setShowAddIncome}
                  setShowAddExpense={setShowAddExpense}
                  setShowImportWizard={setShowImportWizard}
                />
              ) : (
                <RecurringTransactions />
              )}
            </div>
          </Tabs>
        </div>
      </div>

      {/* Global Modals Container */}
      <IncomeFormDialog
        open={showAddIncome}
        onOpenChange={(open) => { setShowAddIncome(open); if (!open) setEditingTransaction(null); }}
        onSubmit={handleFormSubmit}
        isSubmitting={isSubmitting}
        renderTrigger={false}
        transaction={editingTransaction}
      />
      <ExpenseFormDialog
        open={showAddExpense}
        onOpenChange={(open) => { setShowAddExpense(open); if (!open) setEditingTransaction(null); }}
        categories={categories}
        customBudgets={allCustomBudgets}
        onSubmit={handleFormSubmit}
        isSubmitting={isSubmitting}
        transactions={transactions}
        renderTrigger={false}
        transaction={editingTransaction}
      />
      <ImportWizardDialog
        open={showImportWizard}
        onOpenChange={setShowImportWizard}
        renderTrigger={false}
      />
    </>
  );
}

export function TransactionHistory({
  setEditingTransaction,
  setShowAddIncome,
  setShowAddExpense,
  setShowImportWizard
}) {
  const { user } = useSettings();
  const { confirmAction } = useConfirm();
  const queryClient = useQueryClient();

  // FAB Logic moved to leaf component
  const { setFabButtons } = useFAB();

  // History State
  const [filters, setFilters] = useState({
    search: '', type: 'all', category: [], paymentStatus: 'all',
    cashStatus: 'all', financialPriority: 'all', budgetId: 'all',
    startDate: usePeriod().monthStart, endDate: usePeriod().monthEnd, minAmount: '', maxAmount: '',
    idSearch: '' // NEW: Admin ID Search
  });
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [sortConfig, setSortConfig] = useState({ key: 'date', direction: 'desc' });
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [isBulkDeleting, setIsBulkDeleting] = useState(false);
  const [showMassEdit, setShowMassEdit] = useState(false); // NEW STATE
  const isAdmin = user?.role === 'admin';

  // Hooks
  const { transactions, isLoading } = useTransactions(filters.startDate, filters.endDate);
  const { categories } = useMergedCategories();
  const { customBudgets: allCustomBudgets } = useCustomBudgetsForPeriod(user);
  const { filteredTransactions } = useAdvancedTransactionFiltering(transactions, filters, setFilters);
  const { handleDelete } = useTransactionActions({});

  // Reset pagination proactively when filters change to prevent "stale page" flash
  useEffect(() => {
    setCurrentPage(1);
  }, [filters]);

  // Logic
  const sortedTransactions = useMemo(() => {
    const sortableItems = [...filteredTransactions];
    if (sortConfig.key) {
      const categoryMap = {};
      if (sortConfig.key === 'category') categories.forEach(c => categoryMap[c.id] = c.name.toLowerCase());
      sortableItems.sort((a, b) => {
        let aValue = a[sortConfig.key], bValue = b[sortConfig.key];
        if (sortConfig.key === 'amount') { aValue = Number(aValue); bValue = Number(bValue); }
        else if (sortConfig.key === 'category') { aValue = categoryMap[a.category_id] || ''; bValue = categoryMap[b.category_id] || ''; }
        if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
        if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      });
    }
    return sortableItems;
  }, [filteredTransactions, sortConfig, categories]);

  const paginatedTransactions = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return sortedTransactions.slice(startIndex, startIndex + itemsPerPage);
  }, [sortedTransactions, currentPage, itemsPerPage]);

  const handleRefresh = async () => {
    await queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.TRANSACTIONS] });
  };

  const handleEdit = (transaction) => {
    if (setEditingTransaction) setEditingTransaction(transaction);
    if (transaction.type === 'income' && setShowAddIncome) setShowAddIncome(true);
    else if (setShowAddExpense) setShowAddExpense(true);
  };

  const handleDeleteSelected = async () => {
    if (selectedIds.size === 0) return;
    confirmAction("Delete Transactions", `Delete ${selectedIds.size} items?`, async () => {
      setIsBulkDeleting(true);

      // 1. Optimistic UI Update
      await queryClient.cancelQueries({ queryKey: [QUERY_KEYS.TRANSACTIONS] });
      const previousQueries = queryClient.getQueriesData({ queryKey: [QUERY_KEYS.TRANSACTIONS] });
      queryClient.setQueriesData({ queryKey: [QUERY_KEYS.TRANSACTIONS] }, (old = []) =>
        old.filter(t => !selectedIds.has(t.id))
      );

      try {
        const idsToDelete = Array.from(selectedIds);
        const chunks = chunkArray(idsToDelete, 50);
        for (const chunk of chunks) {
          // Wrap in retry logic just in case
          await fetchWithRetry(() => base44.entities.Transaction.deleteMany({ id: { $in: chunk } }));
        }
        showToast({ title: "Success", description: `Deleted ${selectedIds.size} transactions.` });
        setSelectedIds(new Set());
      } catch (e) {
        // 2. Rollback on ultimate failure
        previousQueries.forEach(([queryKey, oldData]) => queryClient.setQueryData(queryKey, oldData));
        showToast({ title: "Error", description: "Failed to delete. Reverting.", variant: "destructive" });
      } finally {
        setIsBulkDeleting(false);
        queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.TRANSACTIONS] }); // Resync with truth
      }
    }, { destructive: true });
  };

  // NEW: Handle Mass Update
  const handleMassUpdate = async (updates) => {
    // 1. Optimistic UI Update
    await queryClient.cancelQueries({ queryKey: [QUERY_KEYS.TRANSACTIONS] });
    const previousQueries = queryClient.getQueriesData({ queryKey: [QUERY_KEYS.TRANSACTIONS] });
    queryClient.setQueriesData({ queryKey: [QUERY_KEYS.TRANSACTIONS] }, (old = []) =>
      old.map(t => selectedIds.has(t.id) ? { ...t, ...updates } : t)
    );

    try {
      const idsToUpdate = Array.from(selectedIds);

      // 2. Process in smaller chunks (10 instead of 50) and stagger them
      const chunks = chunkArray(idsToUpdate, 10);
      for (const chunk of chunks) {
        await Promise.all(chunk.map((id, index) =>
          // Stagger individual requests by 50ms to prevent instant API spikes
          new Promise(resolve => setTimeout(resolve, index * 50))
            .then(() => fetchWithRetry(() => base44.entities.Transaction.update(id, updates)))
        ));
        // Add a small 200ms delay between chunks
        await new Promise(r => setTimeout(r, 200));
      }

      showToast({ title: "Success", description: `Updated ${selectedIds.size} transactions.` });
      setSelectedIds(new Set()); // Clear selection
      setShowMassEdit(false);
    } catch (e) {
      // 3. Rollback on ultimate failure
      previousQueries.forEach(([queryKey, oldData]) => queryClient.setQueryData(queryKey, oldData));
      showToast({ title: "Update Failed", description: "Could not update some transactions. Reverting.", variant: "destructive" });
    } finally {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.TRANSACTIONS] }); // Resync with truth
    }
  };

  // ADDED: Define FAB buttons here
  const historyFab = useMemo(() => [
    {
      key: 'import',
      label: 'Import Data',
      icon: 'FileUp',
      variant: 'primary',
      onClick: () => setShowImportWizard(true) // Assumes these setters are available or passed via context
    },
    {
      key: 'expense',
      label: 'Add Expense',
      icon: 'MinusCircle',
      variant: 'warning',
      onClick: () => setShowAddExpense(true)
    },
    {
      key: 'income',
      label: 'Add Income',
      icon: 'PlusCircle',
      variant: 'success',
      onClick: () => setShowAddIncome(true)
    }
  ], [setShowImportWizard, setShowAddExpense, setShowAddIncome]);

  useEffect(() => {
    setFabButtons(historyFab);
    // Removing setFabButtons from dependency array to prevent loops
  }, [historyFab]);

  return (
    <PullToRefresh onRefresh={handleRefresh}>
      <div className="space-y-4 mt-0">
        {isAdmin && (
          <AdminConsistencyChecker transactions={transactions} />
        )}

        <TransactionFilters
          filters={filters} setFilters={setFilters}
          categories={categories} allCustomBudgets={allCustomBudgets}
          sortConfig={sortConfig} onSort={setSortConfig} // Passed down for Mobile Drawer
        />
        <TransactionList
          transactions={paginatedTransactions} categories={categories}
          onEdit={handleEdit} onDelete={handleDelete} isLoading={isLoading}
          customBudgets={allCustomBudgets}
          monthStart={usePeriod().monthStart} monthEnd={usePeriod().monthEnd}
          currentPage={currentPage}
          totalPages={Math.ceil(filteredTransactions.length / itemsPerPage) || 1}
          onPageChange={setCurrentPage}
          itemsPerPage={itemsPerPage}
          onItemsPerPageChange={(val) => {
            setItemsPerPage(val);
            setCurrentPage(1);
          }}
          totalItems={filteredTransactions.length}
          selectedIds={selectedIds}
          onToggleSelection={(id, s) => { const n = new Set(selectedIds); s ? n.add(id) : n.delete(id); setSelectedIds(n); }}
          onSelectAll={(ids, s) => { const n = new Set(selectedIds); ids.forEach(id => s ? n.add(id) : n.delete(id)); setSelectedIds(n); }}
          onClearSelection={() => setSelectedIds(new Set())}
          onDeleteSelected={handleDeleteSelected} isBulkDeleting={isBulkDeleting}
          onEditSelected={() => setShowMassEdit(true)} // Pass the handler
          sortConfig={sortConfig} onSort={setSortConfig}
        />

        <MassEditDrawer
          open={showMassEdit}
          onOpenChange={setShowMassEdit}
          selectedCount={selectedIds.size}
          onSave={handleMassUpdate}
          categories={categories}
          customBudgets={allCustomBudgets}
        />
      </div>
    </PullToRefresh>
  );
}

export function RecurringTransactions() {
  const { user } = useSettings();
  const queryClient = useQueryClient();
  const { setFabButtons, clearFabButtons } = useFAB();
  const [showRecurringForm, setShowRecurringForm] = useState(false);
  const [editingRecurring, setEditingRecurring] = useState(null);
  const [isProcessingRecurring, setIsProcessingRecurring] = useState(false);

  const { recurringTransactions, isLoading } = useRecurringTransactions(user);
  const { categories } = useMergedCategories();
  const { handleCreate, handleUpdate, handleDelete, handleToggleActive, isSubmitting } = useRecurringTransactionActions(user);

  const handleProcessRecurring = useCallback(async () => {
    setIsProcessingRecurring(true);
    const toastId = toast.loading('Processing...');
    try {
      const userLocalDate = format(new Date(), 'yyyy-MM-dd');
      const response = await fetchWithRetry(() => base44.functions.invoke('processRecurringTransactions', { userLocalDate }));
      if (response.data.success) {
        toast.success(`Processed ${response.data.processed}`, { id: toastId });
        queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.TRANSACTIONS] });
      } else toast.error('Failed', { id: toastId });
    } catch (e) { toast.error('Error', { id: toastId }); }
    finally { setIsProcessingRecurring(false); }
  }, [queryClient]);

  useEffect(() => {
    const buttons = [{
      key: 'add-recurring', label: 'Add Recurring', icon: 'PlusCircle', variant: 'create',
      onClick: () => { setEditingRecurring(null); setShowRecurringForm(true); }
    }];
    if (user?.role === 'admin') buttons.push({
      key: 'process', label: 'Process Now', icon: 'Play', variant: 'info',
      onClick: handleProcessRecurring, disabled: isProcessingRecurring
    });
    setFabButtons(buttons);
    return () => clearFabButtons();
  }, [user, handleProcessRecurring, isProcessingRecurring, setFabButtons, clearFabButtons]);

  const handleRecurringSubmit = (data) => {
    if (editingRecurring) handleUpdate(editingRecurring.id, data);
    else handleCreate(data);
    setShowRecurringForm(false);
  };

  const handleRefresh = async () => {
    await queryClient.invalidateQueries({ queryKey: ['RECURRING_TRANSACTIONS'] });
  };

  return (
    <PullToRefresh onRefresh={handleRefresh}>
      <div className="space-y-4">
        <RecurringTransactionList
          recurringTransactions={recurringTransactions}
          categories={categories}
          onEdit={(r) => { setEditingRecurring(r); setShowRecurringForm(true); }}
          onDelete={handleDelete}
          onToggleActive={handleToggleActive}
          isLoading={isLoading}
        />
      </div>

      <RecurringFormDialog
        open={showRecurringForm}
        onOpenChange={(open) => { setShowRecurringForm(open); if (!open) setEditingRecurring(null); }}
        onSubmit={handleRecurringSubmit}
        isSubmitting={isSubmitting}
        transaction={editingRecurring}
        categories={categories}
      />
    </PullToRefresh>
  );
}