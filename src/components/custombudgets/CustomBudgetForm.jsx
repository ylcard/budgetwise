import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { CustomButton } from "@/components/ui/CustomButton";
import { Label } from "@/components/ui/label";
import { AlertCircle } from "lucide-react";
import AmountInput from "../ui/AmountInput";
import DateRangePicker from "../ui/DateRangePicker";
import { cn } from "@/lib/utils";
import { PRESET_COLORS } from "../utils/constants";
import { normalizeAmount } from "../utils/generalUtils";
import { usePeriod } from "../hooks/usePeriod";
import { useSettings } from "../utils/SettingsContext";
import { Alert, AlertDescription } from "@/components/ui/alert";

export default function CustomBudgetForm({
    budget,
    onSubmit,
    onCancel,
    isSubmitting,
    onFormChange, // ADDED: 16-Jan-2026 - Real-time form updates for feasibility
    children // ADDED: To inject feasibility display inside the scrollable grid
}) {
    const { monthStart, monthEnd } = usePeriod();
    const { user } = useSettings();

    const [formData, setFormData] = useState({
        name: '',
        allocatedAmount: null,
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
                allocatedAmount: budget.allocatedAmount?.toString() || null,
                startDate: budget.startDate || monthStart,
                endDate: budget.endDate || monthEnd,
                description: budget.description || '',
                color: budget.color || '#3B82F6'
            });
        } else {
            setFormData(prev => ({
                ...prev,
                startDate: monthStart,
                endDate: monthEnd
            }));
        }
    }, [budget, monthStart, monthEnd]);

    const handleDateRangeChange = (start, end) => {
        const updated = {
            ...formData,
            startDate: start,
            endDate: end
        };
        setFormData(updated);
        // ADDED: 16-Jan-2026 - Notify parent of changes for real-time feasibility
        if (onFormChange) onFormChange(updated);
    };

    const handleFieldChange = (field, value) => {
        const updated = { ...formData, [field]: value };
        setFormData(updated);
        // ADDED: 16-Jan-2026 - Notify parent of changes for real-time feasibility
        if (onFormChange) onFormChange(updated);
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        setValidationError(null);

        const normalizedAmount = normalizeAmount(formData.allocatedAmount);

        return onSubmit({
            ...formData,
            allocatedAmount: parseFloat(normalizedAmount),
            user_email: budget?.user_email || user?.email,
            status: budget?.status || 'active'
        });
    };

    return (
        <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0 overflow-hidden">
            <div className="flex-1 overflow-y-auto px-4 pb-4 pt-2 md:px-0 md:pt-0 md:overflow-visible">
                {validationError && (
                    <Alert variant="destructive" className="mb-4">
                        <AlertCircle className="h-4 w-4" />
                        <AlertDescription>{validationError}</AlertDescription>
                    </Alert>
                )}
                <div className="grid lg:grid-cols-2 gap-4">
                    <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-3 items-start">
                            <div className="flex flex-col space-y-2">
                                <Label htmlFor="name">Budget Name</Label>
                                <Input
                                    id="name"
                                    value={formData.name}
                                    onChange={(e) => handleFieldChange('name', e.target.value)}
                                    placeholder="e.g., Manchester Trip"
                                    required
                                    autoFocus
                                    autoComplete="off"
                                />
                            </div>

                            <div className="flex flex-col space-y-2">
                                <Label>Date Range</Label>
                                <DateRangePicker
                                    startDate={formData.startDate}
                                    endDate={formData.endDate}
                                    onRangeChange={handleDateRangeChange}
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-1 gap-3 items-end">
                            <div className="space-y-2">
                                <Label htmlFor="allocatedAmount">Budget Limit</Label>
                                <AmountInput
                                    id="allocatedAmount"
                                    value={formData.allocatedAmount}
                                    onChange={(value) => handleFieldChange('allocatedAmount', value)}
                                    placeholder="0.00"
                                    required
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label className="text-sm">Color</Label>
                            <div className="flex gap-2">
                                {PRESET_COLORS.map((color) => (
                                    <button
                                        key={color}
                                        type="button"
                                        onClick={() => handleFieldChange('color', color)}
                                        className={`w-8 h-8 rounded-md border-2 transition-all hover:scale-110 ${formData.color === color ? 'border-gray-900 ring-2 ring-offset-1 ring-gray-900' : 'border-transparent'}`}
                                        style={{ backgroundColor: color }}
                                    />
                                ))}
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="description">Description (Optional)</Label>
                            <Textarea
                                id="description"
                                value={formData.description}
                                onChange={(e) => handleFieldChange('description', e.target.value)}
                                placeholder="Add details about this budget..."
                                rows={2}
                                className="resize-none"
                            />
                        </div>
                    </div>
                    {children}
                </div>
            </div>

            <div className="shrink-0 bg-background border-t p-4 pb-[max(1rem,env(safe-area-inset-bottom))] md:border-none md:p-0 md:pt-4 flex justify-end gap-3 z-10">
                <CustomButton type="button" variant="outline" onClick={onCancel}>
                    Cancel
                </CustomButton>
                <CustomButton
                    type="submit"
                    disabled={isSubmitting}
                    variant="primary"
                >
                    {isSubmitting ? 'Saving...' : budget ? 'Update Budget' : 'Create Budget'}
                </CustomButton>
            </div>
        </form>
    );
}