import React, { useState, useMemo, useCallback, memo, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { CustomButton } from "@/components/ui/CustomButton";
import { Plus, RefreshCw, Play } from "lucide-react";
import { PullToRefresh } from "../components/ui/PullToRefresh"; // ADDED 03-Feb-2026: Native-style pull-to-refresh
import { useQueryClient, useQuery } from "@tanstack/react-query"; // ADDED 03-Feb-2026: For manual refresh
import { useSettings } from "../components/utils/SettingsContext";
import { useCategories } from "../components/hooks/useBase44Entities";
import { useRecurringTransactions, useRecurringTransactionActions } from "../components/hooks/useRecurringTransactions";
import RecurringTransactionForm from "../components/recurring/RecurringTransactionForm";
import RecurringTransactionList from "../components/recurring/RecurringTransactionList";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";
import { format, startOfMonth, endOfMonth } from "date-fns";
import { useFAB } from "../components/hooks/FABContext";
import { useRecurringStatus } from "../components/hooks/useRecurringStatus";

const RecurringTransactionsPage = memo(function RecurringTransactionsPage() {
    const { user } = useSettings();
    const queryClient = useQueryClient(); // ADDED 03-Feb-2026: For pull-to-refresh
    const { categories } = useCategories();
    const { recurringTransactions, isLoading } = useRecurringTransactions(user);
    const { handleCreate, handleUpdate, handleDelete, handleToggleActive, isSubmitting } = useRecurringTransactionActions(user);
    const { setFabButtons, clearFabButtons } = useFAB();

    // FETCH CURRENT MONTH TRANSACTIONS FOR MATCHING
    const currentDate = new Date();
    const startOfCurrentMonth = format(startOfMonth(currentDate), 'yyyy-MM-dd');
    const endOfCurrentMonth = format(endOfMonth(currentDate), 'yyyy-MM-dd');

    const { data: currentMonthTransactions = [] } = useQuery({
        queryKey: ['TRANSACTIONS', 'CURRENT_MONTH', startOfCurrentMonth],
        queryFn: async () => {
            return await base44.entities.Transaction.filter({
                date: { $gte: startOfCurrentMonth, $lte: endOfCurrentMonth },
                user_email: user?.email
            });
        },
        enabled: !!user
    });

    // CALCULATE STATUS
    const recurringWithStatus = useRecurringStatus(recurringTransactions, currentMonthTransactions);

    const [showForm, setShowForm] = useState(false);
    const [editingRecurring, setEditingRecurring] = useState(null);

    // Separate active and paused
    const { activeRecurring, pausedRecurring } = useMemo(() => {
        // Use the new array with 'status' included
        const active = recurringWithStatus.filter(r => r.isActive);
        const paused = recurringWithStatus.filter(r => !r.isActive);
        return { activeRecurring: active, pausedRecurring: paused };
    }, [recurringWithStatus]);

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

    // ADDED 03-Feb-2026: Pull-to-refresh handler
    const handleRefreshData = useCallback(async () => {
        await queryClient.invalidateQueries({ queryKey: ['RECURRING_TRANSACTIONS'] });
        await queryClient.invalidateQueries({ queryKey: ['CATEGORIES'] });
    }, [queryClient]);

    // FAB Configuration
    const fabButtons = useMemo(() => {
        const buttons = [
            {
                key: 'add-recurring',
                label: 'Add Recurring',
                icon: 'PlusCircle',
                variant: 'create', // Using 'create' variant to match desktop button
                onClick: () => handleOpenForm()
            }
        ];

        return buttons;
    }, [user, handleOpenForm]);

    useEffect(() => {
        setFabButtons(fabButtons);
        return () => clearFabButtons();
    }, [fabButtons, setFabButtons, clearFabButtons]);

    return (
        <PullToRefresh onRefresh={handleRefreshData}>
            <div className="space-y-6 pb-24">

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
        </PullToRefresh >
    );
});

export default RecurringTransactionsPage;