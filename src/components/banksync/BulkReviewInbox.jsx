import { useState, useMemo } from "react";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from "@/components/ui/dialog";
import { CustomButton } from "@/components/ui/CustomButton";
import { useSettings } from "@/components/utils/SettingsContext";
import { formatCurrency } from "@/components/utils/currencyUtils";
import CategorySelect from "@/components/ui/CategorySelect";
import { MobileDrawerSelect } from "@/components/ui/MobileDrawerSelect";
import { FINANCIAL_PRIORITIES } from "@/components/utils/constants";
import { base44 } from "@/api/base44Client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2, BrainCircuit, Receipt, Sparkles, ShieldCheck, CheckCircle2 } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { useCategories } from "@/components/hooks/useBase44Entities";

/**
 * Bulk Review Inbox
 * CREATED: 11-Feb-2026
 * * Groups uncertain transactions by merchant and allows bulk categorization.
 * Automatically creates CategoryRules so the engine learns.
 */
export default function BulkReviewInbox({ open, onOpenChange, transactions = [] }) {
    const { settings, user } = useSettings();
    const { categories } = useCategories();
    const { toast } = useToast();
    const queryClient = useQueryClient();

    // Local state to hold the user's selections for each group before saving
    const [selections, setSelections] = useState({});

    // 1. Smart Grouping Logic
    const groupedTransactions = useMemo(() => {
        if (!transactions || transactions.length === 0) return [];

        const groups = {};
        transactions.forEach(tx => {
            // Prefer merchantName. Fallback to title. Uppercase to normalize.
            let rawKey = tx.merchantName || tx.title || 'Unknown';

            // AGGRESSIVE CLEANER: 
            // 1. Removes prefixes like MNI* or PAYPAL*
            // 2. Removes all numbers and special characters
            // 3. Collapses multiple spaces into one
            const key = rawKey.replace(/^[A-Z]{3,6}\*/i, '').replace(/[^a-zA-Z\s]/g, ' ').replace(/\s+/g, ' ').trim().toUpperCase();

            if (!groups[key]) {
                groups[key] = {
                    key: key,
                    displayTitle: rawKey,
                    transactions: [],
                    totalAmount: 0,
                    type: tx.type
                };
            }
            groups[key].transactions.push(tx);
            groups[key].totalAmount += Number(tx.amount);
        });

        // Sort by largest group first (most impact)
        return Object.values(groups).sort((a, b) => b.transactions.length - a.transactions.length);
    }, [transactions]);

    // 2. The Save Mutation
    const { mutate: saveBulkRules, isPending: isSaving } = useMutation({
        mutationFn: async (saveableGroups) => {
            let totalTransactionsUpdated = 0;

            for (const { group, categoryId, priority } of saveableGroups) {
                // A. Update all transactions in this group
                const updatePromises = group.transactions.map(tx =>
                    base44.entities.Transaction.update(tx.id, {
                        category_id: categoryId,
                        financial_priority: priority,
                        needsReview: false
                    })
                );
                await Promise.all(updatePromises);
                totalTransactionsUpdated += group.transactions.length;

                // B. Create a Category Rule so the system learns (FIXED 422 ERROR)
                await base44.entities.CategoryRule.create({
                    user_email: user.email,
                    keyword: group.key,
                    categoryId: categoryId, // Exact match to your schema
                    // Omitted 'priority' entirely because your DB expects a number, not "needs"/"wants"
                });
            }

            return { groupsCount: saveableGroups.length, txCount: totalTransactionsUpdated };
        },
        onSuccess: (data) => {
            toast({
                title: "Inbox Cleared!",
                description: `Updated ${data.txCount} transactions and created ${data.groupsCount} automation rules.`,
                variant: "success"
            });

            // Force deep cache refresh so the dashboard counter updates instantly
            queryClient.invalidateQueries({ queryKey: ['transactions'] });

            // Clear selections and close modal
            setSelections({});
            onOpenChange(false);
        },
        onError: (error) => {
            toast({
                title: "Failed to save",
                description: error.message,
                variant: "destructive"
            });
        }
    });

    const handleSelectionChange = (groupKey, field, value) => {
        setSelections(prev => ({
            ...prev,
            [groupKey]: {
                ...prev[groupKey],
                [field]: value
            }
        }));
    };

    // Calculate how many groups are fully filled out and ready to save
    const readyToSaveGroups = Object.entries(selections)
        .filter(([_, sel]) => sel.categoryId && sel.priority)
        .map(([key, sel]) => ({
            group: groupedTransactions.find(g => g.key === key),
            categoryId: sel.categoryId,
            priority: sel.priority
        }));

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col p-0 overflow-hidden bg-gray-50">
                <DialogHeader className="p-6 pb-4 bg-white border-b">
                    <DialogTitle className="flex items-center gap-2 text-xl">
                        <BrainCircuit className="w-6 h-6 text-amber-500" />
                        Categorization Inbox
                    </DialogTitle>
                    <DialogDescription>
                        We grouped similar transactions. Assign a category once, and we'll remember it for the future.
                    </DialogDescription>
                </DialogHeader>

                <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
                    {groupedTransactions.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-12 text-center">
                            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4 text-green-600">
                                <CheckCircle2 className="w-8 h-8" />
                            </div>
                            <h3 className="text-lg font-bold text-gray-900">Inbox Zero!</h3>
                            <p className="text-gray-500 mt-1 max-w-sm">
                                All your transactions are categorized. The automation engine is running smoothly.
                            </p>
                            <CustomButton className="mt-6" onClick={() => onOpenChange(false)}>
                                Close Inbox
                            </CustomButton>
                        </div>
                    ) : (
                        groupedTransactions.map((group) => {
                            const currentSelection = selections[group.key] || {};
                            const canSave = currentSelection.categoryId && currentSelection.priority;

                            return (
                                <div key={group.key} className="bg-white rounded-2xl p-4 sm:p-5 border shadow-sm">
                                    <div className="flex justify-between items-start mb-4">
                                        <div>
                                            <h4 className="font-bold text-gray-900 text-lg">{group.displayTitle}</h4>
                                            <div className="flex items-center gap-2 mt-1">
                                                <span className="inline-flex items-center gap-1 bg-blue-50 text-blue-700 text-xs font-semibold px-2 py-1 rounded-md">
                                                    <Receipt className="w-3 h-3" />
                                                    {group.transactions.length} transactions
                                                </span>
                                                <span className="text-sm font-medium text-gray-500">
                                                    Total: {formatCurrency(group.totalAmount, settings)}
                                                </span>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
                                        <div className="space-y-1.5">
                                            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Category</label>
                                            <CategorySelect
                                                value={currentSelection.categoryId || ""}
                                                categories={categories}
                                                className="w-full bg-gray-50"
                                                onValueChange={(val) => {
                                                    handleSelectionChange(group.key, 'categoryId', val);
                                                    // Auto-select priority based on category default
                                                    const cat = categories.find(c => c.id === val);
                                                    if (cat) {
                                                        handleSelectionChange(group.key, 'priority', cat.priority || 'wants');
                                                    }
                                                }}
                                            />
                                        </div>
                                        <div className="space-y-1.5">
                                            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Priority</label>
                                            <MobileDrawerSelect
                                                value={currentSelection.priority || ""}
                                                onValueChange={(val) => handleSelectionChange(group.key, 'priority', val)}
                                                options={Object.entries(FINANCIAL_PRIORITIES).filter(([k]) => k !== 'savings').map(([k, v]) => ({ value: k, label: v.label }))}
                                                placeholder="Select Priority"
                                                customTrigger={
                                                    <button className="w-full flex items-center justify-between px-3 h-10 rounded-md border bg-gray-50 hover:bg-gray-100 transition-colors text-left">
                                                        <div className="flex items-center gap-2">
                                                            {currentSelection.priority === 'needs' ? <ShieldCheck className="w-4 h-4 text-emerald-500" /> : <Sparkles className="w-4 h-4 text-amber-500" />}
                                                            <span className="text-sm font-medium text-gray-700">
                                                                {currentSelection.priority ? FINANCIAL_PRIORITIES[currentSelection.priority]?.label : "Select Priority"}
                                                            </span>
                                                        </div>
                                                    </button>
                                                }
                                            />
                                        </div>
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>

                {/* Sticky Bottom Bar for Single Save Action */}
                {groupedTransactions.length > 0 && (
                    <div className="p-4 bg-white border-t flex justify-end shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
                        <CustomButton
                            variant="success"
                            disabled={readyToSaveGroups.length === 0 || isSaving}
                            onClick={() => saveBulkRules(readyToSaveGroups)}
                        >
                            {isSaving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <BrainCircuit className="w-4 h-4 mr-2" />}
                            Save & Apply {readyToSaveGroups.length} Rules
                        </CustomButton>
                    </div>
                )}
            </DialogContent>
        </Dialog>
    );
}
