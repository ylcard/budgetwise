
import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { useSettings } from "../components/utils/SettingsContext";
import { usePeriod } from "../components/hooks/usePeriod";
import {
  useTransactions,
  useCategories,
  useGoals,
  useCustomBudgetsAll,
  useSystemBudgetsAll,
  useSystemBudgetsForPeriod,
  useSystemBudgetManagement,
  useCashWallet,
} from "../components/hooks/useBase44Entities";
import {
  usePaidTransactions,
  useMonthlyTransactions,
  useMonthlyIncome,
  useDashboardSummary,
  useActiveBudgets,
} from "../components/hooks/useDerivedData";
import {
  useTransactionMutationsDashboard,
  useCustomBudgetActions,
} from "../components/hooks/useActions";
import { useCashWalletActions } from "../components/cashwallet/useCashWalletActions";
import { useExchangeRates } from "../components/hooks/useExchangeRates";

import QuickAddTransaction from "../components/transactions/QuickAddTransaction";
import QuickAddIncome from "../components/transactions/QuickAddIncome";
import QuickAddBudget from "../components/dashboard/QuickAddBudget";
import RemainingBudgetCard from "../components/dashboard/RemainingBudgetCard";
import RecentTransactions from "../components/dashboard/RecentTransactions";
import MonthNavigator from "../components/ui/MonthNavigator";
import BudgetBars from "../components/dashboard/BudgetBars";
import CashWalletCard from "../components/cashwallet/CashWalletCard";
import CashWithdrawDialog from "../components/cashwallet/CashWithdrawDialog";
import CashDepositDialog from "../components/cashwallet/CashDepositDialog";

export default function Dashboard() {
  const { user, settings } = useSettings();
  const [showQuickAdd, setShowQuickAdd] = useState(false);
  const [showQuickAddIncome, setShowQuickAddIncome] = useState(false);
  const [showQuickAddBudget, setShowQuickAddBudget] = useState(false);

  // Period management
  const { selectedMonth, setSelectedMonth, selectedYear, setSelectedYear, displayDate, monthStart, monthEnd } = usePeriod();

  // Data fetching
  const { transactions } = useTransactions();
  const { categories } = useCategories();
  const { goals } = useGoals(user);
  const { allCustomBudgets } = useCustomBudgetsAll(user);
  const { allSystemBudgets } = useSystemBudgetsAll(user);
  const { systemBudgets, isLoading: loadingSystemBudgets } = useSystemBudgetsForPeriod(user, monthStart, monthEnd);
  const { cashWallet } = useCashWallet(user);
  const { exchangeRates } = useExchangeRates();

  // System budget management (auto-creation/update)
  useSystemBudgetManagement(user, selectedMonth, selectedYear, goals, transactions, systemBudgets, monthStart, monthEnd);

  // Derived data
  const paidTransactions = usePaidTransactions(transactions, 10);
  const monthlyTransactions = useMonthlyTransactions(transactions, selectedMonth, selectedYear);
  const monthlyIncome = useMonthlyIncome(monthlyTransactions);
  const { remainingBudget, currentMonthIncome, currentMonthExpenses } = useDashboardSummary(
    transactions,
    selectedMonth,
    selectedYear,
    allCustomBudgets,
    systemBudgets
  );
  const { activeCustomBudgets, allActiveBudgets } = useActiveBudgets(
    allCustomBudgets,
    allSystemBudgets,
    selectedMonth,
    selectedYear
  );

  // Actions
  const transactionActions = useTransactionMutationsDashboard(setShowQuickAdd, setShowQuickAddIncome);
  const budgetActions = useCustomBudgetActions(user, transactions, cashWallet);
  const cashWalletActions = useCashWalletActions(user, cashWallet, settings, exchangeRates);

  return (
    <div className="min-h-screen p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* ENHANCEMENT (2025-01-11): Simplified header - removed month navigator (moved to card) */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-3xl md:text-4xl font-bold text-gray-900">Dashboard</h1>
            <p className="text-gray-500 mt-1">Welcome back, {user?.full_name || 'User'}!</p>
          </div>
        </div>

        {/* ENHANCEMENT (2025-01-11): Main cards with integrated month navigator and action buttons */}
        <div className="grid md:grid-cols-3 gap-6">
          <div className="md:col-span-2">
            <RemainingBudgetCard
              remainingBudget={remainingBudget}
              currentMonthIncome={currentMonthIncome}
              currentMonthExpenses={currentMonthExpenses}
              settings={settings}
              monthNavigator={
                <MonthNavigator
                  currentMonth={selectedMonth}
                  currentYear={selectedYear}
                  onMonthChange={(month, year) => {
                    setSelectedMonth(month);
                    setSelectedYear(year);
                  }}
                />
              }
              addIncomeButton={
                <Button
                  onClick={() => setShowQuickAddIncome(true)}
                  variant="ghost"
                  className="text-white border-white/30 hover:bg-white/20 hover:border-white/50"
                  size="sm"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add Income
                </Button>
              }
              addExpenseButton={
                <Button
                  onClick={() => setShowQuickAdd(true)}
                  variant="ghost"
                  className="text-white border-white/30 hover:bg-white/20 hover:border-white/50"
                  size="sm"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add Expense
                </Button>
              }
            />
          </div>
          <div className="md:col-span-1">
            <CashWalletCard
              cashWallet={cashWallet}
              onDepositCash={cashWalletActions.openDepositCashDialog}
              onReturnCash={cashWalletActions.openReturnCashDialog}
            />
          </div>
        </div>

        {/* ENHANCEMENT (2025-01-11): Budget bars and recent transactions with matched heights */}
        <div className="grid lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 flex flex-col">
            <BudgetBars
              systemBudgets={systemBudgets}
              customBudgets={activeCustomBudgets}
              allCustomBudgets={allCustomBudgets}
              transactions={transactions}
              categories={categories}
              currentMonth={selectedMonth}
              currentYear={selectedYear}
              settings={settings}
              goals={goals}
              monthlyIncome={monthlyIncome}
              baseCurrency={settings.baseCurrency}
              onDeleteBudget={budgetActions.handleDelete}
              onCompleteBudget={(id) => budgetActions.handleStatusChange(id, 'completed')}
              onCreateBudget={() => {
                budgetActions.setEditingBudget(null);
                setShowQuickAddBudget(true);
              }}
            />
          </div>

          <div className="lg:col-span-1 flex flex-col">
            <RecentTransactions
              transactions={paidTransactions}
              categories={categories}
              settings={settings}
            />
          </div>
        </div>

        <QuickAddTransaction
          open={showQuickAdd}
          onOpenChange={setShowQuickAdd}
          categories={categories}
          customBudgets={allActiveBudgets}
          onSubmit={transactionActions.createTransaction}
          isSubmitting={transactionActions.isCreating}
          transactions={transactions}
        />

        <QuickAddIncome
          open={showQuickAddIncome}
          onOpenChange={setShowQuickAddIncome}
          onSubmit={transactionActions.createTransaction}
          isSubmitting={transactionActions.isCreating}
        />

        {showQuickAddBudget && (
          <QuickAddBudget
            onSubmit={budgetActions.handleSubmit}
            onCancel={() => setShowQuickAddBudget(false)}
            isSubmitting={budgetActions.isSubmitting}
            cashWallet={cashWallet}
            baseCurrency={settings.baseCurrency}
          />
        )}

        <CashWithdrawDialog
          open={cashWalletActions.depositCashDialogOpen}
          onOpenChange={cashWalletActions.setDepositCashDialogOpen}
          categories={categories}
          onSubmit={cashWalletActions.handleDepositCash}
          isSubmitting={cashWalletActions.isDepositingCash}
          baseCurrency={settings.baseCurrency}
        />

        <CashDepositDialog
          open={cashWalletActions.returnCashDialogOpen}
          onOpenChange={cashWalletActions.setReturnCashDialogOpen}
          onSubmit={cashWalletActions.handleReturnCash}
          isSubmitting={cashWalletActions.isReturningCash}
          cashWallet={cashWallet}
          baseCurrency={settings.baseCurrency}
          settings={settings}
        />
      </div>
    </div>
  );
}
