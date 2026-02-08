import { useState, useMemo } from "react";
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
import { useSettings } from "../utils/SettingsContext";
import { useCustomBudgetsForPeriod, useSystemBudgetsForPeriod } from "../hooks/useBase44Entities";
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
    const isMobile = useIsMobile();

    // If editing, use the transaction's month/year. Otherwise, use the viewed month/year.
    const dateContext = useMemo(() => {
        if (transaction?.date) {
            const d = new Date(transaction.date);
            if (!isNaN(d)) return { month: d.getMonth(), year: d.getFullYear() };
        }
        return {
            month: selectedMonth ?? new Date().getMonth(),
            year: selectedYear ?? new Date().getFullYear()
        };
    }, [transaction, selectedMonth, selectedYear]);

    const { monthStart, monthEnd } = getMonthBoundaries(dateContext.month, dateContext.year);
    // const { monthStart, monthEnd } = getMonthBoundaries(targetMonth, targetYear);

    // 2. Fetch Data
    // System: Constrained by Date (Strict) - BUT if editing, fetch the transaction's month too
    // CRITICAL FIX 17-Jan-2026: When editing, we need to fetch system budgets for BOTH:
    // 1. The currently viewed month (for context)
    // 2. The transaction's original month (so the linked budget appears in dropdown)
    const transactionMonth = transaction?.date ? new Date(transaction.date).getMonth() : null;
    const transactionYear = transaction?.date ? new Date(transaction.date).getFullYear() : null;

    const needsSecondFetch = transaction && (
        transactionMonth !== dateContext.month || transactionYear !== dateContext.year
    );

    const { systemBudgets } = useSystemBudgetsForPeriod(user, monthStart, monthEnd);

    // If editing a transaction from a different month, fetch that month's system budgets too
    const transactionMonthBounds = needsSecondFetch
        ? getMonthBoundaries(transactionMonth, transactionYear)
        : { monthStart: null, monthEnd: null };

    const { systemBudgets: transactionSystemBudgets } = useSystemBudgetsForPeriod(
        user,
        transactionMonthBounds.monthStart,
        transactionMonthBounds.monthEnd
    );

    // Custom: Unconstrained (Fetch "All" - handled by hook limit)
    // UPDATED: 03-Feb-2026 - Using renamed hook
    const { customBudgets: allCustomBudgets } = useCustomBudgetsForPeriod(user, null, null);

    // 3. Prepare & Sort the Dropdown List
    const allBudgets = useMemo(() => {
        // CRITICAL FIX 17-Jan-2026: Merge system budgets from BOTH date ranges when editing

        // A. System Budgets: Combine current month + transaction's month (if different)
        const combinedSystemBudgets = needsSecondFetch
            ? [...systemBudgets, ...transactionSystemBudgets]
            : systemBudgets;

        // Remove duplicates (shouldn't happen, but just in case)
        const uniqueSystemBudgets = Array.from(
            new Map(combinedSystemBudgets.map(sb => [sb.id, sb])).values()
        );

        const formattedSystem = uniqueSystemBudgets
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
    }, [systemBudgets, transactionSystemBudgets, allCustomBudgets, needsSecondFetch]);

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
        if (dateContext.month === now.getMonth() && dateContext.year === now.getFullYear()) {
            return formatDateString(now);
        }
        // Otherwise default to the 1st of the selected month
        return getFirstDayOfMonth(dateContext.month, dateContext.year);
    };

    const formContent = (
        <TransactionFormContent
            initialTransaction={isEditMode ? transaction : (defaultCustomBudgetId ? {
                amount: null,
                date: getInitialDate(),
                budgetId: defaultCustomBudgetId
            } : { date: getInitialDate() })}
            categories={categories}
            allBudgets={allBudgets}
            onSubmit={handleSubmit}
            onCancel={handleCancel}
            isSubmitting={isSubmitting}
            transactions={transactions}
        />
    );

    // Mobile View: Bottom Drawer
    if (isMobile) {
        return (
            <Drawer open={showDialog} onOpenChange={handleOpenChange}>
                {renderTrigger && (
                    <DrawerTrigger asChild>
                        <span className="inline-block cursor-pointer" tabIndex={-1} onClick={(e) => e.stopPropagation()}>
                            {trigger || defaultTrigger}
                        </span>
                    </DrawerTrigger>
                )}
                <DrawerContent className="max-h-[90vh]">
                    <DrawerHeader className="text-left">
                        <DrawerTitle>
                            {isEditMode ? 'Edit Transaction' : 'Quick Add Expense'}
                        </DrawerTitle>
                    </DrawerHeader>
                    <div className="px-4 pb-4 overflow-y-auto">
                        {formContent}
                    </div>
                </DrawerContent>
            </Drawer>
        );
    }

    // Desktop View: Standard Dialog
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

            <DialogContent className="sm:max-w-[500px]">
                <div className="p-6 pb-2">
                    <DialogHeader>
                        <DialogTitle>
                            {isEditMode ? 'Edit Transaction' : 'Quick Add Expense'}
                        </DialogTitle>
                    </DialogHeader>
                    {formContent}
                </div>
            </DialogContent>
        </Dialog>
    );
}