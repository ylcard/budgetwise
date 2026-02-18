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
import GoalSettings from "../components/reports/GoalSettings";
import { useGoalActions } from "../components/hooks/useActions";
import { LayoutDashboard, Target, List, Maximize2, X, ChevronRight, ChevronLeft } from "lucide-react";
import { parseDate, getMonthBoundaries } from "../components/utils/dateUtils";
import useEmblaCarousel from "embla-carousel-react";

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
            from: start.toISOString().split('T')[0],
            to: monthEnd
        };
    }, [monthStart, monthEnd]);

    // Data fetching
    const { transactions, isLoading: loadingTransactions } = useTransactions(healthWindow.from, healthWindow.to);
    const { categories, isLoading: loadingCategories } = useMergedCategories();
    const { goals, isLoading: loadingGoals } = useGoals(user);
    const { customBudgets: allCustomBudgets } = useCustomBudgetsForPeriod(user);
    const { systemBudgets } = useSystemBudgetsForPeriod(user, monthStart, monthEnd);

    // ADDED 17-Jan-2026: Goal Settings state management
    const { handleGoalUpdate, isSaving: isGoalSaving } = useGoalActions(user, goals);
    const [localGoalMode, setLocalGoalMode] = useState(settings.goalMode ?? true);
    const [splits, setSplits] = useState({ split1: 50, split2: 80 });
    const [absoluteValues, setAbsoluteValues] = useState({ needs: '', wants: '', savings: '' });
    const [fixedLifestyleMode, setFixedLifestyleMode] = useState(settings.fixedLifestyleMode ?? false);

    // ADDED: Mobile State
    const [mobileTab, setMobileTab] = useState("analysis"); // 'analysis' | 'goals' | 'breakdown'
    const [fullScreenChart, setFullScreenChart] = useState(null); // Content to show in full screen

    // Sync with DB settings
    useEffect(() => {
        setLocalGoalMode(settings.goalMode ?? true);
        setFixedLifestyleMode(settings.fixedLifestyleMode ?? false);
    }, [settings.goalMode, settings.fixedLifestyleMode]);

    // Sync with DB goals
    useEffect(() => {
        if (goals.length > 0) {
            setAbsoluteValues({
                needs: goals.find(g => g.priority === 'needs')?.target_amount ?? '',
                wants: goals.find(g => g.priority === 'wants')?.target_amount ?? '',
                savings: goals.find(g => g.priority === 'savings')?.target_amount ?? ''
            });
            const map = { needs: 0, wants: 0, savings: 0 };
            goals.forEach(goal => { map[goal.priority] = goal.target_percentage; });
            setSplits({
                split1: map.needs || 50,
                split2: (map.needs || 50) + (map.wants || 30)
            });
        }
    }, [goals]);

    // Save handler
    const handleGoalSave = async () => {
        const promises = [];
        const currentValues = {
            needs: splits.split1,
            wants: splits.split2 - splits.split1,
            savings: 100 - splits.split2
        };

        // Update settings
        await updateSettings({
            ...settings,
            goalMode: localGoalMode,
            fixedLifestyleMode: fixedLifestyleMode
        });

        // Update goals
        ['needs', 'wants', 'savings'].forEach((priority) => {
            const existingGoal = goals.find(g => g.priority === priority);
            let payload = {};

            if (!localGoalMode) {
                const newAmt = absoluteValues[priority] === '' ? 0 : Number(absoluteValues[priority]);
                payload = {
                    target_amount: newAmt,
                    target_percentage: existingGoal?.target_percentage || 0
                };
            } else {
                const newPct = currentValues[priority];
                payload = {
                    target_amount: existingGoal?.target_amount || 0,
                    target_percentage: newPct
                };
            }
            promises.push(handleGoalUpdate(priority, payload.target_percentage, payload));
        });

        await Promise.all(promises);
    };

    // Derived data
    const monthlyTransactions = useMonthlyTransactions(transactions, selectedMonth, selectedYear);
    const monthlyIncome = useMonthlyIncome(transactions, selectedMonth, selectedYear);

    // const prevMonth = selectedMonth === 0 ? 11 : selectedMonth - 1;
    // const prevYear = selectedMonth === 0 ? selectedYear - 1 : selectedYear;
    // const prevMonthlyTransactions = useMonthlyTransactions(transactions, prevMonth, prevYear);
    // const prevMonthlyIncome = useMonthlyIncome(transactions, prevMonth, prevYear);
    const prevMonthlyTransactions = useMonthlyTransactions(transactions, previousMonth, previousYear);
    console.log(prevMonthlyTransactions);
    const prevMonthlyIncome = useMonthlyIncome(transactions, previousMonth, previousYear);

    const isLoading = loadingTransactions || loadingCategories || loadingGoals;

    // Calculate Efficiency Bonus
    const bonusSavingsPotential = useMemo(() => {
        if (!monthStart || !monthEnd || !systemBudgets) return 0;
        const goalMode = settings?.goalMode ?? true;
        // Updated to pass income and goalMode for correct calculation
        return calculateBonusSavingsPotential(systemBudgets, transactions, categories, allCustomBudgets, monthStart, monthEnd, monthlyIncome, goalMode);
    }, [systemBudgets, transactions, categories, allCustomBudgets, monthStart, monthEnd, monthlyIncome, settings]);

    // Calculate the "Safe Baseline" using your existing logic
    const projectionData = useMemo(() => calculateProjection(transactions, categories, 6), [transactions, categories]);

    // ADDED: Prepare data for the CashFlowWave chart
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
                const currentTrans = transactions.filter(t => new Date(t.date || t.created_date) >= new Date(mStart) && new Date(t.date || t.created_date) <= new Date(mEnd));
                expense = estimateCurrentMonth(currentTrans, projectionData.sixMonthAvg || 0).total;
            }

            dataPoints.push({
                month: d.toLocaleDateString('en-US', { month: 'short' }),
                income,
                expense,
                netFlow: income - expense,
                isProjection: isRealCurrentMonth
            });
        }
        return dataPoints;
    }, [transactions, loadingTransactions, selectedMonth, selectedYear, projectionData]);

    // --- Mobile Embla Carousel Setup ---
    const [emblaRef, emblaApi] = useEmblaCarousel({ loop: false });
    const [currentSlide, setCurrentSlide] = useState(0);

    useEffect(() => {
        if (emblaApi) {
            emblaApi.on('select', () => setCurrentSlide(emblaApi.selectedScrollSnap()));
        }
    }, [emblaApi]);

    const scrollTo = useCallback((index) => emblaApi && emblaApi.scrollTo(index), [emblaApi]);

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
            isLoading={isLoading}
            settings={settings}
            categories={categories}
            allCustomBudgets={allCustomBudgets}
            goals={goals}
            className="h-full"
        />
    );

    const waveComponent = <CashFlowWave data={cashFlowData} settings={settings} />;
    const projectionComponent = <ProjectionChart settings={settings} projectionData={projectionData} />;
    const priorityComponent = (
        <PriorityChart
            transactions={monthlyTransactions}
            categories={categories}
            goals={goals}
            monthlyIncome={monthlyIncome}
            isLoading={isLoading}
            settings={settings}
        />
    );

    const goalSettingsComponent = (
        <GoalSettings
            className="w-full h-full"
            isLoading={loadingGoals}
            isSaving={isGoalSaving}
            goalMode={localGoalMode}
            setGoalMode={setLocalGoalMode}
            splits={splits}
            setSplits={setSplits}
            absoluteValues={absoluteValues}
            setAbsoluteValues={setAbsoluteValues}
            fixedLifestyleMode={fixedLifestyleMode}
            setFixedLifestyleMode={setFixedLifestyleMode}
            settings={settings}
            onSave={handleGoalSave}
        />
    );

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
                <div className="grid lg:grid-cols-3 gap-8 items-stretch">
                    <div className="lg:col-span-2 flex flex-col gap-8">
                        {statsComponent}
                        {healthComponent}
                    </div>

                    <div className="lg:col-span-1 flex">
                        {goalSettingsComponent}
                    </div>
                </div>

                {/* 2. Historical Context & Future Projection */}
                <div className="w-full space-y-8">
                    {waveComponent}
                    {projectionComponent}
                </div>

                {/* 3. Bottom Row: Monthly Breakdown + Priority Chart */}
                <div className="grid lg:grid-cols-3 gap-8">
                    <div className="lg:col-span-2">
                        <MonthlyBreakdown
                            transactions={monthlyTransactions}
                            categories={categories}
                            monthlyIncome={monthlyIncome}
                            isLoading={isLoading}
                            selectedMonth={selectedMonth}
                            selectedYear={selectedYear}
                            allCustomBudgets={allCustomBudgets}
                        />
                    </div>
                    <div className="lg:col-span-1">
                        {priorityComponent}
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
                                { id: 'goals', label: 'Goals', icon: Target },
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
                <div className="flex-1 overflow-y-auto bg-gray-50 p-4">

                    {/* TAB: ANALYSIS (Carousel) */}
                    {mobileTab === 'analysis' && (
                        <div className="h-full flex flex-col space-y-4">
                            <div className="embla overflow-hidden flex-1 min-w-0 w-full" ref={emblaRef}>
                                <div className="flex h-full touch-pan-y">

                                    {/* Slide 1: Summary Stats */}
                                    <div className="flex-[0_0_100%] min-w-0 px-2 overflow-y-auto pb-1">
                                        <div className="space-y-4 pb-12">
                                            {statsComponent}
                                            <MobileChartCard title="Financial Health" contentClassName="overflow-visible" onMaximize={() => setFullScreenChart({ title: "Financial Health", content: healthComponent })}>
                                                {healthComponent}
                                            </MobileChartCard>
                                        </div>
                                    </div>

                                    {/* Slide 2: Wave */}
                                    <div className="flex-[0_0_100%] min-w-0 px-2 overflow-y-auto">
                                        <div className="pb-12">
                                            <MobileChartCard title="Cash Flow Wave" className="h-[450px]" onMaximize={() => setFullScreenChart({ title: "Cash Flow Wave", content: waveComponent })}>
                                                {waveComponent}
                                            </MobileChartCard>
                                        </div>
                                    </div>

                                    {/* Slide 3: Projection */}
                                    <div className="flex-[0_0_100%] min-w-0 px-2 overflow-y-auto">
                                        <div className="pb-12">
                                            <MobileChartCard title="Financial Horizon" className="h-[450px]" onMaximize={() => setFullScreenChart({ title: "Financial Horizon", content: projectionComponent })}>
                                                {projectionComponent}
                                            </MobileChartCard>
                                        </div>
                                    </div>

                                    {/* Slide 4: Priority */}
                                    <div className="flex-[0_0_100%] min-w-0 px-2 overflow-y-auto">
                                        <div className="pb-12">
                                            <MobileChartCard title="Priority Allocations" className="h-[450px]" onMaximize={() => setFullScreenChart({ title: "Allocations", content: priorityComponent })}>
                                                {priorityComponent}
                                            </MobileChartCard>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            {/* Dots Indicator */}
                            <div className="flex justify-center gap-1.5 py-2">
                                {[0, 1, 2, 3].map((idx) => (
                                    <button
                                        key={idx}
                                        onClick={() => scrollTo(idx)}
                                        className={`w-2 h-2 rounded-full transition-all ${idx === currentSlide ? 'bg-blue-600 w-4' : 'bg-gray-300'}`}
                                    />
                                ))}
                            </div>
                        </div>
                    )}

                    {/* TAB: GOALS */}
                    {mobileTab === 'goals' && (
                        <div className="h-full pb-20 overflow-y-auto">
                            {goalSettingsComponent}
                        </div>
                    )}

                    {/* TAB: BREAKDOWN */}
                    {mobileTab === 'breakdown' && (
                        <div className="h-full pb-20 overflow-y-auto">
                            <MonthlyBreakdown
                                transactions={monthlyTransactions}
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