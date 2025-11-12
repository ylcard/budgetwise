import React from "react";
//import {
//    Popover,
//    PopoverContent,
//    PopoverTrigger,
//} from "@/components/ui/popover";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
//import { Button } from "@/components/ui/button";
//import { Plus } from "lucide-react";
import CustomBudgetForm from "../custombudgets/CustomBudgetForm";
import { useSettings } from "../utils/SettingsContext";
//import { useCashWallet } from "../hooks/useBase44Entities";

export default function QuickAddBudget({
    open,
    onOpenChange,
    onSubmit,
    onCancel,
    isSubmitting,
    cashWallet,
    baseCurrency
}) {
    const { settings } = useSettings();

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent
                className="w-[600px] fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 max-h-[90vh] overflow-y-auto z-50"
                align="center"
                side="top"
                sideOffset={0}
            >
                <DialogHeader>
                    <DialogTitle>Create Budget</DialogTitle>
                </DialogHeader>
                <div className="space-y-2">
                    <h3 className="font-semibold text-lg">Create Custom Budget</h3>
                    <CustomBudgetForm
                        onSubmit={onSubmit}
                        onCancel={() => onOpenChange(false)}
                        isSubmitting={isSubmitting}
                        cashWallet={cashWallet}
                        baseCurrency={baseCurrency}
                        settings={settings}
                    />
                </div>
            </DialogContent>
        </Dialog>
    );
}

// REFACTOR (2025-01-12): Converted from Dialog to Popover
// - Now consistent with QuickAddTransaction and QuickAddIncome design pattern
// - Form appears in popover instead of modal
// - Added PopoverTrigger with styled button
// - Removed Dialog wrapper
// FIX (2025-01-12): Fixed popover jumping issue
// - PopoverContent now uses fixed positioning with centering transforms
// - Added max-height with overflow-y-auto for long forms
// - Form stays in place when content expands (e.g., adding cash allocations)