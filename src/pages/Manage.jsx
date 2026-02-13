import { useState, useMemo, useEffect } from "react";
import { Outlet } from "react-router-dom";
import {
    Settings as SettingsIcon,
    Save,
    Trash2,
    SlidersHorizontal,
    FolderOpen,
    RefreshCw,
    Link2
} from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile"; // UPDATED IMPORT

// UI Components
import { Input } from "@/components/ui/input";
import { CustomButton } from "@/components/ui/CustomButton";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Separator } from "@/components/ui/separator";
import { showToast } from "@/components/ui/use-toast";

// Utils & Hooks
import { useSettings } from "../components/utils/SettingsContext";
import { useSettingsForm } from "../components/hooks/useActions";
import { formatCurrency } from "../components/utils/currencyUtils";
import { CURRENCY_OPTIONS, SETTINGS_KEYS, DEFAULT_SETTINGS } from "../components/utils/constants";
import { useAuth } from '@/lib/AuthContext';

export default function ManageLayout() {
    return (
        <div className="min-h-screen p-4 md:p-8 pb-24 bg-gray-50/50">
            <div className="max-w-6xl mx-auto space-y-8">

                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight text-gray-900">Manage</h1>
                        <p className="text-gray-500 mt-1">Configure your workspace, data, and preferences.</p>
                    </div>
                </div>
                {/* Main Content (Child Route) */}
                <main className="flex-1 min-w-0 animate-in fade-in-50 duration-300">
                    <Outlet />
                </main>
            </div>
        </div>
    );
}

export function PreferencesSection() {
    const { settings, updateSettings } = useSettings();
    const { formData, handleFormChange, resetForm } = useSettingsForm(settings, updateSettings);
    const [isSaving, setIsSaving] = useState(false);

    // Dirty Check
    const hasChanges = useMemo(() => {
        if (!settings) return false;
        return SETTINGS_KEYS.some(k => formData[k] !== settings[k]);
    }, [formData, settings]);

    // Prevent navigation if unsaved
    useEffect(() => {
        const handleBeforeUnload = (e) => {
            if (hasChanges) {
                e.preventDefault();
                e.returnValue = '';
            }
        };
        window.addEventListener('beforeunload', handleBeforeUnload);
        return () => window.removeEventListener('beforeunload', handleBeforeUnload);
    }, [hasChanges]);

    const handleSave = async () => {
        setIsSaving(true);
        try {
            await updateSettings(formData);
            showToast({ title: "Preferences Saved", description: "Your display settings have been updated." });
        } catch (error) {
            console.error(error);
            showToast({ title: "Error", description: "Failed to save settings.", variant: "destructive" });
        } finally {
            setIsSaving(false);
        }
    };

    const handleCurrencyChange = (code) => {
        const selected = CURRENCY_OPTIONS.find(c => c.code === code);
        if (selected) {
            handleFormChange('baseCurrency', code);
            handleFormChange('currencySymbol', selected.symbol);
        }
    };

    return (
        <div className="space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle>Display Preferences</CardTitle>
                    <CardDescription>Customize how financial data is displayed across the application.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-8">
                    {/* Currency Group */}
                    <div className="space-y-4">
                        <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wider">Currency</h3>
                        <div className="grid md:grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <Label>Base Currency</Label>
                                <Select value={formData.baseCurrency || 'USD'} onValueChange={handleCurrencyChange}>
                                    <SelectTrigger><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        {CURRENCY_OPTIONS.map(c => (
                                            <SelectItem key={c.code} value={c.code}>{c.symbol} - {c.name}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label>Symbol Position</Label>
                                <Select value={formData.currencyPosition} onValueChange={(v) => handleFormChange('currencyPosition', v)}>
                                    <SelectTrigger><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="before">Before ({formData.currencySymbol}100)</SelectItem>
                                        <SelectItem value="after">After (100{formData.currencySymbol})</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                    </div>

                    <Separator />

                    {/* Formatting Group */}
                    <div className="space-y-4">
                        <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wider">Number Formatting</h3>
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
                            <div className="space-y-2">
                                <Label>Decimal Places</Label>
                                <Input
                                    type="number"
                                    min="0"
                                    max="4"
                                    value={formData.decimalPlaces}
                                    onChange={(e) => handleFormChange('decimalPlaces', parseInt(e.target.value) || 0)}
                                />
                            </div>
                            <div className="flex items-center justify-between h-full pt-6">
                                <Label className="cursor-pointer">Hide Trailing Zeros</Label>
                                <Switch
                                    checked={formData.hideTrailingZeros}
                                    onCheckedChange={(c) => handleFormChange('hideTrailingZeros', c)}
                                />
                            </div>
                        </div>
                    </div>

                    {/* Preview Box */}
                    <div className="bg-slate-50 p-6 rounded-lg border border-slate-100 flex items-center justify-between">
                        <span className="text-sm text-slate-500">Preview:</span>
                        <span className="text-2xl font-bold text-slate-900">
                            {formatCurrency(1234567.89, formData)}
                        </span>
                    </div>
                </CardContent>
            </Card>

            {/* Sticky Action Bar - Only visible when changes exist */}
            <div className={`
                hidden md:flex sticky bottom-6 z-10 p-4 bg-white/80 backdrop-blur-md border border-gray-200 rounded-xl shadow-lg
                items-center justify-between transition-all duration-300 transform
                ${hasChanges ? 'translate-y-0 opacity-100' : 'translate-y-10 opacity-0 pointer-events-none'}
            `}>
                <span className="text-sm font-medium text-gray-600 hidden sm:block">
                    You have unsaved changes
                </span>
                <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
                    <CustomButton
                        onClick={() => {
                            resetForm(settings);
                            showToast({ title: "Discarded", description: "Changes reverted." });
                        }}
                        variant="ghost"
                        size="sm"
                    >
                        Discard
                    </CustomButton>
                    <CustomButton
                        onClick={handleSave}
                        disabled={isSaving}
                        variant="primary"
                        size="sm"
                    >
                        {isSaving ? 'Saving...' : <><Save className="w-4 h-4 mr-2" />Save Changes</>}
                    </CustomButton>
                </div>
            </div>

            {/* MOBILE: Floating Pill above Bottom Nav */}
            <div className={`
                md:hidden fixed bottom-[90px] left-4 right-4 z-50 
                flex items-center justify-between gap-3
                transition-all duration-300 transform
                ${hasChanges ? 'translate-y-0 opacity-100' : 'translate-y-20 opacity-0 pointer-events-none'}
            `}>
                <CustomButton
                    onClick={() => resetForm(settings)}
                    variant="secondary"
                    className="flex-1 shadow-lg border-gray-200 bg-white text-gray-700"
                >
                    Discard
                </CustomButton>
                <CustomButton
                    onClick={handleSave}
                    disabled={isSaving}
                    variant="primary"
                    className="flex-1 shadow-lg"
                >
                    Save
                </CustomButton>
            </div>
        </div>
    );
}

export function AccountSection() {
    const { user, logout } = useAuth();
    const { settings, updateSettings } = useSettings();
    const [localName, setLocalName] = useState(settings.displayName || "");
    const [isSaving, setIsSaving] = useState(false);

    const handleAccountDeletion = () => {
        showToast({ title: "Requested", description: "Account deletion initiated...", variant: "destructive" });
        setTimeout(() => window.location.href = '/', 2000);
    };

    // Sync local state if settings change (e.g., after initial load)
    useEffect(() => {
        setLocalName(settings.displayName || "");
    }, [settings.displayName]);

    const handleSaveName = async () => {
        setIsSaving(true);
        try {
            await updateSettings({ displayName: localName });
            showToast({ title: "Profile Updated", description: "Your display name has been saved." });
        } catch (err) {
            showToast({ title: "Error", description: "Failed to update profile.", variant: "destructive" });
        } finally {
            setIsSaving(false);
        }
    };

    const handleLogout = () => {
        showToast({ title: "Logging out", description: "Securely ending your session..." });
        logout();
    };

    return (
        <div className="space-y-6">
            {/* Identity Card */}
            <Card>
                <CardHeader>
                    <CardTitle>Profile Details</CardTitle>
                    <CardDescription>Manage how you appear in the app.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    {/* Google Info (Read Only) */}
                    <div className="flex flex-col md:flex-row items-center gap-4 p-4 bg-gray-50 rounded-xl border border-gray-100">
                        {user?.picture && (
                            <img src={user.picture} alt="Avatar" className="w-16 h-16 rounded-full border-2 border-white shadow-sm" />
                        )}
                        <div className="text-center md:text-left">
                            <p className="text-sm font-medium text-gray-500">Connected Google Account</p>
                            <p className="font-semibold text-gray-900">{user?.email}</p>
                        </div>
                    </div>

                    {/* Editable Display Name */}
                    <div className="space-y-4">
                        <div className="grid gap-2">
                            <Label htmlFor="displayName">Display Name</Label>
                            <div className="flex gap-2">
                                <Input
                                    id="displayName"
                                    placeholder={user?.name || "Enter name..."}
                                    value={localName}
                                    onChange={(e) => setLocalName(e.target.value)}
                                    className="max-w-md"
                                />
                                <CustomButton
                                    disabled={isSaving || localName === settings.displayName}
                                    onClick={handleSaveName}
                                    variant="primary"
                                >
                                    {isSaving ? "..." : "Update"}
                                </CustomButton>
                            </div>
                            <p className="text-xs text-gray-400">This name will be used across the dashboard and reports.</p>
                        </div>

                        <Separator />

                        <div className="flex flex-wrap gap-3">
                            <CustomButton variant="outline" size="sm" onClick={() => window.open('https://myaccount.google.com/security', '_blank')}>
                                Google Security Settings
                            </CustomButton>
                            <CustomButton
                                variant="ghost"
                                size="sm"
                                className="text-gray-600 hover:text-red-600"
                                onClick={handleLogout}
                            >
                                Sign Out
                            </CustomButton>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Danger Zone */}
            <Card className="border-red-100 shadow-sm">
                <CardHeader>
                    <CardTitle className="text-red-600 flex items-center gap-2">
                        <Trash2 className="w-5 h-5" /> Danger Zone
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="bg-red-50 border border-red-100 rounded-lg p-4 mb-6">
                        <h4 className="text-red-800 font-semibold mb-1 text-sm">Delete Account</h4>
                        <p className="text-red-600 text-xs">
                            Permanently remove your account and all associated data. This action cannot be undone.
                        </p>
                    </div>
                    <AlertDialog>
                        <AlertDialogTrigger asChild>
                            <CustomButton variant="destructive">Delete My Account</CustomButton>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                            <AlertDialogHeader>
                                <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                                <AlertDialogDescription>
                                    This action cannot be undone. This will permanently delete your account and remove all data.
                                </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction onClick={handleAccountDeletion} className="bg-red-600 hover:bg-red-700">
                                    Yes, Delete
                                </AlertDialogAction>
                            </AlertDialogFooter>
                        </AlertDialogContent>
                    </AlertDialog>
                </CardContent>
            </Card>
        </div>
    );
}
