import React from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { CustomButton } from "@/components/ui/CustomButton";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useSettings } from "../components/utils/SettingsContext";
import { useSettingsForm } from "../components/hooks/useActions";
import { formatCurrency } from "../components/utils/currencyUtils";
import { Settings as SettingsIcon, Check } from "lucide-react";
import { CURRENCY_OPTIONS } from "../components/utils/constants";

export default function Settings() {
    const { settings, updateSettings } = useSettings();

    // Form state and submission logic from hook
    const { formData, handleFormChange, handleSubmit, isSaving, saveSuccess } = useSettingsForm(
        settings,
        updateSettings
    );

    const handleCurrencyChange = (code) => {
        const selectedCurrency = CURRENCY_OPTIONS.find(c => c.code === code);
        if (selectedCurrency) {
            // Update both baseCurrency and currencySymbol
            handleFormChange('baseCurrency', code);
            handleFormChange('currencySymbol', selectedCurrency.symbol);
        }
    };

    const previewAmount = 1234567.89;

    return (
        <div className="min-h-screen p-4 md:p-8">
            <div className="max-w-4xl mx-auto space-y-6">
                <div>
                    <h1 className="text-3xl md:text-4xl font-bold text-gray-900">Settings</h1>
                    <p className="text-gray-500 mt-1">Customize your currency and number formatting</p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                    <Card className="border-none shadow-lg">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <SettingsIcon className="w-5 h-5" />
                                Currency & Formatting
                            </CardTitle>
                            <CardDescription>
                                Configure how monetary values are displayed throughout the app
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <div className="space-y-2">
                                <Label htmlFor="currency">Currency</Label>
                                <Select
                                    value={formData.baseCurrency || 'USD'}
                                    onValueChange={handleCurrencyChange}
                                >
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {CURRENCY_OPTIONS.map((currency) => (
                                            <SelectItem key={currency.code} value={currency.code}>
                                                {currency.symbol} - {currency.name} ({currency.code})
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="position">Currency Symbol Position</Label>
                                <Select
                                    value={formData.currencyPosition}
                                    onValueChange={(value) => handleFormChange('currencyPosition', value)}
                                >
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="before">Before amount (e.g., $100)</SelectItem>
                                        <SelectItem value="after">After amount (e.g., 100€)</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="grid md:grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <Label htmlFor="thousand">Thousand Separator</Label>
                                    <Select
                                        value={formData.thousandSeparator}
                                        onValueChange={(value) => handleFormChange('thousandSeparator', value)}
                                    >
                                        <SelectTrigger>
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value=",">, (comma)</SelectItem>
                                            <SelectItem value=".">. (period)</SelectItem>
                                            <SelectItem value=" "> (space)</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="decimal">Decimal Separator</Label>
                                    <Select
                                        value={formData.decimalSeparator}
                                        onValueChange={(value) => handleFormChange('decimalSeparator', value)}
                                    >
                                        <SelectTrigger>
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value=".">. (period)</SelectItem>
                                            <SelectItem value=",">, (comma)</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>

                            <div className="grid md:grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <Label htmlFor="decimals">Decimal Places</Label>
                                    <Input
                                        id="decimals"
                                        type="number"
                                        min="0"
                                        max="4"
                                        value={formData.decimalPlaces}
                                        onChange={(e) => handleFormChange('decimalPlaces', parseInt(e.target.value) || 0)}
                                    />
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="hideZeros" className="flex items-center gap-2 text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                                        <input
                                            type="checkbox"
                                            id="hideZeros"
                                            checked={formData.hideTrailingZeros}
                                            onChange={(e) => handleFormChange('hideTrailingZeros', e.target.checked)}
                                            className="w-4 h-4 rounded border-gray-300"
                                        />
                                        Hide Trailing Zeros
                                    </Label>
                                    <p className="text-xs text-gray-500">Hide unnecessary zeros after decimal point</p>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="dateFormat">Date Format</Label>
                                <Select
                                    value={formData.dateFormat}
                                    onValueChange={(value) => handleFormChange('dateFormat', value)}
                                >
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="MM/dd/yyyy">MM/dd/yyyy (12/31/2024)</SelectItem>
                                        <SelectItem value="dd/MM/yyyy">dd/MM/yyyy (31/12/2024)</SelectItem>
                                        <SelectItem value="yyyy-MM-dd">yyyy-MM-dd (2024-12-31)</SelectItem>
                                        <SelectItem value="dd MMM yyyy">dd MMM yyyy (31 Dec 2024)</SelectItem>
                                        <SelectItem value="MMM dd, yyyy">MMM dd, yyyy (Dec 31, 2024)</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="p-6 bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl border border-blue-100">
                                <p className="text-sm text-gray-600 mb-2">Preview</p>
                                <p className="text-3xl font-bold text-gray-900">
                                    {formatCurrency(previewAmount, formData)}
                                </p>
                            </div>

                            <div className="flex justify-end gap-3 pt-4">
                                <CustomButton
                                    type="submit"
                                    disabled={isSaving}
                                    variant="primary"
                                >
                                    {isSaving ? 'Saving...' : saveSuccess ? (
                                        <>
                                            <Check className="w-4 h-4 mr-2" />
                                            Saved!
                                        </>
                                    ) : 'Save Settings'}
                                </CustomButton>
                            </div>
                        </CardContent>
                    </Card>
                </form>
            </div>
        </div>
    );
}
