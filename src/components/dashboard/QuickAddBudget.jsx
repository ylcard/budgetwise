import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";
import { useIsMobile } from "@/hooks/use-mobile";
import BudgetCreationWizard from "../custombudgets/BudgetCreationWizard";
import { useSettings } from "../utils/SettingsContext";
import { useTransactions } from "../hooks/useBase44Entities";
import { useMergedCategories } from "../hooks/useMergedCategories";

export default function QuickAddBudget({
    open,
    onOpenChange,
    onSubmit,
    isSubmitting,
    baseCurrency
}) {
    const { settings } = useSettings();
    const { transactions } = useTransactions();
    const { categories } = useMergedCategories();
    const isMobile = useIsMobile();

    const handleSubmitWrapper = (data) => {
        onSubmit(data);
        onOpenChange(false);
    };

    if (isMobile) {
        return (
            <Drawer open={open} onOpenChange={onOpenChange}>
                <DrawerContent className="max-h-[90dvh] flex flex-col z-[500] bg-background">
                    <DrawerHeader className="text-left shrink-0">
                        <DrawerTitle>Create Budget</DrawerTitle>
                    </DrawerHeader>
                    <BudgetCreationWizard
                        transactions={transactions}
                        categories={categories}
                        settings={settings}
                        onSubmit={handleSubmitWrapper}
                        onCancel={() => onOpenChange(false)}
                        isSubmitting={isSubmitting}
                    />
                </DrawerContent>
            </Drawer>
        );
    }

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