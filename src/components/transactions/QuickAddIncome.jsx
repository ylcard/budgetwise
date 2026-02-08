import { useState, useEffect } from "react";
// import { motion, AnimatePresence } from "framer-motion";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { CustomButton } from "@/components/ui/CustomButton";
// import { Label } from "@/components/ui/label";
import { Plus, Calendar } from "lucide-react";
import AmountInput from "../ui/AmountInput";
import DatePicker from "../ui/DatePicker";
import { formatDateString, getFirstDayOfMonth, formatDate } from "../utils/dateUtils";
import { normalizeAmount } from "../utils/generalUtils";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

export default function QuickAddIncome({
    open,
    onOpenChange,
    onSubmit,
    isSubmitting,
    renderTrigger = true,
    transaction = null, // ADDED 13-Jan-2026: Support editing
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
        date: getInitialDate()
    });

    // UPDATED 13-Jan-2026: Initialize form with transaction data if editing
    useEffect(() => {
        if (transaction) {
            setFormData({
                title: transaction.title || '',
                amount: transaction.originalAmount || transaction.amount || null,
                type: 'income',
                date: transaction.date || getInitialDate()
            });
        } else if (open) {
            setFormData({
                title: '',
                amount: null,
                type: 'income',
                date: getInitialDate()
            });
        }
    }, [open, transaction, selectedMonth, selectedYear]);

    const handleSubmit = (e) => {
        e.preventDefault();
        const normalizedAmount = normalizeAmount(formData.amount);
        const amountValue = parseFloat(normalizedAmount);

        onSubmit({
            ...formData,
            amount: parseFloat(normalizedAmount)
        });

        const submitData = {
            title: formData.title,
            amount: amountValue,
            originalAmount: amountValue,
            originalCurrency: formData.originalCurrency,
            type: 'income',
            date: formData.date,
            category_id: null,
            budgetId: null,
            isPaid: true, // Income is effectively always "paid"
            paidDate: formData.date,
            notes: null
        };

        onSubmit(submitData);

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
            <DialogContent className="sm:max-w-md fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 pt-12">
                <DialogHeader>
                    <DialogTitle>{transaction ? 'Edit Income' : 'Quick Add Income'}</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-6 pt-4">
                    {/* Title: Borderless style */}
                    <div>
                        <Input
                            id="title"
                            value={formData.title}
                            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                            placeholder="Where is this income from?"
                            className="text-lg font-medium border-0 border-b rounded-none px-0 h-10 focus-visible:ring-0 shadow-none placeholder:text-gray-400"
                            required
                            autoComplete="off"
                        />
                    </div>

                    {/* Row: Amount + Date Button */}
                    <div className="flex items-end gap-3">
                        <div className="flex-1">
                            <AmountInput
                                id="amount"
                                value={formData.amount}
                                onChange={(value) => setFormData({ ...formData, amount: value })}
                                currency={formData.originalCurrency}
                                onCurrencyChange={(curr) => setFormData({ ...formData, originalCurrency: curr })}
                                placeholder="0.00"
                                required
                                className="text-2xl h-12 font-semibold"
                            />
                        </div>

                        <Popover modal={true}>
                            <PopoverTrigger asChild>
                                <CustomButton
                                    type="button"
                                    variant="outline"
                                    className="h-12 px-3 bg-gray-50/50 border-dashed border-gray-300 hover:border-gray-400 text-sm"
                                >
                                    <Calendar className="w-3.5 h-3.5 mr-2 text-green-600" />
                                    <span className="text-green-700">
                                        {formData.date ? formatDate(new Date(formData.date), 'MMM d') : 'Date'}
                                    </span>
                                </CustomButton>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-4" align="end">
                                <DatePicker
                                    value={formData.date}
                                    onChange={(value) => setFormData({ ...formData, date: value })}
                                    className="w-full border-0 shadow-none px-0 h-auto"
                                />
                            </PopoverContent>
                        </Popover>
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
                            {isSubmitting ? 'Saving...' : (transaction ? 'Update Income' : 'Add Income')}
                        </CustomButton>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    );
}