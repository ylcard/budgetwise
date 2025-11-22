import { useState } from "react";
import { CustomButton } from "@/components/ui/CustomButton";
import { Trash, Loader2, Plus, ArrowDown } from "lucide-react";
import { useConfirm } from "../components/ui/ConfirmDialogProvider";
import { base44 } from "@/api/base44Client";
import { useQueryClient } from "@tanstack/react-query";
import { showToast } from "@/components/ui/use-toast";
import { QUERY_KEYS } from "../components/hooks/queryKeys";
import { useTransactions, useCategories, useCashWallet, useCustomBudgetsAll } from "../components/hooks/useBase44Entities";
import { useTransactionFiltering } from "../components/hooks/useDerivedData";
import { useTransactionActions } from "../components/hooks/useActions";
import { useSettings } from "../components/utils/SettingsContext";
import { usePeriod } from "../components/hooks/usePeriod";
import { chunkArray } from "../components/utils/generalUtils";
// import TransactionForm from "../components/transactions/TransactionForm";
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

    // ADDED 20-Jan-2025: Fetch period for cross-period detection
    const { monthStart, monthEnd } = usePeriod();

    // Data fetching
    const { transactions, isLoading } = useTransactions();
    const { categories } = useCategories();
    const { cashWallet } = useCashWallet(user);
    const { allCustomBudgets } = useCustomBudgetsAll(user); // ADDED 20-Jan-2025

    // Filtering logic
    const { filters, setFilters, filteredTransactions } = useTransactionFiltering(transactions);

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

    const handleBulkDelete = async () => {
        if (filteredTransactions.length === 0) return;

        confirmAction(
            "Delete Transactions",
            `Are you sure you want to delete all ${filteredTransactions.length} currently filtered transactions? This action cannot be undone.`,
            async () => {
                setIsBulkDeleting(true);
                try {
                    // Batch deletions to avoid API limits
                    const chunks = chunkArray(filteredTransactions, 50); // Process 50 at a time

                    for (const chunk of chunks) {
                        const deletePromises = chunk.map(t => base44.entities.Transaction.delete(t.id));
                        await Promise.all(deletePromises);
                    }

                    queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.TRANSACTIONS] });
                    showToast({ title: "Success", description: `Deleted ${filteredTransactions.length} transactions.` });
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
        <div className="min-h-screen p-4 md:p-8">
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
                        {filteredTransactions.length > 0 && (
                            <CustomButton
                                variant="destructive"
                                onClick={handleBulkDelete}
                                disabled={isBulkDeleting}
                            >
                                {isBulkDeleting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Trash className="w-4 h-4 mr-2" />}
                                Delete All ({filteredTransactions.length})
                            </CustomButton>
                        )}
                    </div>
                </div>

                <TransactionFilters
                    filters={filters}
                    setFilters={setFilters}
                    categories={categories}
                />

                <TransactionList
                    transactions={filteredTransactions}
                    categories={categories}
                    onEdit={handleEdit}
                    onDelete={handleDelete}
                    isLoading={isLoading}
                    onSubmit={handleSubmit}
                    isSubmitting={isSubmitting}
                    customBudgets={allCustomBudgets}
                    monthStart={monthStart}
                    monthEnd={monthEnd}
                />
            </div>
        </div>
    );
}
