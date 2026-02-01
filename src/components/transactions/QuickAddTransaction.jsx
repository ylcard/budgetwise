import { useState, useMemo } from "react";
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
// import { useAllBudgets } from "../hooks/useBase44Entities";
// import { formatDateString, getFirstDayOfMonth } from "../utils/dateUtils";
import { useCustomBudgetsAll, useSystemBudgetsForPeriod } from "../hooks/useBase44Entities";
import { formatDateString, getFirstDayOfMonth, getMonthBoundaries } from "../utils/dateUtils";
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
    triggerClassName = "",
    selectedMonth,
    selectedYear
}) {
    const { user } = useSettings();
    // DEPRECATED: const { allBudgets } = useAllBudgets(user);

    // Trying to fix expenses not being assigned to budgets when importing
    // 1. Determine Date Context for System Budgets
    // Default to current date if not provided (Global Add) or selected date (Dashboard)
    // const targetMonth = selectedMonth ?? new Date().getMonth();
    // const targetYear = selectedYear ?? new Date().getFullYear();

    // FIXED 01-Feb-2026: Fetch wider date range for system budgets to support adding expenses from different months
    // Instead of just fetching the viewed month, fetch 6 months back + 1 month forward
    const dateRangeForFetch = useMemo(() => {
        const now = new Date();
        const viewMonth = selectedMonth ?? now.getMonth();
        const viewYear = selectedYear ?? now.getFullYear();
        
        // Start from 6 months ago
        const startDate = new Date(viewYear, viewMonth - 6, 1);
        // End 1 month in the future
        const endDate = new Date(viewYear, viewMonth + 2, 0); // Last day of next month
        
        return {
            start: startDate.toISOString().split('T')[0],
            end: endDate.toISOString().split('T')[0]
        };
    }, [selectedMonth, selectedYear]);

    // 2. Fetch Data - System budgets for wide range
    const { systemBudgets } = useSystemBudgetsForPeriod(user, dateRangeForFetch.start, dateRangeForFetch.end);
    
    // Custom: Unconstrained (Fetch "All" - handled by hook limit)
    const { allCustomBudgets } = useCustomBudgetsAll(user, null, null);

    // 3. Prepare & Sort the Dropdown List
    const allBudgets = useMemo(() => {
        // FIXED 01-Feb-2026: Simplified - we now fetch a wide range, no need for merging
        const formattedSystem = systemBudgets
            .filter(sb => sb.systemBudgetType !== 'savings') // Rule: Savings is not for expenses
            .map(sb => ({
                ...sb,
                isSystemBudget: true,
                allocatedAmount: sb.budgetAmount
            }));

        // B. Custom Budgets: Sort by Priority (Active > Planned > Completed)
        const statusOrder = { active: 0, planned: 1, completed: 2 };
        const sortedCustom = [...allCustomBudgets].sort((a, b) => statusOrder[a.status] - statusOrder[b.status]);

        // C. Merge: System at the TOP
        return [...formattedSystem, ...sortedCustom];
    }, [systemBudgets, allCustomBudgets]);

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

    // Calculate default date
    const getInitialDate = () => {
        const now = new Date();
        // If selected month/year matches current real-time, use today
        // DEPRECATED: if (selectedMonth === now.getMonth() && selectedYear === now.getFullYear()) {
        if (dateContext.month === now.getMonth() && dateContext.year === now.getFullYear()) {
            return formatDateString(now);
        }
        // Otherwise default to the 1st of the selected month
        // DEPRECATED: return getFirstDayOfMonth(selectedMonth, selectedYear);
        return getFirstDayOfMonth(dateContext.month, dateContext.year);
    };

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
                        date: getInitialDate(),
                        customBudgetId: defaultCustomBudgetId
                    } : { date: getInitialDate() })}
                    categories={categories}
                    allBudgets={allBudgets}
                    onSubmit={handleSubmit}
                    onCancel={handleCancel}
                    isSubmitting={isSubmitting}
                    transactions={transactions}
                />
            </DialogContent>
        </Dialog>
    );
}