import { useState } from "react";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerTrigger } from "@/components/ui/drawer";
import { useIsMobile } from "@/hooks/use-mobile";
import RecurringTransactionForm from "../RecurringTransactionForm";

export default function RecurringFormDialog({
    open,
    onOpenChange,
    onSubmit,
    isSubmitting,
    transaction = null, // The editing entity
    categories,
    renderTrigger = false,
    trigger = null
}) {
    const isMobile = useIsMobile();
    const [internalOpen, setInternalOpen] = useState(false);

    const isControlled = typeof open === "boolean";
    const showDialog = isControlled ? open : internalOpen;
    const isEditMode = !!transaction && !!transaction.id;

    const handleOpenChange = (newOpen) => {
        setInternalOpen(newOpen);
        if (onOpenChange) onOpenChange(newOpen);
    };

    const handleFormSubmit = (data) => {
        onSubmit(data);
        // Form closure is typically handled by the parent or after success, 
        // but can be safely triggered here if desired.
    };

    const formContent = (
        <RecurringTransactionForm
            initialData={transaction}
            categories={categories}
            onSubmit={handleFormSubmit}
            onCancel={() => handleOpenChange(false)}
            isSubmitting={isSubmitting}
        />
    );

    if (isMobile) {
        return (
            <Drawer open={showDialog} onOpenChange={handleOpenChange}>
                {renderTrigger && trigger && (
                    <DrawerTrigger asChild>
                        <span className="inline-block cursor-pointer" tabIndex={-1} onClick={(e) => e.stopPropagation()}>
                            {trigger}
                        </span>
                    </DrawerTrigger>
                )}
                {/* Notice the sticky-footer flex setup here */}
                <DrawerContent className="max-h-[90dvh] flex flex-col z-[500] bg-background">
                    <DrawerHeader className="text-left shrink-0">
                        <DrawerTitle className="text-xl font-bold px-4">
                            {isEditMode ? 'Edit Template' : 'New Recurring Transaction'}
                        </DrawerTitle>
                    </DrawerHeader>
                    {formContent}
                </DrawerContent>
            </Drawer>
        );
    }

    return (
        <Dialog open={showDialog} onOpenChange={handleOpenChange}>
            {renderTrigger && trigger && (
                <DialogTrigger asChild>
                    <span className="inline-block cursor-pointer" tabIndex={-1} onClick={(e) => e.stopPropagation()}>
                        {trigger}
                    </span>
                </DialogTrigger>
            )}
            <DialogContent className="sm:max-w-[500px] p-0 overflow-hidden border-none shadow-2xl">
                <DialogHeader className="p-6 pb-0">
                    <DialogTitle className="text-xl font-bold">
                        {isEditMode ? 'Edit Template' : 'New Recurring Transaction'}
                    </DialogTitle>
                </DialogHeader>
                <div className="p-6 max-h-[85vh] overflow-y-auto pb-6">
                    {formContent}
                </div>
            </DialogContent>
        </Dialog>
    );
}
