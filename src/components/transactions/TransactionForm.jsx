
import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { X } from "lucide-react";
import { motion } from "framer-motion";
import { useSettings } from "../utils/SettingsContext";
import { useAllBudgets } from "../hooks/useBase44Entities";
import AmountInput from "../ui/AmountInput";
import DatePicker from "../ui/DatePicker";
import CategorySelect from "../ui/CategorySelect";
import { formatDateString } from "../utils/budgetCalculations";

export default function TransactionForm({ transaction, categories, onSubmit, onCancel, isSubmitting }) {
  const { user } = useSettings();
  
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
    notes: ''
  });

  useEffect(() => {
    if (transaction) {
      setFormData({
        title: transaction.title || '',
        amount: transaction.amount?.toString() || '',
        type: transaction.type || 'expense',
        category_id: transaction.category_id || '',
        date: transaction.date || formatDateString(new Date()),
        isPaid: transaction.type === 'expense' ? (transaction.isPaid || false) : false,
        paidDate: transaction.paidDate || '',
        customBudgetId: transaction.customBudgetId || '',
        notes: transaction.notes || ''
      });
    }
  }, [transaction]);

  const handleSubmit = (e) => {
    e.preventDefault();
    const submitData = {
      ...formData,
      amount: parseFloat(formData.amount)
    };
    
    if (formData.type === 'expense') {
      submitData.paidDate = formData.isPaid ? (formData.paidDate || formData.date) : null;
      submitData.customBudgetId = formData.customBudgetId || null;
    } else {
      delete submitData.isPaid;
      delete submitData.paidDate;
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
                <Label htmlFor="amount">Amount *</Label>
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
                <Label htmlFor="type">Type *</Label>
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
