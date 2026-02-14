import { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { CustomButton } from "@/components/ui/CustomButton";
import { Label } from "@/components/ui/label";
import { MobileDrawerSelect } from "@/components/ui/MobileDrawerSelect"; // ADDED 03-Feb-2026: iOS-native action sheets on mobile
import { Checkbox } from "@/components/ui/checkbox";
import { AlertCircle, StickyNote } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import AmountInput from "../ui/AmountInput";
import DatePicker from "../ui/DatePicker";
import CategorySelect from "../ui/CategorySelect";
import { useSettings } from "../utils/SettingsContext";
import { formatDateString } from "../utils/dateUtils";
import { normalizeAmount } from "../utils/generalUtils";
import { cn } from "@/lib/utils";

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
  const [showNotes, setShowNotes] = useState(!!initialData?.notes);

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
      if (initialData.notes) setShowNotes(true);
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
    <form onSubmit={handleSubmit} className="pt-4">
      {validationError && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{validationError}</AlertDescription>
        </Alert>
      )}

      {/* Type Toggle */}
      <div className="flex justify-center pb-2 mb-6">
        <div className="flex gap-2 p-1 bg-slate-100/80 rounded-lg">
          <CustomButton
            type="button"
            variant={formData.type === 'expense' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setFormData({ ...formData, type: 'expense' })}
            className={cn("w-24 transition-all", formData.type === 'expense' && "shadow-sm")}
          >
            Expense
          </CustomButton>
          <CustomButton
            type="button"
            variant={formData.type === 'income' ? 'success' : 'ghost'}
            size="sm"
            onClick={() => setFormData({ ...formData, type: 'income' })}
            className={cn("w-24 transition-all", formData.type === 'income' && "shadow-sm")}
          >
            Income
          </CustomButton>
        </div>
      </div>

      {/* Title */}
      <div className="mb-6">
        <Input
          id="title"
          value={formData.title}
          onChange={(e) => setFormData({ ...formData, title: e.target.value })}
          placeholder="Title (e.g., Rent, Netflix)"
          className="text-lg font-medium border-0 border-b rounded-none px-0 h-10 focus-visible:ring-0 shadow-none placeholder:text-gray-400"
          required
          autoComplete="off"
        />
      </div>

      {/* Amount */}
      <div className="mb-6">
        <AmountInput
          id="amount"
          value={formData.amount}
          onChange={(value) => setFormData({ ...formData, amount: value })}
          placeholder="0.00"
          currency={settings?.baseCurrency || 'EUR'}
          required
          className="text-2xl h-12 font-semibold"
        />
      </div>

      {/* Frequency & Date Row */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Frequency</Label>
          <MobileDrawerSelect
            value={formData.frequency}
            onValueChange={(value) => setFormData({ ...formData, frequency: value })}
            placeholder="Select frequency"
            options={FREQUENCY_OPTIONS}
          />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Next Due Date</Label>
          <DatePicker
            value={formData.nextOccurrence}
            onChange={(value) => setFormData({ ...formData, nextOccurrence: value })}
            placeholder="Select date"
            className="h-10"
          />
        </div>
      </div>

      {/* Category & Priority (Expenses only) */}
      <AnimatePresence>
        {formData.type === 'expense' && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ type: "spring", bounce: 0, duration: 0.4 }}
            className="overflow-hidden"
          >
            {/* Margin added INSIDE the animated container to collapse smoothly */}
            <div className="space-y-1.5 mb-6">
              <Label className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Category & Priority</Label>
              <div className="flex gap-3">
                <div className="flex-[3]">
                  <CategorySelect
                    value={formData.category_id}
                    onValueChange={(value) => setFormData({ ...formData, category_id: value })}
                    categories={categories}
                    placeholder="Category"
                  />
                </div>
                <div className="flex-[2]">
                  <div className="flex h-10 bg-slate-100 rounded-md p-1 items-center">
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, financial_priority: 'needs' })}
                      className={cn(
                        "flex-1 text-[10px] font-medium h-full rounded-sm transition-all",
                        formData.financial_priority === 'needs' ? "bg-white text-blue-600 shadow-sm" : "text-slate-500 hover:text-slate-700"
                      )}
                    >
                      Essentials
                    </button>
                    <div className="w-px h-4 bg-slate-200 mx-1" />
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, financial_priority: 'wants' })}
                      className={cn(
                        "flex-1 text-[10px] font-medium h-full rounded-sm transition-all",
                        formData.financial_priority === 'wants' ? "bg-white text-purple-600 shadow-sm" : "text-slate-500 hover:text-slate-700"
                      )}
                    >
                      Lifestyle
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Notes */}
      <div className="space-y-2 mb-6">
        <AnimatePresence mode="wait">
          {!showNotes && !formData.notes ? (
            <motion.div key="add-note-btn" exit={{ opacity: 0, scale: 0.95 }}>
              <CustomButton
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setShowNotes(true)}
                className="text-muted-foreground h-8 px-2"
              >
                <StickyNote className="w-3.5 h-3.5 mr-2" />
                Add Note
              </CustomButton>
            </motion.div>
          ) : (
            <motion.div key="notes-area" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
              <Textarea
                id="notes"
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Additional details..."
                rows={2}
                className="resize-none"
                autoFocus={!initialData?.notes} // Focus only if freshly opened
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Active Toggle */}
      <div className="flex items-center space-x-2 bg-slate-50 p-3 rounded-lg border border-slate-100">
        <Checkbox
          id="isActive"
          checked={formData.isActive}
          onCheckedChange={(checked) => setFormData({ ...formData, isActive: checked })}
        />
        <Label htmlFor="isActive" className="cursor-pointer font-medium text-slate-700">
          Active
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