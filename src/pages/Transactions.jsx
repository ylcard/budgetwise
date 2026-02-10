import { useState, useMemo, useEffect } from "react";
import { CustomButton } from "@/components/ui/CustomButton";
import { Plus, ArrowDown } from "lucide-react";
import { useConfirm } from "../components/ui/ConfirmDialogProvider";
import { base44 } from "@/api/base44Client";
import { useQueryClient } from "@tanstack/react-query";
import { showToast } from "@/components/ui/use-toast";
import { QUERY_KEYS } from "../components/hooks/queryKeys";
import { PullToRefresh } from "../components/ui/PullToRefresh"; // ADDED 03-Feb-2026: Native-style pull-to-refresh
import { useTransactions, useCategories, useCustomBudgetsForPeriod } from "../components/hooks/useBase44Entities";
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

export default function Transactions() {
    const { user } = useSettings();
    const { confirmAction } = useConfirm();
    const queryClient = useQueryClient();
    const [isBulkDeleting, setIsBulkDeleting] = useState(false);
    const [showAddIncome, setShowAddIncome] = useState(false);
    const [showAddExpense, setShowAddExpense] = useState(false);
    const [showImportWizard, setShowImportWizard] = useState(false);
    const [editingTransaction, setEditingTransaction] = useState(null); // ADDED
    const [selectedIds, setSelectedIds] = useState(new Set());
    const { setFabButtons, clearFabButtons } = useFAB();

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
                } else if (sortConfig.key === 'date') {
                    // SETTLEMENT VIEW FIX: Sort by effective date
                    // If expense & paid, use paidDate. Else use date.
                    const getEffectiveDate = (item) => (item.type === 'expense' && item.paidDate) ? item.paidDate : item.date;
                    aValue = getEffectiveDate(a);
                    bValue = getEffectiveDate(b);
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
                        const deletePromises = chunk.map(id => base44.entities.Transaction.delete(id));
                        await Promise.all(deletePromises);
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

    // ADDED 03-Feb-2026: Pull-to-refresh handler
    const handleRefresh = async () => {
        await queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.TRANSACTIONS] });
        await queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.CATEGORIES] });
    };

    // FAB Configuration
    const fabButtons = useMemo(() => [
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

    useEffect(() => {
        setFabButtons(fabButtons);
        return () => clearFabButtons();
    }, [fabButtons, setFabButtons, clearFabButtons]);

    return (
        <PullToRefresh onRefresh={handleRefresh}>
            <div className="min-h-screen p-4 md:p-8" style={{ scrollbarGutter: 'stable' }}>
                <div className="max-w-6xl mx-auto space-y-6">
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                        <div>
                            <h1 className="text-3xl md:text-4xl font-bold text-gray-900">Transactions</h1>
                            <p className="text-gray-500 mt-1">Track your income and expenses</p>
                        </div>
                        <div className="hidden md:flex flex-wrap items-center gap-4">
                            {/* Add Income - Success Variant (Green) */}
                            <CustomButton
                                variant="success"
                                onClick={() => setShowAddIncome(true)}
                            >
                                <ArrowDown className="w-4 h-4 mr-2" />
                                Add Income
                            </CustomButton>

                            {/* Add Expense - Create Variant (Blue/Purple Gradient) */}
                            <CustomButton
                                variant="create"
                                onClick={() => setShowAddExpense(true)}
                            >
                                <Plus className="w-4 h-4 mr-2" />
                                Add Expense
                            </CustomButton>

                            {/* Modals (Logic only, no triggers) */}
                            <QuickAddIncome
                                open={showAddIncome}
                                onOpenChange={(open) => {
                                    setShowAddIncome(open);
                                    if (!open) setEditingTransaction(null);
                                }}
                                onSubmit={handleFormSubmit}
                                isSubmitting={isSubmitting}
                                renderTrigger={false}
                                transaction={editingTransaction}
                            />
                            <QuickAddTransaction
                                open={showAddExpense}
                                onOpenChange={(open) => {
                                    setShowAddExpense(open);
                                    if (!open) setEditingTransaction(null);
                                }}
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
                        </div>
                    </div>

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
                </div>
            </div>
        </PullToRefresh>
    );
}