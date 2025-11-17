import React, { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
// COMMENTED OUT 16-Jan-2025: Replaced with CustomButton for consistency
// import { Button } from "@/components/ui/button";
import { CustomButton } from "@/components/ui/CustomButton";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { RefreshCw, AlertCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/components/ui/use-toast";
import AmountInput from "../ui/AmountInput";
import DatePicker from "../ui/DatePicker";
import CategorySelect from "../ui/CategorySelect";
import CurrencySelect from "../ui/CurrencySelect";
import AnimatePresenceContainer from "../ui/AnimatePresenceContainer";
import { useSettings } from "../utils/SettingsContext";
import { useExchangeRates } from "../hooks/useExchangeRates";
import { getCurrencyBalance, getRemainingAllocatedCash } from "../utils/cashAllocationUtils";
import { getCurrencySymbol } from "../utils/currencyUtils";
import { calculateConvertedAmount, getRateForDate } from "../utils/currencyCalculations";
import SUPPORTED_CURRENCIES from "../utils/constants";
// UPDATED 12-Jan-2025: Changed imports to use dateUtils.js and generalUtils.js
import { formatDateString } from "../utils/dateUtils";
import { normalizeAmount } from "../utils/generalUtils";

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
  const { settings } = useSettings();
  const { toast } = useToast();
  const { exchangeRates, refreshRates, isRefreshing } = useExchangeRates();

  const [formData, setFormData] = useState({
    title: '',
    amount: null,
    originalCurrency: settings?.baseCurrency || 'USD',
    type: 'expense',
    category_id: '',
    date: formatDateString(new Date()),
    isPaid: false,
    paidDate: '',
    customBudgetId: '',
    isCashExpense: false,
    notes: ''
  });

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
  useEffect(() => {
    if (isForeignCurrency && formData.originalCurrency && formData.date && !formData.isCashExpense) {
      refreshRates(
        formData.originalCurrency,
        settings?.baseCurrency || 'USD',
        formData.date
      );
    }
  }, [formData.originalCurrency, formData.date, isForeignCurrency, formData.isCashExpense]);

  // Get currency symbol for the selected currency
  const selectedCurrencySymbol = SUPPORTED_CURRENCIES.find(
    c => c.code === formData.originalCurrency
  )?.symbol || getCurrencySymbol(formData.originalCurrency);

  // ENHANCEMENT (2025-01-11): Filter budgets to show active + planned statuses
  // This allows linking expenses to future/past budgets while keeping the list manageable
  const filteredBudgets = (() => {
    // Filter for active and planned budgets
    let statusFiltered = allBudgets.filter(b => {
      // Include system budgets
      if (b.isSystemBudget) return true;
      // Include active and planned custom budgets
      return b.status === 'active' || b.status === 'planned';
    });
    
    // If editing and the transaction has a budget, ensure it's always in the list
    if (initialTransaction?.customBudgetId) {
      const preSelectedBudget = allBudgets.find(b => b.id === initialTransaction.customBudgetId);
      if (preSelectedBudget && !statusFiltered.find(b => b.id === preSelectedBudget.id)) {
        // Add the pre-selected budget at the beginning
        
        return [preSelectedBudget, ...statusFiltered];
      }
    }
    
    //return statusFiltered;
    const sortedBudgets = [...statusFiltered].sort((a, b) => {
        if (a.isSystemBudget && !b.isSystemBudget) return -1;
        if (!a.isSystemBudget && b.isSystemBudget) return 1;
        return a.name.localeCompare(b.name);
    });
    return sortedBudgets;
  })();

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

  const handleRefreshRates = async () => {
    const result = await refreshRates(
      formData.originalCurrency,
      settings?.baseCurrency || 'USD',
      formData.date
    );

    if (result.success) {
      toast({
        title: result.alreadyFresh ? "Rates Up to Date" : "Success",
        description: result.message,
      });
    } else {
      toast({
        title: "Error",
        description: result.message,
        variant: "destructive",
      });
    }
  };

  const handleSubmit = (e) => {
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
      const sourceRate = getRateForDate(exchangeRates, formData.originalCurrency, formData.date);
      const targetRate = getRateForDate(exchangeRates, settings?.baseCurrency || 'USD', formData.date);

      if (!sourceRate || !targetRate) {
        setValidationError("Exchange rate is missing. Please refresh the exchange rates before submitting.");
        return;
      }

      const conversion = calculateConvertedAmount(
        originalAmount,
        formData.originalCurrency,
        settings?.baseCurrency || 'USD',
        { sourceToUSD: sourceRate, targetToUSD: targetRate }
      );

      finalAmount = conversion.convertedAmount;
      exchangeRateUsed = conversion.exchangeRateUsed;
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
          autoFocus
          autoComplete="off"
        />
      </div>

      {/* Amount and Currency (side by side with proper alignment) */}
      <div className="flex gap-4 items-end">
        <div className="flex-1 space-y-2">
          <Label htmlFor="amount">Amount</Label>
          <AmountInput
            id="amount"
            value={formData.amount}
            onChange={(value) => setFormData({ ...formData, amount: value })}
            placeholder="0.00"
            currencySymbol={selectedCurrencySymbol}
            required
          />
        </div>

        <div className="flex-1 space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="currency">Currency</Label>
            {isForeignCurrency && !formData.isCashExpense && (
              <CustomButton
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleRefreshRates}
                disabled={isRefreshing}
                className="h-6 px-2 text-blue-600 hover:text-blue-700"
              >
                <RefreshCw className={`w-3 h-3 ${isRefreshing ? 'animate-spin' : ''}`} />
              </CustomButton>
            )}
          </div>
          <CurrencySelect
            value={formData.originalCurrency}
            onValueChange={(value) => setFormData({ ...formData, originalCurrency: value })}
          />
        </div>
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

      {/* Category and Budget (side by side) */}
      {formData.type === 'expense' && (
        <div className="grid md:grid-cols-2 gap-4">
          {/* Category */}
          <div className="space-y-2">
            <Label htmlFor="category">Category</Label>
            <CategorySelect
              value={formData.category_id}
              onValueChange={(value) => setFormData({ ...formData, category_id: value })}
              categories={categories}
            />
          </div>

          {/* Budget (REQUIRED for expenses) */}
          <div className="space-y-2">
            <Label htmlFor="customBudget">Budget</Label>
            <Select
              value={formData.customBudgetId || ''}
              onValueChange={(value) => setFormData({ ...formData, customBudgetId: value || '' })}
              required
            >
              <SelectTrigger>
                <SelectValue placeholder="Select a budget" />
              </SelectTrigger>
              <SelectContent>
                {filteredBudgets.map((budget) => (
                  <SelectItem key={budget.id} value={budget.id}>
                    {budget.isSystemBudget && <span className="text-blue-600 mr-1">★</span>}
                    {budget.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
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
          {isSubmitting ? 'Saving...' : initialTransaction ? 'Update' : 'Add'}
        </CustomButton>
      </div>
    </form>
  );
}

// ENHANCEMENT (2025-01-11): Updated budget filtering to show active + planned budgets
// Removed date-based filtering (filterBudgetsByTransactionDate) in favor of status-based filtering
// This allows users to link transactions to future events (planned budgets) or current events (active budgets)
// Pre-selected budget for editing is always included regardless of status
// UPDATED 12-Jan-2025: Changed imports to use dateUtils.js and generalUtils.js instead of budgetCalculations.js
// UPDATED 16-Jan-2025: Replaced Button with CustomButton for form actions
// - Cancel button uses variant="outline"
// - Submit button uses variant="primary" (gradient blue-purple)
// - Refresh rates button uses variant="ghost" size="sm"
// ADDED 17-Jan-2025: Disabled browser autocomplete for transaction title input
// - Added autoComplete="off" to prevent browser from showing history of previous transaction titles
// - Addresses unwanted autocomplete suggestions when entering transaction details