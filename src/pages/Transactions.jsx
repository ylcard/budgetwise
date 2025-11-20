import React from "react";
import { CustomButton } from "@/components/ui/CustomButton";
import { Plus, Trash, Loader2 } from "lucide-react";
import { useConfirm } from "../components/ui/ConfirmDialogProvider";
import { base44 } from "@/api/base44Client";
import { useQueryClient } from "@tanstack/react-query";
import { showToast } from "@/components/ui/use-toast";
import { QUERY_KEYS } from "../components/hooks/queryKeys";
import { useTransactions, useCategories, useCashWallet } from "../components/hooks/useBase44Entities";
import { useTransactionFiltering } from "../components/hooks/useDerivedData";
import { useTransactionActions } from "../components/hooks/useActions";
import { useSettings } from "../components/utils/SettingsContext";
import { chunkArray } from "../components/utils/generalUtils";
import TransactionForm from "../components/transactions/TransactionForm";
import TransactionList from "../components/transactions/TransactionList";
import TransactionFilters from "../components/transactions/TransactionFilters";

export default function Transactions() {
    const { user } = useSettings();
    const { confirmAction } = useConfirm();
    const queryClient = useQueryClient();
    const [isBulkDeleting, setIsBulkDeleting] = React.useState(false);

    // Data fetching
    const { transactions, isLoading } = useTransactions();
    const { categories } = useCategories();
    const { cashWallet } = useCashWallet(user);

    // Filtering logic
    const { filters, setFilters, filteredTransactions } = useTransactionFiltering(transactions);

    const { handleSubmit, handleEdit, handleDelete, isSubmitting } = useTransactionActions(
        null,
        null,
        cashWallet
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
                        <TransactionForm
                            transaction={null}
                            categories={categories}
                            onSubmit={(data) => handleSubmit(data, null)}
                            onCancel={() => { }}
                            isSubmitting={isSubmitting}
                            transactions={transactions}
                            trigger={
                                <CustomButton variant="primary" className="shadow-lg">
                                    <Plus className="w-4 h-4 mr-2" />
                                    Add Transaction
                                </CustomButton>
                            }
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
                />
            </div>
        </div>
    );
}