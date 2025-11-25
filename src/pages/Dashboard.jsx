import { useState } from "react";
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
    useMonthlyIncome,
    useDashboardSummary,
    useActiveBudgets,
} from "../components/hooks/useDerivedData";
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
import { ImportWizardDialog } from "../components/import/ImportWizard";

export default function Dashboard() {
    const { user, settings } = useSettings();
    const [showQuickAdd, setShowQuickAdd] = useState(false);
    const [showQuickAddIncome, setShowQuickAddIncome] = useState(false);
    const [showQuickAddBudget, setShowQuickAddBudget] = useState(false);

    // Period management
    const { selectedMonth, setSelectedMonth, selectedYear, setSelectedYear, monthStart, monthEnd } = usePeriod();

    // Data fetching
    const { transactions } = useTransactions();
    const { categories } = useCategories();
    const { goals } = useGoals(user);
    const { allCustomBudgets } = useCustomBudgetsAll(user);
    const { allSystemBudgets } = useSystemBudgetsAll(user);
    const { systemBudgets } = useSystemBudgetsForPeriod(user, monthStart, monthEnd);
    const { cashWallet } = useCashWallet(user);
    const { exchangeRates } = useExchangeRates();

    // System budget management (auto-creation/update)
    useSystemBudgetManagement(user, selectedMonth, selectedYear, goals, transactions, systemBudgets, monthStart, monthEnd);

    // Derived data
    const paidTransactions = usePaidTransactions(transactions, 10);

    const monthlyIncome = useMonthlyIncome(transactions, selectedMonth, selectedYear);

    // Dashboard summary with categories parameter for granular expense calculations
    const { remainingBudget, currentMonthIncome, currentMonthExpenses } = useDashboardSummary(
        transactions,
        selectedMonth,
        selectedYear,
        allCustomBudgets,
        systemBudgets,
        categories
    );

    const { activeCustomBudgets } = useActiveBudgets(
        allCustomBudgets,
        allSystemBudgets,
        selectedMonth,
        selectedYear
    );

    const transactionActions = useTransactionActions(null, null, cashWallet, {
        onSuccess: () => {
            setShowQuickAdd(false);
            setShowQuickAddIncome(false);
        }
    });

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
                                    resetPosition="right"
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
                                    triggerVariant="seamless"
                                    triggerSize="sm"
                                />
                            }
                            addExpenseButton={
                                <QuickAddTransaction
                                    open={showQuickAdd}
                                    onOpenChange={setShowQuickAdd}
                                    categories={categories}
                                    customBudgets={activeCustomBudgets}
                                    onSubmit={transactionActions.handleSubmit}
                                    isSubmitting={transactionActions.isSubmitting}
                                    transactions={transactions}
                                    renderTrigger={true}
                                    triggerVariant="seamless"
                                    triggerSize="sm"
                                />
                            }
                            importDataButton={
                                <ImportWizardDialog
                                    triggerVariant="seamless"
                                    triggerSize="sm"
                                    triggerClassName="w-full justify-start"
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
