import { useState, useMemo, useEffect } from "react";
import { useSettings } from "../components/utils/SettingsContext";
import { usePeriod } from "../components/hooks/usePeriod";
import { useFAB } from "../components/hooks/FABContext";
import {
    useTransactions,
    useCategories,
    useGoals,
    useCustomBudgetsForPeriod, // UPDATED 04-Feb-2026: Was useCustomBudgetsAll
    useSystemBudgetsAll,
    useSystemBudgetsForPeriod,
    useSystemBudgetManagement,
} from "../components/hooks/useBase44Entities";
import {
    useMonthlyIncome,
    useDashboardSummary,
    useActiveBudgets,
    useMonthlyBreakdown
} from "../components/hooks/useDerivedData";
import {
    useTransactionActions,
    useCustomBudgetActions,
} from "../components/hooks/useActions";
import {
    getCustomBudgetStats,
    getSystemBudgetStats
} from "../components/utils/financialCalculations";
import MonthNavigator from "../components/ui/MonthNavigator";
import RemainingBudgetCard from "../components/dashboard/RemainingBudgetCard";
import MobileRemainingBudgetCard from "../components/dashboard/MobileRemainingBudgetCard";
import CustomBudgetsDisplay from "../components/dashboard/CustomBudgetsDisplay";
import RecentTransactions from "../components/dashboard/RecentTransactions";
import QuickAddTransaction from "../components/transactions/QuickAddTransaction";
import QuickAddIncome from "../components/transactions/QuickAddIncome";
import QuickAddBudget from "../components/dashboard/QuickAddBudget";
import { ImportWizardDialog } from "../components/import/ImportWizard";
import { Button } from "@/components/ui/button";
import { FileUp, MinusCircle, PlusCircle } from "lucide-react";

export default function Dashboard() {
    const { user, settings } = useSettings();
    const [showQuickAdd, setShowQuickAdd] = useState(false);
    const [showQuickAddIncome, setShowQuickAddIncome] = useState(false);
    const [showQuickAddBudget, setShowQuickAddBudget] = useState(false);
    const [showImportWizard, setShowImportWizard] = useState(false);
    const { setFabButtons, clearFabButtons } = useFAB();

    const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

    useEffect(() => {
        const handleResize = () => setIsMobile(window.innerWidth < 768);
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    // Period management
    const { selectedMonth, setSelectedMonth, selectedYear, setSelectedYear, monthStart, monthEnd } = usePeriod();

    // Data fetching
    // CRITICAL: Extract isLoading states to control the UI transitions
    const { transactions, isLoading: transactionsLoading } = useTransactions(monthStart, monthEnd);
    const { categories, isLoading: categoriesLoading } = useCategories();
    const { goals } = useGoals(user);
    const { customBudgets: allCustomBudgets } = useCustomBudgetsForPeriod(user, monthStart, monthEnd);
    const { allSystemBudgets } = useSystemBudgetsAll(user, monthStart, monthEnd);
    const { systemBudgets } = useSystemBudgetsForPeriod(user, monthStart, monthEnd);

    const activeCustomBudgetIds = useMemo(() =>
        allCustomBudgets.map(cb => cb.id),
        [allCustomBudgets]);

    const { transactions: bridgedTransactions } = useTransactions(null, null, activeCustomBudgetIds);

    useSystemBudgetManagement(user, selectedMonth, selectedYear, goals, transactions, systemBudgets, monthStart, monthEnd);

    const monthlyIncome = useMonthlyIncome(transactions, selectedMonth, selectedYear);

    const { currentMonthIncome, currentMonthExpenses, bonusSavingsPotential } = useDashboardSummary(
        transactions,
        selectedMonth,
        selectedYear,
        allCustomBudgets,
        systemBudgets,
        categories,
        settings
    );

    const { detailedBreakdown } = useMonthlyBreakdown(
        transactions,
        categories,
        monthlyIncome,
        allCustomBudgets,
        selectedMonth,
        selectedYear
    );

    const { activeCustomBudgets } = useActiveBudgets(
        allCustomBudgets,
        allSystemBudgets,
        selectedMonth,
        selectedYear
    );

    const systemBudgetsData = useMemo(() => {
        return systemBudgets.map(sb => ({
            ...sb,
            ...getSystemBudgetStats(
                sb,
                transactions,
                categories,
                allCustomBudgets,
                monthStart,
                monthEnd,
                monthlyIncome,
                settings
            )
        }));
    }, [systemBudgets, transactions, categories, allCustomBudgets, monthStart, monthEnd, monthlyIncome, settings]);

    const customBudgetsData = useMemo(() => {
        return activeCustomBudgets.map(cb => {
            const budgetTransactions = bridgedTransactions.filter(t => t.budgetId === cb.id);
            return getCustomBudgetStats(cb, budgetTransactions);
        });
    }, [activeCustomBudgets, bridgedTransactions]);

    const savingsTarget = useMemo(() => {
        const savingsGoal = goals.find(g => g.priority === 'savings');
        return savingsGoal ? (monthlyIncome * (savingsGoal.target_percentage / 100)) : 0;
    }, [goals, monthlyIncome]);

    const totalActualSavings = useMemo(() => {
        return transactions
            .filter(t => t.type === 'savings' || (categories.find(c => c.id === t.category_id)?.priority === 'savings'))
            .reduce((sum, t) => sum + (t.amount || 0), 0);
    }, [transactions, categories]);

    const savingsShortfall = useMemo(() => Math.max(0, savingsTarget - totalActualSavings), [savingsTarget, totalActualSavings]);

    const transactionActions = useTransactionActions({
        onSuccess: () => {
            setShowQuickAdd(false);
            setShowQuickAddIncome(false);
        }
    });

    const budgetActions = useCustomBudgetActions({
        transactions,
        onSuccess: () => {
            setShowQuickAddBudget(false);
        }
    });

    // UPDATED 04-Feb-2026: FAB buttons use simple configs with onClick handlers
    const fabButtons = useMemo(() => {
        const isEmptyMonth = (!currentMonthIncome || currentMonthIncome === 0) && (!currentMonthExpenses || currentMonthExpenses === 0);
        return [
            {
                key: 'import',
                label: 'Import Data',
                icon: 'FileUp',
                variant: 'primary',
                onClick: () => {
                    setShowImportWizard(true);
                }
            },
            {
                key: 'expense',
                label: 'Add Expense',
                icon: 'MinusCircle',
                variant: 'warning',
                onClick: () => setShowQuickAdd(true)
            },
            {
                key: 'income',
                label: 'Add Income',
                icon: 'PlusCircle',
                variant: 'success',
                highlighted: isEmptyMonth,
                onClick: () => setShowQuickAddIncome(true)
            }
        ];
    }, [currentMonthIncome, currentMonthExpenses]);

    useEffect(() => {
        setFabButtons(fabButtons);
        return () => clearFabButtons();
    }, [fabButtons, setFabButtons, clearFabButtons]);

    // Combine loading states. The dashboard summary relies heavily on transactions and categories.
    const isLoading = transactionsLoading || categoriesLoading;

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
                    <div className="md:col-span-3">
                        {isMobile ? (
                            <MobileRemainingBudgetCard
                                breakdown={detailedBreakdown}
                                systemBudgets={systemBudgetsData}
                                currentMonthIncome={currentMonthIncome}
                                currentMonthExpenses={currentMonthExpenses}
                                settings={settings}
                                isLoading={isLoading}
                                selectedMonth={selectedMonth}
                                selectedYear={selectedYear}
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
                            />
                        ) : (
                            <RemainingBudgetCard
                                breakdown={detailedBreakdown}
                                systemBudgets={systemBudgetsData}
                                bonusSavingsPotential={bonusSavingsPotential}
                                currentMonthIncome={currentMonthIncome}
                                currentMonthExpenses={currentMonthExpenses}
                                goals={goals}
                                settings={settings}
                                selectedMonth={selectedMonth}
                                selectedYear={selectedYear}
                                importDataButton={
                                    <Button variant="outline" size="sm" onClick={() => setShowImportWizard(true)} className="gap-2 h-8 text-xs">
                                        <FileUp className="h-3.5 w-3.5" />
                                        <span className="hidden xl:inline">Import</span>
                                    </Button>
                                }
                                addIncomeButton={
                                    <Button size="sm" onClick={() => setShowQuickAddIncome(true)} className="gap-2 h-8 text-xs bg-emerald-600 hover:bg-emerald-700 text-white border-none">
                                        <PlusCircle className="h-3.5 w-3.5" />
                                        <span className="hidden xl:inline">Income</span>
                                    </Button>
                                }
                                addExpenseButton={
                                    <Button variant="destructive" size="sm" onClick={() => setShowQuickAdd(true)} className="gap-2 h-8 text-xs">
                                        <MinusCircle className="h-3.5 w-3.5" />
                                        <span className="hidden xl:inline">Expense</span>
                                    </Button>
                                }
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
                            />
                        )}
                    </div>
                </div>

                <div className="grid lg:grid-cols-3 gap-6">
                    <div className="lg:col-span-2 flex flex-col min-w-0">
                        <CustomBudgetsDisplay
                            systemBudgets={systemBudgets}
                            customBudgets={activeCustomBudgets}
                            allCustomBudgets={allCustomBudgets}
                            preCalculatedSystemData={systemBudgetsData}
                            preCalculatedCustomData={customBudgetsData}
                            preCalculatedSavings={{ totalActualSavings, savingsTarget, savingsShortfall }}
                            transactions={bridgedTransactions}
                            showSystem={false}
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
                            categories={categories}
                            settings={settings}
                            customBudgets={allCustomBudgets}
                            onEdit={(data, transaction) => transactionActions.handleSubmit(data, transaction)}
                            onDelete={transactionActions.handleDelete}
                        />
                    </div>
                </div>

                {/* Hidden dialog components - opened by FAB button onClick handlers */}
                <QuickAddTransaction
                    open={showQuickAdd}
                    selectedMonth={selectedMonth}
                    selectedYear={selectedYear}
                    onOpenChange={setShowQuickAdd}
                    categories={categories}
                    customBudgets={activeCustomBudgets}
                    onSubmit={transactionActions.handleSubmit}
                    isSubmitting={transactionActions.isSubmitting}
                    transactions={transactions}
                    renderTrigger={false}
                />

                <QuickAddIncome
                    open={showQuickAddIncome}
                    selectedMonth={selectedMonth}
                    selectedYear={selectedYear}
                    onOpenChange={setShowQuickAddIncome}
                    onSubmit={transactionActions.handleSubmit}
                    isSubmitting={transactionActions.isSubmitting}
                    renderTrigger={false}
                />

                <QuickAddBudget
                    open={showQuickAddBudget}
                    onOpenChange={setShowQuickAddBudget}
                    onSubmit={budgetActions.handleSubmit}
                    onCancel={() => setShowQuickAddBudget(false)}
                    isSubmitting={budgetActions.isSubmitting}
                    baseCurrency={settings.baseCurrency}
                />

                <ImportWizardDialog
                    open={showImportWizard}
                    onOpenChange={setShowImportWizard}
                    renderTrigger={false}
                />
            </div>
        </div>
    );
}