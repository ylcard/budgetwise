import React, { useState } from "react";
import { Plus, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useSettings } from "../components/utils/SettingsContext";
import {
  useMonthNavigation,
  useTransactionsData,
  useBudgetGoals,
  useAllMiniBudgets,
  useAllSystemBudgets,
  useSystemBudgets,
  useSystemBudgetManagement,
  useActiveBudgets,
  useTransactionMutations,
  useBudgetMutations,
  useDashboardSummary,
} from "../components/hooks/useFinancialData";

import RemainingBudgetCard from "../components/dashboard/RemainingBudgetCard";
import BudgetBars from "../components/dashboard/BudgetBars";
import RecentTransactions from "../components/dashboard/RecentTransactions";
import QuickAddTransaction from "../components/transactions/QuickAddTransaction";
import QuickAddIncome from "../components/transactions/QuickAddIncome";
import QuickAddBudget from "../components/dashboard/QuickAddBudget";
import MonthNavigator from "../components/ui/MonthNavigator";

export default function Dashboard() {
  const { settings, user } = useSettings();
  
  // UI state
  const [showQuickAdd, setShowQuickAdd] = useState(false);
  const [showQuickAddIncome, setShowQuickAddIncome] = useState(false);
  const [showQuickAddBudget, setShowQuickAddBudget] = useState(false);
  const [isTransactionsCollapsed, setIsTransactionsCollapsed] = useState(false);

  // Month navigation
  const { selectedMonth, selectedYear, setSelectedMonth, setSelectedYear } = useMonthNavigation();

  // Data fetching
  const { transactions, categories } = useTransactionsData();
  const { goals } = useBudgetGoals(user);
  const { allMiniBudgets } = useAllMiniBudgets(user);
  const { allSystemBudgets } = useAllSystemBudgets(user);
  const { systemBudgets, monthStart, monthEnd } = useSystemBudgets(user, selectedMonth, selectedYear);

  // System budget management (auto-create/update)
  useSystemBudgetManagement(
    user,
    selectedMonth,
    selectedYear,
    goals,
    transactions,
    systemBudgets,
    monthStart,
    monthEnd
  );

  // Computed data
  const { activeMiniBudgets, allActiveBudgets } = useActiveBudgets(
    allMiniBudgets,
    allSystemBudgets,
    selectedMonth,
    selectedYear
  );

  const { remainingBudget, currentMonthIncome, currentMonthExpenses } = useDashboardSummary(
    transactions,
    selectedMonth,
    selectedYear
  );

  // Mutations with state setters passed to hooks
  const { createTransaction, isCreating } = useTransactionMutations(setShowQuickAdd, setShowQuickAddIncome);
  const { createBudget, deleteBudget, completeBudget } = useBudgetMutations(
    user,
    transactions,
    allMiniBudgets,
    setShowQuickAddBudget
  );

  const displayDate = new Date(selectedYear, selectedMonth);

  return (
    <div className="min-h-screen p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-3xl md:text-4xl font-bold text-gray-900">Dashboard</h1>
            <p className="text-gray-500 mt-1">Your financial overview for {displayDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</p>
          </div>
          <div className="flex gap-3">
            <Button
              onClick={() => setShowQuickAddIncome(true)}
              className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 shadow-lg hover:shadow-xl transition-all duration-200"
            >
              <TrendingUp className="w-4 h-4 mr-2" />
              Quick Add Income
            </Button>
            <Button
              onClick={() => setShowQuickAdd(true)}
              className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 shadow-lg hover:shadow-xl transition-all duration-200"
            >
              <Plus className="w-4 h-4 mr-2" />
              Quick Add Expense
            </Button>
          </div>
        </div>

        <MonthNavigator
          currentMonth={selectedMonth}
          currentYear={selectedYear}
          onMonthChange={(month, year) => {
            setSelectedMonth(month);
            setSelectedYear(year);
          }}
        />

        <RemainingBudgetCard
          remaining={remainingBudget}
          income={currentMonthIncome}
          expenses={currentMonthExpenses}
          settings={settings}
        />

        <div className={`grid gap-6 transition-all ${isTransactionsCollapsed ? 'lg:grid-cols-[1fr_80px]' : 'lg:grid-cols-[2fr_1fr]'}`}>
          <BudgetBars
            systemBudgets={systemBudgets}
            miniBudgets={activeMiniBudgets}
            allMiniBudgets={allMiniBudgets}
            transactions={transactions}
            categories={categories}
            currentMonth={selectedMonth}
            currentYear={selectedYear}
            settings={settings}
            goals={goals}
            monthlyIncome={currentMonthIncome}
            onDeleteBudget={deleteBudget}
            onCompleteBudget={completeBudget}
            onCreateBudget={() => setShowQuickAddBudget(true)}
          />

          <RecentTransactions
            transactions={transactions.slice(0, 10)}
            categories={categories}
            miniBudgets={activeMiniBudgets}
            settings={settings}
            isCollapsed={isTransactionsCollapsed}
            onToggleCollapse={() => setIsTransactionsCollapsed(!isTransactionsCollapsed)}
          />
        </div>

        <QuickAddTransaction
          open={showQuickAdd}
          onOpenChange={setShowQuickAdd}
          categories={categories}
          miniBudgets={allActiveBudgets}
          onSubmit={createTransaction}
          isSubmitting={isCreating}
        />

        <QuickAddIncome
          open={showQuickAddIncome}
          onOpenChange={setShowQuickAddIncome}
          onSubmit={createTransaction}
          isSubmitting={isCreating}
        />

        <QuickAddBudget
          open={showQuickAddBudget}
          onOpenChange={setShowQuickAddBudget}
          onSubmit={createBudget}
          isSubmitting={isCreating}
          selectedMonth={selectedMonth}
          selectedYear={selectedYear}
        />
      </div>
    </div>
  );
}