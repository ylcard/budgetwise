import { useState, useMemo, useEffect, useCallback } from "react";
import { CustomButton } from "@/components/ui/CustomButton";
import { Plus, ArrowDown, History, Repeat, Play, FileUp, PlusCircle, MinusCircle } from "lucide-react";
import { useConfirm } from "../components/ui/ConfirmDialogProvider";
import { base44 } from "@/api/base44Client";
import { useQueryClient } from "@tanstack/react-query";
import { showToast } from "@/components/ui/use-toast";
import { toast } from "sonner";
import { QUERY_KEYS } from "../components/hooks/queryKeys";
import { PullToRefresh } from "../components/ui/PullToRefresh"; // ADDED 03-Feb-2026: Native-style pull-to-refresh
import { useTransactions, useCategories, useCustomBudgetsForPeriod } from "../components/hooks/useBase44Entities";
import { useRecurringTransactions, useRecurringTransactionActions } from "../components/hooks/useRecurringTransactions";
import { useFAB } from "../components/hooks/FABContext";
import { useAdvancedTransactionFiltering } from "../components/hooks/useDerivedData";
import { useTransactionActions } from "../components/hooks/useActions";
import { useSettings } from "../components/utils/SettingsContext";
import { usePeriod } from "../components/hooks/usePeriod";
import { chunkArray } from "../components/utils/generalUtils";
import QuickAddTransaction from "../components/transactions/QuickAddTransaction";
import QuickAddIncome from "../components/transactions/QuickAddIncome";
import TransactionList from "../components/transactions/TransactionList";
import TransactionFilters from "../components/transactions/TransactionFilters";
import { ImportWizardDialog } from "../components/import/ImportWizard";
import RecurringTransactionList from "../components/recurring/RecurringTransactionList";
import RecurringTransactionForm from "../components/recurring/RecurringTransactionForm";
import { format } from "date-fns";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";
import { useIsMobile } from "@/hooks/use-mobile";
import { Outlet, useLocation, useOutletContext } from "react-router-dom";

export default function TransactionsLayout() {
    const { user } = useSettings();
    const location = useLocation();

    // Shared Modals State
    const [showAddIncome, setShowAddIncome] = useState(false);
    const [showAddExpense, setShowAddExpense] = useState(false);
    const [showImportWizard, setShowImportWizard] = useState(false);
    const [editingTransaction, setEditingTransaction] = useState(null); // ADDED

    // Data for Modals
    const { transactions } = useTransactions();
    const { categories } = useCategories();
    const { customBudgets: allCustomBudgets } = useCustomBudgetsForPeriod(user);

    const { handleSubmit, isSubmitting } = useTransactionActions({
        onSuccess: () => {
            setShowAddIncome(false);
            setShowAddExpense(false);
            setEditingTransaction(null);
        }
    });

    // ADDED: Custom submit wrapper to pass the editing context
    const handleFormSubmit = (data) => {
        // The hook expects (data, existingEntity) for updates
        handleSubmit(data, editingTransaction);
    };

    return (
        <>
            <div className="min-h-screen p-2 md:p-8">
                <div className="max-w-6xl mx-auto space-y-4">
                    <div className="flex flex-col md:flex-row justify-between items-end md:items-center gap-4 px-2">
                        <div>
                            <h1 className="text-2xl md:text-4xl font-bold">Transactions</h1>
                            <p className="text-xs text-muted-foreground">Monitor and automate your finances</p>
                        </div>
                    </div>

                    {/* Nested Content: History or Recurring */}
                    <Outlet context={{ setEditingTransaction, setShowAddIncome, setShowAddExpense }} />
                </div>
            </div>

            {/* Global Modals Container */}
            <QuickAddIncome
                open={showAddIncome}
                onOpenChange={(open) => { setShowAddIncome(open); if (!open) setEditingTransaction(null); }}
                onSubmit={handleFormSubmit}
                isSubmitting={isSubmitting}
                renderTrigger={false}
                transaction={editingTransaction}
            />
            <QuickAddTransaction
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

export function TransactionHistory() {
    const { user } = useSettings();
    const { confirmAction } = useConfirm();
    const queryClient = useQueryClient();

    // FAB Logic moved to leaf component
    const { setFabButtons } = useFAB();
    const { setEditingTransaction, setShowAddIncome, setShowAddExpense } = useOutletContext() || {};

    // History State
    const [filters, setFilters] = useState({
        search: '', type: 'all', category: [], paymentStatus: 'all',
        cashStatus: 'all', financialPriority: 'all', budgetId: 'all',
        startDate: usePeriod().monthStart, endDate: usePeriod().monthEnd, minAmount: '', maxAmount: ''
    });
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(10);
    const [sortConfig, setSortConfig] = useState({ key: 'date', direction: 'desc' });
    const [selectedIds, setSelectedIds] = useState(new Set());
    const [isBulkDeleting, setIsBulkDeleting] = useState(false);

    // Hooks
    const { transactions, isLoading } = useTransactions(filters.startDate, filters.endDate);
    const { categories } = useCategories();
    const { customBudgets: allCustomBudgets } = useCustomBudgetsForPeriod(user);
    const { filteredTransactions } = useAdvancedTransactionFiltering(transactions, filters, setFilters);
    const { handleDelete } = useTransactionActions({});

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
            try {
                const idsToDelete = Array.from(selectedIds);
                const chunks = chunkArray(idsToDelete, 50);
                for (const chunk of chunks) await base44.entities.Transaction.deleteMany({ id: { $in: chunk } });
                queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.TRANSACTIONS] });
                showToast({ title: "Success", description: `Deleted ${selectedIds.size} transactions.` });
                setSelectedIds(new Set());
            } catch (e) { showToast({ title: "Error", variant: "destructive" }); }
            finally { setIsBulkDeleting(false); }
        }, { destructive: true });
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
                <TransactionFilters
                    filters={filters} setFilters={setFilters}
                    categories={categories} allCustomBudgets={allCustomBudgets}
                />
                <TransactionList
                    transactions={paginatedTransactions} categories={categories}
                    onEdit={handleEdit} onDelete={handleDelete} isLoading={isLoading}
                    customBudgets={allCustomBudgets}
                    monthStart={usePeriod().monthStart} monthEnd={usePeriod().monthEnd}
                    currentPage={currentPage} totalPages={Math.ceil(filteredTransactions.length / itemsPerPage)}
                    onPageChange={setCurrentPage} itemsPerPage={itemsPerPage} onItemsPerPageChange={setItemsPerPage}
                    totalItems={filteredTransactions.length}
                    selectedIds={selectedIds}
                    onToggleSelection={(id, s) => { const n = new Set(selectedIds); s ? n.add(id) : n.delete(id); setSelectedIds(n); }}
                    onSelectAll={(ids, s) => { const n = new Set(selectedIds); ids.forEach(id => s ? n.add(id) : n.delete(id)); setSelectedIds(n); }}
                    onClearSelection={() => setSelectedIds(new Set())}
                    onDeleteSelected={handleDeleteSelected} isBulkDeleting={isBulkDeleting}
                    sortConfig={sortConfig} onSort={setSortConfig}
                />
            </div>
        </PullToRefresh>
    );
}

export function RecurringTransactions() {
    const { user } = useSettings();
    const queryClient = useQueryClient();
    const isMobile = useIsMobile();
    const { setFabButtons, clearFabButtons } = useFAB();
    const [showRecurringForm, setShowRecurringForm] = useState(false);
    const [editingRecurring, setEditingRecurring] = useState(null);
    const [isProcessingRecurring, setIsProcessingRecurring] = useState(false);

    const { recurringTransactions, isLoading } = useRecurringTransactions(user);
    const { categories } = useCategories();
    const { handleCreate, handleUpdate, handleDelete, handleToggleActive, isSubmitting } = useRecurringTransactionActions(user);

    const handleProcessRecurring = useCallback(async () => {
        setIsProcessingRecurring(true);
        const toastId = toast.loading('Processing...');
        try {
            const userLocalDate = format(new Date(), 'yyyy-MM-dd');
            const response = await base44.functions.invoke('processRecurringTransactions', { userLocalDate });
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
        setEditingRecurring(null);
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
            {isMobile ? (
                <Drawer open={showRecurringForm} onOpenChange={setShowRecurringForm}>
                    <DrawerContent className="max-h-[92vh] z-[500] bg-background">
                        <DrawerHeader className="text-left">
                            <DrawerTitle className="text-xl font-bold px-4">
                                {editingRecurring ? 'Edit Template' : 'New Recurring Transaction'}
                            </DrawerTitle>
                        </DrawerHeader>
                        <div className="p-6 pt-0 overflow-y-auto pb-24">
                            <RecurringTransactionForm
                                initialData={editingRecurring}
                                categories={categories}
                                onSubmit={handleRecurringSubmit}
                                onCancel={() => setShowRecurringForm(false)}
                                isSubmitting={isSubmitting}
                            />
                        </div>
                    </DrawerContent>
                </Drawer>
            ) : (
                <Dialog open={showRecurringForm} onOpenChange={setShowRecurringForm}>
                    <DialogContent className="sm:max-w-[500px] p-0 overflow-hidden border-none shadow-2xl">
                        <DialogHeader className="p-6 pb-0">
                            <DialogTitle className="text-xl font-bold">
                                {editingRecurring ? 'Edit Template' : 'New Recurring Transaction'}
                            </DialogTitle>
                        </DialogHeader>
                        <div className="p-6 max-h-[85vh] overflow-y-auto pb-6">
                            <RecurringTransactionForm
                                initialData={editingRecurring}
                                categories={categories}
                                onSubmit={handleRecurringSubmit}
                                onCancel={() => setShowRecurringForm(false)}
                                isSubmitting={isSubmitting}
                            />
                        </div>
                    </DialogContent>
                </Dialog>
            )}
        </PullToRefresh>
    );
}