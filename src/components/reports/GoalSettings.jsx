import { useState, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CustomButton } from "@/components/ui/CustomButton";
import { Target, Save, GripVertical, Lock } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import AmountInput from "../ui/AmountInput";
import { Label } from "@/components/ui/label";

const priorityConfig = {
    needs: { label: "Needs", color: "#EF4444", description: "Essential expenses" },
    wants: { label: "Wants", color: "#F59E0B", description: "Discretionary spending" },
    savings: { label: "Savings", color: "#10B981", description: "Savings and investments" }
};

export default function GoalSettings({
    // State Props
    isLoading,
    isSaving,
    goalMode,           // boolean (true = Percentage, false = Absolute)
    setGoalMode,        // function
    splits,             // object { split1, split2 }
    setSplits,          // function
    absoluteValues,     // object { needs, wants, savings }
    setAbsoluteValues,  // function
    fixedLifestyleMode, // boolean
    setFixedLifestyleMode, // function

    // Actions
    onSave              // function
}) {
    const containerRef = useRef(null);
    const [activeThumb, setActiveThumb] = useState(null);

    const isAbsoluteMode = !goalMode;

    // Derived percentages for display (Percentage Mode)
    const currentValues = {
        needs: splits.split1,
        wants: splits.split2 - splits.split1,
        savings: 100 - splits.split2
    };

    // --- SLIDER INTERACTION LOGIC (Kept local as it's UI interaction) ---
    const handlePointerDown = (e, thumbIndex) => {
        e.preventDefault();
        e.target.setPointerCapture(e.pointerId);
        setActiveThumb(thumbIndex);
    };

    const handlePointerMove = (e) => {
        if (!activeThumb || !containerRef.current) return;

        const rect = containerRef.current.getBoundingClientRect();
        const rawPercent = ((e.clientX - rect.left) / rect.width) * 100;
        // Snap to nearest integer
        const constrained = Math.round(Math.max(0, Math.min(100, rawPercent)));

        // Update parent state
        setSplits(prev => {
            if (activeThumb === 1) {
                return { ...prev, split1: Math.min(constrained, prev.split2 - 5) };
            } else {
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
                    Goal Allocation
                </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">

                {/* Mode Switcher */}
                <div className="flex items-center justify-center p-1 bg-gray-100 rounded-lg">
                    <button
                        type="button"
                        onClick={() => setGoalMode(true)}
                        className={`flex-1 py-1.5 text-sm font-medium rounded-md transition-all ${!isAbsoluteMode ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                    >
                        Percentage
                    </button>
                    <button
                        type="button"
                        onClick={() => setGoalMode(false)}
                        className={`flex-1 py-1.5 text-sm font-medium rounded-md transition-all ${isAbsoluteMode ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                    >
                        Absolute Values
                    </button>
                </div>

                {/* SLIDER VIEW (Percentage Mode) */}
                {!isAbsoluteMode ? (
                    <div className="pt-6 pb-2 px-2 animate-in fade-in slide-in-from-top-2 duration-300">
                        <div
                            ref={containerRef}
                            className="relative h-6 w-full bg-gray-100 rounded-full select-none touch-none"
                        >
                            {/* Visual Zones */}
                            <div
                                className="absolute top-0 left-0 h-full rounded-l-full transition-colors"
                                style={{ width: `${splits.split1}%`, backgroundColor: priorityConfig.needs.color }}
                            />
                            <div
                                className="absolute top-0 h-full transition-colors"
                                style={{
                                    left: `${splits.split1}%`,
                                    width: `${splits.split2 - splits.split1}%`,
                                    backgroundColor: priorityConfig.wants.color
                                }}
                            />
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
                    /* INPUT VIEW (Absolute Mode) */
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
                                <p className="text-[10px] text-gray-500">If income rises, keep Needs budget fixed and save the rest.</p>
                            </div>
                        </div>
                        <Switch
                            checked={fixedLifestyleMode}
                            onCheckedChange={setFixedLifestyleMode}
                        />
                    </div>
                )}

                {/* Percentage Values Legend (Hidden in Absolute Mode) */}
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
                    onClick={onSave}
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