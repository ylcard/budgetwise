import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { CustomButton } from "@/components/ui/CustomButton";
import { Label } from "@/components/ui/label";
import { AlertCircle, Trash2, Plus } from "lucide-react";
import AmountInput from "../ui/AmountInput";
import DateRangePicker from "../ui/DateRangePicker";
import CurrencySelect from "../ui/CurrencySelect";
import { PRESET_COLORS } from "../utils/constants";
import { normalizeAmount } from "../utils/generalUtils";
import { getCurrencyBalance, validateCashAllocations } from "../utils/cashAllocationUtils";
import { formatCurrency } from "../utils/currencyUtils";
import { getCurrencySymbol } from "../utils/currencyUtils";
import { usePeriod } from "../hooks/usePeriod";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { showToast } from "@/components/ui/use-toast";

export default function CustomBudgetForm({
    budget,
    onSubmit,
    onCancel,
    isSubmitting,
    cashWallet,
    baseCurrency,
    settings
}) {
    const { monthStart, monthEnd } = usePeriod();

    const [formData, setFormData] = useState({
        name: '',
        allocatedAmount: null,
        cashAllocations: [],
        startDate: monthStart,
        endDate: monthEnd,
        description: '',
        color: '#3B82F6'
    });

    const [validationError, setValidationError] = useState(null);

    // Get available currencies from wallet
    const availableCurrencies = cashWallet?.balances
        ?.filter(b => b.amount > 0)
        .map(b => b.currencyCode) || [];

    useEffect(() => {
        if (budget) {
            setFormData({
                name: budget.name || '',
                allocatedAmount: budget.allocatedAmount?.toString() || null,
                cashAllocations: budget.cashAllocations || [],
                startDate: budget.startDate || monthStart,
                endDate: budget.endDate || monthEnd,
                description: budget.description || '',
                color: budget.color || '#3B82F6'
            });
        } else {
            setFormData(prev => ({
                ...prev,
                startDate: monthStart,
                endDate: monthEnd,
                cashAllocations: []
            }));
        }
    }, [budget, monthStart, monthEnd]);

    const handleAddCashAllocation = () => {
        // Check if there's cash available
        if (availableCurrencies.length === 0) {
            showToast({
                title: "No cash available",
                description: "There's no cash in your wallet to allocate.",
                variant: "destructive"
            });
            return;
        }

        const defaultCurrency = availableCurrencies[0] || baseCurrency || 'USD';
        setFormData(prev => ({
            ...prev,
            cashAllocations: [
                ...prev.cashAllocations,
                { currencyCode: defaultCurrency, amount: null }
            ]
        }));
    };

    const handleRemoveCashAllocation = (index) => {
        setFormData(prev => ({
            ...prev,
            cashAllocations: prev.cashAllocations.filter((_, i) => i !== index)
        }));
    };

    const handleCashAllocationChange = (index, field, value) => {
        setFormData(prev => ({
            ...prev,
            cashAllocations: prev.cashAllocations.map((alloc, i) =>
                i === index ? { ...alloc, [field]: value } : alloc
            )
        }));
    };

    const handleDateRangeChange = (start, end) => {
        setFormData(prev => ({
            ...prev,
            startDate: start,
            endDate: end
        }));
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        setValidationError(null);

        const normalizedAmount = normalizeAmount(formData.allocatedAmount);

        const processedCashAllocations = formData.cashAllocations
            .map(alloc => ({
                currencyCode: alloc.currencyCode,
                amount: parseFloat(normalizeAmount(alloc.amount || '0'))
            }))
            .filter(alloc => alloc.amount > 0);

        // Smart validation - only validate NEW allocations when editing
        let allocationsToValidate = processedCashAllocations;

        if (budget && budget.cashAllocations) {
            // When editing, calculate the NET CHANGE in allocations
            const oldAllocationsMap = {};
            budget.cashAllocations.forEach(alloc => {
                oldAllocationsMap[alloc.currencyCode] = alloc.amount;
            });

            // Only validate amounts that are INCREASES from the original allocation
            allocationsToValidate = processedCashAllocations
                .map(newAlloc => {
                    const oldAmount = oldAllocationsMap[newAlloc.currencyCode] || 0;
                    const increase = newAlloc.amount - oldAmount;

                    // Only validate if there's an increase (requesting MORE cash)
                    if (increase > 0) {
                        return {
                            currencyCode: newAlloc.currencyCode,
                            amount: increase
                        };
                    }
                    return null;
                })
                .filter(alloc => alloc !== null);
        }

        // Validate only the net new allocations (or all allocations if creating new budget)
        if (allocationsToValidate.length > 0) {
            const validation = validateCashAllocations(
                cashWallet,
                allocationsToValidate,
                baseCurrency
            );

            if (!validation.valid) {
                const errorMessages = validation.errors.map(err =>
                    `${err.currency}: Requested ${err.requested.toFixed(2)}, Available ${err.available.toFixed(2)}`
                ).join('; ');
                setValidationError(`Insufficient balance: ${errorMessages}`);
                return;
            }
        }

        return onSubmit({
            ...formData,
            allocatedAmount: parseFloat(normalizedAmount),
            cashAllocations: processedCashAllocations,
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

            <div className="grid grid-cols-2 gap-3 items-end">
                <div className="space-y-2">
                    <Label htmlFor="name">Budget Name</Label>
                    <Input
                        id="name"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        placeholder="e.g., Manchester Trip"
                        required
                        autoFocus
                        autoComplete="off"
                    />
                </div>

                <div className="space-y-2">
                    <Label>Date Range</Label>
                    <DateRangePicker
                        startDate={formData.startDate}
                        endDate={formData.endDate}
                        onRangeChange={handleDateRangeChange}
                    />
                </div>
            </div>

            <div className="grid grid-cols-[200px_1fr] gap-3 items-end">
                <div className="space-y-2">
                    <Label htmlFor="allocatedAmount">Card Budget</Label>
                    <AmountInput
                        id="allocatedAmount"
                        value={formData.allocatedAmount}
                        onChange={(value) => setFormData({ ...formData, allocatedAmount: value })}
                        placeholder="0.00"
                        required
                    />
                </div>

                <CustomButton
                    type="button"
                    variant="outline"
                    onClick={handleAddCashAllocation}
                    className="h-10"
                >
                    <Plus className="w-4 h-4 mr-2" />
                    Add Cash
                </CustomButton>
            </div>

            {formData.cashAllocations.length > 0 && (
                <div className="space-y-2 p-3 bg-green-50 rounded-lg border border-green-200">
                    <Label className="text-sm font-semibold text-green-900">Cash Allocations</Label>

                    <div className="space-y-2">
                        {formData.cashAllocations.map((alloc, index) => {
                            const available = getCurrencyBalance(cashWallet, alloc.currencyCode);
                            return (
                                <div key={index} className="grid grid-cols-[120px_1fr_auto] gap-2 items-end bg-white p-2 rounded border border-green-200">
                                    <div className="space-y-1">
                                        <Label className="text-xs">Currency</Label>
                                        <CurrencySelect
                                            value={alloc.currencyCode}
                                            onValueChange={(value) =>
                                                handleCashAllocationChange(index, 'currencyCode', value)
                                            }
                                            filterCurrencies={availableCurrencies}
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <Label className="text-xs flex items-center justify-between">
                                            <span>Amount</span>
                                            <span className="text-gray-500 font-normal">
                                                Available: {settings ? formatCurrency(available, { ...settings, currencySymbol: getCurrencySymbol(alloc.currencyCode) }) : `${getCurrencySymbol(alloc.currencyCode)}${available.toFixed(2)}`}
                                            </span>
                                        </Label>
                                        <AmountInput
                                            value={alloc.amount}
                                            onChange={(value) =>
                                                handleCashAllocationChange(index, 'amount', value)
                                            }
                                            placeholder="0.00"
                                            currencySymbol={getCurrencySymbol(alloc.currencyCode)}
                                        />
                                    </div>
                                    <CustomButton
                                        type="button"
                                        variant="ghost"
                                        size="icon"
                                        onClick={() => handleRemoveCashAllocation(index)}
                                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </CustomButton>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            <div className="space-y-2">
                <Label className="text-sm">Color</Label>
                <div className="flex gap-2">
                    {PRESET_COLORS.map((color) => (
                        <button
                            key={color}
                            type="button"
                            onClick={() => setFormData({ ...formData, color })}
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
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
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
