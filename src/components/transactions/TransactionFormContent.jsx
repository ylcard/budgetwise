import { useState, useEffect, useMemo } from "react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { CustomButton } from "@/components/ui/CustomButton";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"; // Keep for Priority
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { RefreshCw, AlertCircle, Clock, CheckCircle, Check, ChevronsUpDown } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/components/ui/use-toast";
import { useConfirm } from "../ui/ConfirmDialogProvider";
import AmountInput from "../ui/AmountInput";
import DatePicker from "../ui/DatePicker";
import CategorySelect from "../ui/CategorySelect";
import AnimatePresenceContainer from "../ui/AnimatePresenceContainer";
import { useSettings } from "../utils/SettingsContext";
import { useExchangeRates } from "../hooks/useExchangeRates";
import { getCurrencyBalance, getRemainingAllocatedCash } from "../utils/cashAllocationUtils";
import { getCurrencySymbol } from "../utils/currencyUtils";
import { calculateConvertedAmount, getRateForDate, getRateDetailsForDate } from "../utils/currencyCalculations";
import { SUPPORTED_CURRENCIES, FINANCIAL_PRIORITIES } from "../utils/constants";
import { formatDateString, isDateInRange, formatDate } from "../utils/dateUtils";
import { differenceInDays, parseISO, startOfDay } from "date-fns";
import { normalizeAmount } from "../utils/generalUtils";
import { useCategoryRules } from "../hooks/useBase44Entities";
import { categorizeTransaction } from "../utils/transactionCategorization";

export default function TransactionFormContent({
    initialTransaction = null,
    categories = [],
    allBudgets = [],
    onSubmit,
    onCancel,
    isSubmitting = false,
    cashWallet = null,
    transactions = []
}) {
    const { settings, user } = useSettings();
    const { toast } = useToast();
    const { confirmAction } = useConfirm();
    const { exchangeRates, refreshRates, isRefreshing, refetch, isLoading } = useExchangeRates();
    const { rules } = useCategoryRules(user);

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
        customBudgetId: '',
        isCashExpense: false,
        notes: ''
    });

    const [isBudgetOpen, setIsBudgetOpen] = useState(false);
    const [budgetSearchTerm, setBudgetSearchTerm] = useState("");
    const [validationError, setValidationError] = useState(null);

    // Initialize form data from initialTransaction (for editing)
    useEffect(() => {
        if (initialTransaction) {
            setFormData({
                title: initialTransaction.title || '',
                amount: initialTransaction.originalAmount || initialTransaction.amount || null,
                originalCurrency: initialTransaction.originalCurrency || settings?.baseCurrency || 'USD',
                type: initialTransaction.type || 'expense',
                category_id: initialTransaction.category_id || '',
                financial_priority: initialTransaction.financial_priority || '', // ADDED 20-Jan-2025
                date: initialTransaction.date || formatDateString(new Date()),
                isPaid: initialTransaction.type === 'expense' ? (initialTransaction.isPaid || false) : false,
                paidDate: initialTransaction.paidDate || '',
                customBudgetId: initialTransaction.customBudgetId || '',
                isCashExpense: initialTransaction.isCashTransaction || false,
                notes: initialTransaction.notes || ''
            });
        } else {
            // Reset to defaults for new transaction
            setFormData({
                title: '',
                amount: null,
                originalCurrency: settings?.baseCurrency || 'USD',
                type: 'expense',
                category_id: '',
                financial_priority: '',
                date: formatDateString(new Date()),
                isPaid: false,
                paidDate: '',
                customBudgetId: '',
                isCashExpense: false,
                notes: ''
            });
        }
    }, [initialTransaction, settings?.baseCurrency]);

    const isForeignCurrency = formData.originalCurrency !== (settings?.baseCurrency || 'USD');

    // Proactively refresh exchange rates for foreign currencies
    // REMOVED: Proactively refresh exchange rates for foreign currencies
    // We now use a hybrid approach: Manual trigger + Fetch on Submit
    // useEffect(() => { ... }, ...);

    // Get currency symbol for the selected currency
    const selectedCurrencySymbol = SUPPORTED_CURRENCIES.find(
        c => c.code === formData.originalCurrency
    )?.symbol || getCurrencySymbol(formData.originalCurrency);

    // Auto-set Priority based on Category
    useEffect(() => {
        if (formData.category_id) {
            const selectedCategory = categories.find(c => c.id === formData.category_id);
            if (selectedCategory && selectedCategory.priority) {
                setFormData(prev => ({ ...prev, financial_priority: selectedCategory.priority }));
            }
        }
    }, [formData.category_id, categories]);

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

    // Smart Date for Custom Budgets
    // If a custom budget is selected and the current date is outside its range, default to the start date.
    useEffect(() => {
        if (formData.budget_id) {
            const selectedBudget = allBudgets.find(b => b.id === formData.budget_id);
            if (selectedBudget && selectedBudget.type === 'custom' && selectedBudget.start_date && selectedBudget.end_date) {
                const txDate = new Date(formData.date);
                const startDate = new Date(selectedBudget.start_date);
                const endDate = new Date(selectedBudget.end_date);

                // Reset times for comparison
                txDate.setHours(0, 0, 0, 0);
                startDate.setHours(0, 0, 0, 0);
                endDate.setHours(0, 0, 0, 0);

                if (txDate < startDate || txDate > endDate) {
                    setFormData(prev => ({
                        ...prev,
                        date: formatDateString(startDate)
                    }));
                    toast({
                        title: "Date Updated",
                        description: `Date adjusted to match "${selectedBudget.name}" period.`,
                    });
                }
            }
        }
    }, [formData.budget_id, allBudgets, formData.date]);

    // Auto-select System Budget based on Priority
    // If priority changes to 'wants', try to find a budget named 'Wants'
    useEffect(() => {
        // Prevent auto-switching when editing an existing transaction unless the user actually changes the priority.
        if (initialTransaction && 
            formData.customBudgetId === initialTransaction.customBudgetId && 
            formData.financial_priority === (initialTransaction.financial_priority || '')) {
            return;
        }

        if (formData.financial_priority && allBudgets.length > 0) {
            // Find a matching system budget (case-insensitive)
            const matchingSystemBudget = allBudgets.find(b =>
                b.isSystemBudget &&
                b.name.toLowerCase() === formData.financial_priority.toLowerCase()
            );

            if (matchingSystemBudget) {
                // Only auto-switch if we currently have NO budget selected, 
                // or if the currently selected budget is also a system budget.
                // We don't want to kick the user out of a specific custom budget (e.g., "Trip 2025").
                const currentBudget = allBudgets.find(b => b.id === formData.customBudgetId);
                const canAutoSwitch = !formData.customBudgetId || (currentBudget && currentBudget.isSystemBudget);

                if (canAutoSwitch) {
                    setFormData(prev => ({ ...prev, customBudgetId: matchingSystemBudget.id }));
                }
            }
        }
    }, [formData.financial_priority, allBudgets]);

    // Filter budgets to show active + planned statuses + relevant completed budgets
    // This allows linking expenses to future/past budgets while keeping the list manageable
    const smartSortedBudgets = useMemo(() => {
        const userRealNow = startOfDay(new Date()); // User's actual current life date
        const currentPriority = (formData.financial_priority || '').toLowerCase();

        // 1. Intelligent Filtering
        const relevantBudgets = allBudgets.filter(b => {
            if (b.isSystemBudget) {
                // RULE: Never show Savings System Budgets (user preference)
                if (b.systemBudgetType === 'savings' || b.name.toLowerCase().includes('savings')) return false;

                // RULE: If priority is NOT 'needs', don't show Needs System Budget
                if (currentPriority !== 'needs' && b.systemBudgetType === 'needs') return false;

                // Only show system budgets relevant to the Transaction Date (otherwise list is huge)
                return isDateInRange(formData.date, b.startDate, b.endDate);
            }

            // Custom Budgets: Keep them all available for search, 
            // but we will prioritize them in the sort.
            return true;
        });

        // 2. Proximity Scoring & Sorting
        return relevantBudgets.map(b => {
            // Calculate distance from Real Life Today to Budget Start
            // This helps surface the budget that is happening NOW or SOON
            const startDate = parseISO(b.startDate);
            const distanceToNow = Math.abs(differenceInDays(userRealNow, startDate));
            
            return { ...b, distanceToNow };
        }).sort((a, b) => {
            // Always float the currently selected budget to the top if editing
            if (a.id === formData.customBudgetId) return -1;
            if (b.id === formData.customBudgetId) return 1;

            // System budgets for the current priority usually go first
            if (a.isSystemBudget && !b.isSystemBudget) return -1;
            if (!a.isSystemBudget && b.isSystemBudget) return 1;

            // Sort by proximity to user's real today
            return a.distanceToNow - b.distanceToNow;
        });
    }, [allBudgets, formData.date, formData.financial_priority, formData.customBudgetId]);

    // 3. View Limiter
    // If searching, show ALL matches. If not searching, show only top 5 recommended.
    const visibleOptions = useMemo(() => {
        if (budgetSearchTerm && budgetSearchTerm.length > 0) {
            return smartSortedBudgets.filter(b => 
                b.name.toLowerCase().includes(budgetSearchTerm.toLowerCase())
            );
        }
        return smartSortedBudgets.slice(0, 5);
    }, [smartSortedBudgets, budgetSearchTerm]);


    // Calculate available cash balance dynamically
    const availableBalance = (() => {
        if (!formData.isCashExpense) return 0;

        const currency = formData.originalCurrency;

        if (formData.customBudgetId) {
            // Get remaining allocated cash for the selected budget and currency
            const selectedBudget = allBudgets.find(b => b.id === formData.customBudgetId);
            if (selectedBudget && !selectedBudget.isSystemBudget) {
                return getRemainingAllocatedCash(selectedBudget, transactions, currency);
            }
        }

        // Get total cash wallet balance for the selected currency
        return getCurrencyBalance(cashWallet, currency);
    })();

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

        // Validation: Budget is required for expenses
        if (formData.type === 'expense' && !formData.customBudgetId) {
            setValidationError("Please select a budget for this expense.");
            return;
        }

        // Check if sufficient cash for cash expenses
        if (formData.isCashExpense && originalAmount > availableBalance) {
            setValidationError(
                formData.customBudgetId
                    ? "You don't have enough allocated cash in this budget for this expense."
                    : "You don't have enough cash in your wallet for this expense."
            );
            return;
        }

        let finalAmount = originalAmount;
        let exchangeRateUsed = null;

        // Perform currency conversion if needed
        if (isForeignCurrency && !formData.isCashExpense) {
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

                // Re-fetch rates from updated data (or result)
                // Note: refreshRates invalidates query, so exchangeRates prop might not update immediately in this closure.
                // However, we can use the result if needed, but getRateForDate relies on the list.
                // For safety, we might need to rely on the fact that queryClient invalidation triggers re-render, 
                // but we are in an async function. 
                // Better approach: If result.rates is available, use it temporarily, or wait for re-render (which we can't do easily here).
                // Actually, since we await refreshRates, and it invalidates, the prop *won't* update in this function scope.
                // We should probably trust that if success=true, the rate is either in DB or we can proceed.
                // Let's try to grab it again from the hook if possible, or just fail gracefully if still missing?
                // A better way is to pass the new rates back from refreshRates, but let's assume the user might need to click submit again 
                // if the prop doesn't update fast enough? No, that's bad UX.
                // Let's just proceed. If it was a hard fetch, we might need to rely on the user clicking again?
                // Wait, refreshRates returns the rates! We can use that.

                // But getRateForDate expects the full list.
                // Let's just show a message "Rates updated. Please click Save again."? 
                // Or better: we can't easily update the `exchangeRates` variable here.
                // Let's try to proceed, but if missing, warn.

                // Actually, if we just fetched, we can assume it's there for the NEXT render.
                // But we want to submit NOW.
                // Let's block and ask user to click again? "Rates fetched! Please review and click Save."
                setValidationError("Exchange rates updated. Please review the rate and click Save again.");
                return;
            }

            if (!sourceRate || !targetRate) {
                // If still missing (e.g. historical skipped, or fetch failed silently), warn.
                if (!formData.isPaid) {
                    setValidationError("Exchange rate is missing. Please fetch rates manually or mark as paid.");
                    return;
                }
                // If isPaid, we don't strictly need a rate for the *amount* (we assume user entered final), 
                // BUT we might want it for stats. For now, let's allow it if isPaid (logic below handles finalAmount).
            }

            if (sourceRate && targetRate) {
                const conversion = calculateConvertedAmount(
                    originalAmount,
                    formData.originalCurrency,
                    settings?.baseCurrency || 'USD',
                    { sourceToUSD: sourceRate, targetToUSD: targetRate }
                );

                finalAmount = conversion.convertedAmount;
                exchangeRateUsed = conversion.exchangeRateUsed;
            }
        } else if (formData.isCashExpense && isForeignCurrency) {
            // For cash expenses in foreign currency, convert to base currency
            const sourceRate = getRateForDate(exchangeRates, formData.originalCurrency, formData.date);
            const targetRate = getRateForDate(exchangeRates, settings?.baseCurrency || 'USD', formData.date);

            if (sourceRate && targetRate) {
                const conversion = calculateConvertedAmount(
                    originalAmount,
                    formData.originalCurrency,
                    settings?.baseCurrency || 'USD',
                    { sourceToUSD: sourceRate, targetToUSD: targetRate }
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
            submitData.customBudgetId = formData.customBudgetId || null;
            submitData.isCashTransaction = formData.isCashExpense;
            submitData.cashTransactionType = formData.isCashExpense ? 'expense_from_wallet' : null;
            submitData.cashAmount = formData.isCashExpense ? originalAmount : null;
            submitData.cashCurrency = formData.isCashExpense ? formData.originalCurrency : null;
        } else {
            submitData.isPaid = false;
            submitData.paidDate = null;
            submitData.category_id = null;
            submitData.customBudgetId = null;
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
                    {isForeignCurrency && !formData.isCashExpense && (
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
                        {formData.isCashExpense && (
                            <span className="text-xs text-gray-500">
                                (Available: {selectedCurrencySymbol}{availableBalance.toFixed(2)})
                            </span>
                        )}
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
                            <Select
                                value={formData.financial_priority || ''}
                                onValueChange={(value) => setFormData({ ...formData, financial_priority: value || '' })}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Select priority" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="needs">Needs</SelectItem>
                                    <SelectItem value="wants">Wants</SelectItem>
                                    <SelectItem value="savings">Savings</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                    {/* Budget (REQUIRED for expenses) */}
                    <div className="space-y-2">
                        <Label htmlFor="customBudget">Budget Allocation</Label>
                        <Popover open={isBudgetOpen} onOpenChange={setIsBudgetOpen}>
                           <PopoverTrigger asChild>
                                <CustomButton
                                    variant="outline"
                                    role="combobox"
                                    aria-expanded={isBudgetOpen}
                                    className="w-full justify-between font-normal"
                                >
                                    {formData.customBudgetId
                                        ? allBudgets.find((b) => b.id === formData.customBudgetId)?.name
                                        : "Select budget..."}
                                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                </CustomButton>
                            </PopoverTrigger>
                            <PopoverContent className="w-[300px] p-0" align="start">
                                <Command shouldFilter={false}>
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
                                                        setFormData({ ...formData, customBudgetId: budget.id });
                                                        setIsBudgetOpen(false);
                                                    }}
                                                >
                                                    <Check
                                                        className={`mr-2 h-4 w-4 ${formData.customBudgetId === budget.id ? "opacity-100" : "opacity-0"}`}
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

