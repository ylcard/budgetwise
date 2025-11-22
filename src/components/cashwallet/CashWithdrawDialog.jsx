import { useState } from "react";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { CustomButton } from "@/components/ui/CustomButton";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import AmountInput from "../ui/AmountInput";
import DatePicker from "../ui/DatePicker";
import CategorySelect from "../ui/CategorySelect";
import CurrencySelect from "../ui/CurrencySelect";
import { formatDateString } from "../utils/dateUtils";
import { normalizeAmount } from "../utils/generalUtils";

export default function CashDepositDialog({
    open,
    onOpenChange,
    onSubmit,
    isSubmitting,
    categories,
    baseCurrency
}) {
    const [formData, setFormData] = useState({
        title: '',
        amount: null,
        currency: baseCurrency || 'USD',
        date: formatDateString(new Date()),
        category_id: '',
        notes: ''
    });

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
            currency: baseCurrency || 'USD',
            date: formatDateString(new Date()),
            category_id: '',
            notes: ''
        });
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>Deposit Cash</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="title">Description</Label>
                        <Input
                            id="title"
                            value={formData.title}
                            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                            placeholder="e.g., ATM withdrawal"
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
                            <Label htmlFor="currency">Currency</Label>
                            <CurrencySelect
                                value={formData.currency}
                                onValueChange={(value) => setFormData({ ...formData, currency: value })}
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="date">Date</Label>
                        <DatePicker
                            value={formData.date}
                            onChange={(value) => setFormData({ ...formData, date: value })}
                            placeholder="Pick a date"
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="category">Category</Label>
                        <CategorySelect
                            value={formData.category_id}
                            onValueChange={(value) => setFormData({ ...formData, category_id: value })}
                            categories={categories}
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="notes">Notes (optional)</Label>
                        <Textarea
                            id="notes"
                            value={formData.notes}
                            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                            placeholder="Add any additional notes..."
                            rows={2}
                        />
                    </div>

                    <div className="flex justify-end gap-3 pt-4">
                        <CustomButton type="button" variant="outline" onClick={() => onOpenChange(false)}>
                            Cancel
                        </CustomButton>
                        <CustomButton
                            type="submit"
                            disabled={isSubmitting}
                            variant="primary"
                        >
                            {isSubmitting ? 'Processing...' : 'Deposit Cash'}
                        </CustomButton>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    );
}
