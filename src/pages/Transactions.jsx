import { useState, useMemo, useEffect, useCallback, useRef } from "react";
import { useConfirm } from "../components/ui/ConfirmDialogProvider";
import { base44 } from "@/api/base44Client";
import { useQueryClient, useQuery } from "@tanstack/react-query";
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
import { subDays, formatDateString } from "../components/utils/dateUtils";
import { useLocation, useNavigate } from "react-router-dom";
import { MassEditDrawer } from "../components/transactions/MassEditDrawer";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { AdminConsistencyChecker } from "../components/transactions/AdminConsistencyChecker";
import { CustomButton } from "@/components/ui/CustomButton";
import { Check, X, Loader2, RefreshCw, Upload, PlusCircle, MinusCircle, Building2, Repeat } from "lucide-react";
import { useBankSync } from "../components/banksync/useBankSync";
import LastSyncInfo from "@/components/ui/LastSyncInfo";
import ScrollToTopButton from "../components/ui/ScrollToTopButton";
// ADDED 12-Mar-2026: Tutorial system integration for History and Recurring tabs
import { useTutorialTrigger } from '../components/tutorial/useTutorialTrigger';
import { TUTORIAL_IDS } from '../components/tutorial/tutorialConfig';

/**
 * Transactions Layout - Main wrapper for History and Recurring tabs
 */
export default function TransactionsLayout() {
  const transactionsScrollRef = useRef(null);

  const { user, settings } = useSettings();
  const location = useLocation();
  const navigate = useNavigate();

  // Initialize tab based on URL, but then handle locally
  const [activeTab, setActiveTab] = useState(() => {
    const params = new URLSearchParams(location.search);
    return params.get("tab") === "recurring" || location.pathname.includes("recurring") ? "recurring" : "history";
  });

  // Keep tab state strictly synced with URL changes
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    if (params.get("tab") === "recurring" || params.get("tab") === "history") {
      setActiveTab(params.get("tab"));
    }
  }, [location.search]);

  // Shared Modals State
  const [showAddIncome, setShowAddIncome] = useState(false);
  const [showAddExpense, setShowAddExpense] = useState(false);
  const [showImportWizard, setShowImportWizard] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState(null);
  const [showRecurringForm, setShowRecurringForm] = useState(false);
  const [editingRecurring, setEditingRecurring] = useState(null);

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

  const hasActiveConnections = connections.some(c => c.status === 'active');

  const lastSyncDate = useMemo(() => {
    const syncDates = connections
      .filter(c => c.status === 'active' && c.last_sync)
      .map(c => new Date(c.last_sync).getTime());
    return syncDates.length > 0 ? new Date(Math.max(...syncDates)) : null;
  }, [connections]);

  const { executeSync } = useBankSync(user);

  const queryClient = useQueryClient();

  const { handleSubmit, isSubmitting } = useTransactionActions({
    onSuccess: () => {
      setShowAddIncome(false);
      setShowAddExpense(false);
      setEditingTransaction(null);
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.TRANSACTIONS] });
    }
  });

  const { handleCreate, handleUpdate, isSubmitting: isRecurringSubmitting } = useRecurringTransactionActions(user);

  // Custom submit wrapper to pass the editing context
  const handleFormSubmit = (data) => {
    // The hook expects (data, existingEntity) for updates
    handleSubmit(data, editingTransaction);
  };

  // Quick Sync Logic (Defaults to last 30 days)
  const handleGlobalSync = async () => {
    const activeConnections = connections.filter(c => c.status === 'active');

    setSyncState('syncing');
    const dateFrom = formatDateString(subDays(new Date(), 30));

    try {
      for (const conn of activeConnections) {
        await executeSync(conn, dateFrom);
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

  const handleRecurringSubmit = (data) => {
    if (editingRecurring) handleUpdate(editingRecurring.id, data);
    else handleCreate(data);
    setShowRecurringForm(false);
  };

  return (
    <>
      <div ref={transactionsScrollRef} className="h-[calc(100vh-var(--header-total-height)-var(--nav-total-height))] w-full max-w-[100vw] overflow-y-auto overflow-x-hidden p-2 md:p-8 relative scroll-smooth">
        <div className="max-w-6xl mx-auto space-y-4 pb-32">
          {/* Header: Hidden on mobile, visible on desktop */}
          <div className="hidden md:flex flex-row justify-between items-center gap-4 px-2">
            <div>
              <h1 className="text-2xl md:text-4xl font-bold">Transactions</h1>
              <p className="text-xs text-muted-foreground">Monitor and automate your finances</p>
            </div>

            <div className="flex items-center gap-2">
              <CustomButton
                variant="sync"
                size="sm"
                className={`h-auto py-1 px-3 gap-2 transition-all duration-300 ${hasActiveConnections ? 'min-w-[110px]' : 'w-auto'}`}
                onClick={hasActiveConnections ? handleGlobalSync : () => navigate('/BankSync')}
                disabled={syncState === 'syncing'}
              >
                {!hasActiveConnections ? (
                  <><Building2 className="h-4 w-4" /> Connect Bank</>
                ) : (
                  <div className="flex items-center gap-2">
                    {syncState === 'idle' && <RefreshCw className="h-4 w-4" />}
                    {syncState === 'syncing' && <Loader2 className="h-4 w-4 animate-spin" />}
                    {syncState === 'success' && <Check className="h-4 w-4 text-emerald-500" />}
                    {syncState === 'error' && <X className="h-4 w-4 text-rose-500" />}

                    <div className="flex flex-col items-start leading-tight">
                      <span className="text-xs font-medium">
                        {syncState === 'idle' && "Sync"}
                        {syncState === 'syncing' && "Syncing"}
                        {syncState === 'success' && "Synced"}
                        {syncState === 'error' && "Failed"}
                      </span>
                      {lastSyncDate && syncState === 'idle' && (
                        <LastSyncInfo
                          date={lastSyncDate}
                          prefix="Last:"
                          formatOverride="MMM dd"
                          className="text-[10px] opacity-60 font-normal text-inherit"
                        />
                      )}
                    </div>
                  </div>
                )}
              </CustomButton>

              <CustomButton
                variant="importData"
                size="sm"
                className="h-9 gap-2"
                onClick={() => setShowImportWizard(true)}>
                <Upload className="h-4 w-4" /> Import
              </CustomButton>

              <div className="h-6 w-[1px] bg-border mx-1" />

              <CustomButton
                variant="create"
                size="sm"
                className="h-9 gap-2"
                onClick={() => { setEditingRecurring(null); setShowRecurringForm(true); }}>
                <Repeat className="h-4 w-4" /> Recurring
              </CustomButton>

              <CustomButton
                variant="expense"
                size="sm"
                className="h-9 gap-2"
                onClick={() => setShowAddExpense(true)}>
                <MinusCircle className="h-4 w-4" /> Expense
              </CustomButton>

              <CustomButton
                variant="income"
                size="sm"
                className="h-9 gap-2"
                onClick={() => setShowAddIncome(true)}>
                <PlusCircle className="h-4 w-4" /> Income
              </CustomButton>
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

            <div className="mt-4 relative min-h-[500px]">
              <TabsContent value="history" className="m-0 border-none p-0 outline-none">
                <TransactionHistory
                  setEditingTransaction={setEditingTransaction}
                  setShowAddIncome={setShowAddIncome}
                  setShowAddExpense={setShowAddExpense}
                  setShowImportWizard={setShowImportWizard}
                  hasActiveConnections={hasActiveConnections}
                  handleGlobalSync={handleGlobalSync}
                  lastSyncDate={lastSyncDate}
                  settings={settings}
                  syncState={syncState}
                  setShowRecurringForm={setShowRecurringForm}
                  setEditingRecurring={setEditingRecurring}
                />
              </TabsContent>

              <TabsContent value="recurring" className="m-0 border-none p-0 outline-none">
                <RecurringTransactions
                  setEditingRecurring={setEditingRecurring}
                  setShowRecurringForm={setShowRecurringForm}
                  showRecurringForm={showRecurringForm}
                />
              </TabsContent>
            </div>
          </Tabs>
          <ScrollToTopButton scrollRef={transactionsScrollRef} />
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
      <RecurringFormDialog
        open={showRecurringForm}
        onOpenChange={(open) => { setShowRecurringForm(open); if (!open) setEditingRecurring(null); }}
        onSubmit={handleRecurringSubmit}
        isSubmitting={isRecurringSubmitting}
        transaction={editingRecurring}
        categories={categories}
      />
    </>
  );
}

/**
 * Transaction History Tab Content
 */
export function TransactionHistory({
  setEditingTransaction,
  setShowAddIncome,
  setShowAddExpense,
  setShowImportWizard,
  hasActiveConnections,
  handleGlobalSync,
  lastSyncDate,
  settings,
  syncState,
  setShowRecurringForm,
  setEditingRecurring
}) {
  const { user } = useSettings();
  const { confirmAction } = useConfirm();
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  // FAB Logic moved to leaf component
  const { setFabButtons } = useFAB();

  // UPDATED 12-Mar-2026: Read URL search params for deep-link filter support
  const { monthStart: periodStart, monthEnd: periodEnd } = usePeriod();
  const locationForFilters = useLocation();

  const [filters, setFilters] = useState(() => {
    const params = new URLSearchParams(locationForFilters.search);
    return {
      search: '',
      type: params.get('type') || 'all',
      category: params.get('category') ? [params.get('category')] : [],
      paymentStatus: 'all',
      cashStatus: 'all',
      financialPriority: 'all',
      budgetId: 'all',
      startDate: params.get('startDate') || periodStart,
      endDate: params.get('endDate') || periodEnd,
      minAmount: '',
      maxAmount: '',
      idSearch: '',
    };
  });
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [sortConfig, setSortConfig] = useState({ key: 'date', direction: 'desc' });
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [isBulkDeleting, setIsBulkDeleting] = useState(false);
  const [showMassEdit, setShowMassEdit] = useState(false);
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
      await queryClient.cancelQueries({ queryKey: [QUERY_KEYS.TRANSACTIONS], exact: false });
      const previousQueries = queryClient.getQueriesData({ queryKey: [QUERY_KEYS.TRANSACTIONS], exact: false });
      queryClient.setQueriesData({ queryKey: [QUERY_KEYS.TRANSACTIONS], exact: false }, (old = []) =>
        old.filter(t => !selectedIds.has(t.id))
      );

      try {
        const idsToDelete = Array.from(selectedIds);
        const chunks = chunkArray(idsToDelete, 50);
        for (const chunk of chunks) {
          // Wrap in retry logic just in case
          await fetchWithRetry(() => base44.entities.Transaction.deleteMany({ id: { $in: chunk } }));
        }
        toast.success(`Deleted ${selectedIds.size} transactions.`);
        setSelectedIds(new Set());
      } catch (e) {
        // 2. Rollback on ultimate failure
        previousQueries.forEach(([queryKey, oldData]) => queryClient.setQueryData(queryKey, oldData));
        toast.error("Failed to delete. Reverting.");
      } finally {
        setIsBulkDeleting(false);
        queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.TRANSACTIONS] }); // Resync with truth
      }
    }, { destructive: true });
  };

  // NEW: Handle Mass Update
  const handleMassUpdate = async (updates) => {
    // 1. Optimistic UI Update
    await queryClient.cancelQueries({ queryKey: [QUERY_KEYS.TRANSACTIONS], exact: false });
    const previousQueries = queryClient.getQueriesData({ queryKey: [QUERY_KEYS.TRANSACTIONS], exact: false });
    queryClient.setQueriesData({ queryKey: [QUERY_KEYS.TRANSACTIONS], exact: false }, (old = []) =>
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

      toast.success(`Updated ${selectedIds.size} transactions.`);
      setSelectedIds(new Set()); // Clear selection
      setShowMassEdit(false);
    } catch (e) {
      // 3. Rollback on ultimate failure
      previousQueries.forEach(([queryKey, oldData]) => queryClient.setQueryData(queryKey, oldData));
      toast.error("Could not update some transactions. Reverting.");
    } finally {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.TRANSACTIONS] }); // Resync with truth
    }
  };

  // Define FAB buttons here
  const historyFab = useMemo(() => [
    {
      key: 'sync',
      label: syncState === 'syncing' ? 'Syncing...' : (hasActiveConnections ? 'Sync' : 'Connect Bank'),
      icon: syncState === 'syncing' ? 'Loader2' : (hasActiveConnections ? 'RefreshCw' : 'Building2'),
      variant: 'sync',
      onClick: hasActiveConnections ? handleGlobalSync : () => navigate('/BankSync')
    },
    {
      key: 'import',
      label: 'Import Data',
      icon: 'FileUp',
      variant: 'importData',
      onClick: () => setShowImportWizard(true) // Assumes these setters are available or passed via context
    },
    {
      key: 'recurring',
      label: 'Recurring',
      icon: 'Repeat',
      variant: 'create',
      onClick: () => { setEditingRecurring(null); setShowRecurringForm(true); }
    },
    {
      key: 'expense',
      label: 'Add Expense',
      icon: 'MinusCircle',
      variant: 'expense',
      onClick: () => setShowAddExpense(true)
    },
    {
      key: 'income',
      label: 'Add Income',
      icon: 'PlusCircle',
      variant: 'income',
      onClick: () => setShowAddIncome(true)
    }
  ], [setShowImportWizard, setShowAddExpense, setShowAddIncome, setShowRecurringForm, setEditingRecurring, hasActiveConnections, handleGlobalSync, syncState, navigate]);

  useEffect(() => {
    setFabButtons(historyFab);
    // Removing setFabButtons from dependency array to prevent loops
  }, [historyFab]);

  // ADDED 12-Mar-2026: Trigger history tab tutorial when data is loaded
  useTutorialTrigger(TUTORIAL_IDS.TRANSACTION_HISTORY, 800, !isLoading);

  return (
    <PullToRefresh onRefresh={handleRefresh}>
      <div className="space-y-4 mt-0">
        {isAdmin && (
          <AdminConsistencyChecker transactions={transactions} />
        )}

        <div data-tutorial="txn-filters">
          <TransactionFilters
            filters={filters} setFilters={setFilters}
            categories={categories} allCustomBudgets={allCustomBudgets}
            sortConfig={sortConfig} onSort={setSortConfig} // Passed down for Mobile Drawer
          />
        </div>
        <div data-tutorial="txn-list">
          <TransactionList
            transactions={paginatedTransactions} categories={categories}
            onEdit={handleEdit} onDelete={handleDelete} isLoading={isLoading}
            customBudgets={allCustomBudgets}
            monthStart={periodStart} monthEnd={periodEnd}
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
            data-tutorial="txn-sort"
          />
        </div>

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

/**
 * Recurring Transactions Tab Content
 */
export function RecurringTransactions({ setEditingRecurring, setShowRecurringForm }) {
  const { user } = useSettings();
  const queryClient = useQueryClient();
  const { setFabButtons, clearFabButtons } = useFAB();
  const [isProcessingRecurring, setIsProcessingRecurring] = useState(false);

  const { recurringTransactions, isLoading } = useRecurringTransactions(user);
  const { categories } = useMergedCategories();
  const { handleDelete, handleToggleActive } = useRecurringTransactionActions(user);

  const handleProcessRecurring = useCallback(async () => {
    setIsProcessingRecurring(true);
    const toastId = toast.loading('Processing...');
    try {
      const userLocalDate = formatDateString(new Date());
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

  const handleRefresh = async () => {
    await queryClient.invalidateQueries({ queryKey: ['RECURRING_TRANSACTIONS'] });
  };

  // ADDED 12-Mar-2026: Trigger recurring tab tutorial when data is loaded
  useTutorialTrigger(TUTORIAL_IDS.TRANSACTION_RECURRING, 800, !isLoading);

  return (
    <PullToRefresh onRefresh={handleRefresh}>
      <div className="space-y-4">
        <div data-tutorial="recurring-list">
          <RecurringTransactionList
            recurringTransactions={recurringTransactions}
            categories={categories}
            onEdit={(r) => { setEditingRecurring(r); setShowRecurringForm(true); }}
            onDelete={handleDelete}
            onToggleActive={handleToggleActive}
            isLoading={isLoading}
            data-tutorial="recurring-toggle"
          />
        </div>
      </div>
    </PullToRefresh>
  );
}