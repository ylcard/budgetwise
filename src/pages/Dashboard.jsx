import { base44 } from "@/api/base44Client";
import { useQuery, useQueryClient, useRef } from "@tanstack/react-query";
import { useState, useMemo, useEffect, useCallback } from "react";
import { useSettings } from "../components/utils/SettingsContext";
import { useRecurringTransactions } from "../components/hooks/useRecurringTransactions";
import { useRecurringStatus } from "../components/hooks/useRecurringStatus";
import useMeasure from "react-use-measure";
import UpcomingTransactions from "../components/dashboard/UpcomingTransactions";
import { usePeriod } from "../components/hooks/usePeriod";
import { useFAB } from "../components/hooks/FABContext";
import {
  useGoals,
  useCustomBudgetsForPeriod,
  useSystemBudgetsForPeriod,
} from "../components/hooks/useBase44Entities";
import { useTransactionWindow } from "../components/hooks/useTransactionWindow";
import { useBudgetTransactions } from "../components/hooks/useBudgetTransactions";
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
import { getSystemBudgetStats, getCustomBudgetStats } from "../components/utils/financialCalculations";
import MonthNavigator from "../components/ui/MonthNavigator";
import RemainingBudgetCard from "../components/dashboard/RemainingBudgetCard";
import MobileRemainingBudgetCard from "../components/dashboard/MobileRemainingBudgetCard";
import CustomBudgetsDisplay from "../components/dashboard/CustomBudgetsDisplay";
import RecentTransactions from "../components/dashboard/RecentTransactions";
import ExpenseFormDialog from "../components/transactions/dialogs/ExpenseFormDialog";
import IncomeFormDialog from "../components/transactions/dialogs/IncomeFormDialog";
import QuickAddBudget from "../components/dashboard/QuickAddBudget";
import { ImportWizardDialog } from "../components/import/ImportWizard";
import { formatDateString, getFirstDayOfMonth } from "../components/utils/dateUtils";
import { VelocityWidget } from "../components/ui/VelocityWidget";
import { useSearchParams, useNavigate } from "react-router-dom";
import { WrappedStory } from "../components/dashboard/WrappedStory";
import { useHealth } from "../components/utils/HealthContext";
import { useMonthlyRewindTrigger } from "../components/hooks/useMonthlyRewindTrigger";
import { useProjections } from "../components/hooks/useProjections";
import { useFinancialHealthScore } from "../components/hooks/useFinancialHealth";
import { QUERY_KEYS } from "../components/hooks/queryKeys";
import { useTutorialTrigger } from '../components/tutorial/useTutorialTrigger';
import useEmblaCarousel from 'embla-carousel-react';
import { TUTORIAL_IDS } from '../components/tutorial/tutorialConfig';
import { useTutorial } from '../components/tutorial/TutorialContext';
import { subDays } from 'date-fns';
import { ActivityHub } from "../components/dashboard/ActivityHub";
import QuickActions from "../components/dashboard/QuickActions";
import { useBankSync } from "../components/banksync/useBankSync";
import { toast } from "sonner";
// RESTORED 12-Mar-2026: Layout approach didn't work — back to per-page integration
import ScrollToTopButton from "../components/ui/ScrollToTopButton";

/**
 * Main Dashboard Page
 */
export default function Dashboard() {
  // Measure QuickActions to set the "standard" top-row height
  const [actionsRef, { height: actionsHeight }] = useMeasure();

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
  const navigate = useNavigate();

  // Carousel for Mobile Activity (Upcoming/Recent)
  const [emblaRef, emblaApi] = useEmblaCarousel({ align: 'start', skipSnaps: false });
  const [selectedIndex, setSelectedIndex] = useState(0);

  const analysisScrollRef = useRef(null);

  const onSelect = useCallback(() => {
    if (!emblaApi) return;
    setSelectedIndex(emblaApi.selectedScrollSnap());
  }, [emblaApi]);

  useEffect(() => {
    if (!emblaApi) return;
    emblaApi.on('select', onSelect);
  }, [emblaApi, onSelect]);

  // Automatically checks and triggers the dashboard tutorial
  useTutorialTrigger(TUTORIAL_IDS.DASHBOARD_OVERVIEW);
  const { activeTutorial } = useTutorial();

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
      // Use native history API to prevent React Router from triggering a RouteTransition remount
      window.history.replaceState(null, '', window.location.pathname);
    }
  }, [searchParams]);

  // Data fetching
  // CRITICAL: Extract isLoading states to control the UI transitions
  // UPDATED 10-Mar-2026: Wide-window strategy — fetches 7 months at once, only re-fetches
  // when navigating beyond the cached window. Prevents per-month DB calls and 429 errors.
  const {
    allTransactions,
    periodTransactions: transactions,
    isLoading: transactionsLoading
  } = useTransactionWindow(selectedMonth, selectedYear);
  const { categories, isLoading: categoriesLoading } = useMergedCategories();
  const { goals } = useGoals(user);
  const { customBudgets: allCustomBudgets } = useCustomBudgetsForPeriod(user, monthStart, monthEnd);

  // OPTIMIZED 10-Mar-2026: useSystemBudgetsAll and useSystemBudgetsForPeriod were two separate DB calls
  // with overlapping date ranges. useSystemBudgetsAll is used by useActiveBudgets which just filters locally.
  // We can reuse the period-specific data for both purposes.
  const { systemBudgets } = useSystemBudgetsForPeriod(user, monthStart, monthEnd);
  // Alias for useActiveBudgets which expects 'allSystemBudgets' — same data when viewing one month
  const allSystemBudgets = systemBudgets;

  const { activeCustomBudgets: rawActiveCustomBudgets } = useActiveBudgets(
    allCustomBudgets,
    allSystemBudgets,
    selectedMonth,
    selectedYear
  );

  // NEW: Fetch ALL history for these specific budgets to ensure "Arch" accuracy
  const activeBudgetIds = useMemo(() => rawActiveCustomBudgets.map(b => b.id), [rawActiveCustomBudgets]);
  const { data: budgetHistory = [] } = useBudgetTransactions(activeBudgetIds);

  const monthlyIncome = useMonthlyIncome(transactions, selectedMonth, selectedYear);

  const { currentMonthIncome, currentMonthExpenses, bonusSavingsPotential, projectedIncome, isUsingProjection } = useDashboardSummary(
    transactions,
    selectedMonth,
    selectedYear,
    allCustomBudgets,
    systemBudgets,
    categories,
    settings,
    allTransactions // CHANGED 10-Mar-2026: Pass wide-window data for historical income projections
  );

  const { detailedBreakdown } = useMonthlyBreakdown(
    transactions,
    categories,
    monthlyIncome,
    allCustomBudgets,
    selectedMonth,
    selectedYear
  );

  // ADDED 10-Mar-2026: Enrich active custom budgets with calculated stats from existing transactions.
  // Previously done by useEnrichedCustomBudgets (which made its own DB call). Now uses allTransactions.
  const activeCustomBudgets = useMemo(() => {
    return rawActiveCustomBudgets.map(budget => {
      // Use the full budgetHistory instead of the 7-month window
      const stats = getCustomBudgetStats(budget, budgetHistory);

      // Filter allTransactions for this budget that were paid BEFORE the current month start
      const paidPrior = allTransactions
        .filter(t => t.budgetId === budget.id && t.type === 'expense' && t.isPaid)
        .filter(t => (t.paidDate || t.date) < monthStart)
        .reduce((sum, t) => sum + (t.amount || 0), 0);

      return {
        ...budget,
        calculatedPaid: stats?.paid?.totalBaseCurrencyAmount ?? 0,
        calculatedUnpaid: stats?.unpaid?.totalBaseCurrencyAmount ?? 0,
        calculatedTotal: budget.allocatedAmount || budget.budgetAmount || 0,
        paidPrior,
        rawStats: stats
      };
    });
  }, [rawActiveCustomBudgets, allTransactions, monthStart, budgetHistory]);

  // UPDATED 10-Mar-2026: Aligned with new getSystemBudgetStats signature
  const systemBudgetsData = useMemo(() => {
    return systemBudgets.map(sb => ({
      ...sb,
      ...getSystemBudgetStats(
        sb,
        transactions,
        monthStart,
        monthEnd,
        allCustomBudgets
      )
    }));
  }, [systemBudgets, transactions, allCustomBudgets, monthStart, monthEnd]);

  // --- RECURRING BILLS LOGIC ---
  const { recurringTransactions, isLoading: recurringLoading } = useRecurringTransactions(user);

  // FIXED 10-Mar-2026: Recurring status must ALWAYS be computed against the current real-life
  // month's transactions, NOT the navigated period. Otherwise, navigating to a past month causes
  // the Upcoming Transactions component to lose its payment matches and show items as "unpaid".
  // We extract current-month transactions from the wide allTransactions window (client-side filter).
  const realMonthTransactions = useMemo(() => {
    const now = new Date();
    const realStart = getFirstDayOfMonth(now.getMonth(), now.getFullYear());
    // SETTLEMENT_BUFFER: Include 30 days before current month for late-paid matching
    const bufferStart = formatDateString(subDays(new Date(now.getFullYear(), now.getMonth(), 1), 30));
    const realEnd = getFirstDayOfMonth(now.getMonth() + 1 > 11 ? 0 : now.getMonth() + 1, now.getMonth() + 1 > 11 ? now.getFullYear() + 1 : now.getFullYear());
    return allTransactions.filter(t => t.date && t.date >= bufferStart && t.date < realEnd);
  }, [allTransactions]);

  const recurringWithStatus = useRecurringStatus(recurringTransactions, realMonthTransactions);

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
  // UPDATED 10-Mar-2026: Pass allTransactions (7-month window) so projections have full historical context
  const { chartData, totals: projectionTotals } = useProjections(allTransactions, selectedMonth, selectedYear);
  const isCurrentMonth = monthStatus === 'current';

  // --- FINANCIAL HEALTH SCORE ---
  // UPDATED 10-Mar-2026: Pass all data from Dashboard's existing fetches instead of letting
  // useFinancialHealthScore make its own redundant DB calls (was a major 429 source).
  const { healthData } = useFinancialHealthScore({
    allTransactions,
    categories,
    goals,
    customBudgets: allCustomBudgets,
    targetMonth: selectedMonth,
    targetYear: selectedYear
  });

  // --- BANK SYNC LOGIC ---
  const [syncState, setSyncState] = useState('idle');
  const { data: connections = [] } = useQuery({
    queryKey: [QUERY_KEYS.BANK_CONNECTIONS],
    queryFn: () => base44.entities.BankConnection.list(),
    staleTime: 1000 * 60 * 15, // CHANGED 10-Mar-2026: 15 mins (was 5) — bank connections rarely change
  });
  const hasActiveConnections = connections.some(c => c.status === 'active');

  const lastSyncDate = useMemo(() => {
    const syncDates = connections
      .filter(c => c.status === 'active' && c.last_sync)
      .map(c => new Date(c.last_sync).getTime());
    return syncDates.length > 0 ? new Date(Math.max(...syncDates)) : null;
  }, [connections]);

  const { executeSync } = useBankSync(user);

  const handleGlobalSync = async () => {
    const activeConnections = connections.filter(c => c.status === 'active');
    setSyncState('syncing');
    const dateFrom = formatDateString(subDays(new Date(), 30));

    try {
      for (const conn of activeConnections) {
        await executeSync(conn, dateFrom);
      }
      setSyncState('success');
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.TRANSACTIONS] });
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.BANK_CONNECTIONS] });
      setTimeout(() => setSyncState('idle'), 3000);
    } catch (error) {
      setSyncState('error');
      toast.error(`Sync failed: ${error.message}`);
      setTimeout(() => setSyncState('idle'), 3000);
    }
  };

  const handleMarkPaid = (bill) => {
    const template = {
      title: bill.title,
      amount: bill.amount,
      category_id: bill.category_id,
      date: formatDateString(new Date()),
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

  const { handleConfirmMatch, ...transactionActions } = useTransactionActions({
    onSuccess: () => {
      setQuickAddState(null);
      setQuickAddIncomeState(null);
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.TRANSACTIONS] });
    }
  });

  // AUTOMATION: Trigger auto-matches on load/sync
  useEffect(() => {
    if (!recurringWithStatus.currentMonthItems) return;

    const autoMatches = recurringWithStatus.currentMonthItems.filter(
      item => item.matchStatus === 'auto_match' && item.suggestedTransactions?.[0]
    );

    if (autoMatches.length > 0) {
      autoMatches.forEach(item => {
        handleConfirmMatch(item.suggestedTransactions[0], item);
      });
    }
  }, [recurringWithStatus.currentMonthItems, handleConfirmMatch]);

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
        key: 'sync',
        label: syncState === 'syncing' ? 'Syncing...' : (hasActiveConnections ? 'Smart Sync' : 'Connect Bank'),
        icon: syncState === 'syncing' ? 'Loader2' : (hasActiveConnections ? 'RefreshCw' : 'Building2'),
        variant: 'secondary',
        keepOpen: true,
        onClick: hasActiveConnections ? handleGlobalSync : () => navigate('/BankSync')
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
      },
      {
        key: 'import',
        label: 'Import Data',
        icon: 'FileUp',
        variant: 'create',
        onClick: () => {
          setShowImportWizard(true);
        }
      },
      {
        key: 'custom-budget',
        label: 'Add Budget',
        icon: 'Plus',
        variant: 'create',
        onClick: () => setShowQuickAddBudget(true)
      }
    ];
  }, [currentMonthIncome, currentMonthExpenses, hasActiveConnections, syncState, navigate]);

  useEffect(() => {
    setFabButtons(fabButtons);
    return () => clearFabButtons();
  }, [fabButtons, setFabButtons, clearFabButtons]);

  // Combine loading states. The dashboard summary relies heavily on transactions and categories.
  const isLoading = transactionsLoading || categoriesLoading || recurringLoading;

  // ADDED 10-Mar-2026: Push budget health into Layout-level HealthProvider context
  // so the mascot (Casper) can use it without HealthProvider fetching its own data.
  const { setBudgetHealth } = useHealth();
  useEffect(() => {
    if (!currentMonthIncome || currentMonthIncome === 0) {
      setBudgetHealth(0.5);
      return;
    }
    const spendRatio = currentMonthExpenses / currentMonthIncome;
    if (spendRatio >= 1.0) setBudgetHealth(0.1);
    else if (spendRatio >= 0.90) setBudgetHealth(0.3);
    else if (spendRatio >= 0.70) setBudgetHealth(0.6);
    else setBudgetHealth(1.0);
  }, [currentMonthIncome, currentMonthExpenses, setBudgetHealth]);

  // --- MOCK DATA FOR TUTORIAL ---
  const isDashboardTutorial = activeTutorial?.id === TUTORIAL_IDS.DASHBOARD_OVERVIEW;

  const displayIncome = isDashboardTutorial ? 4500 : currentMonthIncome;
  const displayExpenses = isDashboardTutorial ? 2100 : currentMonthExpenses;
  const displaySystemBudgets = isDashboardTutorial ? [
    { id: 'needs', name: 'Needs', limit: 2250, spent: 1500, percentage: 66 },
    { id: 'wants', name: 'Wants', limit: 1350, spent: 600, percentage: 44 }
  ] : systemBudgetsData;
  const displayBreakdown = isDashboardTutorial ? { Needs: 1500, Wants: 600, Savings: 0 } : detailedBreakdown;

  return (
    <>
      {/* REMOVED 10-Mar-2026: Inner HealthProvider — the Layout already wraps all pages in HealthProvider. */}
      {/* Dashboard now pushes health data up via useHealth().setBudgetHealth instead. */}
      {/* Mobile: No padding on sides (components handle it). Desktop: Standard padding. */}
      <div className="min-h-screen w-full max-w-[100vw] overflow-x-hidden px-0 py-4 md:p-8 relative">
        <div className="max-w-7xl mx-auto space-y-4 md:space-y-6 pb-24">
          {/* Desktop Header Only */}
          <div className="hidden md:flex flex-col md:flex-row justify-between items-start md:items-center gap-4 px-4 md:px-0">
            <div>
              <h1 className="text-3xl md:text-4xl font-bold text-foreground">Dashboard</h1>
              <p className="text-muted-foreground mt-1">
                Welcome back, {settings?.displayName || user?.name || 'User'}!
              </p>
            </div>
          </div>

          {/* UNIFIED GRID LAYOUT: Left Column (Stats+Budgets) | Right Column (Activity) */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch w-full max-w-full">

            {/* LEFT COLUMN: Velocity -> Stats -> Budgets */}
            <div className="lg:col-span-8 flex flex-col gap-6 min-w-0 max-w-full">

              {/* 1. Velocity Widget */}
              <div data-tutorial="velocity-widget">
                <VelocityWidget
                  chartData={chartData}
                  totals={projectionTotals}
                  monthStatus={monthStatus}
                  settings={settings}
                  targetHeight={actionsHeight}
                />
              </div>

              {/* 2. Remaining Budget / Stats */}
              <div data-tutorial="quick-stats">
                {isMobile ? (
                  <MobileRemainingBudgetCard
                    breakdown={displayBreakdown}
                    systemBudgets={displaySystemBudgets}
                    currentMonthIncome={displayIncome}
                    currentMonthExpenses={displayExpenses}
                    projectedIncome={isCurrentMonth ? projectionTotals?.finalProjectedIncome : projectedIncome}
                    isUsingProjection={isCurrentMonth || isUsingProjection}
                    projectedRemainingExpense={isCurrentMonth ? (projectionTotals?.projectedRemainingExpense || 0) : 0}
                    settings={settings}
                    monthStatus={monthStatus}
                    healthData={healthData}
                    goals={goals}
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
                    breakdown={displayBreakdown}
                    systemBudgets={displaySystemBudgets}
                    bonusSavingsPotential={bonusSavingsPotential}
                    currentMonthIncome={displayIncome}
                    currentMonthExpenses={displayExpenses}
                    projectedIncome={isCurrentMonth ? projectionTotals?.finalProjectedIncome : projectedIncome}
                    isUsingProjection={isCurrentMonth || isUsingProjection}
                    projectedRemainingExpense={isCurrentMonth ? (projectionTotals?.projectedRemainingExpense || 0) : 0}
                    healthData={healthData}
                    goals={goals}
                    monthStatus={monthStatus}
                    settings={settings}
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
                )}
              </div>

              {/* 3. Custom Budgets */}
              <div data-tutorial="custom-budgets" className="w-full">
                <CustomBudgetsDisplay
                  onCreateBudget={() => setShowQuickAddBudget(true)}
                  budgets={activeCustomBudgets}
                />
              </div>
            </div>

            {/* RIGHT COLUMN: Quick Actions + Activity Hub (Sidebar) */}
            <div className="hidden lg:flex lg:flex-col lg:col-span-4 gap-4 min-w-0 max-w-full" data-tutorial="activity-hub">
              <div ref={actionsRef}>
                <QuickActions
                  onAddIncome={() => setQuickAddIncomeState('new')}
                  onAddExpense={() => setQuickAddState('new')}
                  onImport={() => setShowImportWizard(true)}
                  onSync={handleGlobalSync}
                  hasActiveConnections={hasActiveConnections}
                  syncState={syncState}
                  lastSyncDate={lastSyncDate}
                  settings={settings}
                  isEmptyMonth={(!currentMonthIncome || currentMonthIncome === 0) && (!currentMonthExpenses || currentMonthExpenses === 0)}
                  onNavigateBank={() => navigate('/BankSync')}
                />
              </div>

              <div className="relative flex-1 min-h-[400px]">
                <div className="absolute inset-0">

                  <ActivityHub
                    recurringWithStatus={recurringWithStatus}
                    onMarkPaid={handleMarkPaid}
                    isLoading={isLoading}
                    categories={categories}
                    customBudgets={allCustomBudgets}
                    transactionActions={transactionActions}
                    settings={settings}
                    embedded={true}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* MOBILE ONLY: Activity Carousel (Kept as requested) */}
          <div className="lg:hidden w-full max-w-full mx-auto overflow-hidden mt-2">
            <div className="overflow-hidden rounded-xl" ref={emblaRef}>
              <div className="flex touch-pan-y h-[calc(100dvh-var(--header-total-height)-var(--nav-total-height)-5rem)]">
                {/* Slide 1: Upcoming */}
                <div className="flex-[0_0_100%] min-w-0 px-4 h-full overflow-y-auto scrollbar-hide" data-tutorial="upcoming-transactions">
                  <UpcomingTransactions
                    recurringWithStatus={recurringWithStatus}
                    onMarkPaid={handleMarkPaid}
                    isLoading={isLoading}
                    categories={categories}
                    embedded={false}
                  />
                </div>
                {/* Slide 2: Recent */}
                <div className="flex-[0_0_100%] min-w-0 px-4 h-full overflow-y-auto scrollbar-hide" data-tutorial="recent-transactions">
                  <RecentTransactions
                    categories={categories}
                    settings={settings}
                    customBudgets={allCustomBudgets}
                    onEdit={(data, transaction) => transactionActions.handleSubmit(data, transaction)}
                    onDelete={transactionActions.handleDelete}
                    embedded={false}
                  />
                </div>
              </div>
            </div>

            {/* Pagination Dots */}
            <div className="flex justify-center items-center gap-1.5 mt-4">
              {[0, 1].map((index) => (
                <div
                  key={index}
                  className={`h-1.5 rounded-full transition-all duration-300 ${selectedIndex === index ? "w-4 bg-primary" : "w-1.5 bg-border"
                    }`}
                />
              ))}
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
      {/* RESTORED 12-Mar-2026: Per-page scroll-to-top (auto-detects Layout's data-scroll-main) */}
      <ScrollToTopButton />
      // <ScrollToTopButton scrollRef={analysisScrollRef} />
    </>
  );
}