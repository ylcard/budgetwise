import { useState, useEffect, useMemo } from "react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { CustomButton } from "@/components/ui/CustomButton";
import { Label } from "@/components/ui/label";
import { MobileDrawerSelect } from "@/components/ui/MobileDrawerSelect"; // ADDED 03-Feb-2026: iOS-native action sheets on mobile
import { Checkbox } from "@/components/ui/checkbox";
import { AlertCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import AmountInput from "../ui/AmountInput";
import DatePicker from "../ui/DatePicker";
import CategorySelect from "../ui/CategorySelect";
import { useSettings } from "../utils/SettingsContext";
import { formatDateString } from "../utils/dateUtils";
import { normalizeAmount } from "../utils/generalUtils";

const FREQUENCY_OPTIONS = [
  { value: "daily", label: "Daily" },
  { value: "weekly", label: "Weekly" },
  { value: "biweekly", label: "Every 2 Weeks" },
  { value: "monthly", label: "Monthly" },
  { value: "quarterly", label: "Quarterly" },
  { value: "yearly", label: "Yearly" },
];

export default function RecurringTransactionForm({
  initialData = null,
  categories = [],
  onSubmit,
  onCancel,
  isSubmitting = false,
}) {
  const { settings, user } = useSettings();
  const [validationError, setValidationError] = useState(null);

  const [formData, setFormData] = useState({
    title: '',
    amount: null,
    type: 'expense',
    category_id: '',
    financial_priority: '',
    frequency: 'monthly',
    nextOccurrence: formatDateString(new Date()),
    notes: '',
    isActive: true,
  });

  // Initialize form data from initialData (for editing)
  useEffect(() => {
    if (initialData) {
      setFormData({
        title: initialData.title || '',
        amount: initialData.amount || null,
        type: initialData.type || 'expense',
        category_id: initialData.category_id || '',
        financial_priority: initialData.financial_priority || '',
        frequency: initialData.frequency || 'monthly',
        nextOccurrence: initialData.nextOccurrence || formatDateString(new Date()),
        notes: initialData.notes || '',
        isActive: initialData.isActive ?? true,
      });
    }
  }, [initialData, settings?.baseCurrency]);

  // Auto-set Priority based on Category
  useEffect(() => {
    if (formData.category_id && formData.type === 'expense') {
      if (initialData && formData.category_id === initialData.category_id) return;
      const selectedCategory = categories.find(c => c.id === formData.category_id);
      if (selectedCategory?.priority) {
        setFormData(prev => ({ ...prev, financial_priority: selectedCategory.priority }));
      }
    }
  }, [formData.category_id, categories, initialData, formData.type]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setValidationError(null);

    const normalizedAmount = normalizeAmount(formData.amount);
    const amount = parseFloat(normalizedAmount);

    if (!formData.title.trim()) {
      setValidationError("Please enter a title.");
      return;
    }
    if (isNaN(amount) || amount <= 0) {
      setValidationError("Please enter a valid amount.");
      return;
    }
    if (formData.type === 'expense' && !formData.financial_priority) {
      setValidationError("Please select a financial priority for expenses.");
      return;
    }

    const submitData = {
      title: formData.title.trim(),
      amount: amount,
      type: formData.type,
      category_id: formData.type === 'expense' ? (formData.category_id || null) : null,
      financial_priority: formData.type === 'expense' ? (formData.financial_priority || null) : null,
      frequency: formData.frequency,
      nextOccurrence: formData.nextOccurrence,
      notes: formData.notes || null,
      isActive: formData.isActive,
      user_email: user.email,
    };

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

      {/* Type Toggle */}
      <div className="space-y-2">
        <Label>Type</Label>
        <div className="flex gap-2">
          <CustomButton
            type="button"
            variant={formData.type === 'expense' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFormData({ ...formData, type: 'expense' })}
          >
            Expense
          </CustomButton>
          <CustomButton
            type="button"
            variant={formData.type === 'income' ? 'success' : 'outline'}
            size="sm"
            onClick={() => setFormData({ ...formData, type: 'income' })}
          >
            Income
          </CustomButton>
        </div>
      </div>

      {/* Title */}
      <div className="space-y-2">
        <Label htmlFor="title">Title</Label>
        <Input
          id="title"
          value={formData.title}
          onChange={(e) => setFormData({ ...formData, title: e.target.value })}
          placeholder="e.g., Monthly Rent, Salary"
          required
          autoComplete="off"
        />
      </div>

      {/* Amount */}
      <div className="space-y-2">
        <Label htmlFor="amount">Amount</Label>
        <AmountInput
          id="amount"
          value={formData.amount}
          onChange={(value) => setFormData({ ...formData, amount: value })}
          placeholder="0.00"
          currency={settings?.baseCurrency || 'EUR'}
          required
        />
      </div>

      {/* Frequency */}
      <div className="space-y-2">
        <Label>Frequency</Label>
        <MobileDrawerSelect
          value={formData.frequency}
          onValueChange={(value) => setFormData({ ...formData, frequency: value })}
          placeholder="Select frequency"
          options={FREQUENCY_OPTIONS}
        />
      </div>

      {/* Next Due Date */}
      <div className="space-y-2">
        <Label>Next Due Date</Label>
        <DatePicker
          value={formData.nextOccurrence}
          onChange={(value) => setFormData({ ...formData, nextOccurrence: value })}
          placeholder="Select date"
        />
      </div>

      {/* Category & Priority (Expenses only) */}
      {formData.type === 'expense' && (
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Category</Label>
            <CategorySelect
              value={formData.category_id}
              onValueChange={(value) => setFormData({ ...formData, category_id: value })}
              categories={categories}
            />
          </div>
          <div className="space-y-2">
            <Label>Financial Priority</Label>
            <MobileDrawerSelect
              value={formData.financial_priority || ''}
              onValueChange={(value) => setFormData({ ...formData, financial_priority: value })}
              placeholder="Select priority"
              options={[
                { value: "needs", label: "Needs" },
                { value: "wants", label: "Wants" },
                { value: "savings", label: "Savings" }
              ]}
            />
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

      {/* Active Toggle */}
      <div className="flex items-center space-x-2">
        <Checkbox
          id="isActive"
          checked={formData.isActive}
          onCheckedChange={(checked) => setFormData({ ...formData, isActive: checked })}
        />
        <Label htmlFor="isActive" className="cursor-pointer">
          Active (will generate transactions on schedule)
        </Label>
      </div>

      {/* Action Buttons */}
      <div className="flex justify-end gap-3 pt-2">
        <CustomButton type="button" variant="outline" onClick={onCancel}>
          Cancel
        </CustomButton>
        <CustomButton type="submit" disabled={isSubmitting} variant="primary">
          {isSubmitting ? 'Saving...' : (initialData ? 'Update' : 'Create')}
        </CustomButton>
      </div>
    </form>
  );
}