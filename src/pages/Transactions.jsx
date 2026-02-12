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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { format } from "date-fns";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

export default function Transactions() {
    const { user } = useSettings();
    const [activeTab, setActiveTab] = useState("history");
    const { confirmAction } = useConfirm();
    const queryClient = useQueryClient();
    const [isBulkDeleting, setIsBulkDeleting] = useState(false);
    const [showAddIncome, setShowAddIncome] = useState(false);
    const [showAddExpense, setShowAddExpense] = useState(false);
    const [showImportWizard, setShowImportWizard] = useState(false);
    const [editingTransaction, setEditingTransaction] = useState(null); // ADDED
    const [editingRecurring, setEditingRecurring] = useState(null);
    const [isProcessingRecurring, setIsProcessingRecurring] = useState(false);
    const [selectedIds, setSelectedIds] = useState(new Set());
    const { setFabButtons, clearFabButtons } = useFAB();

    // Recurring State
    const [showRecurringForm, setShowRecurringForm] = useState(false);
    const [editingRecurring, setEditingRecurring] = useState(null);
    const [isProcessingRecurring, setIsProcessingRecurring] = useState(false);

    // Pagination State
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(10);

    // Sorting State
    const [sortConfig, setSortConfig] = useState({ key: 'date', direction: 'desc' });

    // Fetch period for cross-period detection (still useful for defaults)
    const { monthStart, monthEnd } = usePeriod();

    // STATE LIFTING: Initialize filters here so we can drive the API query
    const [filters, setFilters] = useState({
        search: '',
        type: 'all',
        category: [],
        paymentStatus: 'all',
        cashStatus: 'all',
        financialPriority: 'all',
        budgetId: 'all',
        startDate: monthStart,
        endDate: monthEnd,
        minAmount: '',
        maxAmount: ''
    });

    // Data fetching
    const { transactions, isLoading } = useTransactions(filters.startDate, filters.endDate);
    const { categories } = useCategories();
    const { customBudgets: allCustomBudgets } = useCustomBudgetsForPeriod(user);

    // Recurring Data & Actions
    const { recurringTransactions, isLoading: isLoadingRecurring } = useRecurringTransactions(user);
    const { handleCreate: createRecurring, handleUpdate: updateRecurring, handleDelete: deleteRecurring, handleToggleActive: toggleRecurringActive, isSubmitting: isSubmittingRecurring } = useRecurringTransactionActions(user);

    // Advanced Filtering logic
    const { filteredTransactions } = useAdvancedTransactionFiltering(transactions, filters, setFilters);

    // Sorting Logic (Applied BEFORE pagination)
    const sortedTransactions = useMemo(() => {
        const sortableItems = [...filteredTransactions];
        if (sortConfig.key) {
            // Create a map for fast lookup if sorting by category
            const categoryMap = {};
            if (sortConfig.key === 'category') {
                categories.forEach(c => categoryMap[c.id] = c.name.toLowerCase());
            }

            sortableItems.sort((a, b) => {
                let aValue = a[sortConfig.key];
                let bValue = b[sortConfig.key];

                // Handle specific keys if necessary (dates are strings, amounts are numbers)
                if (sortConfig.key === 'amount') {
                    aValue = Number(aValue);
                    bValue = Number(bValue);
                } else if (sortConfig.key === 'category') {
                    // Resolve ID to Name for sorting
                    aValue = categoryMap[a.category_id] || '';
                    bValue = categoryMap[b.category_id] || '';
                }

                if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
                if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
                return 0;
            });
        }
        return sortableItems;
    }, [filteredTransactions, sortConfig, categories]);

    // Pagination Logic
    // Use sortedTransactions instead of filteredTransactions
    const paginatedTransactions = useMemo(() => {
        const startIndex = (currentPage - 1) * itemsPerPage;
        const endIndex = startIndex + itemsPerPage;
        return sortedTransactions.slice(startIndex, endIndex);
    }, [sortedTransactions, currentPage, itemsPerPage]);

    const totalPages = Math.ceil(filteredTransactions.length / itemsPerPage);

    // Reset to page 1 when filters change
    useMemo(() => {
        setCurrentPage(1);
        setSelectedIds(new Set()); // Clear selection on filter change
    }, [filters]);

    // const { handleSubmit, handleEdit, handleDelete, isSubmitting } = useTransactionActions({
    const { handleSubmit, handleDelete, isSubmitting } = useTransactionActions({
        onSuccess: () => {
            setShowAddIncome(false);
            setShowAddExpense(false);
            setEditingTransaction(null);
        }
    });

    // ADDED: Custom wrapper to handle edits for specific modals
    const handleTransactionEdit = (transaction) => {
        setEditingTransaction(transaction);
        if (transaction.type === 'income') {
            setShowAddIncome(true);
        } else {
            setShowAddExpense(true);
        }
    };

    // ADDED: Custom submit wrapper to pass the editing context
    const handleFormSubmit = (data) => {
        // The hook expects (data, existingEntity) for updates
        handleSubmit(data, editingTransaction);
    };

    // Selection Handlers
    const handleToggleSelection = (id, isSelected) => {
        const newSelected = new Set(selectedIds);
        if (isSelected) {
            newSelected.add(id);
        } else {
            newSelected.delete(id);
        }
        setSelectedIds(newSelected);
    };

    const handleClearSelection = () => {
        setSelectedIds(new Set());
    };

    const handleSelectAllPage = (ids, isSelected) => {
        const newSelected = new Set(selectedIds);
        ids.forEach(id => {
            if (isSelected) newSelected.add(id);
            else newSelected.delete(id);
        });
        setSelectedIds(newSelected);
    };

    const handleDeleteSelected = async () => {
        if (selectedIds.size === 0) return;

        confirmAction(
            "Delete Transactions",
            `Are you sure you want to delete ${selectedIds.size} selected transactions? This action cannot be undone.`,
            async () => {
                setIsBulkDeleting(true);
                try {
                    // Convert Set to Array
                    const idsToDelete = Array.from(selectedIds);
                    // Batch deletions to avoid API limits, processes 50 at a time
                    const chunks = chunkArray(idsToDelete, 50);


                    for (const chunk of chunks) {
                        await base44.entities.Transaction.deleteMany({ id: { $in: chunk } });
                    }

                    queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.TRANSACTIONS] });
                    showToast({ title: "Success", description: `Deleted ${selectedIds.size} transactions.` });
                    setSelectedIds(new Set()); // Clear selection
                } catch (error) {
                    console.error("Bulk delete error:", error);
                    showToast({ title: "Error", description: "Failed to delete some transactions.", variant: "destructive" });
                } finally {
                    setIsBulkDeleting(false);
                }
            },
            { destructive: true }
        );
    };

    // Recurring Handlers
    const handleProcessRecurring = useCallback(async () => {
        setIsProcessingRecurring(true);
        const toastId = toast.loading('Processing recurring transactions...');
        try {
            const userLocalDate = format(new Date(), 'yyyy-MM-dd');
            const response = await base44.functions.invoke('processRecurringTransactions', { userLocalDate });
            if (response.data.success) {
                toast.success(`Successfully processed ${response.data.processed} transactions`, { id: toastId });
                queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.TRANSACTIONS] });
            } else {
                toast.error('Failed to process transactions', { id: toastId });
            }
        } catch (error) {
            toast.error('Error processing recurring transactions', { id: toastId });
        } finally {
            setIsProcessingRecurring(false);
        }
    }, [queryClient]);

    const handleRecurringSubmit = (data) => {
        if (editingRecurring) {
            updateRecurring(editingRecurring.id, data);
        } else {
            createRecurring(data);
        }
        setShowRecurringForm(false);
        setEditingRecurring(null);
    };


    // ADDED 03-Feb-2026: Pull-to-refresh handler
    const handleRefresh = async () => {
        if (activeTab === 'history') {
            await queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.TRANSACTIONS] });
        } else {
            await queryClient.invalidateQueries({ queryKey: ['RECURRING_TRANSACTIONS'] });
        }
        await queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.CATEGORIES] });
    };

    // Scope-specific FAB Buttons
    const historyFab = useMemo(() => [
        {
            key: 'import',
            label: 'Import Data',
            icon: 'FileUp',
            variant: 'primary',
            onClick: () => setShowImportWizard(true)
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
    ], []);

    const recurringFab = useMemo(() => {
        const buttons = [{
            key: 'add-recurring',
            label: 'Add Recurring',
            icon: 'PlusCircle',
            variant: 'create',
            onClick: () => { setEditingRecurring(null); setShowRecurringForm(true); }
        }];
        if (user?.role === 'admin') {
            buttons.push({
                key: 'process-recurring',
                label: 'Process Now',
                icon: 'Play',
                variant: 'info',
                onClick: handleProcessRecurring,
                disabled: isProcessingRecurring
            });
        }
        return buttons;
    }, [user, handleProcessRecurring, isProcessingRecurring]);

    useEffect(() => {
        const buttons = activeTab === "history" ? historyFab : recurringFab;
        setFabButtons(buttons);
        return () => clearFabButtons();
    }, [activeTab, historyFab, recurringFab, setFabButtons, clearFabButtons]);

    return (
        <PullToRefresh onRefresh={handleRefresh}>
            <div className="min-h-screen p-2 md:p-8">
                <div className="max-w-6xl mx-auto space-y-4">
                    <div className="flex flex-col md:flex-row justify-between items-end md:items-center gap-4 px-2">
                        <div>
                            <h1 className="text-2xl md:text-4xl font-bold">Transactions</h1>
                            <p className="text-xs text-muted-foreground">Monitor and automate your finances</p>
                        </div>

                        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full md:w-auto">
                            <TabsList className="grid w-full grid-cols-2 h-11 bg-muted/50 p-1">
                                <TabsTrigger value="history" className="gap-2 data-[state=active]:bg-background shadow-sm">
                                    <History className="w-4 h-4" /> History
                                </TabsTrigger>
                                <TabsTrigger value="recurring" className="gap-2 data-[state=active]:bg-background shadow-sm">
                                    <Repeat className="w-4 h-4" /> Recurring
                                </TabsTrigger>
                            </TabsList>
                        </Tabs>
                    </div>

                    <Tabs value={activeTab} className="w-full">
                        <TabsContent value="history" className="space-y-4 mt-0 border-none p-0 outline-none focus-visible:ring-0">
                            <TransactionFilters
                                filters={filters}
                                setFilters={setFilters}
                                categories={categories}
                                allCustomBudgets={allCustomBudgets}
                            />
                            <TransactionList
                                transactions={paginatedTransactions}
                                categories={categories}
                                onEdit={handleTransactionEdit}
                                onDelete={handleDelete}
                                isLoading={isLoading}
                                onSubmit={handleFormSubmit}
                                isSubmitting={isSubmitting}
                                customBudgets={allCustomBudgets}
                                monthStart={monthStart}
                                monthEnd={monthEnd}
                                currentPage={currentPage}
                                totalPages={totalPages}
                                onPageChange={setCurrentPage}
                                itemsPerPage={itemsPerPage}
                                onItemsPerPageChange={setItemsPerPage}
                                totalItems={filteredTransactions.length}
                                selectedIds={selectedIds}
                                onToggleSelection={handleToggleSelection}
                                onSelectAll={handleSelectAllPage}
                                onClearSelection={handleClearSelection}
                                onDeleteSelected={handleDeleteSelected}
                                isBulkDeleting={isBulkDeleting}
                                sortConfig={sortConfig}
                                onSort={setSortConfig}
                            />
                        </TabsContent>

                        <TabsContent value="recurring" className="space-y-4 mt-0 border-none p-0 outline-none focus-visible:ring-0">
                            <div className="grid grid-cols-1 gap-4">
                                <RecurringTransactionList
                                    recurringTransactions={recurringTransactions}
                                    categories={categories}
                                    onEdit={(r) => { setEditingRecurring(r); setShowRecurringForm(true); }}
                                    onDelete={deleteRecurring}
                                    onToggleActive={toggleRecurringActive}
                                    isLoading={isLoadingRecurring}
                                />
                            </div>
                        </TabsContent>
                    </Tabs>
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
            <Dialog open={showRecurringForm} onOpenChange={setShowRecurringForm}>
                <DialogContent className="sm:max-w-[500px] p-0 overflow-hidden border-none shadow-2xl">
                    <DialogHeader className="p-6 pb-0">
                        <DialogTitle className="text-xl font-bold">
                            {editingRecurring ? 'Edit Template' : 'New Recurring Transaction'}
                        </DialogTitle>
                    </DialogHeader>
                    <div className="p-6 max-h-[85vh] overflow-y-auto">
                        <RecurringTransactionForm
                            initialData={editingRecurring}
                            categories={categories}
                            onSubmit={handleRecurringSubmit}
                            onCancel={() => setShowRecurringForm(false)}
                            isSubmitting={isSubmittingRecurring}
                        />
                    </div>
                </DialogContent>
            </Dialog>
        </PullToRefresh>
    );
}