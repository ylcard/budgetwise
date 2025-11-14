import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
// COMMENTED OUT 16-Jan-2025: Replaced with CustomButton for consistency
// import { Button } from "@/components/ui/button";
import { CustomButton } from "@/components/ui/CustomButton";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { X, Circle } from "lucide-react";
import { motion } from "framer-motion";
import { iconMap, POPULAR_ICONS } from "../utils/iconMapConfig";

const PRIORITY_OPTIONS = [
  { value: 'needs', label: 'Needs', description: 'Essential expenses' },
  { value: 'wants', label: 'Wants', description: 'Discretionary spending' },
  { value: 'savings', label: 'Savings', description: 'Savings and investments' }
];

const PRESET_COLORS = [
  '#EF4444', '#F59E0B', '#10B981', '#3B82F6', '#8B5CF6',
  '#EC4899', '#14B8A6', '#F97316', '#06B6D4', '#6366F1'
];

export default function CategoryForm({ category, onSubmit, onCancel, isSubmitting }) {
  const [formData, setFormData] = useState({
    name: '',
    icon: 'Circle',
    color: '#3B82F6',
    priority: 'needs'
  });

  useEffect(() => {
    if (category) {
      setFormData({
        name: category.name || '',
        icon: category.icon || 'Circle',
        color: category.color || '#3B82F6',
        priority: category.priority || 'needs'
      });
    }
  }, [category]);

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(formData);
  };

  const IconComponent = iconMap[formData.icon] || Circle;

  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
    >
      <Card className="border-none shadow-lg">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>{category ? 'Edit' : 'Create'} Category</CardTitle>
          <CustomButton variant="ghost" size="icon" onClick={onCancel}>
            <X className="w-4 h-4" />
          </CustomButton>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="flex justify-center">
              <div
                className="w-24 h-24 rounded-2xl flex items-center justify-center shadow-lg"
                style={{ backgroundColor: `${formData.color}20` }}
              >
                <IconComponent className="w-12 h-12" style={{ color: formData.color }} />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="name">Category Name</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g., Groceries, Entertainment"
                required
              />
            </div>

            <div className="space-y-2">
              <Label>Icon</Label>
              <div className="grid grid-cols-6 md:grid-cols-8 gap-2">
                {POPULAR_ICONS.map((iconName) => {
                  const Icon = iconMap[iconName];
                  return (
                    <button
                      key={iconName}
                      type="button"
                      onClick={() => setFormData({ ...formData, icon: iconName })}
                      className={`p-3 rounded-lg border-2 transition-all hover:scale-110 ${
                        formData.icon === iconName
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <Icon className="w-5 h-5" />
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="space-y-2">
              <Label>Color</Label>
              <div className="grid grid-cols-5 md:grid-cols-10 gap-2">
                {PRESET_COLORS.map((color) => (
                  <button
                    key={color}
                    type="button"
                    onClick={() => setFormData({ ...formData, color })}
                    className={`w-full aspect-square rounded-lg border-2 transition-all hover:scale-110 ${
                      formData.color === color ? 'border-gray-900' : 'border-transparent'
                    }`}
                    style={{ backgroundColor: color }}
                  />
                ))}
              </div>
              <Input
                type="color"
                value={formData.color}
                onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                className="w-full h-12"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="priority">Priority</Label>
              <Select
                value={formData.priority}
                onValueChange={(value) => setFormData({ ...formData, priority: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PRIORITY_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      <div>
                        <p className="font-medium">{option.label}</p>
                        <p className="text-xs text-gray-500">{option.description}</p>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex justify-end gap-3 pt-4">
              <CustomButton type="button" variant="outline" onClick={onCancel}>
                Cancel
              </CustomButton>
              <CustomButton
                type="submit"
                disabled={isSubmitting}
                variant="primary"
              >
                {isSubmitting ? 'Saving...' : category ? 'Update' : 'Create'}
              </CustomButton>
            </div>
          </form>
        </CardContent>
      </Card>
    </motion.div>
  );
}

// UPDATED 16-Jan-2025: Replaced Button with CustomButton for form actions
// - Close button (X) uses variant="ghost" size="icon"
// - Cancel button uses variant="outline"
// - Submit button uses variant="primary" (gradient blue-purple)
// - Native <button>s for icon/color selection intentionally kept as they need specific inline styling
// - All functionality preserved with consistent purpose-based styling