import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import CustomBudgetForm from "../custombudgets/CustomBudgetForm";
import { useSettings } from "../utils/SettingsContext";

export default function QuickAddBudget({
    open,
    onOpenChange,
    onSubmit,
    isSubmitting,
    // cashWallet,
    baseCurrency
}) {
    const { settings } = useSettings();

    const handleSubmitWrapper = (data) => {
        onSubmit(data);
        onOpenChange(false);
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent
                className="sm:max-w-2xl max-h-[90vh] overflow-y-auto"
                aria-describedby="create-budget-description"
            >
                <span id="create-budget-description" className="sr-only">Create a new custom budget</span>
                <DialogHeader>
                    <DialogTitle>Create Budget</DialogTitle>
                </DialogHeader>
                <CustomBudgetForm
                    onSubmit={handleSubmitWrapper}
                    onCancel={() => onOpenChange(false)}
                    isSubmitting={isSubmitting}
                    // cashWallet={cashWallet}
                    baseCurrency={baseCurrency}
                    settings={settings}
                />
            </DialogContent>
        </Dialog>
    );
}
