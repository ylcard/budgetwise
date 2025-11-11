import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import AmountInput from "../ui/AmountInput";
import DatePicker from "../ui/DatePicker";
// UPDATED 12-Jan-2025: Changed imports to use dateUtils.js and generalUtils.js
import { formatDateString } from "../utils/dateUtils";
import { normalizeAmount } from "../utils/generalUtils";

export default function QuickAddIncome({ 
  open, 
  onOpenChange, 
  onSubmit, 
  isSubmitting 
}) {
  const [formData, setFormData] = useState({
    title: '',
    amount: '',
    type: 'income',
    date: formatDateString(new Date())
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    const normalizedAmount = normalizeAmount(formData.amount);
    
    onSubmit({
      ...formData,
      amount: parseFloat(normalizedAmount)
    });
    
    // Reset form
    setFormData({
      title: '',
      amount: '',
      type: 'income',
      date: formatDateString(new Date())
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Quick Add Income</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">Income Source</Label>
            <Input
              id="title"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="e.g., Salary, Freelance Project"
              required
              autoFocus
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
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

            <div className="space-y-2">
              <Label htmlFor="date">Date</Label>
              <DatePicker
                value={formData.date}
                onChange={(value) => setFormData({ ...formData, date: value })}
                placeholder="Pick a date"
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting}
              className="bg-gradient-to-r from-green-600 to-emerald-600"
            >
              {isSubmitting ? 'Adding...' : 'Add Income'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// UPDATED 12-Jan-2025: Changed imports to use dateUtils.js and generalUtils.js instead of budgetCalculations.jsx