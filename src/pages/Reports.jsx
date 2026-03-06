import { useMemo, useState, useEffect, useCallback } from "react";
import { useSettings } from "../components/utils/SettingsContext";
import { usePeriod } from "../components/hooks/usePeriod";
import {
  useTransactions,
  useGoals,
  useSystemBudgetsForPeriod,
  useCustomBudgetsForPeriod
} from "../components/hooks/useBase44Entities";
import { useMergedCategories } from "../components/hooks/useMergedCategories";
import { useMonthlyTransactions, useMonthlyIncome } from "../components/hooks/useDerivedData";
import MonthlyBreakdown from "../components/reports/MonthlyBreakdown";
import PriorityChart from "../components/reports/PriorityChart";
import MonthNavigator from "../components/ui/MonthNavigator";
import ProjectionChart from "../components/reports/ProjectionChart";
import CashFlowWave from "../components/reports/CashFlowWave"; // ADDED
import ReportStats, { FinancialHealthScore } from "../components/reports/ReportStats";
import { calculateProjection, estimateCurrentMonth } from "../components/utils/projectionUtils";
import { calculateBonusSavingsPotential, getMonthlyIncome, getMonthlyPaidExpenses } from "../components/utils/financialCalculations";
import { LayoutDashboard, List, Maximize2, X } from "lucide-react";
import {
  parseDate,
  getMonthBoundaries,
  formatDateString,
  formatDate,
  isDateInRange
} from "../components/utils/dateUtils";
import { useKeenSlider } from "keen-slider/react";
import "keen-slider/keen-slider.min.css";
import { useFinancialHealthScore } from "../components/hooks/useFinancialHealth";

/**
 * Financial Reports Page
 * Displays detailed analysis, cash flow projections, and financial health scores.
 */
export default function Reports() {
  const { user, settings, updateSettings } = useSettings();

  // Period management
  const {
    selectedMonth,
    setSelectedMonth,
    selectedYear,
    setSelectedYear,
    monthStart,
    monthEnd,
    previousMonth,
    previousYear
  } = usePeriod();

  // Health Window: 6 months prior to selected month
  const healthWindow = useMemo(() => {
    const start = parseDate(monthStart);
    start.setMonth(start.getMonth() - 6);
    return {
      from: formatDateString(start),
      to: monthEnd
    };
  }, [monthStart, monthEnd]);

  // Data fetching
  const { transactions, isLoading: loadingTransactions } = useTransactions(healthWindow.from, healthWindow.to);
  const { categories, isLoading: loadingCategories } = useMergedCategories();
  const { goals, isLoading: loadingGoals } = useGoals(user);
  const { customBudgets: allCustomBudgets } = useCustomBudgetsForPeriod(user);
  const { systemBudgets } = useSystemBudgetsForPeriod(user, monthStart, monthEnd);

  // ADDED: Mobile State
  const [mobileTab, setMobileTab] = useState("analysis"); // 'analysis' | 'breakdown'
  const [fullScreenChart, setFullScreenChart] = useState(null); // Content to show in full screen

  // Derived data
  const monthlyTransactions = useMonthlyTransactions(transactions, selectedMonth, selectedYear);
  const monthlyIncome = useMonthlyIncome(transactions, selectedMonth, selectedYear);

  const prevMonthlyTransactions = useMonthlyTransactions(transactions, previousMonth, previousYear);
  const prevMonthlyIncome = useMonthlyIncome(transactions, previousMonth, previousYear);

  const isLoading = loadingTransactions || loadingCategories || loadingGoals;

  // ADDED: Fetch Financial Health Data at page level to share between components
  const { healthData, isLoading: healthLoading } = useFinancialHealthScore(user, selectedMonth, selectedYear);

  // Calculate Efficiency Bonus
  const bonusSavingsPotential = useMemo(() => {
    if (!monthStart || !monthEnd || !systemBudgets) return 0;
    const goalMode = settings?.goalMode ?? true;
    // Updated to pass income and goalMode for correct calculation
    return calculateBonusSavingsPotential(systemBudgets, transactions, categories, allCustomBudgets, monthStart, monthEnd, monthlyIncome, goalMode);
  }, [systemBudgets, transactions, categories, allCustomBudgets, monthStart, monthEnd, monthlyIncome, settings]);

  // Calculate the "Safe Baseline" using your existing logic
  const projectionData = useMemo(() => calculateProjection(transactions, categories, 6), [transactions, categories]);

  /**
   * Prepare data for the CashFlowWave chart.
   * Analyzes the last 6 months relative to the selected period.
   */
  const cashFlowData = useMemo(() => {
    if (loadingTransactions || !transactions) return [];

    const dataPoints = [];
    const realToday = new Date();

    // Loop 6 months back from the SELECTED month (not necessarily today)
    for (let i = 5; i >= 0; i--) {
      // Calculate target month based on user selection
      const d = new Date(selectedYear, selectedMonth - i, 1);

      // Check if this specific data point is the "Real Current Month"
      const isRealCurrentMonth = d.getMonth() === realToday.getMonth() && d.getFullYear() === realToday.getFullYear();

      const { monthStart: mStart, monthEnd: mEnd } = getMonthBoundaries(d.getMonth(), d.getFullYear());

      const income = getMonthlyIncome(transactions, mStart, mEnd);
      let expense = Math.abs(getMonthlyPaidExpenses(transactions, mStart, mEnd));

      // If it is the real current month, use the projection estimate for better accuracy
      if (isRealCurrentMonth) {
        // Filter transactions just for this month to estimate
        const currentTrans = transactions.filter(t =>
          isDateInRange(t.date || t.created_date, mStart, mEnd)
        );

        expense = estimateCurrentMonth(currentTrans, projectionData.sixMonthAvg || 0).total;
      }

      dataPoints.push({
        month: formatDate(d, 'MMM'),
        income,
        expense,
        netFlow: income - expense,
        isProjection: isRealCurrentMonth
      });
    }
    return dataPoints;
  }, [transactions, loadingTransactions, selectedMonth, selectedYear, projectionData]);

  const [currentSlide, setCurrentSlide] = useState(0);
  const [sliderRef, instanceRef] = useKeenSlider({
    initial: 0,
    slideChanged(slider) {
      setCurrentSlide(slider.track.details.rel);
    },
  });

  // --- Helper for Mobile Chart Wrapper ---
  const MobileChartCard = ({ children, title, onMaximize, className, contentClassName }) => (
    <div className={`bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden flex flex-col ${className}`}>
      {onMaximize && (
        <div className="flex justify-between items-center px-4 py-2 border-b border-gray-50 bg-gray-50/50">
          <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">{title}</span>
          <button
            onClick={onMaximize}
            className="p-1.5 bg-white border border-gray-200 rounded-md text-gray-500 hover:text-blue-600 active:scale-95 transition-all"
          >
            <Maximize2 className="w-4 h-4" />
          </button>
        </div>
      )}
      <div className={`flex-1 min-h-0 min-w-0 relative ${contentClassName || 'overflow-hidden'}`}>
        <div className="absolute inset-0 p-2 overflow-auto">
          {children}
        </div>
      </div>
    </div>
  );

  // --- Component Instances (memoized/variable to avoid duplication logic) ---
  // We render these once and use CSS/Structure to place them.
  // Note: For React, passing the same component instance to two locations in DOM is not possible without re-rendering.
  // However, since we use `md:hidden`, we are rendering two separate trees. This is acceptable for responsiveness vs complexity trade-off.

  const statsComponent = (
    <ReportStats
      transactions={monthlyTransactions}
      monthlyIncome={monthlyIncome}
      prevTransactions={prevMonthlyTransactions}
      prevMonthlyIncome={prevMonthlyIncome}
      isLoading={isLoading}
      settings={settings}
      safeBaseline={projectionData.totalProjectedMonthly}
      startDate={monthStart}
      endDate={monthEnd}
      bonusSavingsPotential={bonusSavingsPotential}
      healthData={healthData} // Pass pre-fetched data
    />
  );

  const healthComponent = (
    <FinancialHealthScore
      monthlyIncome={monthlyIncome}
      transactions={monthlyTransactions}
      prevMonthlyIncome={prevMonthlyIncome}
      fullHistory={transactions}
      prevTransactions={prevMonthlyTransactions}
      startDate={monthStart}
      endDate={monthEnd}
      isLoading={isLoading || healthLoading} // Merge loading states
      healthData={healthData} // Pass pre-fetched data
      settings={settings}
      categories={categories}
      allCustomBudgets={allCustomBudgets}
      goals={goals}
      className="h-full"
    />
  );

  const waveComponent = <CashFlowWave data={cashFlowData} settings={settings} />;
  const projectionComponent = <ProjectionChart settings={settings} projectionData={projectionData} />;

  return (
    <div className="min-h-screen bg-gray-50/50">
      {/* --- DESKTOP VIEW (Original Layout) --- */}
      <div className="hidden md:block max-w-7xl mx-auto px-8 py-8 space-y-8">
        {/* Header Section */}
        <div className="flex flex-col md:flex-row justify-between items-center gap-4 mb-8">
          <div className="flex-1">
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Financial Reports</h1>
            <p className="text-gray-500 text-sm mt-1">
              Performance analysis
            </p>
          </div>

          {/* Global Month Navigator - Clean, no border box */}
          <div className="flex-none">
            <MonthNavigator
              currentMonth={selectedMonth}
              currentYear={selectedYear}
              onMonthChange={(m, y) => { setSelectedMonth(m); setSelectedYear(y); }}
              resetPosition="left"
            />
          </div>
        </div>

        {/* 1. Top Row: KPIs + Goal Allocation */}
        <div className="flex flex-col gap-8">
          {statsComponent}
          {healthComponent}
        </div>

        {/* 2. Historical Context & Future Projection */}
        <div className="w-full space-y-8">
          <div className="h-[400px] md:h-[450px]">
            {waveComponent}
          </div>
          <div className="h-[400px] md:h-[450px]">
            {projectionComponent}
          </div>
        </div>

        {/* 3. Bottom Row: Monthly Breakdown + Priority Chart */}
        <div className="grid lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2">
            <MonthlyBreakdown
              transactions={transactions}
              categories={categories}
              monthlyIncome={monthlyIncome}
              isLoading={isLoading}
              selectedMonth={selectedMonth}
              selectedYear={selectedYear}
              allCustomBudgets={allCustomBudgets}
            />
          </div>
        </div>
      </div>

      {/* --- MOBILE VIEW (New App-Like Layout) --- */}
      <div className="md:hidden flex flex-col h-screen overflow-hidden">
        {/* 1. Mobile Fixed Header */}
        <header className="bg-white border-b border-gray-100 flex-none z-20">
          <div className="px-4 py-3 flex items-center justify-between">
            <MonthNavigator
              currentMonth={selectedMonth}
              currentYear={selectedYear}
              onMonthChange={(m, y) => { setSelectedMonth(m); setSelectedYear(y); }}
              resetPosition="right"
            />
          </div>

          {/* Segmented Control Tabs */}
          <div className="px-4 pb-3">
            <div className="flex p-1 bg-gray-100 rounded-lg">
              {[
                { id: 'analysis', label: 'Analysis', icon: LayoutDashboard },
                { id: 'breakdown', label: 'Details', icon: List },
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setMobileTab(tab.id)}
                  className={`flex-1 flex items-center justify-center gap-2 py-2 text-xs font-bold rounded-md transition-all ${mobileTab === tab.id
                    ? 'bg-white text-blue-600 shadow-sm'
                    : 'text-gray-500 hover:text-gray-700'
                    }`}
                >
                  <tab.icon className="w-3.5 h-3.5" />
                  {tab.label}
                </button>
              ))}
            </div>
          </div>
        </header>

        {/* 2. Mobile Content Area */}
        <div className={`flex-1 overflow-x-hidden bg-gray-50 ${mobileTab === 'analysis' ? 'overflow-hidden p-0' : 'overflow-y-auto p-4'}`}>

          {/* TAB: ANALYSIS (Carousel) */}
          {mobileTab === 'analysis' && (
            <div className="h-full relative w-full">
              <div ref={sliderRef} className="keen-slider h-full w-full">

                {/* Slide 1: Summary Stats */}
                <div className="keen-slider__slide h-full p-4 pb-12 overflow-y-auto">
                  <div className="space-y-4">
                    {statsComponent}
                  </div>
                </div>

                {/* Slide 2: Financial Health */}
                <div className="keen-slider__slide h-full p-4 pb-12">
                  <MobileChartCard title="Financial Health" className="h-full" contentClassName="overflow-visible" onMaximize={() => setFullScreenChart({ title: "Financial Health", content: healthComponent })}>
                    {healthComponent}
                  </MobileChartCard>
                </div>

                {/* Slide 3: Cash Flow Wave */}
                <div className="keen-slider__slide h-full p-4 pb-12">
                  <MobileChartCard title="Cash Flow Wave" className="h-full" onMaximize={() => setFullScreenChart({ title: "Cash Flow Wave", content: waveComponent })}>
                    {waveComponent}
                  </MobileChartCard>
                </div>

                {/* Slide 4: Financial Horizon */}
                <div className="keen-slider__slide h-full p-4 pb-12">
                  <MobileChartCard title="Financial Horizon" className="h-full" onMaximize={() => setFullScreenChart({ title: "Financial Horizon", content: projectionComponent })}>
                    {projectionComponent}
                  </MobileChartCard>
                </div>

              </div>

              {/* Custom Navigation Dots */}
              {instanceRef?.current && (
                <div className="absolute bottom-4 left-0 right-0 flex justify-center gap-2 z-10">
                  {[...Array(instanceRef.current.track.details.slides.length).keys()].map((idx) => (
                    <button
                      key={idx}
                      onClick={() => instanceRef.current?.moveToIdx(idx)}
                      className={`w-2 h-2 rounded-full transition-all ${currentSlide === idx ? "bg-blue-600 w-4" : "bg-gray-300"}`}
                      aria-label={`Go to slide ${idx + 1}`}
                    />
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB: BREAKDOWN */}
          {mobileTab === 'breakdown' && (
            <div className="h-full pb-20 overflow-y-auto">
              <MonthlyBreakdown
                transactions={transactions}
                categories={categories}
                monthlyIncome={monthlyIncome}
                isLoading={isLoading}
                selectedMonth={selectedMonth}
                selectedYear={selectedYear}
                allCustomBudgets={allCustomBudgets}
              />
            </div>
          )}
        </div>

        {/* 3. Full Screen Overlay (Focus Mode) */}
        {fullScreenChart && (
          <div className="fixed inset-0 z-50 bg-white animate-in fade-in zoom-in-95 duration-200 flex flex-col">
            <div className="flex items-center justify-between px-4 py-3 border-b bg-gray-50">
              <h2 className="font-bold text-gray-900">{fullScreenChart.title}</h2>
              <button
                onClick={() => setFullScreenChart(null)}
                className="p-2 bg-white rounded-full border shadow-sm hover:bg-gray-100"
              >
                <X className="w-5 h-5 text-gray-600" />
              </button>
            </div>
            <div className="flex-1 p-4 overflow-auto flex flex-col">
              {fullScreenChart.content}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}