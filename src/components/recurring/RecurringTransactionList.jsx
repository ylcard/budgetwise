import React, { memo, useMemo, useState, useEffect } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { RefreshCw, Trash2, Pause, Play, PlusCircle } from "lucide-react";
import { useFAB } from "@/components/hooks/FABContext";
import { useSettings } from "@/components/utils/SettingsContext";
import { base44 } from "@/api/base44Client";
import { useQueryClient } from "@tanstack/react-query";
import { useConfirm } from "@/components/ui/ConfirmDialogProvider";
import { toast } from "sonner";
import { QUERY_KEYS } from "@/components/hooks/queryKeys";
import { chunkArray } from "@/components/utils/generalUtils"; // Assuming this exists based on your code
import RecurringTransactionCard from "./RecurringTransactionCard";

const RecurringTransactionList = memo(function RecurringTransactionList({
    recurringTransactions = [],
    categories = [],
    onEdit,
    onDelete, // Single delete
    onToggleActive, // Single toggle
    isLoading,
    // New props for internal FAB management
    onAdd,
    onProcess,
    isProcessing, // prop for the 'Process Now' button loading state
}) {
    const { user } = useSettings();
    const { setFabButtons, clearFabButtons } = useFAB();
    const { confirmAction } = useConfirm();
    const queryClient = useQueryClient();

    // Internal Selection State
    const [selectedIds, setSelectedIds] = useState(new Set());
    const isSelectionMode = selectedIds.size > 0;

    // Derived Category Map
    const categoryMap = useMemo(() => {
        return categories.reduce((acc, cat) => {
            acc[cat.id] = cat;
            return acc;
        }, {});
    }, [categories]);

    // --- Actions ---

    const handleToggleSelection = (id) => {
        const newSet = new Set(selectedIds);
        if (newSet.has(id)) newSet.delete(id);
        else newSet.add(id);
        setSelectedIds(newSet);
    };

    const handleBulkDelete = async () => {
        confirmAction(
            "Delete Recurring Transactions",
            `Are you sure you want to delete ${selectedIds.size} templates? This will stop future transactions from being created.`,
            async () => {
                const ids = Array.from(selectedIds);
                const toastId = toast.loading("Deleting templates...");
                try {
                    const chunks = chunkArray(ids, 50);
                    for (const chunk of chunks) {
                        await base44.entities.RecurringTransaction.deleteMany({ id: { $in: chunk } });
                    }
                    await queryClient.invalidateQueries({ queryKey: ['RECURRING_TRANSACTIONS'] });
                    toast.success("Templates deleted", { id: toastId });
                    setSelectedIds(new Set());
                } catch (e) {
                    console.error(e);
                    toast.error("Failed to delete templates", { id: toastId });
                }
            },
            { destructive: true }
        );
    };

    const handleBulkStatusChange = async (targetStatus) => {
        // targetStatus: true (active) or false (paused)
        const ids = Array.from(selectedIds);
        const action = targetStatus ? "Resuming" : "Pausing";
        const toastId = toast.loading(`${action} ${ids.length} templates...`);

        try {
            // We loop updates because 'updateMany' behavior can vary or might not trigger necessary side effects
            // If your API supports updateMany, replace this loop.
            const promises = ids.map(id =>
                base44.entities.RecurringTransaction.update(id, { isActive: targetStatus })
            );
            await Promise.all(promises);

            await queryClient.invalidateQueries({ queryKey: ['RECURRING_TRANSACTIONS'] });
            toast.success(`Successfully ${targetStatus ? 'resumed' : 'paused'} templates`, { id: toastId });
            setSelectedIds(new Set());
        } catch (e) {
            console.error(e);
            toast.error(`Failed to update status`, { id: toastId });
        }
    };

    // --- FAB Management ---

    const fabButtons = useMemo(() => {
        // 1. Selection Mode FABs
        if (selectedIds.size > 0) {
            return [
                {
                    key: 'bulk-delete',
                    label: `Delete (${selectedIds.size})`,
                    icon: Trash2,
                    variant: 'destructive',
                    onClick: handleBulkDelete
                },
                {
                    key: 'bulk-pause',
                    label: 'Pause',
                    icon: Pause,
                    variant: 'warning',
                    onClick: () => handleBulkStatusChange(false)
                },
                {
                    key: 'bulk-resume',
                    label: 'Resume',
                    icon: Play,
                    variant: 'success',
                    onClick: () => handleBulkStatusChange(true)
                }
            ];
        }

        // 2. Default Mode FABs
        const buttons = [{
            key: 'add-recurring',
            label: 'Add Recurring',
            icon: PlusCircle,
            variant: 'create',
            onClick: onAdd
        }];

        if (user?.role === 'admin' && onProcess) {
            buttons.push({
                key: 'process-recurring',
                label: 'Process Now',
                icon: Play,
                variant: 'info',
                onClick: onProcess,
                disabled: isProcessing
            });
        }

        return buttons;
    }, [selectedIds.size, user, isProcessing, onAdd, onProcess]);

    // Sync FABs
    useEffect(() => {
        setFabButtons(fabButtons);
        // Cleanup not strictly necessary if parent handles it, but good practice
        // However, since Transactions.jsx mounts this in a tab, we let this component control FAB while active.
    }, [fabButtons, setFabButtons]);


    // --- Render ---

    if (isLoading) {
        return (
            <div className="space-y-3">
                {[1, 2, 3, 4].map(i => (
                    <Skeleton key={i} className="h-20 w-full rounded-xl" />
                ))}
            </div>
        );
    }

    if (recurringTransactions.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center py-16 px-4 bg-card rounded-xl border border-dashed border-border text-center">
                <div className="bg-primary/5 p-4 rounded-full mb-4">
                    <RefreshCw className="w-8 h-8 text-primary/50" />
                </div>
                <h3 className="text-lg font-medium text-foreground">No Recurring Transactions</h3>
                <p className="text-sm text-muted-foreground mt-1 max-w-xs">
                    Set up subscriptions, salary, or bills to track them automatically.
                </p>
                <button
                    onClick={onAdd}
                    className="mt-6 text-sm font-medium text-primary hover:underline"
                >
                    Create your first template
                </button>
            </div>
        );
    }

    return (
        <div className="space-y-3 pb-24"> {/* Added padding-bottom for FAB safety */}

            {/* Optional: Selection Header Indicator (Mobile-friendly) */}
            {isSelectionMode && (
                <div className="sticky top-0 z-10 bg-background/95 backdrop-blur-sm py-2 px-1 flex items-center justify-between border-b mb-2 animate-in fade-in slide-in-from-top-2">
                    <span className="text-sm font-medium text-foreground px-2">
                        {selectedIds.size} selected
                    </span>
                    <button
                        onClick={() => setSelectedIds(new Set())}
                        className="text-xs font-medium text-muted-foreground hover:text-foreground px-3 py-1.5 bg-muted rounded-full"
                    >
                        Cancel
                    </button>
                </div>
            )}

            <div className="space-y-2">
                {recurringTransactions.map(recurring => (
                    <RecurringTransactionCard
                        key={recurring.id}
                        recurring={recurring}
                        category={categoryMap[recurring.category_id]}
                        isSelectionMode={isSelectionMode}
                        isSelected={selectedIds.has(recurring.id)}
                        onToggleSelection={handleToggleSelection}
                        onClick={onEdit}
                    />
                ))}
            </div>
        </div>
    );
});

export default RecurringTransactionList;