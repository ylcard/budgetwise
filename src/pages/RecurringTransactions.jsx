import React, { useState, useMemo, useCallback, memo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { CustomButton } from "@/components/ui/CustomButton";
import { Plus, RefreshCw, Play } from "lucide-react";
import { PullToRefresh } from "../components/ui/PullToRefresh"; // ADDED 03-Feb-2026: Native-style pull-to-refresh
import { useQueryClient } from "@tanstack/react-query"; // ADDED 03-Feb-2026: For manual refresh
import { useSettings } from "../components/utils/SettingsContext";
import { useCategories } from "../components/hooks/useBase44Entities";
import { useRecurringTransactions, useRecurringTransactionActions } from "../components/hooks/useRecurringTransactions";
import RecurringTransactionForm from "../components/recurring/RecurringTransactionForm";
import RecurringTransactionList from "../components/recurring/RecurringTransactionList";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";
import { format } from "date-fns";

const RecurringTransactionsPage = memo(function RecurringTransactionsPage() {
    const { user } = useSettings();
    const queryClient = useQueryClient(); // ADDED 03-Feb-2026: For pull-to-refresh
    const { categories } = useCategories();
    const { recurringTransactions, isLoading } = useRecurringTransactions(user);
    const { handleCreate, handleUpdate, handleDelete, handleToggleActive, isSubmitting } = useRecurringTransactionActions(user);

    const [showForm, setShowForm] = useState(false);
    const [editingRecurring, setEditingRecurring] = useState(null);
    const [isProcessing, setIsProcessing] = useState(false);

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

    // ADDED 03-Feb-2026: Pull-to-refresh handler
    const handleRefreshData = useCallback(async () => {
        await queryClient.invalidateQueries({ queryKey: ['RECURRING_TRANSACTIONS'] });
        await queryClient.invalidateQueries({ queryKey: ['CATEGORIES'] });
    }, [queryClient]);

    const handleProcessRecurring = useCallback(async () => {
        setIsProcessing(true);
        const toastId = toast.loading('Processing recurring transactions...');

        try {
            const currentDate = new Date();
            const userLocalDate = format(currentDate, 'yyyy-MM-dd');
            console.log('🔘 [MANUAL] User clicked Process Now - Date:', userLocalDate);
            
            const response = await base44.functions.invoke('processRecurringTransactions', {
                userLocalDate
            });
            console.log('📥 [MANUAL] Backend response:', JSON.stringify(response.data, null, 2));

            if (response.data.success) {
                const { processed, skipped, errors } = response.data;
                console.log('✅ [MANUAL] Success - Processed:', processed, 'Skipped:', skipped, 'Errors:', errors?.length || 0);
                
                if (processed > 0) {
                    toast.success(`Successfully processed ${processed} transaction${processed !== 1 ? 's' : ''}`, { id: toastId });
                } else {
                    toast.success('No new transactions to process', { id: toastId });
                }

                if (errors && errors.length > 0) {
                    console.warn('Processing errors:', errors);
                }
            } else {
                toast.error('Failed to process recurring transactions', { id: toastId });
            }
        } catch (error) {
            console.error('Process recurring error:', error);
            toast.error('Error processing recurring transactions', { id: toastId });
        } finally {
            setIsProcessing(false);
        }
    }, []);

    return (
        <PullToRefresh onRefresh={handleRefreshData}>
            <div className="min-h-screen p-4 md:p-8">
                <div className="max-w-4xl mx-auto space-y-6">
                {/* Header */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div>
                        <h1 className="text-3xl md:text-4xl font-bold text-gray-900">Recurring Transactions</h1>
                        <p className="text-gray-500 mt-1">Automate your regular income and expenses</p>
                    </div>
                    <div className="flex gap-2">
                        {user?.role === 'admin' && (
                            <CustomButton 
                                variant="info" 
                                onClick={handleProcessRecurring}
                                disabled={isProcessing}
                            >
                                <Play className={`w-4 h-4 mr-2 ${isProcessing ? 'animate-spin' : ''}`} />
                                Process Now
                            </CustomButton>
                        )}
                        <CustomButton variant="create" onClick={() => handleOpenForm()}>
                            <Plus className="w-4 h-4 mr-2" />
                            Add Recurring
                        </CustomButton>
                    </div>
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
        </PullToRefresh>
    );
});

export default RecurringTransactionsPage;