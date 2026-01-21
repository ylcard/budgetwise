import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { CustomButton } from "@/components/ui/CustomButton";
import { Label } from "@/components/ui/label";
import { AlertCircle, Calendar as CalendarIcon, ChevronLeft, ChevronRight } from "lucide-react";
import AmountInput from "../ui/AmountInput";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { DayPicker } from "react-day-picker";
import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";
import { format } from "date-fns";
import { PRESET_COLORS } from "../utils/constants";
import { normalizeAmount } from "../utils/generalUtils";
import { usePeriod } from "../hooks/usePeriod";
import { Alert, AlertDescription } from "@/components/ui/alert";

export default function CustomBudgetForm({
    budget,
    onSubmit,
    onCancel,
    isSubmitting,
    onFormChange // ADDED: 16-Jan-2026 - Real-time form updates for feasibility
}) {
    const { monthStart, monthEnd } = usePeriod();

    const [formData, setFormData] = useState({
        name: '',
        allocatedAmount: null,
        startDate: monthStart,
        endDate: monthEnd,
        description: '',
        color: '#3B82F6'
    });

    const [isPickerOpen, setIsPickerOpen] = useState(false);
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

    const handleRangeSelect = (range) => {
        handleDateRangeChange(
            range?.from ? format(range.from, 'yyyy-MM-dd') : '',
            range?.to ? format(range.to, 'yyyy-MM-dd') : ''
        );
    };

    // Prepare the selected range object for DayPicker
    const selectedRange = {
        from: formData.startDate ? new Date(formData.startDate) : undefined,
        to: formData.endDate ? new Date(formData.endDate) : undefined
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
            status: budget?.status || 'active'
        });
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            {validationError && (
                <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>{validationError}</AlertDescription>
                </Alert>
            )}

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
                    <Popover open={isPickerOpen} onOpenChange={setIsPickerOpen}>
                        <PopoverTrigger asChild>
                            <CustomButton
                                id="date"
                                variant="outline"
                                className={cn(
                                    "w-full justify-start text-left font-normal",
                                    !formData.startDate && "text-muted-foreground"
                                )}
                            >
                                <CalendarIcon className="mr-2 h-4 w-4" />
                                {formData.startDate ? (
                                    formData.endDate ? (
                                        <>
                                            {format(new Date(formData.startDate), "LLL dd, y")} -{" "}
                                            {format(new Date(formData.endDate), "LLL dd, y")}
                                        </>
                                    ) : (
                                        format(new Date(formData.startDate), "LLL dd, y")
                                    )
                                ) : (
                                    <span>Pick a date range</span>
                                )}
                            </CustomButton>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="end">
                            <DayPicker
                                mode="range"
                                defaultMonth={selectedRange.from}
                                selected={selectedRange}
                                onSelect={handleRangeSelect}
                                numberOfMonths={2}
                                showOutsideDays={false}
                                className="p-3"
                                classNames={{
                                    months: "flex flex-col sm:flex-row space-y-4 sm:space-x-4 sm:space-y-0",
                                    month: "space-y-4",
                                    caption: "flex justify-center pt-1 relative items-center",
                                    caption_label: "text-sm font-medium",
                                    nav: "space-x-1 flex items-center absolute right-1",
                                    nav_button: cn(
                                        buttonVariants({ variant: "outline" }),
                                        "h-7 w-7 bg-transparent p-0 opacity-50 hover:opacity-100"
                                    ),
                                    nav_button_previous: "",
                                    nav_button_next: "",
                                    table: "w-full border-collapse space-y-1",
                                    weekdays: "flex",
                                    weekday: "text-muted-foreground rounded-md w-9 font-normal text-[0.8rem]",
                                    week: "flex w-full mt-2",
                                    cell: "h-9 w-9 text-center text-sm p-0 relative [&:has([aria-selected].day-range-end)]:rounded-r-md [&:has([aria-selected].day-outside)]:bg-blue-50/50 [&:has([aria-selected])]:bg-blue-50 first:[&:has([aria-selected])]:rounded-l-md last:[&:has([aria-selected])]:rounded-r-md focus-within:relative focus-within:z-20",
                                    day: cn(
                                        buttonVariants({ variant: "ghost" }),
                                        "h-9 w-9 p-0 font-normal aria-selected:opacity-100"
                                    ),
                                    range_end: "day-range-end",
                                    selected: "bg-blue-600 text-white hover:bg-blue-600 hover:text-white focus:bg-blue-600 focus:text-white rounded-full",
                                    today: "bg-accent text-accent-foreground",
                                    outside: "day-outside text-muted-foreground opacity-50 aria-selected:bg-blue-50/50 aria-selected:text-muted-foreground aria-selected:opacity-30",
                                    disabled: "text-muted-foreground opacity-50",
                                    range_middle: "aria-selected:bg-blue-50 aria-selected:text-blue-700 !rounded-none",
                                    hidden: "invisible",
                                }}
                                components={{
                                    IconLeft: ({ ...props }) => <ChevronLeft {...props} className="h-4 w-4" />,
                                    IconRight: ({ ...props }) => <ChevronRight {...props} className="h-4 w-4" />,
                                }}
                            />
                        </PopoverContent>
                    </Popover>
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
                            className={`w-8 h-8 rounded-md border-2 transition-all hover:scale-110 ${formData.color === color ? 'border-gray-900 ring-2 ring-offset-1 ring-gray-900' : 'border-transparent'
                                }`}
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

            <div className="flex justify-end gap-3 pt-2">
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