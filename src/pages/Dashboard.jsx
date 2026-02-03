import { useState, useMemo } from "react";
import { useSettings } from "../components/utils/SettingsContext";
import { usePeriod } from "../components/hooks/usePeriod";
import {
    useTransactions,
    useCategories,
    useGoals,
    // COMMENTED OUT: 03-Feb-2026 - No longer needed in Dashboard, CustomBudgetsDisplay fetches its own data
    // useCustomBudgetsForPeriod,
    useSystemBudgetsAll,
    useSystemBudgetsForPeriod,
    useSystemBudgetManagement,
} from "../components/hooks/useBase44Entities";
import {
    usePaidTransactions,
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
import CustomBudgetsDisplay from "../components/dashboard/CustomBudgetsDisplay";
import RecentTransactions from "../components/dashboard/RecentTransactions";
import QuickAddTransaction from "../components/transactions/QuickAddTransaction";
import QuickAddIncome from "../components/transactions/QuickAddIncome";
import QuickAddBudget from "../components/dashboard/QuickAddBudget";
import { ImportWizardDialog } from "../components/import/ImportWizard";

export default function Dashboard() {
    const { user, settings } = useSettings();
    const [showQuickAdd, setShowQuickAdd] = useState(false);
    const [showQuickAddIncome, setShowQuickAddIncome] = useState(false);
    const [showQuickAddBudget, setShowQuickAddBudget] = useState(false);

    // Period management
    const { selectedMonth, setSelectedMonth, selectedYear, setSelectedYear, monthStart, monthEnd } = usePeriod();

    // Data fetching
    // GLOBAL SET: Strictly transactions within this month's dates
    const { transactions } = useTransactions(monthStart, monthEnd);
    const { categories } = useCategories();
    const { goals } = useGoals(user);
    // COMMENTED OUT: 03-Feb-2026 - CustomBudgetsDisplay now fetches its own custom budgets and transactions
    // const { allCustomBudgets } = useCustomBudgetsForPeriod(user, monthStart, monthEnd);
    // const activeCustomBudgetIds = useMemo(() => allCustomBudgets.map(cb => cb.id), [allCustomBudgets]);
    // const { transactions: bridgedTransactions } = useTransactions(null, null, activeCustomBudgetIds);
    const { allSystemBudgets } = useSystemBudgetsAll(user, monthStart, monthEnd);
    const { systemBudgets } = useSystemBudgetsForPeriod(user, monthStart, monthEnd);

    // System budget management (auto-creation/update)
    useSystemBudgetManagement(user, selectedMonth, selectedYear, goals, transactions, systemBudgets, monthStart, monthEnd);

    const monthlyIncome = useMonthlyIncome(transactions, selectedMonth, selectedYear);

    // COMMENTED OUT: 03-Feb-2026 - allCustomBudgets no longer available in Dashboard
    // Passing empty array for allCustomBudgets since CustomBudgetsDisplay handles its own data
    const { remainingBudget, currentMonthIncome, currentMonthExpenses, bonusSavingsPotential } = useDashboardSummary(
        transactions,
        selectedMonth,
        selectedYear,
        [], // allCustomBudgets - empty array, not needed for dashboard summary
        systemBudgets,
        categories,
        settings
    );

    // Global breakdown stays strictly Month-Only
    const { aggregateNeedsTotal, aggregateWantsTotal, detailedBreakdown } = useMonthlyBreakdown(
        transactions,
        categories,
        monthlyIncome,
        [], // allCustomBudgets - empty array, not needed for monthly breakdown
        selectedMonth,
        selectedYear
    );

    // COMMENTED OUT: 03-Feb-2026 - activeCustomBudgets no longer needed in Dashboard
    // const { activeCustomBudgets } = useActiveBudgets(
    //     allCustomBudgets,
    //     allSystemBudgets,
    //     selectedMonth,
    //     selectedYear
    // );

    // Direct Calculation: System Budgets (Month-Only Transactions)
    const systemBudgetsData = useMemo(() => {
        return systemBudgets.map(sb => ({
            ...sb, // CRITICAL: Keep id, systemBudgetType, etc.
            ...getSystemBudgetStats(
                sb, 
                transactions, 
                categories, 
                [], // allCustomBudgets - empty array, not needed for system budget stats
                monthStart, 
                monthEnd, 
                monthlyIncome, 
                settings
            )
        }));
    }, [systemBudgets, transactions, categories, monthStart, monthEnd, monthlyIncome, settings]);

    // COMMENTED OUT: 03-Feb-2026 - customBudgetsData no longer needed in Dashboard
    // const customBudgetsData = useMemo(() => {
    //     return activeCustomBudgets.map(cb => {
    //         const budgetTransactions = bridgedTransactions.filter(t => t.customBudgetId === cb.id);
    //         return getCustomBudgetStats(cb, budgetTransactions);
    //     });
    // }, [activeCustomBudgets, bridgedTransactions]);

    // Savings Logic (Month-Only Transactions)
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
                        <RemainingBudgetCard
                            breakdown={detailedBreakdown}
                            systemBudgets={systemBudgetsData} // NEW: Budgets with calculated stats
                            bonusSavingsPotential={bonusSavingsPotential}
                            currentMonthIncome={currentMonthIncome}
                            currentMonthExpenses={currentMonthExpenses}
                            goals={goals}
                            settings={settings}
                            selectedMonth={selectedMonth}
                            selectedYear={selectedYear}
                            // aggregateNeedsTotal={aggregateNeedsTotal}
                            // aggregateWantsTotal={aggregateWantsTotal}
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
                                    selectedMonth={selectedMonth}
                                    selectedYear={selectedYear}
                                    onOpenChange={setShowQuickAddIncome}
                                    onSubmit={transactionActions.handleSubmit}
                                    isSubmitting={transactionActions.isSubmitting}
                                    renderTrigger={true}
                                    triggerVariant="success"
                                    triggerSize="sm"
                                />
                            }
                            addExpenseButton={
                                <QuickAddTransaction
                                    open={showQuickAdd}
                                    selectedMonth={selectedMonth}
                                    selectedYear={selectedYear}
                                    onOpenChange={setShowQuickAdd}
                                    categories={categories}
                                    customBudgets={[]}
                                    onSubmit={transactionActions.handleSubmit}
                                    isSubmitting={transactionActions.isSubmitting}
                                    transactions={transactions}
                                    renderTrigger={true}
                                    triggerVariant="warning"
                                    triggerSize="sm"
                                />
                            }
                            importDataButton={
                                <ImportWizardDialog
                                    triggerVariant="primary"
                                    triggerSize="sm"
                                    triggerClassName="w-full justify-start"
                                />
                            }
                        />
                    </div>
                </div>

                <div className="grid lg:grid-cols-3 gap-6">
                    <div className="lg:col-span-2 flex flex-col">
                        <CustomBudgetsDisplay
                            onCreateBudget={() => setShowQuickAddBudget(true)}
                        />
                    </div>

                    <div className="lg:col-span-1 flex flex-col">
                        <RecentTransactions
                            categories={categories}
                            customBudgets={[]}
                            onEdit={(data, transaction) => transactionActions.handleSubmit(data, transaction)}
                            onDelete={transactionActions.handleDelete}
                        />
                    </div>
                </div>

                <QuickAddBudget
                    open={showQuickAddBudget}
                    onOpenChange={setShowQuickAddBudget}
                    onSubmit={budgetActions.handleSubmit}
                    onCancel={() => setShowQuickAddBudget(false)}
                    isSubmitting={budgetActions.isSubmitting}
                    baseCurrency={settings.baseCurrency}
                />
            </div>
        </div>
    );
}