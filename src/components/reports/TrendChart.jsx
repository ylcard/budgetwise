import React, { useMemo } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { formatCurrency } from "../utils/currencyUtils";
import { Button } from "@/components/ui/button";
import MonthNavigator from "../ui/MonthNavigator";
import { RotateCcw, Wallet } from "lucide-react";

// Import necessary calculation functions from your centralized file
import { getMonthlyIncome, getMonthlyPaidExpenses } from "../utils/financialCalculations";

// 1. Helper function is defined OUTSIDE the component for cleaner structure and useMemo
const calculateTrendData = (allTransactions, currentMonth, currentYear) => {
  const result = [];
  for (let i = 5; i >= 0; i--) {
    let targetMonth = currentMonth - i;
    let targetYear = currentYear;

    if (targetMonth < 0) {
      targetMonth += 12;
      targetYear -= 1;
    }

    const d = new Date(targetYear, targetMonth, 1);
    const label = d.toLocaleDateString('en-US', { month: 'short' });

    // Determine month start/end dates for financial calculation helpers
    const startDate = new Date(targetYear, targetMonth, 1).toISOString();
    const endDate = new Date(targetYear, targetMonth + 1, 0).toISOString();

    // FIX: Use centralized, robust financial calculation functions
    const income = getMonthlyIncome(allTransactions, startDate, endDate);
    const expense = Math.abs(getMonthlyPaidExpenses(allTransactions, startDate, endDate));

    result.push({ label, income, expense });
  }
  return result;
};


// 2. Component signature includes props for navigation control
export default function TrendChart({
  allTransactions = [],
  currentMonth,
  currentYear,
  settings,
  setSelectedMonth,
  setSelectedYear
}) {
  // FIX: useMemo correctly calls the helper function and uses correct dependencies
  const data = useMemo(() => {
    // Pass the raw data and the target period for trend calculation
    return calculateTrendData(allTransactions, currentMonth, currentYear);
  }, [allTransactions, currentMonth, currentYear]);

  // Check for sufficient data (Threshold: at least 2 months with non-zero activity)
  const activeMonths = data.filter(item => item.income > 0 || item.expense > 0).length;
  const isInsufficientData = activeMonths < 2;

  const maxVal = Math.max(...data.map(d => Math.max(d.income, d.expense)), 100);
  const scale = (value) => (value / maxVal) * 100;

  // Logic for Reset Button (needs to be calculated here for the embedded navigator)
  const isCurrentMonth = (new Date().getMonth() === currentMonth && new Date().getFullYear() === currentYear);
  const handleResetToCurrentMonth = () => {
    setSelectedMonth(new Date().getMonth());
    setSelectedYear(new Date().getFullYear());
  };

  return (
    <Card className="border-none shadow-sm">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-lg font-semibold text-gray-800">6 Month Trend</CardTitle>

        {/* 3. Embedded Month Navigator (as requested) */}
        <div className="flex items-center space-x-3">
          {/* LEFT RESET BUTTON */}
          {!isCurrentMonth && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleResetToCurrentMonth}
              className="text-xs h-8 px-3 transition-colors duration-200 flex items-center gap-1"
            >
              <RotateCcw className="w-3 h-3" />
              Reset
            </Button>
          )}
          <MonthNavigator
            currentMonth={currentMonth}
            currentYear={currentYear}
            onMonthChange={(month, year) => {
              setSelectedMonth(month);
              setSelectedYear(year);
            }}
            // Use the compact layout to hide the default button placement
            layout="reports-compact"
          />
        </div>
      </CardHeader>

      <CardContent>
        {/* 4. Insufficient Data Fallback */}
        {isInsufficientData ? (
          <div className="h-52 flex flex-col items-center justify-center text-center text-gray-500 bg-gray-50 rounded-lg border border-dashed">
            <Wallet className="w-6 h-6 mb-2" />
            <p className="font-semibold">Insufficient Data</p>
            <p className="text-sm mt-1">Need activity in at least two months to visualize a trend.</p>
          </div>
        ) : (
          <div className="relative h-52 mt-4 px-2">
            {/* Legend */}
            <div className="absolute top-0 right-0 text-xs text-gray-500 space-y-1 z-10">
              <div className="flex items-center">
                <span className="inline-block w-2 h-2 rounded-full bg-emerald-500 mr-2"></span> Income
              </div>
              <div className="flex items-center">
                <span className="inline-block w-2 h-2 rounded-full bg-rose-500 mr-2"></span> Expense
              </div>
            </div>

            {/* Chart Container - Horizontal Axis */}
            <div className="flex items-end justify-between h-full">
              {data.map((item, idx) => {
                const netFlow = item.income - item.expense;
                const incomeHeight = scale(item.income);
                const expenseHeight = scale(item.expense);

                return (
                  <div key={idx} className="flex-1 flex flex-col items-center gap-3 group relative h-full justify-end px-2">
                    <div className="w-full h-full relative flex items-end justify-center">

                      {/* Stacked Bar/Area for Income */}
                      <div
                        className="absolute bottom-0 w-8 rounded-t-md transition-all duration-300 bg-emerald-300 opacity-60 hover:opacity-80"
                        style={{ height: `${incomeHeight}%` }}
                      ></div>

                      {/* Expense Bar (Overlay for Stacked Look) */}
                      <div
                        className="absolute bottom-0 w-8 rounded-t-md transition-all duration-300 bg-rose-400 opacity-80 hover:opacity-100"
                        style={{ height: `${expenseHeight}%` }}
                      ></div>

                      {/* Net Flow Marker (Line Chart Simulation) */}
                      <div
                        className="absolute bottom-0 w-1 rounded-full border-2 border-white shadow-lg z-10"
                        style={{
                          height: `${scale(Math.abs(netFlow))}%`,
                          backgroundColor: netFlow >= 0 ? '#3b82f6' : '#ef4444'
                        }}
                      />
                    </div>

                    {/* X-Axis Label */}
                    <span className={`text-xs font-medium ${idx === 5 ? 'text-gray-900 font-bold' : 'text-gray-400'}`}>
                      {item.label}
                    </span>

                    {/* Hover Tooltip */}
                    <div className="absolute bottom-12 opacity-0 group-hover:opacity-100 transition-opacity bg-gray-800 text-white text-xs p-2 rounded shadow-lg z-10 whitespace-nowrap pointer-events-none">
                      <div className="flex items-center gap-2">
                        <span className="text-emerald-300">In: {formatCurrency(item.income, settings)}</span>
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-rose-300">Out: {formatCurrency(item.expense, settings)}</span>
                      </div>
                      <div className="flex items-center gap-2 mt-1 border-t border-gray-700 pt-1">
                        <span className={`${netFlow >= 0 ? 'text-blue-300' : 'text-red-300'}`}>Net: {formatCurrency(netFlow, settings)}</span>
                      </div>
                    </div>

                  </div>
                );
              })}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}