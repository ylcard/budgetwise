
import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { useSettings } from "../utils/SettingsContext";
import { useMonthlyBreakdown } from "../hooks/useDerivedData";
import { formatCurrency } from "../utils/currencyUtils";
import { getCategoryIcon } from "../utils/iconMapConfig";
import { getProgressBarColor } from "../utils/progressBarColor";

export default function MonthlyBreakdown({ transactions, categories, monthlyIncome, isLoading }) {
  const { settings } = useSettings();

  // Use the extracted hook for calculations
  const { categoryBreakdown, totalExpenses } = useMonthlyBreakdown(transactions, categories, monthlyIncome);

  return (
    <Card className="border-none shadow-lg">
      <CardHeader>
        <CardTitle>Monthly Budget Breakdown</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {isLoading ? (
          <Skeleton className="h-96 w-full" />
        ) : (
          <>
            <div className="grid grid-cols-2 gap-4 p-4 bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl">
              <div>
                <p className="text-sm text-gray-600 mb-1">Total Income</p>
                <p className="text-2xl font-bold text-gray-900">{formatCurrency(monthlyIncome, settings)}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600 mb-1">Total Expenses</p>
                <p className="text-2xl font-bold text-gray-900">{formatCurrency(totalExpenses, settings)}</p>
              </div>
            </div>

            {categoryBreakdown.length === 0 ? (
              <div className="h-40 flex items-center justify-center text-gray-400">
                <p>No expenses to show yet</p>
              </div>
            ) : (
              <div className="space-y-4">
                {categoryBreakdown.map((item) => {
                  const IconComponent = getCategoryIcon(item.icon);

                  return (
                    <div key={item.id || item.name} className="space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div
                            className="w-10 h-10 rounded-lg flex items-center justify-center"
                            style={{ backgroundColor: `${item.color}20` }}
                          >
                            <IconComponent className="w-5 h-5" style={{ color: item.color }} />
                          </div>
                          <div>
                            <p className="font-medium text-gray-900">{item.name}</p>
                            <p className="text-sm text-gray-500">
                              {item.expensePercentage.toFixed(1)}% of expenses
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-gray-900">{formatCurrency(item.amount, settings)}</p>
                          <p className="text-sm text-gray-500">
                            {item.percentage.toFixed(1)}% of income
                          </p>
                        </div>
                      </div>
                      <Progress
                        value={item.expensePercentage}
                        className="h-2"
                        style={{ '--progress-background': getProgressBarColor(item.expensePercentage) }}
                      />
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}