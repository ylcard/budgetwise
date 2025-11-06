/*
 * ⚠️⚠️⚠️ DEPRECATED - SCHEDULED FOR DELETION ⚠️⚠️⚠️
 * 
 * This file is DEPRECATED and scheduled for deletion.
 * DO NOT USE THIS COMPONENT IN NEW CODE.
 * 
 * === DEPRECATION REASONS ===
 * 
 * 1. NOT RENDERED ANYWHERE
 *    - Dashboard.js does NOT import or render this component
 *    - Reports page uses PriorityChart.jsx instead
 *    - No active usage found in the entire codebase
 * 
 * 2. MASSIVE CODE DUPLICATION (~95%)
 *    - Nearly identical calculation logic to usePriorityChartData hook
 *    - Same categoryMap creation
 *    - Same goalMap creation
 *    - Same expensesByPriority aggregation
 *    - Same percentage calculations
 *    - Total of ~80 lines of duplicated code
 * 
 * 3. DUPLICATE priorityConfig DEFINITION
 *    - priorityConfig defined locally here
 *    - Also defined in usePriorityChartData hook
 *    - Also defined in GoalSettings.jsx
 *    - Should be extracted to shared constant file
 * 
 * 4. NO MEMOIZATION
 *    - All calculations run on every render
 *    - Performance issue with many transactions
 *    - Hook version uses useMemo properly
 * 
 * 5. ARCHITECTURAL REDUNDANCY
 *    - PriorityChart.jsx (used in Reports page) serves the same purpose
 *    - Both components show actual vs target priority spending
 *    - PriorityChart uses proper hook for calculations
 * 
 * === REPLACEMENT ===
 * Use PriorityChart.jsx from components/reports/PriorityChart.jsx instead
 * It uses the usePriorityChartData hook for calculations (proper architecture)
 * 
 * === MIGRATION PATH ===
 * If you need priority breakdown display:
 * 1. Import PriorityChart from components/reports/PriorityChart
 * 2. Pass transactions, categories, goals, and monthlyIncome as props
 * 3. Component handles all calculations internally via hook
 * 
 * === DELETION TIMELINE ===
 * Date Deprecated: 2025-11-06
 * Scheduled Deletion: After verification that no pages import/use this component
 * 
 * === VERIFICATION CHECKLIST BEFORE DELETION ===
 * [x] Confirmed not imported in Dashboard.js
 * [x] Confirmed not imported in Reports.js (uses PriorityChart instead)
 * [ ] Grep codebase for "PriorityBreakdown" imports
 * [ ] Verify no dynamic imports or lazy loading
 * [ ] Delete this file entirely
 */

/* ENTIRE COMPONENT COMMENTED OUT - DO NOT UNCOMMENT

import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Target, AlertCircle } from "lucide-react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { formatCurrency } from "../utils/formatCurrency";
import { useSettings } from "../utils/SettingsContext";

const priorityConfig = {
  needs: { label: "Needs", color: "#EF4444", bg: "bg-red-50" },
  wants: { label: "Wants", color: "#F59E0B", bg: "bg-orange-50" },
  savings: { label: "Savings", color: "#10B981", bg: "bg-green-50" }
};

export default function PriorityBreakdown({ transactions, categories, goals, totalIncome, isLoading }) {
  const { settings } = useSettings();

  const categoryMap = categories.reduce((acc, cat) => {
    acc[cat.id] = cat;
    return acc;
  }, {});

  const goalMap = goals.reduce((acc, goal) => {
    acc[goal.priority] = goal.target_percentage;
    return acc;
  }, {});

  const expensesByPriority = transactions
    .filter(t => t.type === 'expense' && t.category_id)
    .reduce((acc, t) => {
      const category = categoryMap[t.category_id];
      if (category) {
        const priority = category.priority;
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

END OF COMMENTED OUT CODE */

// Export empty component to prevent import errors until file is deleted
export default function PriorityBreakdown() {
  return null;
}