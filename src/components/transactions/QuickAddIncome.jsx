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
import { CustomButton } from "@/components/ui/CustomButton";
import { Plus, Pencil } from "lucide-react";
import IncomeFormContent from "./IncomeFormContent";

export default function QuickAddIncome({
    open,
    onOpenChange,
    onSubmit,
    isSubmitting,
    renderTrigger = true,
    transaction = null,
    transactionTemplate = null, // Allow pre-filling without edit mode
    triggerVariant = "default",
    triggerSize = "default",
    triggerClassName = "",
    selectedMonth,
    selectedYear
}) {

    const isMobile = useIsMobile();
    const [internalOpen, setInternalOpen] = useState(false);

    const isControlled = typeof open === "boolean";
    const showDialog = isControlled ? open : internalOpen;
    const isEditMode = !!transaction && !!transaction.id; // Strict check for ID

    const handleOpenChange = (newOpen) => {
        setInternalOpen(newOpen);
        if (onOpenChange) onOpenChange(newOpen);
    };

    const handleFormSubmit = (data) => {
        onSubmit(data);
        handleOpenChange(false);
    };

    const defaultTrigger = isEditMode ? (
        <CustomButton variant="ghost" size="icon" className="h-7 w-7">
            <Pencil className="w-4 h-4" />
        </CustomButton>
    ) : (
        <CustomButton variant={triggerVariant} size={triggerSize} className={triggerClassName}>
            <Plus className="w-4 h-4 mr-2" /> Add Income
        </CustomButton>
    );

    const formContent = (
        <IncomeFormContent
            initialTransaction={isEditMode ? transaction : transactionTemplate} // ADDED: Use template if not editing
            onSubmit={handleFormSubmit}
            onCancel={() => handleOpenChange(false)}
            isSubmitting={isSubmitting}
            selectedMonth={selectedMonth}
            selectedYear={selectedYear}
        />
    );

    if (isMobile) {
        return (
            <Drawer open={showDialog} onOpenChange={handleOpenChange}>
                {renderTrigger && (
                    <DrawerTrigger asChild>
                        <span className="inline-block cursor-pointer" tabIndex={-1} onClick={(e) => e.stopPropagation()}>
                            {defaultTrigger}
                        </span>
                    </DrawerTrigger>
                )}
                <DrawerContent className="max-h-[90vh]">
                    <DrawerHeader className="text-left">
                        <DrawerTitle>{isEditMode ? 'Edit Income' : 'Quick Add Income'}</DrawerTitle>
                    </DrawerHeader>
                    <div className="px-4 pb-4 overflow-y-auto">{formContent}</div>
                </DrawerContent>
            </Drawer>
        );
    }

    return (
        <Dialog open={showDialog} onOpenChange={handleOpenChange}>
            {renderTrigger && (
                <DialogTrigger asChild>
                    <span className="inline-block cursor-pointer" tabIndex={-1} onClick={(e) => e.stopPropagation()}>
                        {defaultTrigger}
                    </span>
                </DialogTrigger>
            )}
            <DialogContent className="sm:max-w-[450px]">
                <div className="p-6 pb-2">
                    <DialogHeader><DialogTitle>{isEditMode ? 'Edit Income' : 'Quick Add Income'}</DialogTitle></DialogHeader>
                    {formContent}
                </div>
            </DialogContent>
        </Dialog>
    );
}