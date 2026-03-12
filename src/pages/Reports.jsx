import { useMemo, useState, useRef } from "react";
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
import MonthNavigator from "../components/ui/MonthNavigator";
import CashFlowWave from "../components/reports/CashFlowWave";
import { SavingsRateCard } from "../components/reports/cards/SavingsRateCard";
import { NetFlowCard } from "../components/reports/cards/NetFlowCard";
import { EfficiencyBonusCard } from "../components/reports/cards/EfficiencyBonusCard";
import FinancialHealthScore from "../components/reports/FinancialHealthScore";
import { useProjections } from "../components/hooks/useProjections";
import { calculateBonusSavingsPotential, getMonthlyIncome, getMonthlyPaidExpenses, calculateAdjustedAverage } from "../components/utils/financialCalculations";
import { LayoutDashboard, List, Maximize2, X } from "lucide-react";
import {
    parseDate,
    getMonthBoundaries,
    formatDateString,
    formatDate,
    isDateInRange
} from "../components/utils/dateUtils";
import { useFinancialHealthScore } from "../components/hooks/useFinancialHealth";
import useEmblaCarousel from "embla-carousel-react";
import ScrollToTopButton from "../components/ui/ScrollToTopButton";
import { motion, AnimatePresence } from "framer-motion";

/**
 * Financial Reports Page
 * Displays detailed analysis, cash flow projections, and financial health scores.
 */
export default function Reports() {
    const { user, settings } = useSettings();

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

    // Scroll refs for mobile tabs (for ScrollToTopButton)
    const analysisScrollRef = useRef(null);
    const breakdownScrollRef = useRef(null);

    // Derived data
    const monthlyTransactions = useMonthlyTransactions(transactions, selectedMonth, selectedYear);
    const monthlyIncome = useMonthlyIncome(transactions, selectedMonth, selectedYear);

    const prevMonthlyTransactions = useMonthlyTransactions(transactions, previousMonth, previousYear);
    const prevMonthlyIncome = useMonthlyIncome(transactions, previousMonth, previousYear);

    const isLoading = loadingTransactions || loadingCategories || loadingGoals;

    // UPDATED 10-Mar-2026: Pass data to useFinancialHealthScore instead of letting it self-fetch
    const { healthData } = useFinancialHealthScore({
        allTransactions: transactions,
        categories,
        goals,
        customBudgets: allCustomBudgets,
        targetMonth: selectedMonth,
        targetYear: selectedYear
    });

    // Get projection totals for the NetFlowCard & CashFlowWave
    const { totals: projectionTotals } = useProjections(transactions, selectedMonth, selectedYear);

    // Calculate Efficiency Bonus
    const bonusSavingsPotential = useMemo(() => {
        if (!monthStart || !monthEnd || !systemBudgets) return 0;
        const goalMode = settings?.goalMode ?? true;
        // Updated to pass income and goalMode for correct calculation
        return calculateBonusSavingsPotential(systemBudgets, transactions, categories, allCustomBudgets, monthStart, monthEnd, monthlyIncome, goalMode);
    }, [systemBudgets, transactions, categories, allCustomBudgets, monthStart, monthEnd, monthlyIncome, settings]);

    // Calculate the "Safe Baseline" (Overall 6-month average expense)
    const safeBaselineTotal = useMemo(() => {
        const historyStartStr = getMonthBoundaries(selectedMonth - 6, selectedYear).monthStart;
        const historyEndStr = getMonthBoundaries(selectedMonth - 1, selectedYear).monthEnd;
        const historyStartD = parseDate(historyStartStr);
        const historyEndD = parseDate(historyEndStr);

        const monthlyTotals = {};
        transactions.forEach(t => {
            if (t.type !== 'expense') return;
            const tDate = parseDate(t.paidDate || t.date);
            if (!tDate || tDate < historyStartD || tDate > historyEndD) return;
            const monthKey = tDate.toISOString().substring(0, 7);
            monthlyTotals[monthKey] = (monthlyTotals[monthKey] || 0) + Number(t.amount || 0);
        });

        return calculateAdjustedAverage(Object.values(monthlyTotals));
    }, [transactions, selectedMonth, selectedYear]);

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
                expense = projectionTotals.finalProjectedExpense || expense;
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
    }, [transactions, loadingTransactions, selectedMonth, selectedYear, projectionTotals]);

    // Local Embla instance for the Stats cards
    const [statsEmblaRef] = useEmblaCarousel({
        align: "center",
        breakpoints: { '(min-width: 768px)': { active: false } }
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
    // Shared calculations for the cards
    const totalPaidExpenses = useMemo(() => Math.abs(getMonthlyPaidExpenses(monthlyTransactions, monthStart, monthEnd)), [monthlyTransactions, monthStart, monthEnd]);
    const prevPaidExpenses = useMemo(() => prevMonthlyTransactions.reduce((sum, t) => {
        if (t.category?.name === 'Income' || t.type === 'income') return sum;
        return sum + (Number(t.amount) || 0);
    }, 0), [prevMonthlyTransactions]);

    const statsComponent = isLoading ? (
        <div className="w-full overflow-hidden py-1 px-4 md:px-0" ref={statsEmblaRef}>
            <div className="flex gap-3 md:grid md:grid-cols-3 md:gap-4">
                {[1, 2, 3].map((i) => (
                    <div key={i} className="flex-[0_0_80%] min-w-0 md:flex-auto md:col-span-1">
                        <div className="h-40 bg-gray-100 animate-pulse rounded-xl w-full" />
                    </div>
                ))}
            </div>
        </div>
    ) : (
        <div className="w-full overflow-hidden py-1 px-4 md:px-0" ref={statsEmblaRef}>
            <div className="flex touch-pan-y gap-3 md:grid md:grid-cols-3 md:gap-4 items-stretch">
                <div className="flex-[0_0_80%] min-w-0 md:flex-auto md:col-span-1">
                    <SavingsRateCard
                        monthlyIncome={monthlyIncome}
                        totalPaidExpenses={totalPaidExpenses}
                        prevMonthlyIncome={prevMonthlyIncome}
                        prevPaidExpenses={prevPaidExpenses}
                    />
                </div>
                <div className="flex-[0_0_80%] min-w-0 md:flex-auto md:col-span-1">
                    <NetFlowCard
                        transactions={monthlyTransactions}
                        monthlyIncome={monthlyIncome}
                        totalPaidExpenses={totalPaidExpenses}
                        prevMonthlyIncome={prevMonthlyIncome}
                        prevPaidExpenses={prevPaidExpenses}
                        safeBaseline={safeBaselineTotal}
                        projectedExpenseTotal={projectionTotals.finalProjectedExpense}
                        startDate={monthStart}
                        settings={settings}
                    />
                </div>
                <div className="flex-[0_0_80%] min-w-0 md:flex-auto md:col-span-1">
                    <EfficiencyBonusCard
                        bonusSavingsPotential={bonusSavingsPotential}
                        settings={settings}
                    />
                </div>
            </div>
        </div>
    );

    const healthComponent = (
        <FinancialHealthScore
            healthData={healthData} // Pass pre-fetched data
            className="h-full"
        />
    );

    const waveComponent = <CashFlowWave data={cashFlowData} settings={settings} />;

    return (
        <div className="bg-gray-50/50 md:min-h-screen">
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
            <div className="md:hidden flex flex-col" style={{ height: 'calc(100vh - var(--header-total-height) - var(--nav-total-height))' }}>

                {/* Stable Mobile Header */}
                <div className="bg-white border-b border-gray-100 flex-none">
                    <div className="px-4 py-3 flex items-center justify-center">
                        <MonthNavigator
                            currentMonth={selectedMonth}
                            currentYear={selectedYear}
                            onMonthChange={(m, y) => { setSelectedMonth(m); setSelectedYear(y); }}
                            resetPosition="right"
                        />
                    </div>
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
                </div>

                <div className="flex-1 relative overflow-hidden">
                    <AnimatePresence mode="wait">
                        {mobileTab === 'analysis' ? (
                            <motion.div
                                key="analysis"
                                ref={analysisScrollRef}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -10 }}
                                transition={{ duration: 0.2 }}
                                className="absolute inset-0 overflow-y-auto bg-gray-50 pb-20"
                            >
                                <div className="pt-4 space-y-8">
                                    <section>
                                        <h2 className="px-4 text-xs font-bold text-gray-500 mb-3 uppercase tracking-wider">Overview</h2>
                                        {statsComponent}
                                    </section>
                                    <section>
                                        <h2 className="px-4 text-xs font-bold text-gray-500 mb-3 uppercase tracking-wider">Financial Health</h2>
                                        {healthComponent}
                                    </section>
                                    <section className="px-4">
                                        <MobileChartCard title="Cash Flow Wave" className="h-[400px]" onMaximize={() => setFullScreenChart({ title: "Cash Flow Wave", content: waveComponent })}>
                                            {waveComponent}
                                        </MobileChartCard>
                                    </section>
                                </div>
                                <ScrollToTopButton scrollRef={analysisScrollRef} />
                            </motion.div>
                        ) : (
                            <motion.div
                                key="breakdown"
                                ref={breakdownScrollRef}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -10 }}
                                transition={{ duration: 0.2 }}
                                className="absolute inset-0 overflow-y-auto bg-gray-50 pb-20 p-4"
                            >
                                <MonthlyBreakdown
                                    transactions={transactions}
                                    categories={categories}
                                    monthlyIncome={monthlyIncome}
                                    isLoading={isLoading}
                                    selectedMonth={selectedMonth}
                                    selectedYear={selectedYear}
                                    allCustomBudgets={allCustomBudgets}
                                />
                                <ScrollToTopButton scrollRef={breakdownScrollRef} />
                            </motion.div>
                        )}
                    </AnimatePresence>
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