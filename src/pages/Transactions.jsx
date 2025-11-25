import { useState, useMemo } from "react";
import { CustomButton } from "@/components/ui/CustomButton";
import { Trash, Loader2, Plus, ArrowDown, X } from "lucide-react";
import { useConfirm } from "../components/ui/ConfirmDialogProvider";
import { base44 } from "@/api/base44Client";
import { useQueryClient } from "@tanstack/react-query";
import { showToast } from "@/components/ui/use-toast";
import { QUERY_KEYS } from "../components/hooks/queryKeys";
import { useTransactions, useCategories, useCashWallet, useCustomBudgetsAll } from "../components/hooks/useBase44Entities";
import { useAdvancedTransactionFiltering } from "../components/hooks/useDerivedData";
import { useTransactionActions } from "../components/hooks/useActions";
import { useSettings } from "../components/utils/SettingsContext";
import { usePeriod } from "../components/hooks/usePeriod";
import { chunkArray } from "../components/utils/generalUtils";
import QuickAddTransaction from "../components/transactions/QuickAddTransaction";
import QuickAddIncome from "../components/transactions/QuickAddIncome";
import TransactionList from "../components/transactions/TransactionList";
import TransactionFilters from "../components/transactions/TransactionFilters";

export default function Transactions() {
    const { user } = useSettings();
    const { confirmAction } = useConfirm();
    const queryClient = useQueryClient();
    const [isBulkDeleting, setIsBulkDeleting] = useState(false);
    const [showAddIncome, setShowAddIncome] = useState(false);
    const [showAddExpense, setShowAddExpense] = useState(false);
    const [selectedIds, setSelectedIds] = useState(new Set());

    // Pagination State
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(10);

    // Fetch period for cross-period detection (still useful for defaults)
    const { monthStart, monthEnd } = usePeriod();

    // Data fetching
    const { transactions, isLoading } = useTransactions();
    const { categories } = useCategories();
    const { cashWallet } = useCashWallet(user);
    const { allCustomBudgets } = useCustomBudgetsAll(user);

    // Advanced Filtering logic
    const { filters, setFilters, filteredTransactions } = useAdvancedTransactionFiltering(transactions);

    // Pagination Logic
    const paginatedTransactions = useMemo(() => {
        const startIndex = (currentPage - 1) * itemsPerPage;
        const endIndex = startIndex + itemsPerPage;
        return filteredTransactions.slice(startIndex, endIndex);
    }, [filteredTransactions, currentPage, itemsPerPage]);

    const totalPages = Math.ceil(filteredTransactions.length / itemsPerPage);

    // Reset to page 1 when filters change
    useMemo(() => {
        setCurrentPage(1);
        setSelectedIds(new Set()); // Clear selection on filter change
    }, [filters]);

    const { handleSubmit, handleEdit, handleDelete, isSubmitting } = useTransactionActions(
        null,
        null,
        cashWallet,
        {
            onSuccess: () => {
                setShowAddIncome(false);
                setShowAddExpense(false);
            }
        }
    );

    // const handleBulkDelete = async () => {
    //     if (filteredTransactions.length === 0) return;
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
                    // DEPRECATED: Batch deletions to avoid API limits, proccesses 50 at a time
                    // const chunks = chunkArray(filteredTransactions, 50);

                    // Convert Set to Array
                    const idsToDelete = Array.from(selectedIds);
                    // Batch deletions to avoid API limits, processes 50 at a time
                    const chunks = chunkArray(idsToDelete, 50);


                    for (const chunk of chunks) {
                        // const deletePromises = chunk.map(t => base44.entities.Transaction.delete(t.id));
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

    return (
        <div className="min-h-screen p-4 md:p-8" style={{ scrollbarGutter: 'stable' }}>
            <div className="max-w-6xl mx-auto space-y-6">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div>
                        <h1 className="text-3xl md:text-4xl font-bold text-gray-900">Transactions</h1>
                        <p className="text-gray-500 mt-1">Track your income and expenses</p>
                    </div>
                    <div className="flex flex-wrap items-center gap-4">
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
                            onOpenChange={setShowAddIncome}
                            onSubmit={handleSubmit}
                            isSubmitting={isSubmitting}
                            renderTrigger={false}
                        />
                        <QuickAddTransaction
                            open={showAddExpense}
                            onOpenChange={setShowAddExpense}
                            categories={categories}
                            customBudgets={allCustomBudgets}
                            onSubmit={handleSubmit}
                            isSubmitting={isSubmitting}
                            transactions={transactions}
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
                    onEdit={handleEdit}
                    onDelete={handleDelete}
                    isLoading={isLoading}
                    onSubmit={handleSubmit}
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
                />
            </div>
        </div>
    );
}
