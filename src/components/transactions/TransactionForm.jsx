import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { X, RefreshCw } from "lucide-react";
import { motion } from "framer-motion";
import { useToast } from "@/components/ui/use-toast";
import { useSettings } from "../utils/SettingsContext";
import { useAllBudgets } from "../hooks/useBase44Entities";
import { useExchangeRates } from "../hooks/useExchangeRates";
import { calculateConvertedAmount, getRateForDate } from "../utils/currencyCalculations";
import { formatDateString, normalizeAmount } from "../utils/budgetCalculations";
import AmountInput from "../ui/AmountInput";
import DatePicker from "../ui/DatePicker";
import CategorySelect from "../ui/CategorySelect";
import CurrencySelect from "../ui/CurrencySelect";

export default function TransactionForm({ transaction, categories, onSubmit, onCancel, isSubmitting }) {
  const { user, settings } = useSettings();
  const { toast } = useToast();
  const { exchangeRates, refreshRates, isRefreshing } = useExchangeRates();
  
  // Use the extracted hook for fetching budgets
  const { allBudgets } = useAllBudgets(user);

  const [formData, setFormData] = useState({
    title: '',
    amount: '',
    originalCurrency: settings.baseCurrency || 'USD',
    type: 'expense',
    category_id: '',
    date: formatDateString(new Date()),
    isPaid: false,
    paidDate: '',
    customBudgetId: '',
    notes: ''
  });

  useEffect(() => {
    if (transaction) {
      setFormData({
        title: transaction.title || '',
        amount: transaction.originalAmount?.toString() || transaction.amount?.toString() || '',
        originalCurrency: transaction.originalCurrency || settings.baseCurrency || 'USD',
        type: transaction.type || 'expense',
        category_id: transaction.category_id || '',
        date: transaction.date || formatDateString(new Date()),
        isPaid: transaction.type === 'expense' ? (transaction.isPaid || false) : false,
        paidDate: transaction.paidDate || '',
        customBudgetId: transaction.customBudgetId || '',
        notes: transaction.notes || ''
      });
    }
  }, [transaction, settings.baseCurrency]);

  const isForeignCurrency = formData.originalCurrency !== (settings.baseCurrency || 'USD');

  const handleRefreshRates = async () => {
    const result = await refreshRates(
      formData.originalCurrency,
      settings.baseCurrency || 'USD',
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
    const normalizedAmount = normalizeAmount(formData.amount);
    const originalAmount = parseFloat(normalizedAmount);
    
    let finalAmount = originalAmount;
    let exchangeRateUsed = null;

    // Perform currency conversion if needed
    if (isForeignCurrency) {
      const sourceRate = getRateForDate(exchangeRates, formData.originalCurrency, formData.date);
      const targetRate = getRateForDate(exchangeRates, settings.baseCurrency || 'USD', formData.date);

      if (!sourceRate || !targetRate) {
        toast({
          title: "Exchange Rate Missing",
          description: "Please refresh the exchange rates before submitting.",
          variant: "destructive",
        });
        return;
      }

      const conversion = calculateConvertedAmount(
        originalAmount,
        formData.originalCurrency,
        settings.baseCurrency || 'USD',
        { sourceToUSD: sourceRate, targetToUSD: targetRate }
      );

      finalAmount = conversion.convertedAmount;
      exchangeRateUsed = conversion.exchangeRateUsed;
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
      submitData.isPaid = formData.isPaid;
      submitData.paidDate = formData.isPaid ? (formData.paidDate || formData.date) : null;
      submitData.customBudgetId = formData.customBudgetId || null;
    } else {
      submitData.isPaid = false;
      submitData.paidDate = null;
      submitData.category_id = null;
      submitData.customBudgetId = null;
    }
    
    onSubmit(submitData);
  };

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
                <Label htmlFor="title">Title</Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="e.g., Salary, Rent, Groceries"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="amount">Amount</Label>
                <AmountInput
                  id="amount"
                  value={formData.amount}
                  onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                  placeholder="0.00"
                  required
                />
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="type">Type</Label>
                <Select
                  value={formData.type}
                  onValueChange={(value) => setFormData({ 
                    ...formData, 
                    type: value,
                    category_id: value === 'income' ? '' : formData.category_id,
                    customBudgetId: value === 'income' ? '' : formData.customBudgetId,
                    isPaid: value === 'income' ? false : formData.isPaid,
                    paidDate: value === 'income' ? '' : formData.paidDate
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

              <div className="space-y-2">
                <Label htmlFor="date">Date</Label>
                <DatePicker
                  value={formData.date}
                  onChange={(value) => setFormData({ ...formData, date: value })}
                  placeholder="Select date"
                />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="currency">Currency</Label>
                {isForeignCurrency && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={handleRefreshRates}
                    disabled={isRefreshing}
                    className="h-8 px-2 text-blue-600 hover:text-blue-700"
                  >
                    <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
                  </Button>
                )}
              </div>
              <CurrencySelect
                value={formData.originalCurrency}
                onValueChange={(value) => setFormData({ ...formData, originalCurrency: value })}
              />
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