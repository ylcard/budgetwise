
import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { X } from "lucide-react";
import { motion } from "framer-motion";
import AmountInput from "../ui/AmountInput";
import DatePicker from "../ui/DatePicker";
import { PRESET_COLORS } from "../utils/constants";
import { normalizeAmount } from "../utils/budgetCalculations";
import { usePeriod } from "../hooks/usePeriod";

export default function CustomBudgetForm({ budget, onSubmit, onCancel, isSubmitting, isQuickAdd = false }) {
  const { monthStart, monthEnd } = usePeriod();

  const [formData, setFormData] = useState({
    name: '',
    allocatedAmount: '',
    startDate: monthStart,
    endDate: monthEnd,
    description: '',
    color: '#3B82F6'
  });

  useEffect(() => {
    if (budget) {
      setFormData({
        name: budget.name || '',
        allocatedAmount: budget.allocatedAmount?.toString() || '',
        startDate: budget.startDate || monthStart,
        endDate: budget.endDate || monthEnd,
        description: budget.description || '',
        color: budget.color || '#3B82F6'
      });
    } else {
      // Reset to current month dates when creating new
      setFormData(prev => ({
        ...prev,
        startDate: monthStart,
        endDate: monthEnd
      }));
    }
  }, [budget, monthStart, monthEnd]);

  const handleSubmit = (e) => {
    e.preventDefault();
    const normalizedAmount = normalizeAmount(formData.allocatedAmount);
    
    onSubmit({
      ...formData,
      allocatedAmount: parseFloat(normalizedAmount),
      status: budget?.status || 'active'
    });
  };

  const content = (
    <form onSubmit={handleSubmit} className="space-y-4">
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
          <Label htmlFor="allocatedAmount">Total Budget</Label>
          <AmountInput
            id="allocatedAmount"
            value={formData.allocatedAmount}
            onChange={(e) => setFormData({ ...formData, allocatedAmount: e.target.value })}
            placeholder="0.00"
            required
          />
        </div>
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
