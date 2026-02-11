import { useState, useEffect } from "react";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { CustomButton } from "@/components/ui/CustomButton";
import { CheckCircle2, Loader2 } from "lucide-react";
import CategorizeReview from "./CategorizeReview";
import { useCategories, useAllBudgets } from "@/components/hooks/useBase44Entities";
import { useSettings } from "@/components/utils/SettingsContext";

/**
 * Transaction Preview Dialog
 * CREATED: 26-Jan-2026
 * 
 * Shows fetched transactions with selection and import confirmation
 */

export default function TransactionPreviewDialog({
    open,
    onOpenChange,
    transactions,
    settings,
    onImport,
    isImporting
}) {
    const { user } = useSettings();
    const { categories } = useCategories();
    const { allBudgets } = useAllBudgets(user);
    const [localData, setLocalData] = useState([]);

    // Initialize selection when transactions change
    useEffect(() => {
        setLocalData(transactions || []);
    }, [transactions]);

    const handleUpdateRow = (index, updates) => {
        setLocalData(prev => {
            const newData = [...prev];
            newData[index] = { ...newData[index], ...updates };
            return newData;
        });
    };

    const handleDeleteRows = (indices) => {
        const indexSet = new Set(indices);
        setLocalData(prev => prev.filter((_, i) => !indexSet.has(i)));
    };

    if (!localData || localData.length === 0) {
        return null;
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>Review Bank Transactions</DialogTitle>
                    <DialogDescription>
                        Verify categories and details before importing to your ledger.
                    </DialogDescription>
                </DialogHeader>

                <div className="py-4">
                    <CategorizeReview
                        data={localData}
                        categories={categories}
                        allBudgets={allBudgets}
                        onUpdateRow={handleUpdateRow}
                        onDeleteRows={handleDeleteRows}
                    />
                </div>

                <DialogFooter>
                    <CustomButton variant="outline" onClick={() => onOpenChange(false)}>
                        Cancel
                    </CustomButton>
                    <CustomButton
                        variant="success"
                        onClick={() => onImport(localData)}
                        disabled={localData.length === 0 || isImporting}
                    >
                        {isImporting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <CheckCircle2 className="w-4 h-4 mr-2" />}
                        Import {localData.length} Transactions
                    </CustomButton>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}