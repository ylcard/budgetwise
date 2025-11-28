import { useState, useEffect, useRef, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { CustomButton } from "@/components/ui/CustomButton";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useSettings } from "../components/utils/SettingsContext";
import { useSettingsForm, useGoalActions } from "../components/hooks/useActions";
import { useGoals } from "../components/hooks/useBase44Entities";
import { formatCurrency } from "../components/utils/currencyUtils";
import { Settings as SettingsIcon, Target, GripVertical, Lock, Save, AlertCircle } from "lucide-react";
import { CURRENCY_OPTIONS } from "../components/utils/constants";
import AmountInput from "../components/ui/AmountInput";
import { Skeleton } from "@/components/ui/skeleton";
import { showToast } from "@/components/ui/use-toast";

const priorityConfig = {
    needs: { label: "Needs", color: "#EF4444", description: "Essential expenses" },
    wants: { label: "Wants", color: "#F59E0B", description: "Discretionary spending" },
    savings: { label: "Savings", color: "#10B981", description: "Savings and investments" }
};

const SETTINGS_KEYS = [
    'baseCurrency',
    'currencyPosition',
    'budgetViewMode',
    'thousandSeparator',
    'decimalSeparator',
    'decimalPlaces',
    'hideTrailingZeros',
    'fixedLifestyleMode'
];


export default function Settings() {
    const { settings, updateSettings, user } = useSettings();

    // --- 1. GENERAL SETTINGS LOGIC ---
    const { formData, handleFormChange } = useSettingsForm(
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

    // --- 2. GOAL SETTINGS LOGIC (Moved from Component) ---
    const { goals, isLoading: loadingGoals } = useGoals(user);
    const { handleGoalUpdate, isSaving: isGoalSaving } = useGoalActions(user, goals);

    // Mode State
    const [localGoalMode, setLocalGoalMode] = useState(settings.goalMode ?? true);
    const isAbsoluteMode = !localGoalMode;

    // Slider State (Percentage)
    const [splits, setSplits] = useState({ split1: 50, split2: 80 });
    const containerRef = useRef(null);
    const [activeThumb, setActiveThumb] = useState(null);

    // Input State (Absolute)
    const [absoluteValues, setAbsoluteValues] = useState({
        needs: '', wants: '', savings: ''
    });

    // Sync local mode when DB settings load
    useEffect(() => {
        setLocalGoalMode(settings.goalMode ?? true);
    }, [settings.goalMode]);

    // Sync values when Goals load
    useEffect(() => {
        if (goals.length > 0) {
            // 1. Sync Absolute Values
            setAbsoluteValues({
                needs: goals.find(g => g.priority === 'needs')?.target_amount ?? '',
                wants: goals.find(g => g.priority === 'wants')?.target_amount ?? '',
                savings: goals.find(g => g.priority === 'savings')?.target_amount ?? ''
            });

            // 2. Sync Sliders
            const map = { needs: 0, wants: 0, savings: 0 };
            goals.forEach(goal => { map[goal.priority] = goal.target_percentage; });
            setSplits({
                split1: map.needs || 50,
                split2: (map.needs || 50) + (map.wants || 30)
            });
        }
    }, [goals]);

    // Derived Percentages
    const currentValues = {
        needs: splits.split1,
        wants: splits.split2 - splits.split1,
        savings: 100 - splits.split2
    };

    // Slider Handlers
    const handlePointerDown = (e, thumbIndex) => {
        e.preventDefault();
        e.target.setPointerCapture(e.pointerId);
        setActiveThumb(thumbIndex);
    };

    const handlePointerMove = (e) => {
        if (!activeThumb || !containerRef.current) return;
        const rect = containerRef.current.getBoundingClientRect();
        const rawPercent = ((e.clientX - rect.left) / rect.width) * 100;
        const constrained = Math.round(Math.max(0, Math.min(100, rawPercent)));

        setSplits(prev => {
            if (activeThumb === 1) return { ...prev, split1: Math.min(constrained, prev.split2 - 5) };
            else return { ...prev, split2: Math.max(constrained, prev.split1 + 5) };
        });
    };

    const handlePointerUp = (e) => {
        setActiveThumb(null);
        e.target.releasePointerCapture(e.pointerId);
    };

    // --- 3. SMART SAVE LOGIC ---
    // Dirty Check: Compare current state vs DB state
    const hasChanges = useMemo(() => {
        if (!settings || goals.length === 0) return false;

        // 1. General Settings
        // const settingsKeys = ['baseCurrency', 'currencyPosition', 'budgetViewMode', 'thousandSeparator', 'decimalSeparator', 'decimalPlaces', 'hideTrailingZeros', 'fixedLifestyleMode'];
        // if (settingsKeys.some(k => formData[k] !== settings[k])) return true;
        if (SETTINGS_KEYS.some(k => formData[k] !== settings[k])) return true;
        if (localGoalMode !== (settings.goalMode ?? true)) return true;

        // 2. Goals
        return Object.keys(priorityConfig).some(p => {
            const goal = goals.find(g => g.priority === p);
            if (!localGoalMode) { // Absolute
                return (Number(absoluteValues[p]) || 0) !== (goal?.target_amount || 0);
            } else { // Percentage
                // Allow small float tolerance
                return Math.abs(currentValues[p] - (goal?.target_percentage || 0)) > 0.5;
            }
        });
    }, [formData, settings, localGoalMode, absoluteValues, currentValues, goals]);

    const [isGlobalSaving, setIsGlobalSaving] = useState(false);

    const handleGlobalSave = async () => {
        setIsGlobalSaving(true);
        try {
            const promises = [];

            // A. Settings Update (if changed)
            // const settingsKeys = ['baseCurrency', 'currencyPosition', 'budgetViewMode', 'thousandSeparator', 'decimalSeparator', 'decimalPlaces', 'hideTrailingZeros', 'fixedLifestyleMode'];
            // const settingsChanged = settingsKeys.some(k => formData[k] !== settings[k]);
            const settingsChanged = SETTINGS_KEYS.some(k => formData[k] !== settings[k]);
            const modeChanged = localGoalMode !== (settings.goalMode ?? true);

            if (settingsChanged || modeChanged) {
                promises.push(updateSettings({
                    ...formData,
                    goalMode: localGoalMode
                }));
            }

            // B. Goal Updates (if changed)
            Object.keys(priorityConfig).forEach((priority) => {
                const existingGoal = goals.find(g => g.priority === priority);
                let payload = {};
                let hasGoalChanged = false;

                if (!localGoalMode) {
                    // ABSOLUTE MODE
                    const newAmt = absoluteValues[priority] === '' ? 0 : Number(absoluteValues[priority]);
                    if (newAmt !== (existingGoal?.target_amount || 0)) {
                        hasGoalChanged = true;
                        payload = {
                            target_amount: newAmt,
                            target_percentage: existingGoal?.target_percentage || 0
                        };
                    }
                } else {
                    // PERCENTAGE MODE
                    const newPct = currentValues[priority];
                    if (Math.abs(newPct - (existingGoal?.target_percentage || 0)) > 0.01) {
                        hasGoalChanged = true;
                        payload = {
                            target_amount: existingGoal?.target_amount || 0,
                            target_percentage: newPct
                        };
                    }
                }
                if (hasGoalChanged) {
                    promises.push(handleGoalUpdate(priority, payload.target_percentage, payload));
                }
            });

            await Promise.all(promises);
            showToast({ title: "Success", description: "All changes saved successfully" });
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

                {/* CARD 1: GENERAL APP SETTINGS */}
                <div className="space-y-6">
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
                                            <SelectItem value="before">Before ($100)</SelectItem>
                                            <SelectItem value="after">After (100€)</SelectItem>
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
                                <div className="space-y-2">
                                    <Label className="flex items-center gap-2 pt-8 cursor-pointer">
                                        <input type="checkbox" checked={formData.hideTrailingZeros} onChange={(e) => handleFormChange('hideTrailingZeros', e.target.checked)} className="rounded border-gray-300" />
                                        Hide Trailing Zeros
                                    </Label>
                                </div>
                            </div>

                            <div className="p-4 bg-slate-50 rounded-lg border border-slate-100">
                                <p className="text-xs text-gray-500 mb-1">Preview</p>
                                <p className="text-2xl font-bold text-gray-900">{formatCurrency(previewAmount, formData)}</p>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* CARD 2: BUDGET GOALS (Logic moved here) */}
                <Card className="border-none shadow-lg">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Target className="w-5 h-5" />
                            Goal Allocation
                        </CardTitle>
                        <CardDescription>Define how your monthly income is split between Needs, Wants, and Savings.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        {loadingGoals ? (
                            <Skeleton className="h-64 w-full" />
                        ) : (
                            <>
                                {/* Mode Switcher */}
                                <div className="flex items-center justify-center p-1 bg-gray-100 rounded-lg">
                                    <button type="button" onClick={() => setLocalGoalMode(true)} className={`flex-1 py-1.5 text-sm font-medium rounded-md transition-all ${!isAbsoluteMode ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>Percentage</button>
                                    <button type="button" onClick={() => setLocalGoalMode(false)} className={`flex-1 py-1.5 text-sm font-medium rounded-md transition-all ${isAbsoluteMode ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>Absolute Values</button>
                                </div>

                                {/* SLIDER VIEW (Percentage) */}
                                {!isAbsoluteMode ? (
                                    <div className="pt-6 pb-2 px-2 animate-in fade-in slide-in-from-top-2 duration-300">
                                        <div ref={containerRef} className="relative h-6 w-full bg-gray-100 rounded-full select-none touch-none">
                                            {/* Zones */}
                                            <div className="absolute top-0 left-0 h-full rounded-l-full" style={{ width: `${splits.split1}%`, backgroundColor: priorityConfig.needs.color }} />
                                            <div className="absolute top-0 h-full" style={{ left: `${splits.split1}%`, width: `${splits.split2 - splits.split1}%`, backgroundColor: priorityConfig.wants.color }} />
                                            <div className="absolute top-0 h-full rounded-r-full" style={{ left: `${splits.split2}%`, width: `${100 - splits.split2}%`, backgroundColor: priorityConfig.savings.color }} />

                                            {/* Thumb 1 */}
                                            <div onPointerDown={(e) => handlePointerDown(e, 1)} onPointerMove={handlePointerMove} onPointerUp={handlePointerUp} className={`absolute top-0 bottom-0 w-4 -ml-2 bg-white shadow-sm rounded-full border flex items-center justify-center z-10 hover:scale-110 transition-transform ${activeThumb === 1 ? 'cursor-grabbing' : 'cursor-grab'}`} style={{ left: `${splits.split1}%` }}>
                                                <GripVertical className="w-2.5 h-2.5 text-gray-400" />
                                            </div>
                                            {/* Thumb 2 */}
                                            <div onPointerDown={(e) => handlePointerDown(e, 2)} onPointerMove={handlePointerMove} onPointerUp={handlePointerUp} className={`absolute top-0 bottom-0 w-4 -ml-2 bg-white shadow-sm rounded-full border flex items-center justify-center z-10 hover:scale-110 transition-transform ${activeThumb === 2 ? 'cursor-grabbing' : 'cursor-grab'}`} style={{ left: `${splits.split2}%` }}>
                                                <GripVertical className="w-3 h-3 text-gray-400" />
                                            </div>
                                        </div>
                                    </div>
                                ) : (
                                    /* INPUT VIEW (Absolute) */
                                    <div className="pt-2 animate-in fade-in slide-in-from-top-2 duration-300 space-y-4">
                                        <div className="grid grid-cols-1 gap-4">
                                            {Object.entries(priorityConfig).map(([key, config]) => (
                                                <div key={key} className="space-y-1.5">
                                                    <Label className="text-xs font-semibold uppercase tracking-wider text-gray-500 flex items-center gap-2">
                                                        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: config.color }} />
                                                        {config.label}
                                                    </Label>
                                                    <div>
                                                        <AmountInput
                                                            value={absoluteValues[key]}
                                                            onChange={(val) => setAbsoluteValues(prev => ({ ...prev, [key]: val }))}
                                                            placeholder="0.00"
                                                            className="font-mono"
                                                        />
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                        <div className="flex justify-between items-center pt-2 border-t border-gray-100">
                                            <span className="text-sm font-medium text-gray-500">Total Allocated</span>
                                            <span className="text-lg font-bold text-gray-900">
                                                $ {Object.values(absoluteValues).reduce((acc, val) => acc + (Number(val) || 0), 0).toLocaleString()}
                                            </span>
                                        </div>
                                    </div>
                                )}

                                {/* Lifestyle Creep Protection (Percentage Mode Only) */}
                                {!isAbsoluteMode && (
                                    <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg border border-blue-100 animate-in fade-in slide-in-from-top-1 duration-300 delay-75">
                                        <div className="flex items-center gap-3">
                                            <div className="p-2 bg-blue-100 rounded-full text-blue-600">
                                                <Lock className="w-4 h-4" />
                                            </div>
                                            <div>
                                                <p className="text-sm font-bold text-gray-900">Fixed Lifestyle Mode</p>
                                                <p className="text-xs text-gray-500">If income rises, keep Needs budget fixed.</p>
                                            </div>
                                        </div>
                                        <Switch
                                            checked={formData.fixedLifestyleMode}
                                            // Update local form state, handled by general submit usually, but here we can stick to settings sync
                                            onCheckedChange={(checked) => handleFormChange('fixedLifestyleMode', checked)}
                                        />
                                    </div>
                                )}

                                {/* Percentage Legend */}
                                {!isAbsoluteMode && (
                                    <div className="grid grid-cols-3 gap-4 animate-in fade-in">
                                        {Object.entries(priorityConfig).map(([key, config]) => (
                                            <div key={key} className="text-center space-y-1">
                                                <div className="flex items-center justify-center gap-2 mb-1">
                                                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: config.color }} />
                                                    <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">{config.label}</span>
                                                </div>
                                                <div className="text-2xl font-bold text-gray-900">{Math.round(currentValues[key])}%</div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </>
                        )}
                    </CardContent>
                </Card>
            </div>
            {/* --- STICKY SAVE FOOTER --- */}
            <div className={`fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-4 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)] transition-transform duration-300 transform ${hasChanges ? 'translate-y-0' : 'translate-y-full'}`}>
                <div className="max-w-4xl mx-auto flex items-center justify-between">
                    <div className="flex items-center gap-2 text-amber-600">
                        <AlertCircle className="w-5 h-5" />
                        <span className="text-sm font-medium">You have unsaved changes</span>
                    </div>
                    <CustomButton onClick={handleGlobalSave} disabled={isGlobalSaving} variant="primary" size="lg">
                        {isGlobalSaving ? 'Saving...' : <><Save className="w-4 h-4 mr-2" />Save Changes</>}
                    </CustomButton>
                </div>
            </div>
        </div>
    );
}
