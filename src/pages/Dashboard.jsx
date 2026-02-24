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
    useHistoricalIncomeTransactions
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
import { getSystemBudgetStats } from "../components/utils/financialCalculations";
import MonthNavigator from "../components/ui/MonthNavigator";
import RemainingBudgetCard from "../components/dashboard/RemainingBudgetCard";
import MobileRemainingBudgetCard from "../components/dashboard/MobileRemainingBudgetCard";
import CustomBudgetsDisplay from "../components/dashboard/CustomBudgetsDisplay";
import RecentTransactions from "../components/dashboard/RecentTransactions";
import ExpenseFormDialog from "../components/transactions/dialogs/ExpenseFormDialog";
import IncomeFormDialog from "../components/transactions/dialogs/IncomeFormDialog";
import QuickAddBudget from "../components/dashboard/QuickAddBudget";
import { ImportWizardDialog } from "../components/import/ImportWizard";
import { CustomButton } from "@/components/ui/CustomButton";
import { FileUp, MinusCircle, PlusCircle } from "lucide-react";
import { format, startOfMonth, endOfMonth } from "date-fns";
import { VelocityWidget } from "../components/ui/VelocityWidget";
import { useSearchParams } from "react-router-dom"; // Added for notification linking
import { WrappedStory } from "../components/dashboard/WrappedStory";
import { HealthProvider } from "../components/utils/HealthContext";
import { useMonthlyRewindTrigger } from "../components/hooks/useMonthlyRewindTrigger";
import { useProjections } from "../components/hooks/useProjections";
import { useFinancialHealthScore } from "../components/hooks/useFinancialHealth";
import { useQueryClient } from "@tanstack/react-query";
import { QUERY_KEYS } from "../components/hooks/queryKeys";

export default function Dashboard() {
    const { user, settings } = useSettings();
    const [quickAddState, setQuickAddState] = useState(null); // null | 'new' | templateObject
    const [quickAddIncomeState, setQuickAddIncomeState] = useState(null); // UPDATED: null | 'new' | templateObject
    const [showQuickAddBudget, setShowQuickAddBudget] = useState(false);
    const [showImportWizard, setShowImportWizard] = useState(false);
    const [storyContext, setStoryContext] = useState(null); // { month, year }
    const { setFabButtons, clearFabButtons } = useFAB();
    const [searchParams, setSearchParams] = useSearchParams();
    const [showStory, setShowStory] = useState(false);
    const queryClient = useQueryClient();

    const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

    useEffect(() => {
        const handleResize = () => setIsMobile(window.innerWidth < 768);
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    // Period management
    const { selectedMonth, setSelectedMonth, selectedYear, setSelectedYear, monthStart, monthEnd } = usePeriod();

    // Automated trigger: Only creates a notification if the previous month's story is missing
    useMonthlyRewindTrigger(user?.email);

    // --- NOTIFICATION LISTENER ---
    // Checks if the user arrived via a "Monthly Rewind" notification click
    useEffect(() => {
        const isStoryMode = searchParams.get("story") === "true";
        const paramMonth = searchParams.get("month");
        const paramYear = searchParams.get("year");

        if (isStoryMode && paramMonth && paramYear) {
            // Set story context independently of Dashboard month
            setStoryContext({ month: parseInt(paramMonth), year: parseInt(paramYear) });
            setShowStory(true);

            // Clean the URL so it doesn't reopen on refresh
            setSearchParams({});
        }
    }, [searchParams, setSearchParams]);

    // Data fetching
    // CRITICAL: Extract isLoading states to control the UI transitions
    const { transactions, isLoading: transactionsLoading } = useTransactions(monthStart, monthEnd);
    const { categories, isLoading: categoriesLoading } = useMergedCategories();
    const { goals } = useGoals(user);
    const { customBudgets: allCustomBudgets } = useCustomBudgetsForPeriod(user, monthStart, monthEnd);
    const { allSystemBudgets } = useSystemBudgetsAll(user, monthStart, monthEnd);
    const { systemBudgets } = useSystemBudgetsForPeriod(user, monthStart, monthEnd);

    // Fetch specific history for the projection engine
    // This ensures we have the full 6-month context, not just the current view's buffer
    const { incomeTransactions: historicalIncome } = useHistoricalIncomeTransactions(user);

    const monthlyIncome = useMonthlyIncome(transactions, selectedMonth, selectedYear);

    const { currentMonthIncome, currentMonthExpenses, bonusSavingsPotential, projectedIncome, isUsingProjection } = useDashboardSummary(
        transactions,
        selectedMonth,
        selectedYear,
        allCustomBudgets,
        systemBudgets,
        categories,
        settings,
        historicalIncome // Pass the full history
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

    // --- TEMPORAL CONTEXT ---
    // Determine if we are looking at the past, present, or future
    const monthStatus = useMemo(() => {
        const today = new Date();
        const currentY = today.getFullYear();
        const currentM = today.getMonth();

        if (selectedYear < currentY || (selectedYear === currentY && selectedMonth < currentM)) return 'past';
        if (selectedYear > currentY || (selectedYear === currentY && selectedMonth > currentM)) return 'future';
        return 'current';
    }, [selectedMonth, selectedYear]);

    // Centralized Projection Engine
    const { chartData, totals: projectionTotals } = useProjections(transactions, selectedMonth, selectedYear);
    const isCurrentMonth = monthStatus === 'current';

    // --- FINANCIAL HEALTH SCORE ---
    const { healthData } = useFinancialHealthScore(user, selectedMonth, selectedYear);

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

    const transactionActions = useTransactionActions({
        onSuccess: () => {
            setQuickAddState(null);
            setQuickAddIncomeState(null);
            queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.TRANSACTIONS] });
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
                key: 'custom-budget',
                label: 'Add Budget',
                icon: 'Plus',
                variant: 'primary',
                onClick: () => setShowQuickAddBudget(true)
            },
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
                key: 'income',
                label: 'Add Income',
                icon: 'PlusCircle',
                variant: 'success',
                highlighted: isEmptyMonth,
                onClick: () => setQuickAddIncomeState('new')
            },
            {
                key: 'expense',
                label: 'Add Expense',
                icon: 'MinusCircle',
                variant: 'warning',
                onClick: () => setQuickAddState('new')
            }
        ];
    }, [currentMonthIncome, currentMonthExpenses]);

    useEffect(() => {
        setFabButtons(fabButtons);
        return () => clearFabButtons();
    }, [fabButtons, setFabButtons, clearFabButtons]);

    // Combine loading states. The dashboard summary relies heavily on transactions and categories.
    const isLoading = transactionsLoading || categoriesLoading || recurringLoading;

    return (
        <HealthProvider>
            {/* Mobile: No padding on sides (components handle it). Desktop: Standard padding. */}
            <div className="min-h-screen px-0 py-4 md:p-8 relative">
                <div className="max-w-7xl mx-auto space-y-4 md:space-y-6 pb-24">
                    {/* Header with horizontal margin for mobile safety */}
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 px-4 md:px-0">
                        <div>
                            <h1 className="text-3xl md:text-4xl font-bold text-foreground">Dashboard</h1>
                            <p className="text-muted-foreground mt-1">
                                Welcome back, {settings?.displayName || user?.name || 'User'}!
                            </p>
                        </div>
                    </div>

                    {/* GRID LAYOUT: Split Hero Row */}
                    <div className="grid lg:grid-cols-3 gap-6">
                        <div className="lg:col-span-2 space-y-4 md:space-y-6">

                            {/* INNOVATION: Velocity Widget at the top */}
                            <VelocityWidget
                                chartData={chartData}
                                totals={projectionTotals}
                                monthStatus={monthStatus}
                                settings={settings}
                            />
                            {isMobile ? (
                                <MobileRemainingBudgetCard
                                    breakdown={detailedBreakdown}
                                    systemBudgets={systemBudgetsData}
                                    currentMonthIncome={currentMonthIncome}
                                    currentMonthExpenses={currentMonthExpenses}
                                    projectedIncome={isCurrentMonth ? projectionTotals?.finalProjectedIncome : projectedIncome}
                                    isUsingProjection={isCurrentMonth || isUsingProjection}
                                    projectedRemainingExpense={isCurrentMonth ? (projectionTotals?.projectedRemainingExpense || 0) : 0}
                                    settings={settings}
                                    monthStatus={monthStatus}
                                    healthData={healthData}
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
                                    projectedIncome={isCurrentMonth ? projectionTotals?.finalProjectedIncome : projectedIncome}
                                    isUsingProjection={isCurrentMonth || isUsingProjection}
                                    projectedRemainingExpense={isCurrentMonth ? (projectionTotals?.projectedRemainingExpense || 0) : 0}
                                    healthData={healthData}
                                    goals={goals}
                                    monthStatus={monthStatus}
                                    settings={settings}
                                    selectedMonth={selectedMonth}
                                    selectedYear={selectedYear}
                                    importDataButton={
                                        <CustomButton variant="primary" size="sm" onClick={() => setShowImportWizard(true)} className="gap-2 h-8 text-xs">
                                            <FileUp className="h-3.5 w-3.5" />
                                            <span className="hidden xl:inline">Import</span>
                                        </CustomButton>
                                    }
                                    addIncomeButton={
                                        <CustomButton variant="success" size="sm" onClick={() => setQuickAddIncomeState('new')} className="gap-2 h-8 text-xs">
                                            <PlusCircle className="h-3.5 w-3.5" />
                                            <span className="hidden xl:inline">Income</span>
                                        </CustomButton>
                                    }
                                    addExpenseButton={
                                        <CustomButton variant="delete" size="sm" onClick={() => setQuickAddState('new')} className="gap-2 h-8 text-xs">
                                            <MinusCircle className="h-3.5 w-3.5" />
                                            <span className="hidden xl:inline">Expense</span>
                                        </CustomButton>
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
                            {/* <BudgetAvatar health={budgetHealth} /> */}
                            <UpcomingTransactions
                                recurringWithStatus={recurringWithStatus}
                                onMarkPaid={handleMarkPaid}
                                isLoading={isLoading}
                                categories={categories}
                            />
                        </div>
                    </div>

                    <div className="grid lg:grid-cols-3 gap-6">
                        {/* Added spacing between elements in this column */}
                        <div className="lg:col-span-2 flex flex-col min-w-0 space-y-4 md:space-y-6">

                            <CustomBudgetsDisplay
                                onCreateBudget={() => setShowQuickAddBudget(true)}
                            />

                            {/* MOBILE PLACEMENT: Below Custom Budgets */}
                            {/* Removed fixed height 'h-96' to let content flow naturally */}
                            <div className="lg:hidden w-full">
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
                    <ExpenseFormDialog
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

                    <IncomeFormDialog
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

                    <WrappedStory
                        isOpen={showStory}
                        onClose={() => setShowStory(false)}
                        month={storyContext?.month}
                        year={storyContext?.year}
                        settings={settings}
                        user={user}
                    />
                </div>
            </div>
        </HealthProvider>
    );
}