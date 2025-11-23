/**
 * DEPRECATED: This component has been replaced by QuickAddTransaction.jsx
 * 
 * QuickAddTransaction now handles both add and edit modes, eliminating the need
 * for this separate component. This consolidation ensures consistent behavior
 * across all transaction dialogs.
 * 
 * Migration: Use QuickAddTransaction with the `transaction` prop to enable edit mode.
 * 
 * Last used: 2025-11-23
 * Replaced by: QuickAddTransaction.jsx
 */

/*
import { useState } from "react";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { CustomButton } from "@/components/ui/CustomButton";
import { Pencil } from "lucide-react";
import { useSettings } from "../utils/SettingsContext";
import { useCashWallet, useAllBudgets } from "../hooks/useBase44Entities";
import TransactionFormContent from "./TransactionFormContent";

export default function TransactionForm({
    transaction,
    categories,
    onSubmit,
    onCancel,
    isSubmitting,
    transactions = [],
    trigger = null
}) {
    const { user } = useSettings();
    const { cashWallet } = useCashWallet(user);
    const { allBudgets } = useAllBudgets(user);
    const [open, setOpen] = useState(false);

    const handleCancel = () => {
        setOpen(false);
        if (onCancel) onCancel();
    };

    const handleSubmit = (data) => {
        onSubmit(data);
        setOpen(false);
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                {trigger || (
                    <CustomButton variant="ghost" size="icon" className="hover:bg-blue-50 hover:text-blue-600 h-7 w-7">
                        <Pencil className="w-4 h-4" />
                    </CustomButton>
                )}
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>
                        {transaction ? 'Edit Transaction' : 'Add Transaction'}
                    </DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                    <TransactionFormContent
                        initialTransaction={transaction}
                        categories={categories}
                        allBudgets={allBudgets}
                        onSubmit={handleSubmit}
                        onCancel={handleCancel}
                        isSubmitting={isSubmitting}
                        cashWallet={cashWallet}
                        transactions={transactions}
                    />
                </div>
            </DialogContent>
        </Dialog>
    );
}
*/
