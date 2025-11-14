import React, { useState } from "react";
// COMMENTED OUT 13-Jan-2025: Button and Plus imports moved inline to where they're needed
// import { Button } from "@/components/ui/button";
// import { Plus } from "lucide-react";
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
// UPDATED 16-Jan-2025: Removed useTransactionMutationsDashboard (deprecated), now using useTransactionActions
import {
    useTransactionActions,
    useCustomBudgetActions,
} from "../components/hooks/useActions";
import { useCashWalletActions } from "../components/cashwallet/useCashWalletActions";
import { useExchangeRates } from "../components/hooks/useExchangeRates";

import MonthNavigator from "../components/ui/MonthNavigator";
import RemainingBudgetCard from "../components/dashboard/RemainingBudgetCard";
import BudgetBars from "../components/dashboard/BudgetBars";
import RecentTransactions from "../components/dashboard/RecentTransactions";
import QuickAddTransaction from "../components/transactions/QuickAddTransaction";
import QuickAddIncome from "../components/transactions/QuickAddIncome";
import QuickAddBudget from "../components/dashboard/QuickAddBudget";
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
    
    // REFACTORED 14-Jan-2025: Use centralized useMonthlyIncome hook with full transactions + month/year
    // Previous implementation filtered transactions first (monthlyTransactions), now passes full set
    const monthlyIncome = useMonthlyIncome(transactions, selectedMonth, selectedYear);
    
    // COMMENTED OUT 14-Jan-2025: Old implementation that required pre-filtered monthlyTransactions
    // const monthlyIncome = useMonthlyIncome(monthlyTransactions);
    
    // Dashboard summary with categories parameter for granular expense calculations
    const { remainingBudget, currentMonthIncome, currentMonthExpenses } = useDashboardSummary(
        transactions,
        selectedMonth,
        selectedYear,
        allCustomBudgets,
        systemBudgets,
        categories
    );
    
    const { activeCustomBudgets, allActiveBudgets } = useActiveBudgets(
        allCustomBudgets,
        allSystemBudgets,
        selectedMonth,
        selectedYear
    );

    // UPDATED 16-Jan-2025: Replaced deprecated useTransactionMutationsDashboard with unified useTransactionActions
    // Now uses options.onSuccess callback to close dialogs after successful transaction creation
    const transactionActions = useTransactionActions(null, null, cashWallet, {
        onSuccess: () => {
            setShowQuickAdd(false);
            setShowQuickAddIncome(false);
        }
    });

    // ENHANCED 16-Jan-2025: Added options.onSuccess callback to close dialog after budget creation
    const budgetActions = useCustomBudgetActions(user, transactions, cashWallet, {
        onSuccess: () => {
            setShowQuickAddBudget(false);
        }
    });

    const cashWalletActions = useCashWalletActions(user, cashWallet, settings, exchangeRates);

    return (
        <div className="min-h-screen p-4 md:p-8">
            <div className="max-w-7xl mx-auto space-y-6">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div>
                        <h1 className="text-3xl md:text-4xl font-bold text-gray-900">Dashboard</h1>
                        <p className="text-gray-500 mt-1">Welcome back, {user?.full_name || 'User'}!</p>
                    </div>
                </div>

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
                                <QuickAddIncome
                                    open={showQuickAddIncome}
                                    onOpenChange={setShowQuickAddIncome}
                                    onSubmit={transactionActions.handleSubmit}
                                    isSubmitting={transactionActions.isSubmitting}
                                    renderTrigger={true}
                                    triggerVariant="ghost"
                                    triggerSize="sm"
                                    triggerClassName="text-white border-white/30 hover:bg-white/20 hover:border-white/50"
                                />
                            }
                            addExpenseButton={
                                <QuickAddTransaction
                                    open={showQuickAdd}
                                    onOpenChange={setShowQuickAdd}
                                    categories={categories}
                                    customBudgets={allActiveBudgets}
                                    onSubmit={transactionActions.handleSubmit}
                                    isSubmitting={transactionActions.isSubmitting}
                                    transactions={transactions}
                                    renderTrigger={true}
                                    triggerVariant="ghost"
                                    triggerSize="sm"
                                    triggerClassName="text-white border-white/30 hover:bg-white/20 hover:border-white/50"
                                />
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
                            onCreateBudget={() => setShowQuickAddBudget(true)}
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

                {/* REMOVED 13-Jan-2025: Standalone QuickAddTransaction and QuickAddIncome - they now render their own triggers inline */}
                {/* <QuickAddTransaction
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
                /> */}

                <QuickAddBudget
                    open={showQuickAddBudget}
                    onOpenChange={setShowQuickAddBudget}
                    onSubmit={budgetActions.handleSubmit}
                    onCancel={() => setShowQuickAddBudget(false)}
                    isSubmitting={budgetActions.isSubmitting}
                    cashWallet={cashWallet}
                    baseCurrency={settings.baseCurrency}
                />

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

// REFACTORED 11-Nov-2025: Updated to use new utility file structure (dateUtils, currencyUtils, generalUtils)
// All imports now point to specialized utility files instead of deprecated budgetCalculations.js
// UPDATED 13-Jan-2025: QuickAddTransaction and QuickAddIncome now render their own trigger buttons inline in RemainingBudgetCard
// REFACTORED 14-Jan-2025: Updated to use centralized useMonthlyIncome hook with full transactions + month/year parameters
// CRITICAL REFACTOR 16-Jan-2025: Fixed data integrity issues by removing deprecated dashboard hooks
// - Removed useTransactionMutationsDashboard (had missing SYSTEM_BUDGETS invalidation)
// - Now uses unified useTransactionActions with options.onSuccess callback for dialog closing
// - Enhanced budgetActions with options.onSuccess callback for consistent UI behavior
// - All CRUD operations now go through robust, fully-featured hooks with proper cash wallet handling
// - This prevents data corruption (missing cash returns, incorrect status assignment) previously present in dashboard-specific hooks