import { useState, useMemo, useEffect } from "react";
import { useSettings } from "../components/utils/SettingsContext";
import { useRecurringTransactions } from "../components/hooks/useRecurringTransactions";
import { useRecurringStatus } from "../components/hooks/useRecurringStatus";
import UpcomingTransactions from "../components/dashboard/UpcomingTransactions";
import { usePeriod } from "../components/hooks/usePeriod";
import { useFAB } from "../components/hooks/FABContext";
import {
    useTransactions,
    useGoals,
    useCustomBudgetsForPeriod,
    useSystemBudgetsAll,
    useSystemBudgetsForPeriod,
    useSystemBudgetManagement,
} from "../components/hooks/useBase44Entities";
import { useMergedCategories } from "../components/hooks/useMergedCategories";
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
import { format, startOfMonth, endOfMonth } from "date-fns";
import { BudgetAvatar } from "../components/ui/BudgetAvatar";

export default function Dashboard() {
    const { user, settings } = useSettings();
    const [quickAddState, setQuickAddState] = useState(null); // null | 'new' | templateObject
    const [quickAddIncomeState, setQuickAddIncomeState] = useState(null); // UPDATED: null | 'new' | templateObject
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
    const { categories, isLoading: categoriesLoading } = useMergedCategories();
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

    // --- RECURRING BILLS LOGIC ---
    const { recurringTransactions, isLoading: recurringLoading } = useRecurringTransactions(user);

    // Fetch REAL current month transactions for the widget status logic (independent of navigator)
    const today = new Date();
    const realMonthStart = format(startOfMonth(today), 'yyyy-MM-dd');
    const realMonthEnd = format(endOfMonth(today), 'yyyy-MM-dd');
    const { transactions: realTransactions } = useTransactions(realMonthStart, realMonthEnd);

    // Use the REAL transactions for status matching
    const recurringWithStatus = useRecurringStatus(recurringTransactions, realTransactions);


    const handleMarkPaid = (bill) => {
        const template = {
            title: bill.title,
            amount: bill.amount,
            category_id: bill.category_id,
            date: format(new Date(), 'yyyy-MM-dd'),
            recurringTransactionId: bill.id, // The Link ID
            type: bill.type
        };

        // Route to appropriate form based on type
        if (bill.type === 'income') {
            setQuickAddIncomeState(template);
        } else {
            setQuickAddState(template);
        }
    };

    const savingsTarget = useMemo(() => {
        const savingsGoal = goals.find(g => g.priority === 'savings');
        return savingsGoal ? (monthlyIncome * (savingsGoal.target_percentage / 100)) : 0;
    }, [goals, monthlyIncome]);

    const totalActualSavings = useMemo(() => {
        return transactions
            .filter(t => t.type === 'savings' || (categories.find(c => c.id === t.category_id)?.priority === 'savings'))
            .reduce((sum, t) => sum + (t.amount || 0), 0);
    }, [transactions, categories]);

    // Seemingly unused
    // const savingsShortfall = useMemo(() => Math.max(0, savingsTarget - totalActualSavings), [savingsTarget, totalActualSavings]);

    const transactionActions = useTransactionActions({
        onSuccess: () => {
            setQuickAddState(null);
            setQuickAddIncomeState(null);
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
                onClick: () => setQuickAddState('new')
            },
            {
                key: 'income',
                label: 'Add Income',
                icon: 'PlusCircle',
                variant: 'success',
                highlighted: isEmptyMonth,
                onClick: () => setQuickAddIncomeState('new')
            }
        ];
    }, [currentMonthIncome, currentMonthExpenses]);

    useEffect(() => {
        setFabButtons(fabButtons);
        return () => clearFabButtons();
    }, [fabButtons, setFabButtons, clearFabButtons]);

    // --- CASPER'S MOOD LOGIC (Monthly Context Only) ---
    const budgetHealth = useMemo(() => {
        if (!currentMonthIncome || currentMonthIncome === 0) return 0.5; // Neutral if no data
        const spendRatio = currentMonthExpenses / currentMonthIncome;

        // 1. You spent more than you earned. Casper is dead.
        if (spendRatio >= 1.0) return 0.1;

        // 2. You saved less than 10%. Casper is panicking (Living on the edge).
        if (spendRatio >= 0.90) return 0.3;

        // 3. You saved decent money (10-30%). Casper is chilling.
        if (spendRatio >= 0.70) return 0.6;

        // 4. You saved > 30%. Casper Ascends.
        return 1.0;
    }, [currentMonthIncome, currentMonthExpenses]);

    // Combine loading states. The dashboard summary relies heavily on transactions and categories.
    const isLoading = transactionsLoading || categoriesLoading || recurringLoading;

    return (
        <div className="min-h-screen p-4 md:p-8 relative">
            <div className="max-w-7xl mx-auto space-y-6 pb-24">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div>
                        <h1 className="text-3xl md:text-4xl font-bold text-foreground">Dashboard</h1>
                        <p className="text-muted-foreground mt-1">
                            Welcome back, {settings?.displayName || user?.name || 'User'}!
                        </p>
                    </div>
                </div>

                {/* GRID LAYOUT: Split Hero Row */}
                <div className="grid lg:grid-cols-3 gap-6">
                    <div className="lg:col-span-2 space-y-6">
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
                                    <Button size="sm" onClick={() => setQuickAddIncomeState('new')} className="gap-2 h-8 text-xs bg-emerald-600 hover:bg-emerald-700 text-white border-none">
                                        <PlusCircle className="h-3.5 w-3.5" />
                                        <span className="hidden xl:inline">Income</span>
                                    </Button>
                                }
                                addExpenseButton={
                                    <Button variant="destructive" size="sm" onClick={() => setQuickAddState('new')} className="gap-2 h-8 text-xs">
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

                    {/* DESKTOP PLACEMENT: Right side of Hero */}
                    <div className="hidden lg:block lg:col-span-1 h-full space-y-6">
                        <BudgetAvatar health={budgetHealth} />
                        <UpcomingTransactions
                            recurringWithStatus={recurringWithStatus}
                            onMarkPaid={handleMarkPaid}
                            isLoading={isLoading}
                            categories={categories}
                        />
                    </div>
                </div>

                <div className="grid lg:grid-cols-3 gap-6">
                    <div className="lg:col-span-2 flex flex-col min-w-0">

                        <CustomBudgetsDisplay
                            onCreateBudget={() => setShowQuickAddBudget(true)}
                        />

                        {/* MOBILE PLACEMENT: Below Custom Budgets */}
                        <div className="lg:hidden mt-6 h-96">
                            <UpcomingTransactions
                                recurringWithStatus={recurringWithStatus}
                                onMarkPaid={handleMarkPaid}
                                isLoading={isLoading}
                                categories={categories}
                            />
                        </div>

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
                    open={!!quickAddState}
                    selectedMonth={selectedMonth}
                    selectedYear={selectedYear}
                    onOpenChange={(isOpen) => !isOpen && setQuickAddState(null)}
                    // Pass template if state is object, otherwise null
                    transactionTemplate={typeof quickAddState === 'object' ? quickAddState : null}
                    categories={categories}
                    customBudgets={activeCustomBudgets}
                    onSubmit={transactionActions.handleSubmit}
                    isSubmitting={transactionActions.isSubmitting}
                    transactions={transactions}
                    renderTrigger={false}
                />

                <QuickAddIncome
                    open={!!quickAddIncomeState}
                    selectedMonth={selectedMonth}
                    selectedYear={selectedYear}
                    onOpenChange={(isOpen) => !isOpen && setQuickAddIncomeState(null)}
                    transactionTemplate={typeof quickAddIncomeState === 'object' ? quickAddIncomeState : null}
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