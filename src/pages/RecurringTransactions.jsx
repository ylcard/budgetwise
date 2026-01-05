import React, { useState, useMemo, useCallback, memo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { CustomButton } from "@/components/ui/CustomButton";
import { Plus, RefreshCw } from "lucide-react";
import { useSettings } from "../components/utils/SettingsContext";
import { useCategories } from "../components/hooks/useBase44Entities";
import { useRecurringTransactions, useRecurringTransactionActions } from "../components/hooks/useRecurringTransactions";
import RecurringTransactionForm from "../components/recurring/RecurringTransactionForm";
import RecurringTransactionList from "../components/recurring/RecurringTransactionList";

const RecurringTransactionsPage = memo(function RecurringTransactionsPage() {
    const { user } = useSettings();
    const { categories } = useCategories();
    const { recurringTransactions, isLoading } = useRecurringTransactions(user);
    const { handleCreate, handleUpdate, handleDelete, handleToggleActive, isSubmitting } = useRecurringTransactionActions(user);

    const [showForm, setShowForm] = useState(false);
    const [editingRecurring, setEditingRecurring] = useState(null);

    // Separate active and paused
    const { activeRecurring, pausedRecurring } = useMemo(() => {
        const active = recurringTransactions.filter(r => r.isActive);
        const paused = recurringTransactions.filter(r => !r.isActive);
        return { activeRecurring: active, pausedRecurring: paused };
    }, [recurringTransactions]);

    const handleOpenForm = useCallback((recurring = null) => {
        setEditingRecurring(recurring);
        setShowForm(true);
    }, []);

    const handleCloseForm = useCallback(() => {
        setShowForm(false);
        setEditingRecurring(null);
    }, []);

    const handleSubmit = useCallback((data) => {
        if (editingRecurring) {
            handleUpdate(editingRecurring.id, data);
        } else {
            handleCreate(data);
        }
        handleCloseForm();
    }, [editingRecurring, handleUpdate, handleCreate, handleCloseForm]);

    const handleEdit = useCallback((recurring) => {
        handleOpenForm(recurring);
    }, [handleOpenForm]);

    return (
        <div className="min-h-screen p-4 md:p-8">
            <div className="max-w-4xl mx-auto space-y-6">
                {/* Header */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div>
                        <h1 className="text-3xl md:text-4xl font-bold text-gray-900">Recurring Transactions</h1>
                        <p className="text-gray-500 mt-1">Automate your regular income and expenses</p>
                    </div>
                    <CustomButton variant="create" onClick={() => handleOpenForm()}>
                        <Plus className="w-4 h-4 mr-2" />
                        Add Recurring
                    </CustomButton>
                </div>

                {/* Active Section */}
                <div>
                    <h2 className="text-lg font-semibold text-gray-800 mb-3 flex items-center gap-2">
                        <RefreshCw className="w-5 h-5 text-green-600" />
                        Active ({activeRecurring.length})
                    </h2>
                    <RecurringTransactionList
                        recurringTransactions={activeRecurring}
                        categories={categories}
                        onEdit={handleEdit}
                        onDelete={handleDelete}
                        onToggleActive={handleToggleActive}
                        isLoading={isLoading}
                    />
                </div>

                {/* Paused Section */}
                {pausedRecurring.length > 0 && (
                    <div className="mt-8">
                        <h2 className="text-lg font-semibold text-gray-500 mb-3">
                            Paused ({pausedRecurring.length})
                        </h2>
                        <RecurringTransactionList
                            recurringTransactions={pausedRecurring}
                            categories={categories}
                            onEdit={handleEdit}
                            onDelete={handleDelete}
                            onToggleActive={handleToggleActive}
                            isLoading={false}
                        />
                    </div>
                )}

                {/* Form Dialog */}
                <Dialog open={showForm} onOpenChange={setShowForm}>
                    <DialogContent className="sm:max-w-[500px]">
                        <DialogHeader>
                            <DialogTitle>
                                {editingRecurring ? 'Edit Recurring Transaction' : 'New Recurring Transaction'}
                            </DialogTitle>
                        </DialogHeader>
                        <RecurringTransactionForm
                            initialData={editingRecurring}
                            categories={categories}
                            onSubmit={handleSubmit}
                            onCancel={handleCloseForm}
                            isSubmitting={isSubmitting}
                        />
                    </DialogContent>
                </Dialog>
            </div>
        </div>
    );
});

export default RecurringTransactionsPage;