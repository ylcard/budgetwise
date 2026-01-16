import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import BudgetCreationWizard from "../custombudgets/BudgetCreationWizard";
import { useSettings } from "../utils/SettingsContext";
import { useTransactions, useCategories } from "../hooks/useBase44Entities";

export default function QuickAddBudget({
    open,
    onOpenChange,
    onSubmit,
    isSubmitting,
    baseCurrency
}) {
    const { settings } = useSettings();
    const { transactions } = useTransactions();
    const { categories } = useCategories();

    const handleSubmitWrapper = (data) => {
        onSubmit(data);
        onOpenChange(false);
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent
                className="sm:max-w-5xl max-h-[90vh] overflow-y-auto"
                aria-describedby="create-budget-description"
            >
                <span id="create-budget-description" className="sr-only">Create a new custom budget with AI assistance</span>
                <DialogHeader>
                    <DialogTitle>Create Budget</DialogTitle>
                </DialogHeader>
                <BudgetCreationWizard
                    transactions={transactions}
                    categories={categories}
                    settings={settings}
                    onSubmit={handleSubmitWrapper}
                    onCancel={() => onOpenChange(false)}
                    isSubmitting={isSubmitting}
                />
            </DialogContent>
        </Dialog>
    );
}