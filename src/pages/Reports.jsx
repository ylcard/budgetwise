import React from "react";
import { useSettings } from "../components/utils/SettingsContext";
import {
  useReportData,
  useReportPeriodState,
  useGoalActions,
} from "../components/hooks/useFinancialData";

import MonthlyBreakdown from "../components/reports/MonthlyBreakdown";
import PriorityChart from "../components/reports/PriorityChart";
import GoalSettings from "../components/reports/GoalSettings";
import MonthNavigator from "../components/ui/MonthNavigator";

export default function Reports() {
  const { user } = useSettings();

  // Data fetching
  const { transactions, categories, goals, isLoading } = useReportData(user);

  // Period management and aggregated data
  const { 
    selectedMonth, 
    setSelectedMonth, 
    selectedYear, 
    setSelectedYear, 
    monthlyTransactions, 
    monthlyIncome, 
    displayDate 
  } = useReportPeriodState(transactions);

  // Goal mutations and actions
  const { handleGoalUpdate, isSaving } = useGoalActions(user, goals);

  return (
    <div className="min-h-screen p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        <div>
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900">Reports & Goals</h1>
          <p className="text-gray-500 mt-1">
            Analyze your spending for {displayDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
          </p>
        </div>

        <MonthNavigator
          currentMonth={selectedMonth}
          currentYear={selectedYear}
          onMonthChange={(month, year) => {
            setSelectedMonth(month);
            setSelectedYear(year);
          }}
        />

        <div className="grid lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <MonthlyBreakdown
              transactions={monthlyTransactions}
              categories={categories}
              monthlyIncome={monthlyIncome}
              isLoading={isLoading}
            />

            <PriorityChart
              transactions={monthlyTransactions}
              categories={categories}
              goals={goals}
              monthlyIncome={monthlyIncome}
              isLoading={isLoading}
            />
          </div>

          <div>
            <GoalSettings
              goals={goals}
              onGoalUpdate={handleGoalUpdate}
              isLoading={isLoading}
              isSaving={isSaving}
            />
          </div>
        </div>
      </div>
    </div>
  );
}