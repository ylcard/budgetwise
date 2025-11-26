import { useState } from "react";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { CustomButton } from "@/components/ui/CustomButton";
import { Plus, Pencil } from "lucide-react";
import { useSettings } from "../utils/SettingsContext";
import { useAllBudgets } from "../hooks/useBase44Entities";
import TransactionFormContent from "./TransactionFormContent";

export default function QuickAddTransaction({
    open,
    onOpenChange,
    transaction = null, // If provided, edit mode; if null, add mode
    categories,
    defaultCustomBudgetId = '',
    onSubmit,
    isSubmitting,
    transactions = [],
    renderTrigger = true,
    trigger = null, // Custom trigger element
    triggerVariant = "default",
    triggerSize = "default",
    triggerClassName = ""
}) {
    const { user } = useSettings();
    const { allBudgets } = useAllBudgets(user);

    // We rely on internal state UNLESS the parent explicitly passes a boolean 'open' prop
    const [internalOpen, setInternalOpen] = useState(false);

    // STRICT check: Only be controlled if open is truly a boolean (true/false)
    // If 'open' is undefined/null, we default to internal state (like the old component)
    const isControlled = typeof open === "boolean";
    const showDialog = isControlled ? open : internalOpen;

    const isEditMode = !!transaction;

    const handleOpenChange = (newOpenState) => {
        setInternalOpen(newOpenState); // Always update internal backup
        if (onOpenChange) {
            onOpenChange(newOpenState);
        }
    };
    const handleSubmit = (data) => {
        onSubmit(data);
        handleOpenChange(false);
    };

    const handleCancel = () => {
        handleOpenChange(false);
    };

    // Determine default trigger based on mode
    const defaultTrigger = isEditMode ? (
        <CustomButton variant="ghost" size="icon" className="hover:bg-blue-50 hover:text-blue-600 h-7 w-7">
            <Pencil className="w-4 h-4" />
        </CustomButton>
    ) : (
        <CustomButton
            variant={triggerVariant}
            size={triggerSize}
            className={triggerClassName}
        >
            <Plus className="w-4 h-4 mr-2" />
            Add Expense
        </CustomButton>
    );

    return (
        <Dialog open={showDialog} onOpenChange={handleOpenChange}>
            {renderTrigger && (
                <DialogTrigger asChild>
                    {/* Wrap in span to guarantee event capture, mimicking simple DOM behavior */}
                    <span className="inline-block cursor-pointer" tabIndex={-1} onClick={(e) => e.stopPropagation()}>
                        {trigger || defaultTrigger}
                    </span>
                </DialogTrigger>
            )}
            <DialogContent className="sm:max-w-[500px] fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
                <DialogHeader>
                    <DialogTitle>
                        {isEditMode ? 'Edit Transaction' : 'Quick Add Expense'}
                    </DialogTitle>
                </DialogHeader>
                <TransactionFormContent
                    initialTransaction={isEditMode ? transaction : (defaultCustomBudgetId ? {
                        amount: null,
                        customBudgetId: defaultCustomBudgetId
                    } : null)}
                    categories={categories}
                    allBudgets={allBudgets}
                    onSubmit={handleSubmit}
                    onCancel={handleCancel}
                    isSubmitting={isSubmitting}
                    // cashWallet={cashWallet}
                    transactions={transactions}
                />
            </DialogContent>
        </Dialog>
    );
}
