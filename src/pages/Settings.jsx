import { useState, useEffect, /* useRef, */ useMemo } from "react"; // UPDATED 17-Jan-2026: Commented out useRef
import { Input } from "@/components/ui/input";
import { CustomButton } from "@/components/ui/CustomButton";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, /* CardFooter */ } from "@/components/ui/card"; // UPDATED 17-Jan-2026: Commented out CardFooter
import { Switch } from "@/components/ui/switch";
import { useSettings } from "../components/utils/SettingsContext";
import { useSettingsForm, /* useGoalActions */ } from "../components/hooks/useActions"; // UPDATED 17-Jan-2026: Commented out useGoalActions
// import { useGoals } from "../components/hooks/useBase44Entities"; // REMOVED 17-Jan-2026: Goals moved to Reports
import { formatCurrency } from "../components/utils/currencyUtils";
import { Settings as SettingsIcon, Save, LogOut } from "lucide-react"; // UPDATED 17-Jan-2026: Removed unused icons
import { base44 } from "@/api/base44Client";
import {
    CURRENCY_OPTIONS,
    // FINANCIAL_PRIORITIES, // REMOVED 17-Jan-2026: Goals moved to Reports
    SETTINGS_KEYS,
    DEFAULT_SETTINGS
} from "../components/utils/constants";
// import AmountInput from "../components/ui/AmountInput"; // REMOVED 17-Jan-2026: Goals moved to Reports
// import { Skeleton } from "@/components/ui/skeleton"; // REMOVED 17-Jan-2026: Goals moved to Reports
import { showToast } from "@/components/ui/use-toast";

export default function Settings() {
    const { settings, updateSettings, user } = useSettings();

    // --- 1. GENERAL SETTINGS LOGIC ---
    const { formData, handleFormChange, resetForm } = useSettingsForm(
        settings,
        updateSettings
    );

    const handleCurrencyChange = (code) => {
        const selectedCurrency = CURRENCY_OPTIONS.find(c => c.code === code);
        if (selectedCurrency) {
            handleFormChange('baseCurrency', code);
            handleFormChange('currencySymbol', selectedCurrency.symbol);
        }
    };

    // REMOVED 17-Jan-2026: Goal Settings logic moved to Reports page

    // --- 3. SMART SAVE LOGIC ---
    // Dirty Check: Compare current state vs DB state
    const hasChanges = useMemo(() => {
        if (!settings) return false;

        // General Settings only (goals removed)
        return SETTINGS_KEYS.some(k => formData[k] !== settings[k]);
    }, [formData, settings]);

    // --- NAVIGATION GUARD (Browser Level) ---
    useEffect(() => {
        const handleBeforeUnload = (e) => {
            if (hasChanges) {
                e.preventDefault();
                e.returnValue = ''; // Chrome requires this
            }
        };
        window.addEventListener('beforeunload', handleBeforeUnload);
        return () => window.removeEventListener('beforeunload', handleBeforeUnload);
    }, [hasChanges]);

    const [isGlobalSaving, setIsGlobalSaving] = useState(false);

    // --- ACTIONS ---
    const handleDiscard = () => {
        resetForm(settings);
        showToast({ title: "Changes Discarded", description: "Settings reverted to last saved state." });
    };

    const handleResetToDefaults = () => {
        if (!window.confirm("Are you sure you want to reset all settings to factory defaults?")) return;
        resetForm(DEFAULT_SETTINGS);
        showToast({ title: "Reset Applied", description: "Settings reset to defaults. Click Save to apply." });
    };

    const handleGlobalSave = async () => {
        setIsGlobalSaving(true);
        try {
            await updateSettings(formData);
            showToast({ title: "Success", description: "Settings saved successfully" });
        } catch (error) {
            console.error('Save error:', error);
            showToast({ title: "Error", description: "Failed to save settings.", variant: "destructive" });
        } finally {
            setIsGlobalSaving(false);
        }
    };


    const previewAmount = 1234567.89;

    return (
        <div className="min-h-screen p-4 md:p-8 pb-24">
            <div className="max-w-4xl mx-auto space-y-8">
                <div>
                    <h1 className="text-3xl md:text-4xl font-bold text-gray-900">Settings</h1>
                    <p className="text-gray-500 mt-1">Manage your preferences and financial goals</p>
                </div>

                <Card className="border-none shadow-lg">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <SettingsIcon className="w-5 h-5" />
                            Application Preferences
                        </CardTitle>
                        <CardDescription>
                            Manage currency formatting and budget allocation goals
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        {/* SECTION 1: CURRENCY & FORMATTING */}
                        <div className="space-y-6">
                            <div className="flex items-center gap-2 pb-2 border-b border-gray-100">
                                <h3 className="font-semibold text-gray-900">Currency & Formatting</h3>
                            </div>

                            {/* ... Currency Inputs ... */}
                            <div className="space-y-2">
                                <Label htmlFor="currency">Currency</Label>
                                <Select value={formData.baseCurrency || 'USD'} onValueChange={handleCurrencyChange}>
                                    <SelectTrigger><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        {CURRENCY_OPTIONS.map((c) => (
                                            <SelectItem key={c.code} value={c.code}>{c.symbol} - {c.name} ({c.code})</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="grid md:grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <Label>Position</Label>
                                    <Select value={formData.currencyPosition} onValueChange={(v) => handleFormChange('currencyPosition', v)}>
                                        <SelectTrigger><SelectValue /></SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="before">Before ({formData.currencySymbol}100)</SelectItem>
                                            <SelectItem value="after">After (100{formData.currencySymbol})</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <Label>View Mode</Label>
                                    <Select value={formData.budgetViewMode || 'bars'} onValueChange={(v) => handleFormChange('budgetViewMode', v)}>
                                        <SelectTrigger><SelectValue /></SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="bars">Bars</SelectItem>
                                            <SelectItem value="cards">Cards</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>

                            {/* ... Formatting Inputs ... */}
                            <div className="grid md:grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <Label>Thousand Separator</Label>
                                    <Select value={formData.thousandSeparator} onValueChange={(v) => handleFormChange('thousandSeparator', v)}>
                                        <SelectTrigger><SelectValue /></SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value=",">Comma (,)</SelectItem>
                                            <SelectItem value=".">Period (.)</SelectItem>
                                            <SelectItem value=" ">Space</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <Label>Decimal Separator</Label>
                                    <Select value={formData.decimalSeparator} onValueChange={(v) => handleFormChange('decimalSeparator', v)}>
                                        <SelectTrigger><SelectValue /></SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value=".">Period (.)</SelectItem>
                                            <SelectItem value=",">Comma (,)</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>

                            <div className="grid md:grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <Label>Decimal Places</Label>
                                    <Input type="number" min="0" max="4" value={formData.decimalPlaces} onChange={(e) => handleFormChange('decimalPlaces', parseInt(e.target.value) || 0)} />
                                </div>
                                <div className="flex items-center justify-between pt-8">
                                    <Label className="cursor-pointer font-medium">Hide Trailing Zeros</Label>
                                    <Switch 
                                        checked={formData.hideTrailingZeros} 
                                        onCheckedChange={(checked) => handleFormChange('hideTrailingZeros', checked)} 
                                    />
                                </div>
                            </div>
                            <div className="p-4 bg-slate-50 rounded-lg border border-slate-100">
                                <p className="text-xs text-gray-500 mb-1">Preview</p>
                                <p className="text-2xl font-bold text-gray-900">{formatCurrency(previewAmount, formData)}</p>
                            </div>
                        </div>

                        {/* REMOVED 17-Jan-2026: Goal Allocation moved to Reports page */}
                    </CardContent>
                </Card>

                {/* ADDED 26-Jan-2026: Logout Section */}
                <Card className="border-none shadow-lg">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <LogOut className="w-5 h-5" />
                            Account
                        </CardTitle>
                        <CardDescription>
                            Manage your account and session
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                            <div>
                                <p className="font-medium text-gray-900">{user?.full_name || user?.email}</p>
                                <p className="text-sm text-gray-500">{user?.email}</p>
                            </div>
                            <CustomButton
                                variant="delete"
                                onClick={() => base44.auth.logout()}
                            >
                                <LogOut className="w-4 h-4" />
                                Logout
                            </CustomButton>
                        </div>
                    </CardContent>
                </Card>
                {/* --- STATIC ACTION BUTTONS --- */}
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-gray-100">
                    <CustomButton
                        onClick={handleResetToDefaults}
                        variant="outline"
                        className="w-full sm:w-auto text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200"
                    >
                        Reset to Defaults
                    </CustomButton>

                    <div className="flex items-center gap-3 w-full sm:w-auto">
                        {hasChanges && (
                            <div className="flex items-center gap-3 w-full sm:w-auto animate-in fade-in slide-in-from-right-4 duration-300">
                                <CustomButton
                                    onClick={handleDiscard}
                                    variant="ghost"
                                    className="w-full sm:w-auto"
                                >
                                    Discard Changes
                                </CustomButton>
                            </div>
                        )}

                        <CustomButton
                            onClick={handleGlobalSave}
                            disabled={isGlobalSaving || !hasChanges}
                            variant="primary"
                            className="w-full sm:w-auto min-w-[140px]"
                        >
                            {isGlobalSaving ? 'Saving...' : <><Save className="w-4 h-4 mr-2" />Save Settings</>}
                        </CustomButton>
                    </div>
                </div>
            </div>
        </div>
    );
}