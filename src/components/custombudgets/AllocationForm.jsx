import { useState, useEffect } from "react";
import { CustomButton } from "@/components/ui/CustomButton";
import { Label } from "@/components/ui/label";
import AmountInput from "../ui/AmountInput";
import CategorySelect from "../ui/CategorySelect";
import { formatCurrency } from "../utils/currencyUtils";

export default function AllocationForm({
    allocation,
    customBudget,
    categories,
    onSubmit,
    onCancel,
    isSubmitting,
    settings
}) {
    const baseCurrency = settings?.baseCurrency || 'USD';

    const [formData, setFormData] = useState({
        categoryId: '',
        allocatedAmount: null
    });

    useEffect(() => {
        if (allocation) {
            setFormData({
                categoryId: allocation.categoryId || '',
                allocatedAmount: allocation.allocatedAmount || null
            });
        } else {
            setFormData({
                categoryId: '',
                allocatedAmount: null
            });
        }
    }, [allocation]);

    const totalBudgetLimit = customBudget?.allocatedAmount || 0;

    const handleSubmit = (e) => {
        e.preventDefault();

        onSubmit({
            ...formData,
            allocatedAmount: formData.allocatedAmount,
            allocationType: 'digital',
            currency: baseCurrency
        });
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            {/* Available Funds Display */}
            <div className="p-3 bg-blue-50 rounded-lg space-y-1">
                <p className="text-sm font-medium text-gray-700">Total Budget Limit:</p>
                <p className="text-lg font-bold text-blue-600">
                    {formatCurrency(totalBudgetLimit, settings)}
                </p>
            </div>

            {/* Category Selection */}
            <div className="space-y-2">
                <Label htmlFor="categoryId">Category</Label>
                <CategorySelect
                    value={formData.categoryId}
                    onValueChange={(value) => setFormData({ ...formData, categoryId: value })}
                    categories={categories}
                />
            </div>

            {/* Amount */}
            <div className="grid grid-cols-1 gap-4">
                <div className="space-y-2">
                    <Label htmlFor="allocatedAmount">Amount</Label>
                    <AmountInput
                        id="allocatedAmount"
                        value={formData.allocatedAmount}
                        onChange={(value) => setFormData({ ...formData, allocatedAmount: value })}
                        placeholder="0.00"
                        required
                    />
                </div>
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
                    {isSubmitting ? 'Saving...' : allocation ? 'Update' : 'Add'}
                </CustomButton>
            </div>
        </form>
    );
}
