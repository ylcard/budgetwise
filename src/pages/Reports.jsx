
import React from "react";
import { useSettings } from "../components/utils/SettingsContext";
import { usePeriod } from "../components/hooks/usePeriod";
import { useTransactions, useCategories, useGoals } from "../components/hooks/useBase44Entities";
import { useMonthlyTransactions, useMonthlyIncome } from "../components/hooks/useDerivedData";
import { useGoalActions } from "../components/hooks/useActions";
import MonthlyBreakdown from "../components/reports/MonthlyBreakdown";
import PriorityChart from "../components/reports/PriorityChart";
import GoalSettings from "../components/reports/GoalSettings";
import MonthNavigator from "../components/ui/MonthNavigator";
import TrendChart from "../components/reports/TrendChart";
import ReportStats from "../components/reports/ReportStats";

export default function Reports() {
  const { user, settings } = useSettings();

  // Period management
  const {
    selectedMonth,
    setSelectedMonth,
    selectedYear,
    setSelectedYear,
    displayDate,
    monthStart, // Required for ReportStats calculation
    monthEnd  // Required for ReportStats calculation
  } = usePeriod();

  // Data fetching
  const { transactions, isLoading: loadingTransactions } = useTransactions();
  const { categories, isLoading: loadingCategories } = useCategories();
  const { goals, isLoading: loadingGoals } = useGoals(user);

  // Derived data
  const monthlyTransactions = useMonthlyTransactions(transactions, selectedMonth, selectedYear);
  const monthlyIncome = useMonthlyIncome(transactions, selectedMonth, selectedYear);

  // Goal mutations and actions
  const { handleGoalUpdate, isSaving } = useGoalActions(user, goals);

  const isLoading = loadingTransactions || loadingCategories || loadingGoals;

  return (
    <div className="min-h-screen p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header Section */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 mb-4">
          <div>
            <h1 className="text-3xl md:text-4xl font-bold text-gray-900">Financial Reports</h1>
            <p className="text-gray-500 mt-1">
              Performance analysis for {displayDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
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
        </div>

        {/* 1. High-Level KPIs (New) */}
        <ReportStats
          transactions={monthlyTransactions}
          monthlyIncome={monthlyIncome}
          isLoading={isLoading}
          settings={settings}
        />

        {/* 2. Historical Context (New) */}
        <TrendChart
          allTransactions={transactions}
          currentMonth={selectedMonth}
          currentYear={selectedYear}
          settings={settings}
        />

        {/* 3. Detailed Breakdown & Goals */}
        <div className="grid lg:grid-cols-3 gap-8">
          {/* Left Column: Composition Analysis */}
          <div className="lg:col-span-2 space-y-8">
            <PriorityChart
              transactions={monthlyTransactions}
              categories={categories}
              goals={goals}
              monthlyIncome={monthlyIncome}
              isLoading={isLoading}
            />

            <MonthlyBreakdown
              transactions={monthlyTransactions}
              categories={categories}
              monthlyIncome={monthlyIncome}
              isLoading={isLoading}
            />
          </div>

          {/* Right Column: Goal Management */}
          <div className="space-y-6">
            <div className="sticky top-8">
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
    </div>
  );
}