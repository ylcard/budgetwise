import { useState, useEffect, useMemo } from "react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { CustomButton } from "@/components/ui/CustomButton";
import { Label } from "@/components/ui/label";
import { MobileDrawerSelect } from "@/components/ui/MobileDrawerSelect";
import { useQueryClient } from "@tanstack/react-query";
import { QUERY_KEYS } from "../hooks/queryKeys";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { RefreshCw, AlertCircle, Check, ChevronsUpDown } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/components/ui/use-toast";
import { useConfirm } from "../ui/ConfirmDialogProvider";
import AmountInput from "../ui/AmountInput";
import DatePicker from "../ui/DatePicker";
import CategorySelect from "../ui/CategorySelect";
import AnimatePresenceContainer from "../ui/AnimatePresenceContainer";
import { useSettings } from "../utils/SettingsContext";
import { useExchangeRates } from "../hooks/useExchangeRates";
import { calculateConvertedAmount, getRateForDate, getRateDetailsForDate } from "../utils/currencyCalculations";
import { formatDateString, isDateInRange, formatDate, getMonthBoundaries } from "../utils/dateUtils";
import { differenceInDays, parseISO, startOfDay } from "date-fns";
import { normalizeAmount } from "../utils/generalUtils";
import { useCategoryRules, useGoals, useSystemBudgetsForPeriod } from "../hooks/useBase44Entities";
import { categorizeTransaction } from "../utils/transactionCategorization";
import { getOrCreateSystemBudgetForTransaction } from "../utils/budgetInitialization";
import { FINANCIAL_PRIORITIES } from "../utils/constants";

export default function TransactionFormContent({
    initialTransaction = null,
    categories = [],
    allBudgets = [],
    onSubmit,
    onCancel,
    isSubmitting = false,
}) {
    const queryClient = useQueryClient();
    const { settings, user } = useSettings();
    const { toast } = useToast();
    const { confirmAction } = useConfirm();
    const { exchangeRates, refreshRates, isRefreshing, refetch, isLoading } = useExchangeRates();
    const { rules } = useCategoryRules(user);
    const { goals } = useGoals(user);

    // Force fetch rates on mount if empty
    useEffect(() => {
        if (exchangeRates.length === 0) {
            refetch();
        }
    }, [exchangeRates.length, refetch]);

    const [formData, setFormData] = useState({
        title: '',
        amount: null,
        originalCurrency: settings?.baseCurrency || 'USD',
        type: 'expense',
        category_id: '',
        financial_priority: '',
        date: formatDateString(new Date()),
        isPaid: false,
        paidDate: '',
        budgetId: '',
        isCashExpense: false,
        notes: ''
    });

    const [isBudgetOpen, setIsBudgetOpen] = useState(false);
    const [budgetSearchTerm, setBudgetSearchTerm] = useState("");
    const [validationError, setValidationError] = useState(null);

    // 1. Calculate boundaries for the CURRENTLY SELECTED date in the form
    const selectedDateBounds = useMemo(() => {
        if (!formData.date) return null;
        const date = new Date(formData.date);
        return getMonthBoundaries(date.getMonth(), date.getFullYear());
    }, [formData.date]);

    // 2. Fetch budgets specifically for the date chosen in the form
    // This ensures that even if the Dashboard is on February, the Form can "see" January.
    const { systemBudgets: localSystemBudgets } = useSystemBudgetsForPeriod(
        user,
        selectedDateBounds?.monthStart,
        selectedDateBounds?.monthEnd
    );

    // Merge all system budgets (from parent + transaction date + paid date) with custom budgets from parent
    const mergedBudgets = useMemo(() => {
        const systemFromParent = allBudgets.filter(b => b.isSystemBudget);
        const customFromParent = allBudgets.filter(b => !b.isSystemBudget);
        
        // Combine parent-provided budgets with locally fetched budgets for the selected date
        const combinedSystem = [...systemFromParent, ...(localSystemBudgets || [])];
        
        // Deduplicate by ID
        const uniqueSystem = Array.from(new Map(combinedSystem.map(s => [s.id, s])).values());

        const formattedSystem = uniqueSystem.map(sb => ({
            ...sb,
            isSystemBudget: true,
            allocatedAmount: sb.budgetAmount || sb.allocatedAmount
        }));

        // Return system budgets first, then custom budgets
        return [...formattedSystem, ...customFromParent];
    }, [allBudgets, localSystemBudgets]);

    // Initialize form data from initialTransaction (for editing)
    useEffect(() => {
        if (initialTransaction) {
            setFormData({
                title: initialTransaction.title || '',
                amount: initialTransaction.originalAmount || initialTransaction.amount || null,
                originalCurrency: initialTransaction.originalCurrency || settings?.baseCurrency || 'USD',
                type: initialTransaction.type || 'expense',
                category_id: initialTransaction.category_id || '',
                financial_priority: initialTransaction.financial_priority || '',
                date: initialTransaction.date || formatDateString(new Date()),
                isPaid: initialTransaction.type === 'expense' ? (initialTransaction.isPaid || false) : false,
                paidDate: initialTransaction.paidDate || '',
                budgetId: initialTransaction.budgetId || '',
                isCashExpense: initialTransaction.isCashTransaction || false,
                notes: initialTransaction.notes || ''
            });
        }
    }, [initialTransaction]);

    const isForeignCurrency = formData.originalCurrency !== (settings?.baseCurrency || 'USD');

    // Auto-set Priority based on Category
    useEffect(() => {
        if (formData.category_id) {
            // Prevent overwriting existing priority on initial load of an edit
            if (initialTransaction && formData.category_id === initialTransaction.category_id) {
                // If we are editing and the category hasn't changed, respect the saved priority
                return;
            }

            const selectedCategory = categories.find(c => c.id === formData.category_id);
            if (selectedCategory && selectedCategory.priority) {
                setFormData(prev => ({ ...prev, financial_priority: selectedCategory.priority }));
            }
        }
    }, [formData.category_id, categories, initialTransaction]);

    // Auto-Categorize based on Title
    useEffect(() => {
        if (formData.title && !formData.category_id && !initialTransaction) {
            const result = categorizeTransaction({ title: formData.title }, rules, categories);
            if (result.categoryId) {
                setFormData(prev => ({
                    ...prev,
                    category_id: result.categoryId
                    // Priority will be set by the useEffect above when category_id changes
                }));
            }
        }
    }, [formData.title, rules, categories, initialTransaction, formData.category_id]);

    // ATOMIC SYNC: Ensure budget exists for the selected date/priority
    useEffect(() => {
        const syncBudget = async () => {
            if (!formData.financial_priority || !formData.date || !user) return;

            const relevantDate = formData.isPaid && formData.paidDate ? formData.paidDate : formData.date;

            try {
                // This call ensures the budget exists in the DB. 
                // If it already exists, it just returns the ID immediately.
                const budgetId = await getOrCreateSystemBudgetForTransaction(
                    user.email,
                    relevantDate,
                    formData.financial_priority,
                    goals,
                    settings
                );

                // Only auto-update the selection if the user hasn't manually 
                // picked a different specific custom budget.
                const currentBudget = mergedBudgets.find(b => b.id === formData.budgetId);
                const isSystemOrEmpty = !formData.budgetId || (currentBudget && currentBudget.isSystemBudget);

                if (budgetId && isSystemOrEmpty) {
                    // Invalidate specifically to trigger the localSystemBudgets hook to update
                    await queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.SYSTEM_BUDGETS] });
                    await queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.ALL_SYSTEM_BUDGETS] });
                    setFormData(prev => ({ ...prev, budgetId }));
                }
            } catch (err) {
                console.error("Failed to atomic-sync budget:", err);
            }
        };

        syncBudget();
    }, [formData.financial_priority, formData.date, formData.paidDate, formData.isPaid, user, goals, settings]);

    // 3. Filter Options (Search only)
    // We rely on the parent component to provide the correct order (System > Active > Planned)
    // FIXED 01-Feb-2026: Use transaction date (or paid date) for filtering, not current date
    const visibleOptions = useMemo(() => {
        let filtered = mergedBudgets;

        // A. Mutual Exclusivity for System Budgets based on Priority
        // If "Needs" is selected, hide "Wants" system budget, and vice versa.
        if (formData.financial_priority) {
            filtered = filtered.filter(b => {
                if (!b.isSystemBudget) return true; // Always show Custom Budgets
                // Only show the system budget that matches the selected priority
                return b.systemBudgetType === formData.financial_priority;
            });
        }

        // B. Date-Based Filter for System Budgets
        // CRITICAL FIX: Use the paid date if available (for paid expenses), otherwise use transaction date
        const relevantDate = formData.type === 'expense' && formData.isPaid && formData.paidDate
            ? formData.paidDate
            : formData.date;

        filtered = filtered.filter(b => {
            if (!b.isSystemBudget) return true; // Always show Custom Budgets
            // Only show system budgets relevant to the transaction/paid date
            return isDateInRange(relevantDate, b.startDate, b.endDate);
        });

        // C. Search Filter
        if (budgetSearchTerm && budgetSearchTerm.length > 0) {
            filtered = filtered.filter(b =>
                b.name.toLowerCase().includes(budgetSearchTerm.toLowerCase())
            );
        }
        return filtered;
    }, [mergedBudgets, budgetSearchTerm, formData.financial_priority, formData.date, formData.isPaid, formData.paidDate, formData.type]);

    const executeRefresh = async (force) => {
        const result = await refreshRates(
            formData.originalCurrency,
            settings?.baseCurrency || 'USD',
            formData.date,
            force
        );

        if (result.success) {
            toast({
                title: result.alreadyFresh ? "Rates Up to Date" : (result.skipped ? "Historical Rate Skipped" : "Success"),
                description: result.message,
                variant: result.skipped ? "warning" : "default"
            });
        } else {
            toast({
                title: "Error",
                description: result.message,
                variant: "destructive",
            });
        }
    };

    const handleRefreshRates = async () => {
        // Check if rate already exists
        const existingRateDetails = getRateDetailsForDate(exchangeRates, formData.originalCurrency, formData.date, settings?.baseCurrency);

        if (existingRateDetails) {
            confirmAction(
                "Update Exchange Rate?",
                `A rate for this date already exists (${existingRateDetails.rate} from ${formatDate(existingRateDetails.date)}). Do you want to fetch a new one?`,
                () => executeRefresh(true),
                { confirmText: "Update" }
            );
        } else {
            await executeRefresh(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setValidationError(null);

        const normalizedAmount = normalizeAmount(formData.amount);
        const originalAmount = parseFloat(normalizedAmount);

        let finalAmount = originalAmount;
        let finalBudgetId = formData.budgetId;

        // ATOMIC CREATION: If priority is set but no specific custom budget is picked, 
        // ensure the system budget exists for the relevant month right now.
        if (formData.type === 'expense' && formData.financial_priority) {
            const relevantDate = formData.isPaid && formData.paidDate ? formData.paidDate : formData.date;

            // This call is synchronized via our Map lock in budgetInitialization
            finalBudgetId = await getOrCreateSystemBudgetForTransaction(
                user.email,
                relevantDate,
                formData.financial_priority,
                goals,
                settings
            );
        }

        if (formData.type === 'expense' && !finalBudgetId) {
            setValidationError("A budget allocation is required for expenses.");
            return;
        }

        let exchangeRateUsed = null;

        // Perform currency conversion if needed
        if (isForeignCurrency) {
            let sourceRate = getRateForDate(exchangeRates, formData.originalCurrency, formData.date);
            let targetRate = getRateForDate(exchangeRates, settings?.baseCurrency || 'USD', formData.date);

            // AUTO-FETCH ON SUBMIT: If rate is missing and not paid, try to fetch it now
            if ((!sourceRate || !targetRate) && !formData.isPaid) {
                toast({ title: "Fetching Exchange Rates...", description: "Please wait while we update rates." });

                const result = await refreshRates(
                    formData.originalCurrency,
                    settings?.baseCurrency || 'USD',
                    formData.date
                );

                if (!result.success) {
                    setValidationError("Failed to fetch exchange rates. Please try again or enter amount manually.");
                    return;
                }

                setValidationError("Exchange rates updated. Please review the rate and click Save again.");
                return;
            }

            if (!sourceRate || !targetRate) {
                if (!formData.isPaid) {
                    setValidationError("Exchange rate is missing. Please fetch rates manually or mark as paid.");
                    return;
                }
            }

            // MODIFIED: 17-Jan-2026 - Updated parameter names from USD to EUR
            if (sourceRate && targetRate) {
                const conversion = calculateConvertedAmount(
                    originalAmount,
                    formData.originalCurrency,
                    settings?.baseCurrency || 'USD',
                    { sourceToEUR: sourceRate, targetToEUR: targetRate }
                );

                finalAmount = conversion.convertedAmount;
                exchangeRateUsed = conversion.exchangeRateUsed;
            }
        }

        const submitData = {
            title: formData.title,
            amount: finalAmount,
            originalAmount: originalAmount,
            originalCurrency: formData.originalCurrency,
            exchangeRateUsed: exchangeRateUsed,
            type: formData.type,
            category_id: formData.category_id || null,
            financial_priority: formData.financial_priority || null, // ADDED 20-Jan-2025
            date: formData.date,
            notes: formData.notes || null
        };

        if (formData.type === 'expense') {
            submitData.isPaid = formData.isCashExpense ? true : formData.isPaid;
            submitData.paidDate = formData.isCashExpense ? formData.date : (formData.isPaid ? (formData.paidDate || formData.date) : null);
            submitData.budgetId = finalBudgetId || null;
            submitData.isCashTransaction = formData.isCashExpense;
            submitData.cashTransactionType = null;
        } else {
            submitData.isPaid = false;
            submitData.paidDate = null;
            submitData.category_id = null;
            submitData.budgetId = null;
            submitData.isCashTransaction = false;
            submitData.cashTransactionType = null;
            submitData.cashAmount = null;
            submitData.cashCurrency = null;
        }

        onSubmit(submitData);
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            {validationError && (
                <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>{validationError}</AlertDescription>
                </Alert>
            )}

            {/* Title */}
            <div className="space-y-2">
                <Label htmlFor="title">Title</Label>
                <Input
                    id="title"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    placeholder="e.g., Salary, Groceries, Coffee"
                    required
                    autoComplete="off"
                />
            </div>

            {/* Amount and Currency (Combined) */}
            <div className="space-y-2">
                <div className="flex justify-between items-center">
                    <Label htmlFor="amount">Amount</Label>
                    {isForeignCurrency && (
                        <div className="flex items-center gap-2">
                            {(() => {
                                const rateDetails = getRateDetailsForDate(exchangeRates, formData.originalCurrency, formData.date, settings?.baseCurrency);
                                if (rateDetails) {
                                    const rateDate = startOfDay(parseISO(rateDetails.date));
                                    const txDate = startOfDay(parseISO(formData.date));
                                    const age = Math.abs(differenceInDays(txDate, rateDate));
                                    const isOld = age > 14;

                                    return (
                                        <span
                                            className={`text-xs ${isOld ? 'text-amber-600' : 'text-gray-500'}`}
                                            title={`Rate: ${rateDetails.rate} (from ${formatDate(rateDetails.date)}) - ${age} days diff`}
                                        >
                                            Rate: {rateDetails.rate} ({formatDate(rateDetails.date, 'MMM d')}{isOld ? ', Old' : ''})
                                        </span>
                                    );
                                }
                                if (isLoading) return <span className="text-xs text-gray-400">Loading...</span>;
                                return <span className="text-xs text-amber-600">No rate</span>;
                            })()}
                            <CustomButton
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={handleRefreshRates}
                                disabled={isRefreshing || isLoading}
                                className="h-6 px-2 text-blue-600 hover:text-blue-700"
                            >
                                <RefreshCw className={`w-3 h-3 mr-1 ${isRefreshing ? 'animate-spin' : ''}`} />
                                <span className="text-xs">Fetch Rate</span>
                            </CustomButton>
                        </div>
                    )}
                </div>
                <AmountInput
                    id="amount"
                    value={formData.amount}
                    onChange={(value) => setFormData({ ...formData, amount: value })}
                    placeholder="0.00"
                    currency={formData.originalCurrency}
                    onCurrencyChange={(value) => setFormData({ ...formData, originalCurrency: value })}
                    required
                />
            </div>

            {/* Paid with cash checkbox - right below amount/currency */}
            {formData.type === 'expense' && (
                <div className="flex items-center space-x-2">
                    <Checkbox
                        id="isCashExpense"
                        checked={formData.isCashExpense}
                        onCheckedChange={(checked) => setFormData({
                            ...formData,
                            isCashExpense: checked,
                            isPaid: checked ? true : formData.isPaid
                        })}
                    />
                    <Label htmlFor="isCashExpense" className="cursor-pointer flex items-center gap-2">
                        Paid with cash
                    </Label>
                </div>
            )}

            {/* Date picker and Mark as paid checkbox */}
            <div className="space-y-2">
                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <Label htmlFor="date">Date</Label>
                        <DatePicker
                            value={formData.date}
                            onChange={(value) => setFormData({ ...formData, date: value })}
                            placeholder="Select date"
                        />
                    </div>

                    {/* Payment Date - appears next to Date when isPaid is checked */}
                    <AnimatePresenceContainer show={formData.type === 'expense' && formData.isPaid && !formData.isCashExpense}>
                        <div className="space-y-2">
                            <Label htmlFor="paidDate">Payment Date</Label>
                            <DatePicker
                                value={formData.paidDate || formData.date}
                                onChange={(value) => setFormData({ ...formData, paidDate: value })}
                                placeholder="Payment date"
                            />
                        </div>
                    </AnimatePresenceContainer>
                </div>

                {/* Mark as paid checkbox - below date fields */}
                {formData.type === 'expense' && !formData.isCashExpense && (
                    <div className="flex items-center space-x-2">
                        <Checkbox
                            id="isPaid"
                            checked={formData.isPaid}
                            onCheckedChange={(checked) => setFormData({
                                ...formData,
                                isPaid: checked,
                                paidDate: checked ? (formData.paidDate || formData.date) : ''
                            })}
                        />
                        <Label htmlFor="isPaid" className="cursor-pointer">
                            Mark as paid
                        </Label>
                    </div>
                )}
            </div>

            {/* Category, Budget Assignment, and Budget (grid layout) */}
            {formData.type === 'expense' && (
                <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        {/* Category */}
                        <div className="space-y-2">
                            <Label htmlFor="category">Category</Label>
                            <CategorySelect
                                value={formData.category_id}
                                onValueChange={(value) => setFormData({ ...formData, category_id: value })}
                                categories={categories}
                            />
                        </div>

                        {/* Financial Priority */}
                        <div className="space-y-2">
                            <Label htmlFor="financial_priority">Financial Priority</Label>
                            <MobileDrawerSelect
                                value={formData.financial_priority || ''}
                                onValueChange={(value) => setFormData({ ...formData, financial_priority: value || '' })}
                                placeholder="Select priority"
                                options={Object.entries(FINANCIAL_PRIORITIES)
                                    .filter(([key]) => key !== 'savings')
                                    .map(([key, cfg]) => ({
                                        value: key,
                                        label: cfg.label
                                    }))}
                            />
                        </div>
                    </div>
                    {/* Budget (REQUIRED for expenses) */}
                    <div className="space-y-2">
                        <Label htmlFor="customBudget">Budget Allocation</Label>
                        <Popover open={isBudgetOpen} onOpenChange={setIsBudgetOpen} modal={true}>
                            <PopoverTrigger asChild>
                                <CustomButton
                                    variant="outline"
                                    role="combobox"
                                    aria-expanded={isBudgetOpen}
                                    className="w-full justify-between font-normal"
                                >
                                    {formData.budgetId
                                        ? mergedBudgets.find((b) => b.id === formData.budgetId)?.name
                                        : "Select budget..."}
                                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                </CustomButton>
                            </PopoverTrigger>
                            <PopoverContent className="w-[300px] p-0" align="start">
                                <Command shouldFilter={false} className="h-auto overflow-hidden">
                                    <CommandInput
                                        placeholder="Search budgets..."
                                        onValueChange={setBudgetSearchTerm}
                                    />
                                    <CommandList>
                                        <CommandEmpty>No relevant budget found.</CommandEmpty>
                                        <CommandGroup heading={budgetSearchTerm ? "Search Results" : undefined}>
                                            {visibleOptions.map((budget) => (
                                                <CommandItem
                                                    key={budget.id}
                                                    value={budget.name}
                                                    onSelect={() => {
                                                        setFormData({ ...formData, budgetId: budget.id });
                                                        setIsBudgetOpen(false);
                                                    }}
                                                >
                                                    <Check
                                                        className={`mr-2 h-4 w-4 ${formData.budgetId === budget.id ? "opacity-100" : "opacity-0"}`}
                                                    />
                                                    <div className="flex items-center text-sm">
                                                        {budget.isSystemBudget ? (
                                                            <span className="text-blue-600 mr-2">★</span>
                                                        ) : (
                                                            <span className={`w-2 h-2 rounded-full mr-2 ${budget.status === 'active' ? 'bg-green-500' : 'bg-gray-300'}`} />
                                                        )}
                                                        {budget.name}
                                                        {budget.isSystemBudget && <span className="ml-1 text-xs text-gray-400">({formatDate(budget.startDate, 'MMM')})</span>}
                                                    </div>
                                                </CommandItem>
                                            ))}
                                        </CommandGroup>
                                    </CommandList>
                                </Command>
                            </PopoverContent>
                        </Popover>
                    </div>
                </div>
            )}

            {/* Notes */}
            <div className="space-y-2">
                <Label htmlFor="notes">Notes</Label>
                <Textarea
                    id="notes"
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    placeholder="Additional details..."
                    rows={2}
                />
            </div>

            {/* Action Buttons */}
            <div className="flex justify-end gap-3 pt-2">
                <CustomButton type="button" variant="outline" onClick={onCancel}>
                    Cancel
                </CustomButton>
                <CustomButton
                    type="submit"
                    disabled={isSubmitting}
                    variant="primary"
                >
                    {isSubmitting ? 'Saving...' : (initialTransaction && initialTransaction.id) ? 'Update' : 'Add'}
                </CustomButton>
            </div>
        </form>
    );
}