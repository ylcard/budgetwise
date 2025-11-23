import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { CustomButton } from "@/components/ui/CustomButton";
import { Plus } from "lucide-react";
import { useSettings } from "../utils/SettingsContext";
import { useCashWallet, useAllBudgets } from "../hooks/useBase44Entities";
import TransactionFormContent from "./TransactionFormContent";

export default function QuickAddTransaction({
    open,
    onOpenChange,
    categories,
    defaultCustomBudgetId = '',
    onSubmit,
    isSubmitting,
    transactions = [],
    renderTrigger = true,
    triggerVariant = "default",
    triggerSize = "default",
    triggerClassName = ""
}) {
    const { user } = useSettings();
    const { cashWallet } = useCashWallet(user);
    const { allBudgets } = useAllBudgets(user);

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            {renderTrigger && (
                <DialogTrigger asChild>
                    <CustomButton
                        variant={triggerVariant}
                        size={triggerSize}
                        className={triggerClassName}
                    >
                        <Plus className="w-4 h-4 mr-2" />
                        Add Expense
                    </CustomButton>
                </DialogTrigger>
            )}
            <DialogContent className="sm:max-w-[500px] fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
                <DialogHeader>
                    <DialogTitle>Quick Add Expense</DialogTitle>
                </DialogHeader>
                <TransactionFormContent
                    initialTransaction={defaultCustomBudgetId ? {
                        amount: null,
                        customBudgetId: defaultCustomBudgetId
                    } : null}
                    categories={categories}
                    allBudgets={allBudgets}
                    onSubmit={onSubmit}
                    onCancel={() => onOpenChange(false)}
                    isSubmitting={isSubmitting}
                    cashWallet={cashWallet}
                    transactions={transactions}
                />
            </DialogContent>
        </Dialog>
    );
}
