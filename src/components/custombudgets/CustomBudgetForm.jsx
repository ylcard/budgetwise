import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { X, Plus, Trash2, AlertCircle } from "lucide-react";
import { motion } from "framer-motion";
import AmountInput from "../ui/AmountInput";
import DatePicker from "../ui/DatePicker";
import CurrencySelect from "../ui/CurrencySelect";
import { PRESET_COLORS } from "../utils/constants";
import { normalizeAmount } from "../utils/budgetCalculations";
import { getCurrencyBalance, validateCashAllocations } from "../utils/cashAllocationUtils";
import { formatCurrency } from "../utils/formatCurrency";
import { SUPPORTED_CURRENCIES } from "../utils/currencyCalculations";
import { usePeriod } from "../hooks/usePeriod";
import { Alert, AlertDescription } from "@/components/ui/alert";

export default function CustomBudgetForm({ 
  budget, 
  onSubmit, 
  onCancel, 
  isSubmitting, 
  isQuickAdd = false,
  cashWallet,
  baseCurrency,
  settings
}) {
  const { monthStart, monthEnd } = usePeriod();

  const [formData, setFormData] = useState({
    name: '',
    allocatedAmount: '',
    cashAllocations: [],
    startDate: monthStart,
    endDate: monthEnd,
    description: '',
    color: '#3B82F6'
  });

  const [validationError, setValidationError] = useState(null);

  useEffect(() => {
    if (budget) {
      setFormData({
        name: budget.name || '',
        allocatedAmount: budget.allocatedAmount?.toString() || '',
        cashAllocations: budget.cashAllocations || [],
        startDate: budget.startDate || monthStart,
        endDate: budget.endDate || monthEnd,
        description: budget.description || '',
        color: budget.color || '#3B82F6'
      });
    } else {
      setFormData(prev => ({
        ...prev,
        startDate: monthStart,
        endDate: monthEnd,
        cashAllocations: []
      }));
    }
  }, [budget, monthStart, monthEnd]);

  const handleAddCashAllocation = () => {
    setFormData(prev => ({
      ...prev,
      cashAllocations: [
        ...prev.cashAllocations,
        { currencyCode: baseCurrency || 'USD', amount: '' }
      ]
    }));
  };

  const handleRemoveCashAllocation = (index) => {
    setFormData(prev => ({
      ...prev,
      cashAllocations: prev.cashAllocations.filter((_, i) => i !== index)
    }));
  };

  const handleCashAllocationChange = (index, field, value) => {
    setFormData(prev => ({
      ...prev,
      cashAllocations: prev.cashAllocations.map((alloc, i) =>
        i === index ? { ...alloc, [field]: value } : alloc
      )
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setValidationError(null);

    const normalizedAmount = normalizeAmount(formData.allocatedAmount);
    
    // Process cash allocations
    const processedCashAllocations = formData.cashAllocations
      .map(alloc => ({
        currencyCode: alloc.currencyCode,
        amount: parseFloat(normalizeAmount(alloc.amount || '0'))
      }))
      .filter(alloc => alloc.amount > 0);

    // Validate cash allocations against wallet balance
    const validation = validateCashAllocations(
      cashWallet,
      processedCashAllocations,
      baseCurrency
    );

    if (!validation.valid) {
      const errorMessages = validation.errors.map(err => 
        `${err.currency}: Requested ${err.requested.toFixed(2)}, Available ${err.available.toFixed(2)}`
      ).join('; ');
      setValidationError(`Insufficient balance: ${errorMessages}`);
      return;
    }
    
    onSubmit({
      ...formData,
      allocatedAmount: parseFloat(normalizedAmount),
      cashAllocations: processedCashAllocations,
      status: budget?.status || 'active'
    });
  };

  const getCurrencySymbol = (currencyCode) => {
    const currency = SUPPORTED_CURRENCIES.find(c => c.code === currencyCode);
    return currency?.symbol || currencyCode;
  };

  const content = (
    <form onSubmit={handleSubmit} className="space-y-4">
      {validationError && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{validationError}</AlertDescription>
        </Alert>
      )}

      <div className="grid md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="name">{isQuickAdd ? 'Budget Name' : 'Event Name'}</Label>
          <Input
            id="name"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            placeholder={isQuickAdd ? "e.g., Manchester Trip" : "e.g., Manchester Trip, Berlin Concert"}
            required
            autoFocus={isQuickAdd}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="allocatedAmount">Card/Bank Budget</Label>
          <AmountInput
            id="allocatedAmount"
            value={formData.allocatedAmount}
            onChange={(e) => setFormData({ ...formData, allocatedAmount: e.target.value })}
            placeholder="0.00"
            required
          />
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label>Cash Allocations (Optional)</Label>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleAddCashAllocation}
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Currency
          </Button>
        </div>
        
        {formData.cashAllocations.length > 0 && (
          <div className="space-y-2 p-3 bg-gray-50 rounded-lg">
            {formData.cashAllocations.map((alloc, index) => {
              const available = getCurrencyBalance(cashWallet, alloc.currencyCode);
              return (
                <div key={index} className="grid grid-cols-[1fr_1fr_auto] gap-2 items-end">
                  <div className="space-y-1">
                    <Label className="text-xs">Currency</Label>
                    <CurrencySelect
                      value={alloc.currencyCode}
                      onValueChange={(value) => 
                        handleCashAllocationChange(index, 'currencyCode', value)
                      }
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs flex items-center justify-between">
                      <span>Amount</span>
                      <span className="text-gray-500">
                        Available: {settings ? formatCurrency(available, { ...settings, currencySymbol: getCurrencySymbol(alloc.currencyCode) }) : `${getCurrencySymbol(alloc.currencyCode)}${available.toFixed(2)}`}
                      </span>
                    </Label>
                    <AmountInput
                      value={alloc.amount}
                      onChange={(e) => 
                        handleCashAllocationChange(index, 'amount', e.target.value)
                      }
                      placeholder="0.00"
                      currencySymbol={getCurrencySymbol(alloc.currencyCode)}
                    />
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => handleRemoveCashAllocation(index)}
                    className="flex-shrink-0"
                  >
                    <Trash2 className="w-4 h-4 text-red-600" />
                  </Button>
                </div>
              );
            })}
          </div>
        )}
        
        <p className="text-xs text-gray-500">
          Allocate physical cash from your wallet to this budget
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="startDate">Start Date</Label>
          <DatePicker
            id="startDate"
            value={formData.startDate}
            onChange={(value) => setFormData({ ...formData, startDate: value })}
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="endDate">End Date</Label>
          <DatePicker
            id="endDate"
            value={formData.endDate}
            onChange={(value) => setFormData({ ...formData, endDate: value })}
            required
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label>Color</Label>
        <div className="flex gap-2 flex-wrap">
          {PRESET_COLORS.map((color) => (
            <button
              key={color}
              type="button"
              onClick={() => setFormData({ ...formData, color })}
              className={`w-10 h-10 rounded-lg border-2 transition-all hover:scale-110 ${
                formData.color === color ? 'border-gray-900 ring-2 ring-offset-2 ring-gray-900' : 'border-transparent'
              }`}
              style={{ backgroundColor: color }}
            />
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">Description</Label>
        <Textarea
          id="description"
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          placeholder="Add details about this budget..."
          rows={isQuickAdd ? 2 : 3}
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
          {isSubmitting ? 'Saving...' : budget ? 'Update' : isQuickAdd ? 'Create Budget' : 'Create'}
        </Button>
      </div>
    </form>
  );

  if (isQuickAdd) {
    return content;
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
    >
      <Card className="border-none shadow-lg">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>{budget ? 'Edit' : 'Create'} Custom Budget</CardTitle>
          <Button variant="ghost" size="icon" onClick={onCancel}>
            <X className="w-4 h-4" />
          </Button>
        </CardHeader>
        <CardContent>
          {content}
        </CardContent>
      </Card>
    </motion.div>
  );
}