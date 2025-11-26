// import { useState, useEffect, useMemo } from "react";
import { useState, useEffect } from "react";
import { CustomButton } from "@/components/ui/CustomButton";
import { Label } from "@/components/ui/label";
import AmountInput from "../ui/AmountInput";
import CategorySelect from "../ui/CategorySelect";
// import CurrencySelect from "../ui/CurrencySelect";
// import { normalizeAmount } from "../utils/generalUtils";
// import { getCurrencySymbol, formatCurrency } from "../utils/currencyUtils";
import { formatCurrency } from "../utils/currencyUtils";

export default function AllocationForm({
    allocation,
    customBudget,
    categories,
    onSubmit,
    onCancel,
    isSubmitting,
    settings
    // cashWallet
}) {
    const baseCurrency = settings?.baseCurrency || 'USD';
    // const hasCashAllocations = customBudget?.cashAllocations && customBudget.cashAllocations.length > 0;

    // Extract available currencies from customBudget.cashAllocations
    // const availableCashCurrencies = useMemo(() => {
    //     return hasCashAllocations
    //         ? customBudget.cashAllocations.map(alloc => alloc.currencyCode)
    //         : [];
    // }, [customBudget, hasCashAllocations]);

    const [formData, setFormData] = useState({
        categoryId: '',
        allocatedAmount: null
        // allocationType: 'digital',
        // currency: availableCashCurrencies.length > 0 ? availableCashCurrencies[0] : baseCurrency
    });

    useEffect(() => {
        if (allocation) {
            setFormData({
                categoryId: allocation.categoryId || '',
                allocatedAmount: allocation.allocatedAmount || null
                // allocationType: allocation.allocationType || 'digital',
                // currency: allocation.currency || (availableCashCurrencies.length > 0 ? availableCashCurrencies[0] : baseCurrency)
            });
        } else {
            setFormData({
                categoryId: '',
                allocatedAmount: null
                // allocationType: 'digital',
                // currency: availableCashCurrencies.length > 0 ? availableCashCurrencies[0] : baseCurrency
            });
        }
        // }, [allocation, baseCurrency, availableCashCurrencies]);
    }, [allocation]);

    // Calculate available funds
    // const availableDigital = customBudget?.allocatedAmount || 0;

    // const availableCashByCurrency = {};
    // if (hasCashAllocations) {
    //     customBudget.cashAllocations.forEach(alloc => {
    //         availableCashByCurrency[alloc.currencyCode] = alloc.amount;
    //     });
    // }

    // Get wallet cash (for display only - not for validation since allocations come from budget)
    // const walletCashByCurrency = {};
    // if (cashWallet?.balances) {
    //     cashWallet.balances.forEach(balance => {
    //         walletCashByCurrency[balance.currencyCode] = balance.amount;
    //     });
    // }
    const totalBudgetLimit = customBudget?.allocatedAmount || 0;

    const handleSubmit = (e) => {
        e.preventDefault();

        // const normalizedAmount = normalizeAmount(formData.allocatedAmount);

        onSubmit({
            ...formData,
            allocatedAmount: formData.allocatedAmount,
            // currency: formData.allocationType === 'digital' ? baseCurrency : formData.currency
            // Legacy compatibility fields (can be removed if backend doesn't require them)
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
                        // currencySymbol={formData.allocationType === 'digital' ? settings?.currencySymbol : getCurrencySymbol(formData.currency)}
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
