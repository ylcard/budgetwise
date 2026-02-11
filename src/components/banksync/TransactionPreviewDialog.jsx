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
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
    TrendingUp, 
    TrendingDown, 
    AlertCircle,
    CheckCircle2 
} from "lucide-react";
import { formatCurrency } from "../utils/currencyUtils";
import { formatDate } from "../utils/dateUtils";

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
    const [selectedIds, setSelectedIds] = useState(new Set());
    const [selectAll, setSelectAll] = useState(true);

    // Initialize selection when transactions change
    useEffect(() => {
        if (transactions && transactions.length > 0) {
            setSelectedIds(new Set(transactions.map((_, idx) => idx)));
            setSelectAll(true);
        }
    }, [transactions]);

    const handleToggleTransaction = (index) => {
        const newSelected = new Set(selectedIds);
        if (newSelected.has(index)) {
            newSelected.delete(index);
        } else {
            newSelected.add(index);
        }
        setSelectedIds(newSelected);
        setSelectAll(newSelected.size === transactions.length);
    };

    const handleToggleAll = () => {
        if (selectAll) {
            setSelectedIds(new Set());
        } else {
            setSelectedIds(new Set(transactions.map((_, idx) => idx)));
        }
        setSelectAll(!selectAll);
    };

    const handleImport = () => {
        const selectedTransactions = transactions.filter((_, idx) => selectedIds.has(idx));
        onImport(selectedTransactions);
    };

    if (!transactions || transactions.length === 0) {
        return null;
    }

    const selectedCount = selectedIds.size;
    const totalIncome = transactions
        .filter((_, idx) => selectedIds.has(idx) && transactions[idx].type === 'income')
        .reduce((sum, tx) => sum + tx.amount, 0);
    const totalExpenses = transactions
        .filter((_, idx) => selectedIds.has(idx) && transactions[idx].type === 'expense')
        .reduce((sum, tx) => sum + tx.amount, 0);

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-3xl max-h-[80vh]">
                <DialogHeader>
                    <DialogTitle>Review Bank Transactions</DialogTitle>
                    <DialogDescription>
                        Select transactions to import. Duplicates will be automatically filtered.
                    </DialogDescription>
                </DialogHeader>

                {/* Summary */}
                <div className="grid grid-cols-3 gap-4 p-4 bg-gray-50 rounded-lg">
                    <div>
                        <p className="text-xs text-gray-500 mb-1">Selected</p>
                        <p className="text-lg font-semibold text-gray-900">
                            {selectedCount} / {transactions.length}
                        </p>
                    </div>
                    <div>
                        <p className="text-xs text-gray-500 mb-1">Income</p>
                        <p className="text-lg font-semibold text-green-600">
                            +{formatCurrency(totalIncome, settings)}
                        </p>
                    </div>
                    <div>
                        <p className="text-xs text-gray-500 mb-1">Expenses</p>
                        <p className="text-lg font-semibold text-red-600">
                            -{formatCurrency(totalExpenses, settings)}
                        </p>
                    </div>
                </div>

                {/* Select All */}
                <div className="flex items-center gap-2 px-4 py-2 bg-blue-50 rounded-lg">
                    <Checkbox
                        checked={selectAll}
                        onCheckedChange={handleToggleAll}
                    />
                    <label className="text-sm font-medium text-gray-900 cursor-pointer">
                        Select All Transactions
                    </label>
                </div>

                {/* Transaction List */}
                <ScrollArea className="h-[400px] pr-4">
                    <div className="space-y-2">
                        {transactions.map((tx, index) => {
                            const isSelected = selectedIds.has(index);
                            const isIncome = tx.type === 'income';

                            return (
                                <div
                                    key={index}
                                    className={`flex items-start gap-3 p-3 border rounded-lg cursor-pointer transition-colors ${
                                        isSelected
                                            ? 'border-blue-300 bg-blue-50'
                                            : 'border-gray-200 hover:bg-gray-50'
                                    }`}
                                    onClick={() => handleToggleTransaction(index)}
                                >
                                    <Checkbox
                                        checked={isSelected}
                                        onCheckedChange={() => handleToggleTransaction(index)}
                                    />
                                    
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-start justify-between gap-2 mb-1">
                                            <div className="flex items-center gap-2 min-w-0">
                                                {isIncome ? (
                                                    <TrendingUp className="w-4 h-4 text-green-600 shrink-0" />
                                                ) : (
                                                    <TrendingDown className="w-4 h-4 text-red-600 shrink-0" />
                                                )}
                                                <p className="font-medium text-gray-900 truncate">
                                                    {String(tx.description || 'Transaction')}
                                                </p>
                                            </div>
                                            <p className={`font-bold shrink-0 ${
                                                isIncome ? 'text-green-600' : 'text-red-600'
                                            }`}>
                                                {isIncome ? '+' : '-'}{settings ? formatCurrency(Number(tx.amount || 0), settings) : (tx.amount || 0)}
                                            </p>
                                        </div>
                                        
                                        <div className="flex items-center gap-2 text-xs text-gray-500">
                                            <span>{formatDate(tx.date, settings)}</span>
                                            <span>•</span>
                                            <span>{tx.accountName}</span>
                                            {tx.currency !== settings.baseCurrency && (
                                                <>
                                                    <span>•</span>
                                                    <Badge variant="outline" className="text-xs">
                                                        {tx.currency}
                                                    </Badge>
                                                </>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </ScrollArea>

                <DialogFooter>
                    <CustomButton
                        variant="outline"
                        onClick={() => onOpenChange(false)}
                        disabled={isImporting}
                    >
                        Cancel
                    </CustomButton>
                    <CustomButton
                        variant="success"
                        onClick={handleImport}
                        disabled={selectedCount === 0 || isImporting}
                    >
                        {isImporting ? (
                            <>
                                <CheckCircle2 className="w-4 h-4 animate-spin" />
                                Importing...
                            </>
                        ) : (
                            <>
                                <CheckCircle2 className="w-4 h-4" />
                                Import {selectedCount} Transaction{selectedCount !== 1 ? 's' : ''}
                            </>
                        )}
                    </CustomButton>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}