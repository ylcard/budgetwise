import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
// COMMENTED OUT 16-Jan-2025: Replaced with CustomButton for consistency
// import { Button } from "@/components/ui/button";
import { CustomButton } from "@/components/ui/CustomButton";
import { Label } from "@/components/ui/label";
import { Target, Save } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

const priorityConfig = {
  needs: { label: "Needs", color: "#EF4444", description: "Essential expenses" },
  wants: { label: "Wants", color: "#F59E0B", description: "Discretionary spending" },
  savings: { label: "Savings", color: "#10B981", description: "Savings and investments" }
};

export default function GoalSettings({ goals, onGoalUpdate, isLoading, isSaving }) {
  const [percentages, setPercentages] = useState({
    needs: 0,
    wants: 0,
    savings: 0
  });

  useEffect(() => {
    const newPercentages = { needs: 0, wants: 0, savings: 0 };
    goals.forEach(goal => {
      newPercentages[goal.priority] = goal.target_percentage;
    });
    setPercentages(newPercentages);
  }, [goals]);

  const handleSave = async () => {
    for (const [priority, percentage] of Object.entries(percentages)) {
      await onGoalUpdate(priority, percentage);
    }
  };

  const total = Object.values(percentages).reduce((sum, val) => sum + val, 0);
  const isValid = total <= 100;

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
        <div className="space-y-4">
          {Object.entries(priorityConfig).map(([key, config]) => (
            <div key={key} className="space-y-2">
              <Label htmlFor={key} className="flex items-center gap-2">
                <div
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: config.color }}
                />
                <div>
                  <p className="font-medium">{config.label}</p>
                  <p className="text-xs text-gray-500 font-normal">{config.description}</p>
                </div>
              </Label>
              <div className="flex items-center gap-2">
                <Input
                  id={key}
                  type="number"
                  min="0"
                  max="100"
                  step="1"
                  value={percentages[key]}
                  onChange={(e) => setPercentages({
                    ...percentages,
                    [key]: parseFloat(e.target.value) || 0
                  })}
                  className="flex-1"
                />
                <span className="text-gray-500 font-medium w-6">%</span>
              </div>
            </div>
          ))}
        </div>

        <div className="p-4 rounded-lg bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-100">
          <div className="flex items-center justify-between mb-2">
            <span className="font-medium text-gray-700">Total</span>
            <span className={`text-xl font-bold ${isValid ? 'text-gray-900' : 'text-red-600'}`}>
              {total.toFixed(0)}%
            </span>
          </div>
          {!isValid && (
            <p className="text-sm text-red-600">Total must not exceed 100%</p>
          )}
          {isValid && total < 100 && (
            <p className="text-sm text-gray-600">
              {(100 - total).toFixed(0)}% unallocated
            </p>
          )}
        </div>

        <CustomButton
          onClick={handleSave}
          disabled={!isValid || isSaving}
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

// UPDATED 16-Jan-2025: Replaced Button with CustomButton for "Save Goals" button
// - Uses variant="primary" (gradient blue-purple) for primary action
// - Removed manual gradient styling as variant provides it
// - All functionality preserved with consistent styling