import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { X } from "lucide-react";
import { motion } from "framer-motion";
import AmountInput from "../ui/AmountInput";
import CategorySelect from "../ui/CategorySelect";

export default function AllocationForm({ allocation, customBudgetId, categories, onSubmit, onCancel, isSubmitting }) {
  const [formData, setFormData] = useState({
    categoryId: '',
    allocatedAmount: ''
  });

  useEffect(() => {
    if (allocation) {
      setFormData({
        categoryId: allocation.categoryId || '',
        allocatedAmount: allocation.allocatedAmount?.toString() || ''
      });
    }
  }, [allocation]);

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit({
      customBudgetId,
      categoryId: formData.categoryId,
      allocatedAmount: parseFloat(formData.allocatedAmount)
    });
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
    >
      <Card className="border border-blue-200 bg-blue-50/50">
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <CardTitle className="text-lg">{allocation ? 'Edit' : 'Add'} Allocation</CardTitle>
          <Button variant="ghost" size="icon" onClick={onCancel} className="h-8 w-8">
            <X className="w-4 h-4" />
          </Button>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="category">Category *</Label>
              <CategorySelect
                value={formData.categoryId}
                onValueChange={(value) => setFormData({ ...formData, categoryId: value })}
                categories={categories}
                placeholder="Select a category"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="amount">Allocated Amount *</Label>
              <AmountInput
                id="amount"
                value={formData.allocatedAmount}
                onChange={(e) => setFormData({ ...formData, allocatedAmount: e.target.value })}
                placeholder="0.00"
                required
              />
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <Button type="button" variant="outline" onClick={onCancel} size="sm">
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting || !formData.categoryId || !formData.allocatedAmount}
                className="bg-gradient-to-r from-blue-600 to-purple-600"
                size="sm"
              >
                {isSubmitting ? 'Saving...' : allocation ? 'Update' : 'Add'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </motion.div>
  );
}