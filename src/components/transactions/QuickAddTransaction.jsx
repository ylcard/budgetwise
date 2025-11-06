import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import AmountInput from "../ui/AmountInput";
import DatePicker from "../ui/DatePicker";
import CategorySelect from "../ui/CategorySelect";
import { formatDateString, normalizeAmount } from "../utils/budgetCalculations";

export default function QuickAddTransaction({ 
  open, 
  onOpenChange, 
  categories, 
  customBudgets, 
  defaultCustomBudgetId = '', 
  onSubmit, 
  isSubmitting 
}) {
  const [formData, setFormData] = useState({
    title: '',
    amount: '',
    type: 'expense',
    category_id: '',
    date: formatDateString(new Date()),
    isPaid: false,
    paidDate: '',
    customBudgetId: defaultCustomBudgetId || ''
  });

  useEffect(() => {
    if (defaultCustomBudgetId) {
      setFormData(prev => ({ ...prev, customBudgetId: defaultCustomBudgetId }));
    }
  }, [defaultCustomBudgetId]);

  const handleSubmit = (e) => {
    e.preventDefault();
    const normalizedAmount = normalizeAmount(formData.amount);
    
    onSubmit({
      ...formData,
      amount: parseFloat(normalizedAmount),
      paidDate: formData.isPaid ? (formData.paidDate || formData.date) : null,
      customBudgetId: formData.customBudgetId || null
    });
    
    setFormData({
      title: '',
      amount: '',
      type: 'expense',
      category_id: '',
      date: formatDateString(new Date()),
      isPaid: false,
      paidDate: '',
      customBudgetId: defaultCustomBudgetId || ''
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Quick Add Expense</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">What did you spend on? *</Label>
            <Input
              id="title"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="e.g., Coffee, Concert ticket"
              required
              autoFocus
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
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
                placeholder="Pick a date"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="category">Category</Label>
            <CategorySelect
              value={formData.category_id}
              onValueChange={(value) => setFormData({ ...formData, category_id: value })}
              categories={categories}
            />
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox
              id="isPaid"
              checked={formData.isPaid}
              onCheckedChange={(checked) => setFormData({ 
                ...formData, 
                isPaid: checked,
                paidDate: checked ? formData.date : ''
              })}
            />
            <Label htmlFor="isPaid" className="cursor-pointer">
              Already paid
            </Label>
          </div>

          {formData.isPaid && (
            <div className="space-y-2">
              <Label htmlFor="paidDate">Payment Date</Label>
              <DatePicker
                value={formData.paidDate || formData.date}
                onChange={(value) => setFormData({ ...formData, paidDate: value })}
                placeholder="Pick payment date"
              />
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="customBudget">Budget</Label>
            <Select
              value={formData.customBudgetId || ''}
              onValueChange={(value) => setFormData({ ...formData, customBudgetId: value || '' })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select budget (optional)" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={null}>None</SelectItem>
                {customBudgets.map((budget) => (
                  <SelectItem key={budget.id} value={budget.id}>
                    {budget.isSystemBudget && <span className="text-blue-600 mr-1">★</span>}
                    {budget.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting}
              className="bg-gradient-to-r from-blue-600 to-purple-600"
            >
              {isSubmitting ? 'Adding...' : 'Add Expense'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}