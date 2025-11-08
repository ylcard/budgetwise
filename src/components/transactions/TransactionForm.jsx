import React, { useState, useEffect, useMemo, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { X, RefreshCw, RotateCcw } from "lucide-react";
import { motion } from "framer-motion";
import { useToast } from "@/components/ui/use-toast";
import { useSettings } from "../utils/SettingsContext";
import { useAllBudgets } from "../hooks/useBase44Entities";
import { useCurrencyRefresh } from "../hooks/useCurrencyRefresh";
import { convertCurrency } from "../utils/currencyConversion";
import AmountInput from "../ui/AmountInput";
import DatePicker from "../ui/DatePicker";
import CategorySelect from "../ui/CategorySelect";
import CurrencySelect from "../ui/CurrencySelect";
import { formatDateString } from "../utils/budgetCalculations";

export default function TransactionForm({ transaction, categories, onSubmit, onCancel, isSubmitting }) {
  const { user, settings, isLoading: settingsLoading } = useSettings();
  const { toast } = useToast();
  const { isRefreshing, refreshRates } = useCurrencyRefresh(user);
  
  // Use the extracted hook for fetching budgets
  const { allBudgets } = useAllBudgets(user);

  const [formData, setFormData] = useState({
    title: '',
    amount: '',
    type: 'expense',
    category_id: '',
    date: formatDateString(new Date()),
    isPaid: false,
    paidDate: '',
    customBudgetId: '',
    notes: '',
    originalCurrency: null // Start as null until settings load
  });

  // Initialize form data when editing an existing transaction
  useEffect(() => {
    if (transaction) {
      setFormData({
        title: transaction.title || '',
        amount: transaction.originalAmount?.toString() || transaction.amount?.toString() || '',
        type: transaction.type || 'expense',
        category_id: transaction.category_id || '',
        date: transaction.date || formatDateString(new Date()),
        isPaid: transaction.type === 'expense' ? (transaction.isPaid || false) : false,
        paidDate: transaction.paidDate || '',
        customBudgetId: transaction.customBudgetId || '',
        notes: transaction.notes || '',
        originalCurrency: transaction.originalCurrency || settings.currencyCode || null
      });
    }
  }, [transaction, settings.currencyCode]);

  // Initialize originalCurrency only after settings are loaded (for new transactions)
  useEffect(() => {
    if (!transaction && !settingsLoading && settings.currencyCode && formData.originalCurrency === null) {
      setFormData(prev => ({ ...prev, originalCurrency: settings.currencyCode }));
    }
  }, [transaction, settingsLoading, settings.currencyCode, formData.originalCurrency]);

  const isForeignCurrency = useMemo(() => {
    // Don't show foreign currency UI if settings are still loading or currency not set
    if (settingsLoading || !settings.currencyCode || !formData.originalCurrency) {
      return false;
    }
    return formData.type === 'expense' && formData.originalCurrency !== settings.currencyCode;
  }, [formData.type, formData.originalCurrency, settings.currencyCode, settingsLoading]);

  const handleResetCurrency = useCallback(() => {
    setFormData(prev => ({ ...prev, originalCurrency: settings.currencyCode }));
  }, [settings.currencyCode]);

  const handleRefreshRates = useCallback(async () => {
    if (!user) return;
    
    const result = await refreshRates(
      formData.date,
      settings.currencyCode,
      formData.originalCurrency
    );
    
    toast({
      title: result.success ? "Success" : "Error",
      description: result.message,
      variant: result.success ? "default" : "destructive"
    });
  }, [user, formData.date, formData.originalCurrency, settings.currencyCode, refreshRates, toast]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    console.log('Form submission - settings.currencyCode:', settings.currencyCode);
    console.log('Form submission - formData.originalCurrency:', formData.originalCurrency);
    console.log('Form submission - isForeignCurrency:', isForeignCurrency);
    
    const inputAmount = parseFloat(formData.amount);
    
    let finalAmount = inputAmount;
    let exchangeRateUsed = null;
    let originalCurrency = null;
    let originalAmountValue = null;

    // Convert currency if needed for expenses - comparing form currency to user's base currency
    if (isForeignCurrency) {
      try {
        console.log(`Converting ${inputAmount} from ${formData.originalCurrency} to ${settings.currencyCode}`);
        
        const { convertedAmount, exchangeRate } = await convertCurrency(
          inputAmount,
          formData.originalCurrency,
          settings.currencyCode,
          formData.date
        );
        
        console.log(`Conversion result: ${convertedAmount} ${settings.currencyCode} (rate: ${exchangeRate})`);
        
        finalAmount = convertedAmount;
        exchangeRateUsed = exchangeRate;
        originalCurrency = formData.originalCurrency;
        originalAmountValue = inputAmount;
      } catch (error) {
        console.error('Conversion error:', error);
        toast({
          title: "Conversion Error",
          description: "Please refresh exchange rates for this date and currency before submitting.",
          variant: "destructive"
        });
        return;
      }
    } else {
      console.log(`No conversion needed - amount is already in base currency (${settings.currencyCode})`);
    }

    const submitData = {
      title: formData.title,
      amount: finalAmount,
      type: formData.type,
      category_id: formData.category_id,
      date: formData.date,
      notes: formData.notes,
      originalAmount: originalAmountValue,
      originalCurrency: originalCurrency,
      exchangeRateUsed: exchangeRateUsed
    };
    
    if (formData.type === 'expense') {
      submitData.paidDate = formData.isPaid ? (formData.paidDate || formData.date) : null;
      submitData.isPaid = formData.isPaid;
      submitData.customBudgetId = formData.customBudgetId || null;
    } else {
      submitData.isPaid = false;
      submitData.paidDate = null;
      submitData.category_id = null;
      submitData.customBudgetId = null;
      submitData.originalAmount = null;
      submitData.originalCurrency = null;
      submitData.exchangeRateUsed = null;
    }
    
    console.log('Final submit data:', submitData);
    onSubmit(submitData);
  };

  // Show loading state while settings are being fetched
  if (settingsLoading || (!transaction && formData.originalCurrency === null)) {
    return (
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
      >
        <Card className="border-none shadow-lg">
          <CardContent className="p-12">
            <div className="text-center">
              <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
              <p className="text-gray-500">Loading settings...</p>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
    >
      <Card className="border-none shadow-lg">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>{transaction ? 'Edit' : 'Add'} Transaction</CardTitle>
          <Button variant="ghost" size="icon" onClick={onCancel}>
            <X className="w-4 h-4" />
          </Button>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="title">Title *</Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="e.g., Salary, Rent, Groceries"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="type">Type *</Label>
                <Select
                  value={formData.type}
                  onValueChange={(value) => setFormData({ 
                    ...formData, 
                    type: value,
                    category_id: value === 'income' ? '' : formData.category_id,
                    customBudgetId: value === 'income' ? '' : formData.customBudgetId,
                    isPaid: value === 'income' ? false : formData.isPaid,
                    paidDate: value === 'income' ? '' : formData.paidDate,
                    originalCurrency: value === 'income' ? settings.currencyCode : formData.originalCurrency
                  })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="income">Income</SelectItem>
                    <SelectItem value="expense">Expense</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {formData.type === 'expense' && (
              <div className="space-y-2">
                <Label htmlFor="currency">Currency *</Label>
                <div className="flex gap-2">
                  <div className="flex-1">
                    <CurrencySelect
                      value={formData.originalCurrency}
                      onValueChange={(value) => setFormData({ ...formData, originalCurrency: value })}
                    />
                  </div>
                  {isForeignCurrency && (
                    <>
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        onClick={handleResetCurrency}
                        title="Reset to base currency"
                      >
                        <RotateCcw className="w-4 h-4" />
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        onClick={handleRefreshRates}
                        disabled={isRefreshing}
                        title="Refresh exchange rates"
                      >
                        <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
                      </Button>
                    </>
                  )}
                </div>
                {isForeignCurrency && (
                  <p className="text-xs text-gray-500">
                    Amount will be converted to {settings.currencyCode} ({settings.currencySymbol})
                  </p>
                )}
              </div>
            )}

            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="amount">Amount *</Label>
                <AmountInput
                  id="amount"
                  value={formData.amount}
                  onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                  placeholder="0.00"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="date">Date *</Label>
                <DatePicker
                  value={formData.date}
                  onChange={(value) => setFormData({ ...formData, date: value })}
                  placeholder="Select date"
                />
              </div>
            </div>

            {formData.type === 'expense' && (
              <div className="space-y-2">
                <Label htmlFor="category">Category</Label>
                <CategorySelect
                  value={formData.category_id}
                  onValueChange={(value) => setFormData({ ...formData, category_id: value })}
                  categories={categories}
                />
              </div>
            )}

            {formData.type === 'expense' && (
              <div className="space-y-2">
                <Label htmlFor="customBudget">Budget (Optional)</Label>
                <Select
                  value={formData.customBudgetId || ''}
                  onValueChange={(value) => setFormData({ ...formData, customBudgetId: value || '' })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select budget (optional)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={null}>None</SelectItem>
                    {allBudgets.map((budget) => (
                      <SelectItem key={budget.id} value={budget.id}>
                        {budget.isSystemBudget && <span className="text-blue-600 mr-1">★</span>}
                        {budget.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {formData.type === 'expense' && (
              <>
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

                {formData.isPaid && (
                  <div className="space-y-2">
                    <Label htmlFor="paidDate">Payment Date</Label>
                    <DatePicker
                      value={formData.paidDate || formData.date}
                      onChange={(value) => setFormData({ ...formData, paidDate: value })}
                      placeholder="Select payment date"
                    />
                  </div>
                )}
              </>
            )}

            <div className="space-y-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Additional details..."
                rows={3}
              />
            </div>

            <div className="flex justify-end gap-3 pt-4">
              <Button type="button" variant="outline" onClick={onCancel}>
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting}
                className="bg-gradient-to-r from-blue-600 to-purple-600"
              >
                {isSubmitting ? 'Saving...' : transaction ? 'Update' : 'Create'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </motion.div>
  );
}