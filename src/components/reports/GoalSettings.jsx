import React, { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CustomButton } from "@/components/ui/CustomButton";
import { Target, Save, GripVertical } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

const priorityConfig = {
    needs: { label: "Needs", color: "#EF4444", description: "Essential expenses" },
    wants: { label: "Wants", color: "#F59E0B", description: "Discretionary spending" },
    savings: { label: "Savings", color: "#10B981", description: "Savings and investments" }
};

export default function GoalSettings({ goals, onGoalUpdate, isLoading, isSaving }) {
    // We track two split points (0-100).
    // Split 1: Boundary between Needs/Wants
    // Split 2: Boundary between Wants/Savings
    const [splits, setSplits] = useState({ split1: 50, split2: 80 });
    const containerRef = useRef(null);
    const [activeThumb, setActiveThumb] = useState(null);

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

    const handleSave = async () => {
        for (const [priority, percentage] of Object.entries(currentValues)) {
            await onGoalUpdate(priority, percentage);
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

                {/* Interactive Slider Area */}
                <div className="pt-6 pb-2 px-2">
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

                {/* Legend & Values */}
                <div className="grid grid-cols-3 gap-4">
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