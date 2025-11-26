import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import AllocationForm from "./AllocationForm";

export default function AllocationFormDialog({
    open,
    onOpenChange,
    allocation,
    customBudget,
    categories,
    onSubmit,
    isSubmitting,
    settings
    // cashWallet
}) {
    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[600px] fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>{allocation ? 'Edit' : 'Add'} Allocation</DialogTitle>
                </DialogHeader>
                <AllocationForm
                    allocation={allocation}
                    customBudget={customBudget}
                    categories={categories}
                    onSubmit={onSubmit}
                    onCancel={() => onOpenChange(false)}
                    isSubmitting={isSubmitting}
                    settings={settings}
                    // cashWallet={cashWallet}
                />
            </DialogContent>
        </Dialog>
    );
}
