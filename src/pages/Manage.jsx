import { useState, useMemo, useEffect } from "react";
import { Outlet } from "react-router-dom";
import {
    Save,
    Trash2,
    Download,
    Wrench,
    RefreshCw
} from "lucide-react";

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
import TutorialSettings from "../components/tutorial/TutorialSettings"; // ADDED 15-Feb-2026: Tutorial management UI

// Utils & Hooks
import { useSettings } from "../components/utils/SettingsContext";
import { useSettingsForm } from "../components/hooks/useActions";
import { formatCurrency } from "../components/utils/currencyUtils";
import { SETTINGS_KEYS } from "../components/utils/constants";
import { useCurrencies } from "../components/hooks/useCurrencies";
import { useAuth } from '@/lib/AuthContext';
import { base44 } from "@/api/base44Client";
import ExportDialog from "../components/manage/ExportDialog";
import { convertToCSV, downloadFile, CSV_HEADERS } from "../components/utils/exportHelpers";

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
    const { currencies } = useCurrencies();
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
        const selected = currencies.find(c => c.code === code);
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
                                        {currencies.map(c => (
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

            {/* ADDED 15-Feb-2026: Tutorial Settings */}
            <TutorialSettings />

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
    const [isRepairing, setIsRepairing] = useState(false);

    // Email/Password Change State
    const [isChangingEmail, setIsChangingEmail] = useState(false);
    const [isChangingPassword, setIsChangingPassword] = useState(false);
    const [newEmail, setNewEmail] = useState("");
    const [currentPassword, setCurrentPassword] = useState("");
    const [newPassword, setNewPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");

    // Data Export State
    const [isExporting, setIsExporting] = useState(false);
    const [showExportDialog, setShowExportDialog] = useState(false);
    const [exportSelections, setExportSelections] = useState({
        transactions: true,
        categories: true,
        budgetGoals: true,
        systemBudgets: true,
        customBudgets: true,
        budgetAllocations: true,
        exchangeRates: true,
        cashWallet: true,
        categoryRules: true,
        recurringTransactions: true,
        settings: true,
        bankConnections: false // Sensitive - default off
    });
    const [dateRange, setDateRange] = useState({ enabled: false, from: null, to: null });
    const [fileFormat, setFileFormat] = useState('json'); // 'json' | 'csv' | 'pdf'
    const [pdfTemplate, setPdfTemplate] = useState('summary'); // 'summary' | 'detailed' | 'comprehensive'

    // Check if user is using email/password auth (not Google)
    const isEmailPasswordAuth = !user?.picture; // Simple heuristic

    const handleAccountDeletion = async () => {
        try {
            // Delete all user data first
            const userEmail = user?.email;
            if (!userEmail) throw new Error("No user email found");

            showToast({ title: "Deleting...", description: "Removing all your data...", variant: "destructive" });

            // Delete user's data from all entities
            await Promise.all([
                base44.entities.Transaction.deleteMany({ created_by: userEmail }),
                base44.entities.Category.deleteMany({ created_by: userEmail }),
                base44.entities.BudgetGoal.deleteMany({ created_by: userEmail }),
                base44.entities.SystemBudget.deleteMany({ created_by: userEmail }),
                base44.entities.CustomBudget.deleteMany({ created_by: userEmail }),
                base44.entities.CustomBudgetAllocation.deleteMany({ created_by: userEmail }),
                base44.entities.ExchangeRate.deleteMany({ created_by: userEmail }),
                base44.entities.CashWallet.deleteMany({ created_by: userEmail }),
                base44.entities.CategoryRule.deleteMany({ created_by: userEmail }),
                base44.entities.RecurringTransaction.deleteMany({ created_by: userEmail }),
                base44.entities.UserSettings.deleteMany({ created_by: userEmail }),
                base44.entities.BankConnection.deleteMany({ created_by: userEmail })
            ]);

            // Note: Actual user account deletion from auth system would need a backend function
            showToast({
                title: "Data Deleted",
                description: "All your data has been removed. Logging out...",
                variant: "destructive"
            });

            setTimeout(() => {
                logout();
            }, 1500);
        } catch (error) {
            console.error("Deletion failed:", error);
            showToast({
                title: "Error",
                description: "Failed to delete account data. Please contact support.",
                variant: "destructive"
            });
        }
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

    const handleUpdateFullName = async () => {
        if (!localName.trim()) {
            showToast({ title: "Error", description: "Name cannot be empty", variant: "destructive" });
            return;
        }

        setIsSaving(true);
        try {
            await base44.auth.updateMe({ full_name: localName.trim() });
            showToast({ title: "Name Updated", description: "Your full name has been changed." });
        } catch (err) {
            console.error(err);
            showToast({ title: "Error", description: "Failed to update name.", variant: "destructive" });
        } finally {
            setIsSaving(false);
        }
    };

    const handleChangeEmail = async () => {
        if (!newEmail.trim() || !currentPassword.trim()) {
            showToast({ title: "Error", description: "Please fill all fields", variant: "destructive" });
            return;
        }

        setIsSaving(true);
        try {
            // This would require a backend function to update email in auth system
            showToast({
                title: "Not Implemented",
                description: "Email change requires backend support. Contact administrator.",
                variant: "destructive"
            });
        } catch (err) {
            showToast({ title: "Error", description: err.message, variant: "destructive" });
        } finally {
            setIsSaving(false);
            setIsChangingEmail(false);
            setNewEmail("");
            setCurrentPassword("");
        }
    };

    const handleChangePassword = async () => {
        if (!currentPassword.trim() || !newPassword.trim() || !confirmPassword.trim()) {
            showToast({ title: "Error", description: "Please fill all fields", variant: "destructive" });
            return;
        }

        if (newPassword !== confirmPassword) {
            showToast({ title: "Error", description: "New passwords don't match", variant: "destructive" });
            return;
        }

        if (newPassword.length < 8) {
            showToast({ title: "Error", description: "Password must be at least 8 characters", variant: "destructive" });
            return;
        }

        setIsSaving(true);
        try {
            // This would require a backend function to update password in auth system
            showToast({
                title: "Not Implemented",
                description: "Password change requires backend support. Contact administrator.",
                variant: "destructive"
            });
        } catch (err) {
            showToast({ title: "Error", description: err.message, variant: "destructive" });
        } finally {
            setIsSaving(false);
            setIsChangingPassword(false);
            setCurrentPassword("");
            setNewPassword("");
            setConfirmPassword("");
        }
    };

    const handleExportData = async () => {
        setIsExporting(true);
        try {
            const userEmail = user?.email;
            if (!userEmail) throw new Error("No user email found");

            const exportData = {};

            // Build date filter if enabled
            const dateFilter = dateRange.enabled && dateRange.from && dateRange.to
                ? { date: { $gte: dateRange.from, $lte: dateRange.to } }
                : {};

            // Fetch selected data types with date filtering where applicable
            if (exportSelections.transactions) {
                exportData.transactions = await base44.entities.Transaction.filter({
                    created_by: userEmail,
                    ...dateFilter
                });
            }
            if (exportSelections.categories) {
                exportData.categories = await base44.entities.Category.filter({ created_by: userEmail });
            }
            if (exportSelections.budgetGoals) {
                exportData.budgetGoals = await base44.entities.BudgetGoal.filter({ created_by: userEmail });
            }
            if (exportSelections.systemBudgets) {
                const budgetFilter = dateRange.enabled && dateRange.from && dateRange.to
                    ? { startDate: { $lte: dateRange.to }, endDate: { $gte: dateRange.from } }
                    : {};
                exportData.systemBudgets = await base44.entities.SystemBudget.filter({
                    created_by: userEmail,
                    ...budgetFilter
                });
            }
            if (exportSelections.customBudgets) {
                const budgetFilter = dateRange.enabled && dateRange.from && dateRange.to
                    ? { startDate: { $lte: dateRange.to }, endDate: { $gte: dateRange.from } }
                    : {};
                exportData.customBudgets = await base44.entities.CustomBudget.filter({
                    created_by: userEmail,
                    ...budgetFilter
                });
            }
            if (exportSelections.budgetAllocations) {
                exportData.budgetAllocations = await base44.entities.CustomBudgetAllocation.filter({ created_by: userEmail });
            }
            if (exportSelections.exchangeRates) {
                exportData.exchangeRates = await base44.entities.ExchangeRate.filter({ created_by: userEmail });
            }
            if (exportSelections.cashWallet) {
                exportData.cashWallet = await base44.entities.CashWallet.filter({ created_by: userEmail });
            }
            if (exportSelections.categoryRules) {
                exportData.categoryRules = await base44.entities.CategoryRule.filter({ created_by: userEmail });
            }
            if (exportSelections.recurringTransactions) {
                exportData.recurringTransactions = await base44.entities.RecurringTransaction.filter({ created_by: userEmail });
            }
            if (exportSelections.settings) {
                exportData.settings = await base44.entities.UserSettings.filter({ created_by: userEmail });
            }
            if (exportSelections.bankConnections) {
                exportData.bankConnections = await base44.entities.BankConnection.filter({ created_by: userEmail });
            }

            // Add metadata
            exportData._metadata = {
                exportDate: new Date().toISOString(),
                userEmail: userEmail,
                appVersion: "1.0.0",
                dateRange: dateRange.enabled ? { from: dateRange.from, to: dateRange.to } : null
            };

            // Enrich with category names for better readability
            if (exportData.transactions && exportData.categories) {
                exportData.transactions = exportData.transactions.map(tx => ({
                    ...tx,
                    category: exportData.categories.find(c => c.id === tx.category_id)?.name || 'Uncategorized'
                }));
            }

            // Export based on selected format
            if (fileFormat === 'json') {
                const dataStr = JSON.stringify(exportData, null, 2);
                downloadFile(
                    dataStr,
                    `budgetwise-data-${new Date().toISOString().split('T')[0]}.json`,
                    'application/json'
                );
                showToast({ title: "Export Complete", description: "JSON data downloaded successfully." });
            } else if (fileFormat === 'csv') {
                // Export each entity type as separate CSV
                const csvFiles = [];

                Object.entries(exportData).forEach(([key, data]) => {
                    if (key === '_metadata' || !Array.isArray(data) || data.length === 0) return;

                    const headers = CSV_HEADERS[key];
                    if (headers) {
                        const csv = convertToCSV(data, headers);
                        csvFiles.push({ name: key, content: csv });
                    }
                });

                // For simplicity, download the first/largest dataset as CSV
                // Or create a ZIP file with all CSVs (requires additional library)
                if (csvFiles.length > 0) {
                    const mainFile = csvFiles.find(f => f.name === 'transactions') || csvFiles[0];
                    downloadFile(
                        mainFile.content,
                        `budgetwise-${mainFile.name}-${new Date().toISOString().split('T')[0]}.csv`,
                        'text/csv'
                    );
                    showToast({
                        title: "CSV Export Complete",
                        description: `Downloaded ${mainFile.name}.csv. Other entities available in JSON format.`
                    });
                }
            } else if (fileFormat === 'pdf') {
                // Call backend function to generate PDF
                showToast({ title: "Generating PDF", description: "Creating your report..." });

                const response = await base44.functions.invoke('generatePdfReport', {
                    template: pdfTemplate,
                    data: exportData,
                    dateRange: dateRange.enabled ? { from: dateRange.from, to: dateRange.to } : null,
                    settings: {
                        currencySymbol: settings.currencySymbol || '$',
                        decimalPlaces: settings.decimalPlaces || 2
                    }
                });

                // Download PDF
                const blob = new Blob([response.data], { type: 'application/pdf' });
                const url = URL.createObjectURL(blob);
                const link = document.createElement('a');
                link.href = url;
                link.download = `budgetwise-report-${new Date().toISOString().split('T')[0]}.pdf`;
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                URL.revokeObjectURL(url);

                showToast({ title: "PDF Export Complete", description: "Your report has been downloaded." });
            }

            setShowExportDialog(false);
        } catch (error) {
            console.error("Export failed:", error);
            showToast({ title: "Error", description: "Failed to export data.", variant: "destructive" });
        } finally {
            setIsExporting(false);
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
                    <CardDescription>Manage your account information and authentication.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    {/* Account Info */}
                    <div className="flex flex-col md:flex-row items-center gap-4 p-4 bg-gray-50 rounded-xl border border-gray-100">
                        {user?.picture && (
                            <img src={user.picture} alt="Avatar" className="w-16 h-16 rounded-full border-2 border-white shadow-sm" />
                        )}
                        <div className="text-center md:text-left">
                            <p className="text-sm font-medium text-gray-500">
                                {user?.picture ? 'Connected Google Account' : 'Email Account'}
                            </p>
                            <p className="font-semibold text-gray-900">{user?.email}</p>
                            {user?.name && <p className="text-sm text-gray-600">{user.name}</p>}
                        </div>
                    </div>

                    {/* Full Name (System Level) */}
                    <div className="space-y-2">
                        <Label htmlFor="fullName">Full Name</Label>
                        <div className="flex gap-2">
                            <Input
                                id="fullName"
                                placeholder="Enter your full name..."
                                value={localName}
                                onChange={(e) => setLocalName(e.target.value)}
                                className="max-w-md"
                            />
                            <CustomButton
                                disabled={isSaving || localName === (user?.name || settings.displayName)}
                                onClick={handleUpdateFullName}
                                variant="primary"
                            >
                                {isSaving ? "..." : "Update"}
                            </CustomButton>
                        </div>
                        <p className="text-xs text-gray-400">This name is used across your account and reports.</p>
                    </div>

                    {/* Email/Password Management (Only for non-Google users) */}
                    {isEmailPasswordAuth && (
                        <>
                            <Separator />

                            <div className="space-y-4">
                                <h3 className="text-sm font-semibold text-gray-700">Authentication</h3>

                                {/* Change Email */}
                                <div className="space-y-2">
                                    {!isChangingEmail ? (
                                        <CustomButton
                                            variant="outline"
                                            size="sm"
                                            onClick={() => setIsChangingEmail(true)}
                                        >
                                            Change Email
                                        </CustomButton>
                                    ) : (
                                        <div className="space-y-3 p-4 bg-blue-50 rounded-lg border">
                                            <Label htmlFor="newEmail">New Email Address</Label>
                                            <Input
                                                id="newEmail"
                                                type="email"
                                                placeholder="new.email@example.com"
                                                value={newEmail}
                                                onChange={(e) => setNewEmail(e.target.value)}
                                            />
                                            <Label htmlFor="emailPassword">Current Password</Label>
                                            <Input
                                                id="emailPassword"
                                                type="password"
                                                placeholder="Enter current password"
                                                value={currentPassword}
                                                onChange={(e) => setCurrentPassword(e.target.value)}
                                            />
                                            <div className="flex gap-2">
                                                <CustomButton
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() => {
                                                        setIsChangingEmail(false);
                                                        setNewEmail("");
                                                        setCurrentPassword("");
                                                    }}
                                                >
                                                    Cancel
                                                </CustomButton>
                                                <CustomButton
                                                    variant="primary"
                                                    size="sm"
                                                    onClick={handleChangeEmail}
                                                    disabled={isSaving}
                                                >
                                                    {isSaving ? "Updating..." : "Update Email"}
                                                </CustomButton>
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {/* Change Password */}
                                <div className="space-y-2">
                                    {!isChangingPassword ? (
                                        <CustomButton
                                            variant="outline"
                                            size="sm"
                                            onClick={() => setIsChangingPassword(true)}
                                        >
                                            Change Password
                                        </CustomButton>
                                    ) : (
                                        <div className="space-y-3 p-4 bg-blue-50 rounded-lg border">
                                            <Label htmlFor="currentPass">Current Password</Label>
                                            <Input
                                                id="currentPass"
                                                type="password"
                                                placeholder="Enter current password"
                                                value={currentPassword}
                                                onChange={(e) => setCurrentPassword(e.target.value)}
                                            />
                                            <Label htmlFor="newPass">New Password</Label>
                                            <Input
                                                id="newPass"
                                                type="password"
                                                placeholder="At least 8 characters"
                                                value={newPassword}
                                                onChange={(e) => setNewPassword(e.target.value)}
                                            />
                                            <Label htmlFor="confirmPass">Confirm New Password</Label>
                                            <Input
                                                id="confirmPass"
                                                type="password"
                                                placeholder="Re-enter new password"
                                                value={confirmPassword}
                                                onChange={(e) => setConfirmPassword(e.target.value)}
                                            />
                                            <div className="flex gap-2">
                                                <CustomButton
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() => {
                                                        setIsChangingPassword(false);
                                                        setCurrentPassword("");
                                                        setNewPassword("");
                                                        setConfirmPassword("");
                                                    }}
                                                >
                                                    Cancel
                                                </CustomButton>
                                                <CustomButton
                                                    variant="primary"
                                                    size="sm"
                                                    onClick={handleChangePassword}
                                                    disabled={isSaving}
                                                >
                                                    {isSaving ? "Updating..." : "Update Password"}
                                                </CustomButton>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </>
                    )}

                    <Separator />

                    <div className="flex flex-wrap gap-3">
                        {user?.picture && (
                            <CustomButton variant="outline" size="sm" onClick={() => window.open('https://myaccount.google.com/security', '_blank')}>
                                Google Security Settings
                            </CustomButton>
                        )}
                        <CustomButton
                            variant="ghost"
                            size="sm"
                            className="text-gray-600 hover:text-red-600"
                            onClick={handleLogout}
                        >
                            Sign Out
                        </CustomButton>
                    </div>
                </CardContent>
            </Card>

            {/* Data Export Card */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Download className="w-5 h-5" /> Export Your Data
                    </CardTitle>
                    <CardDescription>Download your financial data in JSON, CSV, or PDF format with custom date ranges.</CardDescription>
                </CardHeader>
                <CardContent>
                    <CustomButton
                        variant="outline"
                        onClick={() => setShowExportDialog(true)}
                    >
                        <Download className="w-4 h-4 mr-2" />
                        Export Data
                    </CustomButton>
                </CardContent>
            </Card>

            {/* Export Dialog */}
            <ExportDialog
                open={showExportDialog}
                onOpenChange={setShowExportDialog}
                exportSelections={exportSelections}
                setExportSelections={setExportSelections}
                dateRange={dateRange}
                setDateRange={setDateRange}
                fileFormat={fileFormat}
                setFileFormat={setFileFormat}
                pdfTemplate={pdfTemplate}
                setPdfTemplate={setPdfTemplate}
                onExport={handleExportData}
                isExporting={isExporting}
            />

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