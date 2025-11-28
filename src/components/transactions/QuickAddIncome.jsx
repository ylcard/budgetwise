import { useState, useEffect } from "react";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { CustomButton } from "@/components/ui/CustomButton";
import { Label } from "@/components/ui/label";
import { Plus } from "lucide-react";
import AmountInput from "../ui/AmountInput";
import DatePicker from "../ui/DatePicker";
import { formatDateString, getFirstDayOfMonth } from "../utils/dateUtils";
import { normalizeAmount } from "../utils/generalUtils";

export default function QuickAddIncome({
    open,
    onOpenChange,
    onSubmit,
    isSubmitting,
    renderTrigger = true,
    triggerVariant = "default",
    triggerSize = "default",
    triggerClassName = "",
    selectedMonth,
    selectedYear
}) {

    // Helper to determine initial date based on context
    const getInitialDate = () => {
        const now = new Date();
        // If selected month/year matches current real-time, use today
        if (selectedMonth === now.getMonth() && selectedYear === now.getFullYear()) {
            return formatDateString(now);
        }
        // Otherwise default to the 1st of the selected month
        return getFirstDayOfMonth(selectedMonth, selectedYear);
    };
   

    const [formData, setFormData] = useState({
        title: '',
        amount: null,
        type: 'income',
        // date: formatDateString(new Date())
        date: getInitialDate()
    });
    
    // CRITICAL: Ensure form date updates when the component opens or the selected month changes
    useEffect(() => {
        if (open) {
            setFormData(prev => ({ ...prev, date: getInitialDate() }));
        }
    }, [open, selectedMonth, selectedYear]);

    const handleSubmit = (e) => {
        e.preventDefault();
        const normalizedAmount = normalizeAmount(formData.amount);

        onSubmit({
            ...formData,
            amount: parseFloat(normalizedAmount)
        });

        setFormData({
            title: '',
            amount: null,
            type: 'income',
            // date: formatDateString(new Date())
            date: getInitialDate()
        });
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            {renderTrigger && (
                <DialogTrigger asChild>
                    <CustomButton
                        variant={triggerVariant}
                        size={triggerSize}
                        className={triggerClassName}
                    >
                        <Plus className="w-4 h-4 mr-2" />
                        Add Income
                    </CustomButton>
                </DialogTrigger>
            )}
            <DialogContent className="sm:max-w-md fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
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
                                onChange={(value) => setFormData({ ...formData, amount: value })}
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
                        <CustomButton type="button" variant="outline" onClick={() => onOpenChange(false)}>
                            Cancel
                        </CustomButton>
                        <CustomButton
                            type="submit"
                            disabled={isSubmitting}
                            variant="success"
                        >
                            {isSubmitting ? 'Adding...' : 'Add Income'}
                        </CustomButton>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    );
}
