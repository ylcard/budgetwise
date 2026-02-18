import { useState, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CustomButton } from "@/components/ui/CustomButton";
import { Target, Save, GripVertical, Lock } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import AmountInput from "../ui/AmountInput";
import { Label } from "@/components/ui/label";
import InfoTooltip from "../ui/InfoTooltip"; // ADDED: 17-Jan-2026
import { formatCurrency } from "../utils/currencyUtils";

const priorityConfig = {
    needs: { label: "Essentials", color: "#EF4444", textClass: "text-red-500" },
    wants: { label: "Lifestyle", color: "#F59E0B", textClass: "text-amber-500" },
    savings: { label: "Savings", color: "#10B981", textClass: "text-emerald-500" }
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
    // Currency formatting
    settings,
    className,
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

    // Calculate total absolute value
    const totalAbsolute = Object.values(absoluteValues).reduce((acc, val) => acc + (Number(val) || 0), 0);

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
            <Card className={`border-none shadow-md sticky top-6 ${className || ''}`}>
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
        <Card className={`border-none shadow-md sticky top-6 h-full flex flex-col ${className || ''}`}>
            <CardHeader className="pb-4">
                <CardTitle className="flex items-center gap-2">
                    <Target className="w-5 h-5" />
                    Goal Allocation
                    <InfoTooltip
                        title="Goal Allocation"
                        description="Define how your monthly income is split between Essentials, Lifestyle, and Savings. You can use percentage-based allocation or set absolute amounts."
                    />
                </CardTitle>
            </CardHeader>
            <CardContent className="flex-1 flex flex-col gap-4">

                {/* Mode Switcher */}
                <div className="bg-gray-100 p-1 rounded-lg flex w-full flex-none">
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
                        Absolute
                    </button>
                </div>

                {/* SLIDER VIEW (Percentage Mode) */}
                {/* MAIN CONTENT AREA: Use min-h to prevent jarring size jumps */}
                {/* +                    STACKING TRICK: 
                    We use a grid with one cell. Both modes sit in that cell.
                    The card will grow to fit the tallest one, and stay that height for both.
                */}
                <div className="flex-1 grid grid-cols-1 items-start">

                    {/* --- PERCENTAGE MODE --- */}
                    <div
                        className={`col-start-1 row-start-1 space-y-6 transition-all duration-300 ${!isAbsoluteMode ? 'opacity-100 translate-y-0' : 'opacity-0 pointer-events-none -translate-y-2'
                            }`}
                    >
                        <div className="px-2 pt-4">
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
                                    className={`absolute top-1/2 -translate-y-1/2 w-8 h-8 -ml-4 bg-transparent flex items-center justify-center z-10 cursor-grab touch-none`}
                                    style={{ left: `${splits.split1}%` }}
                                >
                                    {/* Visual Thumb */}
                                    <div className={`w-4 h-4 bg-white shadow-md rounded-full border border-gray-200 flex items-center justify-center transition-transform ${activeThumb === 1 ? 'scale-125 border-blue-400' : ''}`}>
                                        <GripVertical className="w-2.5 h-2.5 text-gray-400" />
                                    </div>
                                </div>

                                {/* Thumb 2 */}
                                <div
                                    onPointerDown={(e) => handlePointerDown(e, 2)}
                                    onPointerMove={handlePointerMove}
                                    onPointerUp={handlePointerUp}
                                    className={`absolute top-1/2 -translate-y-1/2 w-8 h-8 -ml-4 bg-transparent flex items-center justify-center z-10 cursor-grab touch-none`}
                                    style={{ left: `${splits.split2}%` }}
                                >
                                    <div className={`w-4 h-4 bg-white shadow-md rounded-full border border-gray-200 flex items-center justify-center transition-transform ${activeThumb === 2 ? 'scale-125 border-blue-400' : ''}`}>
                                        <GripVertical className="w-2.5 h-2.5 text-gray-400" />
                                    </div>
                                </div>
                            </div>
                        </div>
                        {/* Legend / Values (Updated: No bullets, just colored text) */}
                        <div className="grid grid-cols-3 gap-2 text-center">
                            {Object.entries(priorityConfig).map(([key, config]) => (
                                <div key={key} className="flex flex-col items-center">
                                    <span className={`text-xs font-bold uppercase tracking-wider mb-1 ${config.textClass}`}>
                                        {config.label}
                                    </span>
                                    <span className="text-2xl font-bold text-gray-900">
                                        {Math.round(currentValues[key])}%
                                    </span>
                                </div>
                            ))}
                        </div>

                        {/* Inflation Protection */}
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between p-3 bg-blue-50 rounded-lg border border-blue-100 gap-3">
                            <div className="flex items-center gap-3 flex-1">
                                <div className="p-2 bg-blue-100 rounded-full text-blue-600">
                                    <Lock className="w-4 h-4" />
                                </div>
                                <div>
                                    <div className="flex items-center gap-1">
                                        <p className="text-sm font-bold text-gray-900">Inflation Protection</p>
                                        <InfoTooltip
                                            title="Inflation Protection"
                                            description="Budgets stay fixed if income rises; extra goes to Savings."
                                        />
                                    </div>
                                </div>
                            </div>
                            <div className="flex justify-end w-full sm:w-auto">
                                <Switch checked={fixedLifestyleMode} onCheckedChange={setFixedLifestyleMode} />
                            </div>
                        </div>
                    </div>

                    {/* --- ABSOLUTE MODE --- */}
                    <div
                        className={`col-start-1 row-start-1 space-y-4 transition-all duration-300 ${isAbsoluteMode ? 'opacity-100 translate-y-0' : 'opacity-0 pointer-events-none -translate-y-2'
                            }`}
                    >
                        <div className="grid grid-cols-1 gap-4 pt-2">
                            {Object.entries(priorityConfig).map(([key, config]) => (
                                <div key={key} className="space-y-1">
                                    <Label className={`text-xs font-bold uppercase tracking-wider ${config.textClass}`}>
                                        {config.label}
                                    </Label>
                                    <AmountInput
                                        value={absoluteValues[key]}
                                        onChange={(val) => setAbsoluteValues(prev => ({ ...prev, [key]: val }))}
                                        placeholder="0.00"
                                        className="font-mono h-9"
                                    />
                                </div>
                            ))}
                        </div>
                        <div className="flex justify-between items-center pt-3 border-t border-gray-100 mt-2">
                            <span className="text-sm font-medium text-gray-500">Total Allocated</span>
                            <span className="text-lg font-bold text-gray-900">
                                {formatCurrency(totalAbsolute, settings)}
                            </span>
                        </div>
                    </div>
                </div>

                <CustomButton
                    onClick={onSave}
                    disabled={isSaving}
                    variant="primary"
                    className="w-full mt-auto"
                >
                    <Save className="w-4 h-4 mr-2" />
                    {isSaving ? 'Saving...' : 'Save Goals'}
                </CustomButton>
            </CardContent>
        </Card>
    );
}