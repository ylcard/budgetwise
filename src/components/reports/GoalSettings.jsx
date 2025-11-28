import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CustomButton } from "@/components/ui/CustomButton";
import { Target, Save, GripVertical, Lock } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { showToast } from "@/components/ui/use-toast";
import { Switch } from "@/components/ui/switch";
import { useSettings } from "../utils/SettingsContext";
import AmountInput from "../ui/AmountInput";
import { Label } from "@/components/ui/label";

const priorityConfig = {
    needs: { label: "Needs", color: "#EF4444", description: "Essential expenses" },
    wants: { label: "Wants", color: "#F59E0B", description: "Discretionary spending" },
    savings: { label: "Savings", color: "#10B981", description: "Savings and investments" }
};

export default function GoalSettings({ goals, onGoalUpdate, isLoading, isSaving }) {
    const { settings, updateSettings } = useSettings();
    // We track two split points (0-100).
    // Split 1: Boundary between Needs/Wants
    // Split 2: Boundary between Wants/Savings
    const [splits, setSplits] = useState({ split1: 50, split2: 80 });
    const containerRef = useRef(null);
    const [activeThumb, setActiveThumb] = useState(null);

    // HELPER: Strictly resolve the mode to boolean to avoid "false" string issues
    const resolveMode = (val) => {
        if (val === 'false') return false;
        if (val === 'true') return true;
        // If undefined/null, default to true (Percentage)
        return val ?? true;
    };

    // Determine initial mode from Settings (default to 'percentage')
    const [localGoalMode, setLocalGoalMode] = useState(() => resolveMode(settings.goalMode));
    const isAbsoluteMode = !localGoalMode;

    // Track if user has manually touched the toggle
    const hasInteracted = useRef(false);

    // FIX: Only sync with DB settings if user hasn't manually changed it yet.
    useEffect(() => {
        if (!hasInteracted.current) {
            setLocalGoalMode(resolveMode(settings.goalMode));
        }
    }, [settings.goalMode]);

    // Local state for Absolute Mode inputs
    // Initialize from the goals prop (which comes from DB)
    // const needsGoal = goals.find(g => g.priority === 'needs');
    const [absoluteValues, setAbsoluteValues] = useState({
        // needs: goals.find(g => g.priority === 'needs')?.target_amount || 0,
        // wants: goals.find(g => g.priority === 'wants')?.target_amount || 0,
        // savings: goals.find(g => g.priority === 'savings')?.target_amount || 0
        needs: goals.find(g => g.priority === 'needs')?.target_amount ?? '',
        wants: goals.find(g => g.priority === 'wants')?.target_amount ?? '',
        savings: goals.find(g => g.priority === 'savings')?.target_amount ?? ''
    });

    // BEING DEPRECATED - Track mode based on the 'needs' goal (assuming all follow same mode or just using needs as master)
    // const [isAbsoluteMode, setIsAbsoluteMode] = useState(needsGoal?.is_absolute || false);

    useEffect(() => {
        const map = { needs: 0, wants: 0, savings: 0 };
        goals.forEach(goal => {
            map[goal.priority] = goal.target_percentage;
        });

        // Convert individual values to cumulative splits
        setSplits({
            split1: map.needs,
            split2: map.needs + map.wants
        });
    }, [goals]);

    // Calculate derived percentages for display/save
    const currentValues = {
        needs: splits.split1,
        wants: splits.split2 - splits.split1,
        savings: 100 - splits.split2
    };

    // const isAbsoluteMode = settings.goalAllocationMode === 'absolute';

    const handleModeChange = (isPercentage) => {
        hasInteracted.current = true; // Mark as user-controlled so DB sync doesn't overwrite it
        setLocalGoalMode(isPercentage);
    };

    const handleSave = async () => {
        try {
            // 1. Save the strictly typed boolean mode to settings
            await updateSettings({
                goalMode: localGoalMode
            });

            // 2. Update goals, preserving the inactive mode's values
            const promises = Object.keys(priorityConfig).map((priority) => {
                const existingGoal = goals.find(g => g.priority === priority);

                let payload = {};

                if (isAbsoluteMode) {
                    // ABSOLUTE MODE: 
                    // Save new Amount, preserve existing Percentage (non-destructive)
                    payload = {
                        target_amount: absoluteValues[priority] === '' ? 0 : Number(absoluteValues[priority]),
                        target_percentage: existingGoal?.target_percentage || 0
                    };
                } else {
                    // PERCENTAGE MODE: 
                    // Save new Percentage, preserve existing Amount (non-destructive)
                    payload = {
                        target_amount: existingGoal?.target_amount || 0,
                        target_percentage: currentValues[priority]
                    };
                }

                return onGoalUpdate(priority, payload.target_percentage, payload);
            });

            // Wait for all updates to complete
            await Promise.all(promises);

            // Show single success toast after all updates complete
            showToast({
                title: "Success",
                description: "Goals updated successfully",
            });
            // Optional: Reset interaction flag after successful save
            hasInteracted.current = false;
        } catch (error) {
            console.error('Error saving goals:', error);
            showToast({
                title: "Error",
                description: error?.message || "Failed to update goals. Please try again.",
                variant: "destructive",
            });
        }
    };

    // Pointer event handlers for dragging
    const handlePointerDown = (e, thumbIndex) => {
        e.preventDefault();
        e.target.setPointerCapture(e.pointerId);
        setActiveThumb(thumbIndex);
    };

    const handlePointerMove = (e) => {
        if (!activeThumb || !containerRef.current) return;

        const rect = containerRef.current.getBoundingClientRect();
        const rawPercent = ((e.clientX - rect.left) / rect.width) * 100;
        // Snap to nearest integer to avoid floating point summation errors (e.g., 99% totals)
        const constrained = Math.round(Math.max(0, Math.min(100, rawPercent)));

        setSplits(prev => {
            // Thumb 1 (Needs/Wants)
            if (activeThumb === 1) {
                return { ...prev, split1: Math.min(constrained, prev.split2 - 5) };
            }
            // Thumb 2 (Wants/Savings)
            else {
                return { ...prev, split2: Math.max(constrained, prev.split1 + 5) };
            }
        });
    };

    const handlePointerUp = (e) => {
        setActiveThumb(null);
        e.target.releasePointerCapture(e.pointerId);
    };

    if (isLoading) {
        return (
            <Card className="border-none shadow-lg sticky top-6">
                <CardHeader>
                    <CardTitle>Goal Settings</CardTitle>
                </CardHeader>
                <CardContent>
                    <Skeleton className="h-96 w-full" />
                </CardContent>
            </Card>
        );
    }

    return (
        <Card className="border-none shadow-lg sticky top-6">
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <Target className="w-5 h-5" />
                    Goal Settings
                </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">

                {/* Mode Switcher */}
                <div className="flex items-center justify-center p-1 bg-gray-100 rounded-lg">
                    <button
                        type="button"
                        onClick={() => handleModeChange(true)}
                        className={`flex-1 py-1.5 text-sm font-medium rounded-md transition-all ${!isAbsoluteMode ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                    >
                        Percentage
                    </button>
                    <button
                        type="button"
                        onClick={() => handleModeChange(false)}
                        className={`flex-1 py-1.5 text-sm font-medium rounded-md transition-all ${isAbsoluteMode ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                    >
                        Absolute Values
                    </button>
                </div>

                {/* Interactive Slider Area */}
                {!isAbsoluteMode ? (
                    <div className="pt-6 pb-2 px-2 animate-in fade-in slide-in-from-top-2 duration-300">
                        <div
                            ref={containerRef}
                            className="relative h-6 w-full bg-gray-100 rounded-full select-none touch-none"
                        >
                            {/* Zone 1: Needs (Red) */}
                            <div
                                className="absolute top-0 left-0 h-full rounded-l-full transition-colors"
                                style={{ width: `${splits.split1}%`, backgroundColor: priorityConfig.needs.color }}
                            />

                            {/* Zone 2: Wants (Amber) */}
                            <div
                                className="absolute top-0 h-full transition-colors"
                                style={{
                                    left: `${splits.split1}%`,
                                    width: `${splits.split2 - splits.split1}%`,
                                    backgroundColor: priorityConfig.wants.color
                                }}
                            />

                            {/* Zone 3: Savings (Green) */}
                            <div
                                className="absolute top-0 h-full rounded-r-full transition-colors"
                                style={{
                                    left: `${splits.split2}%`,
                                    width: `${100 - splits.split2}%`,
                                    backgroundColor: priorityConfig.savings.color
                                }}
                            />

                            {/* Thumb 1 */}
                            <div
                                onPointerDown={(e) => handlePointerDown(e, 1)}
                                onPointerMove={handlePointerMove}
                                onPointerUp={handlePointerUp}
                                className={`absolute top-0 bottom-0 w-4 -ml-2 bg-white shadow-sm rounded-full border flex items-center justify-center z-10 hover:scale-110 transition-transform ${activeThumb === 1 ? 'cursor-grabbing' : 'cursor-grab'}`}
                                style={{ left: `${splits.split1}%` }}
                            >
                                <GripVertical className="w-2.5 h-2.5 text-gray-400" />
                            </div>

                            {/* Thumb 2 */}
                            <div
                                onPointerDown={(e) => handlePointerDown(e, 2)}
                                onPointerMove={handlePointerMove}
                                onPointerUp={handlePointerUp}
                                className={`absolute top-0 bottom-0 w-4 -ml-2 bg-white shadow-sm rounded-full border flex items-center justify-center z-10 hover:scale-110 transition-transform ${activeThumb === 2 ? 'cursor-grabbing' : 'cursor-grab'}`}
                                style={{ left: `${splits.split2}%` }}
                            >
                                <GripVertical className="w-3 h-3 text-gray-400" />
                            </div>
                        </div>
                    </div>
                ) : (
                    /* Absolute Mode Inputs */
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
                        {/* Simple helper to see total budget allocation */}
                        <div className="flex justify-between items-center pt-2 border-t border-gray-100">
                            <span className="text-sm font-medium text-gray-500">Total Allocated</span>
                            <span className="text-lg font-bold text-gray-900">
                                $ {Object.values(absoluteValues).reduce((acc, val) => acc + (Number(val) || 0), 0).toLocaleString()}
                            </span>
                        </div>
                    </div>
                )}

                {/* Lifestyle Creep Protection Toggle */}
                {!isAbsoluteMode && (
                    <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg border border-blue-100 animate-in fade-in slide-in-from-top-1 duration-300 delay-75">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-blue-100 rounded-full text-blue-600">
                                <Lock className="w-4 h-4" />
                            </div>
                            <div>
                                <p className="text-sm font-bold text-gray-900">Fixed Lifestyle Mode</p>
                                <p className="text-[10px] text-gray-500">If income rises, keep Needs budget fixed and save the rest.</p>
                            </div>
                        </div>
                        <Switch
                            checked={settings.fixedLifestyleMode}
                            onCheckedChange={(checked) => updateSettings({ fixedLifestyleMode: checked })}
                        />
                    </div>
                )}

                {/* Legend & Values */}
                {!isAbsoluteMode && (
                    <div className="grid grid-cols-3 gap-4 animate-in fade-in">
                        {Object.entries(priorityConfig).map(([key, config]) => (
                            <div key={key} className="text-center space-y-1">
                                <div className="flex items-center justify-center gap-2 mb-1">
                                    <div
                                        className="w-2 h-2 rounded-full"
                                        style={{ backgroundColor: config.color }}
                                    />
                                    <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                                        {config.label}
                                    </span>
                                </div>
                                <div className="text-2xl font-bold text-gray-900">
                                    {Math.round(currentValues[key])}%
                                </div>
                                <p className="text-[10px] text-gray-400 line-clamp-1 px-1">
                                    {config.description}
                                </p>
                            </div>
                        ))}
                    </div>
                )}

                <CustomButton
                    onClick={handleSave}
                    disabled={isSaving}
                    variant="primary"
                    className="w-full"
                >
                    <Save className="w-4 h-4 mr-2" />
                    {isSaving ? 'Saving...' : 'Save Goals'}
                </CustomButton>
            </CardContent>
        </Card>
    );
}