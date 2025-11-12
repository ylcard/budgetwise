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

export default function Reports() {
  const { user } = useSettings();

  // Period management
  const { selectedMonth, setSelectedMonth, selectedYear, setSelectedYear, displayDate } = usePeriod();

  // Data fetching
  const { transactions, isLoading: loadingTransactions } = useTransactions();
  const { categories, isLoading: loadingCategories } = useCategories();
  const { goals, isLoading: loadingGoals } = useGoals(user);

  // Derived data
  const monthlyTransactions = useMonthlyTransactions(transactions, selectedMonth, selectedYear);
  
  // REFACTORED 14-Jan-2025: Use centralized useMonthlyIncome hook with full transactions + month/year
  // Previous implementation filtered transactions first (monthlyTransactions), now passes full set
  const monthlyIncome = useMonthlyIncome(transactions, selectedMonth, selectedYear);
  
  // COMMENTED OUT 14-Jan-2025: Old implementation that required pre-filtered monthlyTransactions
  // const monthlyIncome = useMonthlyIncome(monthlyTransactions);

  // Goal mutations and actions
  const { handleGoalUpdate, isSaving } = useGoalActions(user, goals);

  const isLoading = loadingTransactions || loadingCategories || loadingGoals;

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

// REFACTORED 14-Jan-2025: Updated to use centralized useMonthlyIncome hook with full transactions + month/year parameters