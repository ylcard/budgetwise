import { useState, useEffect, useMemo } from "react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { CustomButton } from "@/components/ui/CustomButton";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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

const DAY_OF_WEEK_OPTIONS = [
    { value: 0, label: "Sunday" },
    { value: 1, label: "Monday" },
    { value: 2, label: "Tuesday" },
    { value: 3, label: "Wednesday" },
    { value: 4, label: "Thursday" },
    { value: 5, label: "Friday" },
    { value: 6, label: "Saturday" },
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
        originalCurrency: settings?.baseCurrency || 'USD',
        type: 'expense',
        category_id: '',
        financial_priority: '',
        frequency: 'monthly',
        dayOfMonth: 1,
        dayOfWeek: 1,
        startDate: formatDateString(new Date()),
        endDate: '',
        autoMarkPaid: false,
        notes: '',
        isActive: true,
    });

    // Initialize form data from initialData (for editing)
    useEffect(() => {
        if (initialData) {
            setFormData({
                title: initialData.title || '',
                amount: initialData.originalAmount || initialData.amount || null,
                originalCurrency: initialData.originalCurrency || settings?.baseCurrency || 'USD',
                type: initialData.type || 'expense',
                category_id: initialData.category_id || '',
                financial_priority: initialData.financial_priority || '',
                frequency: initialData.frequency || 'monthly',
                dayOfMonth: initialData.dayOfMonth || 1,
                dayOfWeek: initialData.dayOfWeek ?? 1,
                startDate: initialData.startDate || formatDateString(new Date()),
                endDate: initialData.endDate || '',
                autoMarkPaid: initialData.autoMarkPaid || false,
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

    // Show day-of-week selector for weekly/biweekly
    const showDayOfWeek = ['weekly', 'biweekly'].includes(formData.frequency);
    // Show day-of-month selector for monthly/quarterly/yearly
    const showDayOfMonth = ['monthly', 'quarterly', 'yearly'].includes(formData.frequency);

    const dayOfMonthOptions = useMemo(() => {
        return Array.from({ length: 31 }, (_, i) => ({ value: i + 1, label: `${i + 1}` }));
    }, []);

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
            originalAmount: amount,
            originalCurrency: formData.originalCurrency,
            type: formData.type,
            category_id: formData.type === 'expense' ? (formData.category_id || null) : null,
            financial_priority: formData.type === 'expense' ? (formData.financial_priority || null) : null,
            frequency: formData.frequency,
            dayOfMonth: showDayOfMonth ? formData.dayOfMonth : null,
            dayOfWeek: showDayOfWeek ? formData.dayOfWeek : null,
            startDate: formData.startDate,
            endDate: formData.endDate || null,
            autoMarkPaid: formData.autoMarkPaid,
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
                    currency={formData.originalCurrency}
                    onCurrencyChange={(value) => setFormData({ ...formData, originalCurrency: value })}
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

            {/* Day of Week (for weekly/biweekly) */}
            {showDayOfWeek && (
                <div className="space-y-2">
                    <Label>Day of Week</Label>
                    <MobileDrawerSelect
                        value={String(formData.dayOfWeek)}
                        onValueChange={(value) => setFormData({ ...formData, dayOfWeek: parseInt(value) })}
                        placeholder="Select day"
                        options={DAY_OF_WEEK_OPTIONS.map(opt => ({ value: String(opt.value), label: opt.label }))}
                    />
                </div>
            )}

            {/* Day of Month (for monthly/quarterly/yearly) */}
            {showDayOfMonth && (
                <div className="space-y-2">
                    <Label>Day of Month</Label>
                    <MobileDrawerSelect
                        value={String(formData.dayOfMonth)}
                        onValueChange={(value) => setFormData({ ...formData, dayOfMonth: parseInt(value) })}
                        placeholder="Select day"
                        options={dayOfMonthOptions.map(opt => ({ value: String(opt.value), label: opt.label }))}
                    />
                </div>
            )}

            {/* Start Date & End Date */}
            <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                    <Label>Start Date</Label>
                    <DatePicker
                        value={formData.startDate}
                        onChange={(value) => setFormData({ ...formData, startDate: value })}
                        placeholder="Start date"
                    />
                </div>
                <div className="space-y-2">
                    <Label>End Date (Optional)</Label>
                    <DatePicker
                        value={formData.endDate}
                        onChange={(value) => setFormData({ ...formData, endDate: value })}
                        placeholder="No end date"
                    />
                </div>
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

            {/* Auto Mark Paid (Expenses only) */}
            {formData.type === 'expense' && (
                <div className="flex items-center space-x-2">
                    <Checkbox
                        id="autoMarkPaid"
                        checked={formData.autoMarkPaid}
                        onCheckedChange={(checked) => setFormData({ ...formData, autoMarkPaid: checked })}
                    />
                    <Label htmlFor="autoMarkPaid" className="cursor-pointer">
                        Automatically mark as paid when created
                    </Label>
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