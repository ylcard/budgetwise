
import { useState, useEffect } from "react";
import { CustomButton } from "@/components/ui/CustomButton";
import { Label } from "@/components/ui/label";
import AmountInput from "../ui/AmountInput";
import CategorySelect from "../ui/CategorySelect";
import CurrencySelect from "../ui/CurrencySelect";
import { normalizeAmount } from "../utils/generalUtils";
import { getCurrencySymbol, formatCurrency } from "../utils/currencyUtils";

export default function AllocationForm({
    allocation,
    customBudget,
    categories,
    onSubmit,
    onCancel,
    isSubmitting,
    settings,
    cashWallet
}) {
    const baseCurrency = settings?.baseCurrency || 'USD';
    const hasCashAllocations = customBudget?.cashAllocations && customBudget.cashAllocations.length > 0;

    // Extract available currencies from customBudget.cashAllocations
    const availableCashCurrencies = hasCashAllocations
        ? customBudget.cashAllocations.map(alloc => alloc.currencyCode)
        : [];

    const [formData, setFormData] = useState({
        categoryId: '',
        allocatedAmount: '',
        allocationType: 'digital',
        currency: availableCashCurrencies.length > 0 ? availableCashCurrencies[0] : baseCurrency
    });

    useEffect(() => {
        if (allocation) {
            setFormData({
                categoryId: allocation.categoryId || '',
                allocatedAmount: allocation.allocatedAmount?.toString() || '',
                allocationType: allocation.allocationType || 'digital',
                currency: allocation.currency || (availableCashCurrencies.length > 0 ? availableCashCurrencies[0] : baseCurrency)
            });
        } else {
            setFormData({
                categoryId: '',
                allocatedAmount: '',
                allocationType: 'digital',
                currency: availableCashCurrencies.length > 0 ? availableCashCurrencies[0] : baseCurrency
            });
        }
    }, [allocation, baseCurrency, availableCashCurrencies]);

    // Calculate available funds
    const availableDigital = customBudget?.allocatedAmount || 0;

    const availableCashByCurrency = {};
    if (hasCashAllocations) {
        customBudget.cashAllocations.forEach(alloc => {
            availableCashByCurrency[alloc.currencyCode] = alloc.amount;
        });
    }

    // Get wallet cash (for display only - not for validation since allocations come from budget)
    const walletCashByCurrency = {};
    if (cashWallet?.balances) {
        cashWallet.balances.forEach(balance => {
            walletCashByCurrency[balance.currencyCode] = balance.amount;
        });
    }

    const handleSubmit = (e) => {
        e.preventDefault();

        const normalizedAmount = normalizeAmount(formData.allocatedAmount);

        onSubmit({
            ...formData,
            allocatedAmount: parseFloat(normalizedAmount),
            currency: formData.allocationType === 'digital' ? baseCurrency : formData.currency
        });
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            {/* Allocation Type - Only show if cash allocations exist */}
            {hasCashAllocations && (
                <div className="space-y-2">
                    <Label>Allocation Type</Label>
                    <div className="grid grid-cols-2 gap-2">
                        <CustomButton
                            type="button"
                            variant={formData.allocationType === 'digital' ? 'default' : 'outline'}
                            onClick={() => setFormData({ ...formData, allocationType: 'digital', currency: baseCurrency })}
                            className="w-full"
                        >
                            Card
                        </CustomButton>
                        <CustomButton
                            type="button"
                            variant={formData.allocationType === 'cash' ? 'default' : 'outline'}
                            onClick={() => setFormData({ ...formData, allocationType: 'cash', currency: availableCashCurrencies[0] || baseCurrency })}
                            className="w-full"
                        >
                            Cash
                        </CustomButton>
                    </div>
                </div>
            )}

            {/* Available Funds Display */}
            <div className="p-3 bg-blue-50 rounded-lg space-y-1">
                <p className="text-sm font-medium text-gray-700">Available to Allocate:</p>
                {formData.allocationType === 'digital' ? (
                    <p className="text-lg font-bold text-blue-600">
                        {formatCurrency(availableDigital, settings)}
                    </p>
                ) : (
                    <div className="space-y-1">
                        {Object.entries(availableCashByCurrency).map(([currency, amount]) => (
                            <p key={currency} className="text-sm font-semibold text-blue-600">
                                {currency}: {formatCurrency(amount, { ...settings, currencySymbol: getCurrencySymbol(currency) })}
                            </p>
                        ))}
                        {Object.keys(availableCashByCurrency).length === 0 && (
                            <p className="text-sm text-gray-500">No cash allocated to this budget</p>
                        )}
                    </div>
                )}

                {/* Also show wallet cash for reference */}
                {formData.allocationType === 'cash' && Object.keys(walletCashByCurrency).length > 0 && (
                    <div className="mt-2 pt-2 border-t border-blue-200">
                        <p className="text-xs text-gray-600 mb-1">Wallet Cash (for reference):</p>
                        {Object.entries(walletCashByCurrency).map(([currency, amount]) => (
                            <p key={currency} className="text-xs text-gray-600">
                                {currency}: {formatCurrency(amount, { ...settings, currencySymbol: getCurrencySymbol(currency) })}
                            </p>
                        ))}
                    </div>
                )}
            </div>

            {/* Category Selection */}
            <div className="space-y-2">
                <Label htmlFor="categoryId">Category *</Label>
                <CategorySelect
                    value={formData.categoryId}
                    onValueChange={(value) => setFormData({ ...formData, categoryId: value })}
                    categories={categories}
                />
            </div>

            {/* Amount and Currency */}
            <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                    <Label htmlFor="allocatedAmount">Amount *</Label>
                    <AmountInput
                        id="allocatedAmount"
                        value={formData.allocatedAmount}
                        onChange={(e) => setFormData({ ...formData, allocatedAmount: e.target.value })}
                        placeholder="0.00"
                        currencySymbol={formData.allocationType === 'digital' ? settings?.currencySymbol : getCurrencySymbol(formData.currency)}
                        required
                    />
                </div>

                {/* Currency - Only show for cash allocations and limited to available currencies */}
                {formData.allocationType === 'cash' && availableCashCurrencies.length > 0 && (
                    <div className="space-y-2">
                        <Label htmlFor="currency">Currency *</Label>
                        <CurrencySelect
                            value={formData.currency}
                            onValueChange={(value) => setFormData({ ...formData, currency: value })}
                            limitToCurrencies={availableCashCurrencies}
                        />
                    </div>
                )}
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
