import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Target, AlertCircle } from "lucide-react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { formatCurrency } from "../utils/formatCurrency";
import { useSettings } from "../utils/SettingsContext";

/*
 * ⚠️ REFACTORING NOTE ⚠️
 * FIXED: Removed undefined `calculateMonthlyAmount` prop - now using t.amount directly
 * FIXED: Added proper currency formatting with user settings
 * FIXED: Updated priority keys to match app's system (needs/wants/savings instead of essential/optional/savings/other)
 * 
 * This component is used in the Dashboard (if rendered) or Reports page.
 * Uses progress bars (correct visualization for this app).
 */

const priorityConfig = {
  needs: { label: "Needs", color: "#EF4444", bg: "bg-red-50" },
  wants: { label: "Wants", color: "#F59E0B", bg: "bg-orange-50" },
  savings: { label: "Savings", color: "#10B981", bg: "bg-green-50" }
};

export default function PriorityBreakdown({ transactions, categories, goals, /* calculateMonthlyAmount, */ totalIncome, isLoading }) {
  const { settings } = useSettings();

  const categoryMap = categories.reduce((acc, cat) => {
    acc[cat.id] = cat;
    return acc;
  }, {});

  const goalMap = goals.reduce((acc, goal) => {
    acc[goal.priority] = goal.target_percentage;
    return acc;
  }, {});

  // FIXED: Using t.amount directly instead of calculateMonthlyAmount(t)
  const expensesByPriority = transactions
    .filter(t => t.type === 'expense' && t.category_id)
    .reduce((acc, t) => {
      const category = categoryMap[t.category_id];
      if (category) {
        const priority = category.priority;
        // ✅ FIXED: Direct amount usage
        acc[priority] = (acc[priority] || 0) + t.amount;
      }
      return acc;
    }, {});

  const priorityData = Object.entries(priorityConfig).map(([key, config]) => {
    const amount = expensesByPriority[key] || 0;
    const percentage = totalIncome > 0 ? (amount / totalIncome) * 100 : 0;
    const target = goalMap[key] || 0;
    const isOverTarget = percentage > target;
    
    return {
      priority: key,
      label: config.label,
      color: config.color,
      bg: config.bg,
      amount,
      percentage,
      target,
      isOverTarget
    };
  });

  if (isLoading) {
    return (
      <Card className="border-none shadow-lg">
        <CardHeader>
          <CardTitle>Priority Breakdown</CardTitle>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-64 w-full" />
        </CardContent>
      </Card>
    );
  }

  const hasGoals = Object.keys(goalMap).length > 0;

  return (
    <Card className="border-none shadow-lg sticky top-6">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Target className="w-5 h-5" />
          Priority Breakdown
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {!hasGoals && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm">
              <p className="font-medium text-blue-900 mb-1">Set Your Goals</p>
              <p className="text-blue-700">
                Visit the{" "}
                <Link to={createPageUrl("Reports")} className="underline font-medium">
                  Reports page
                </Link>
                {" "}to set target percentages for each priority.
              </p>
            </div>
          </div>
        )}

        {priorityData.map((item) => (
          <div key={item.priority} className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div 
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: item.color }}
                />
                <span className="font-medium text-gray-900">{item.label}</span>
              </div>
              <div className="text-right">
                <p className="text-sm font-bold text-gray-900">
                  {item.percentage.toFixed(1)}%
                </p>
                {item.target > 0 && (
                  <p className="text-xs text-gray-500">
                    Target: {item.target}%
                  </p>
                )}
              </div>
            </div>
            
            <Progress 
              value={item.target > 0 ? (item.percentage / item.target) * 100 : item.percentage} 
              className="h-2"
              style={{
                '--progress-background': item.color
              }}
            />
            
            <div className="flex items-center justify-between text-xs text-gray-500">
              {/* ✅ FIXED: Using formatCurrency with user settings */}
              <span>{formatCurrency(item.amount, settings)}</span>
              {item.target > 0 && item.isOverTarget && (
                <span className="text-red-600 font-medium">
                  {(item.percentage - item.target).toFixed(1)}% over
                </span>
              )}
              {item.target > 0 && !item.isOverTarget && item.percentage > 0 && (
                <span className="text-green-600 font-medium">
                  On track
                </span>
              )}
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}