import { useMemo } from "react";
import { useSettings } from "../components/utils/SettingsContext";
import { usePeriod } from "../components/hooks/usePeriod";
import {
    useTransactions,
    useCategories,
    useGoals,
    useSystemBudgetsForPeriod,
    useCustomBudgetsAll
} from "../components/hooks/useBase44Entities";
import { useMonthlyTransactions, useMonthlyIncome } from "../components/hooks/useDerivedData";
import MonthlyBreakdown from "../components/reports/MonthlyBreakdown";
import PriorityChart from "../components/reports/PriorityChart";
import MonthNavigator from "../components/ui/MonthNavigator";
import ProjectionChart from "../components/reports/ProjectionChart";
import ReportStats, { FinancialHealthScore } from "../components/reports/ReportStats";
import { calculateProjection } from "../components/utils/projectionUtils";
import { calculateBonusSavingsPotential } from "../components/utils/financialCalculations";

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

    // Data fetching
    const { transactions, isLoading: loadingTransactions } = useTransactions();
    const { categories, isLoading: loadingCategories } = useCategories();
    const { goals, isLoading: loadingGoals } = useGoals(user);
    const { allCustomBudgets } = useCustomBudgetsAll(user);
    const { systemBudgets } = useSystemBudgetsForPeriod(user, monthStart, monthEnd);

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

    return (
        <div className="min-h-screen px-4 md:px-8 pb-4 md:pb-8 pt-2 md:pt-4">
            <div className="max-w-7xl mx-auto space-y-8">
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

                {/* 1. High-Level KPIs (New) */}
                <ReportStats
                    transactions={monthlyTransactions}
                    monthlyIncome={monthlyIncome}
                    prevTransactions={prevMonthlyTransactions}
                    prevMonthlyIncome={prevMonthlyIncome}
                    fullHistory={transactions}
                    isLoading={isLoading}
                    settings={settings}
                    safeBaseline={projectionData.totalProjectedMonthly}
                    startDate={monthStart}
                    endDate={monthEnd}
                    bonusSavingsPotential={bonusSavingsPotential}
                />

                {/* 2. Financial Health Score (New) */}
                <FinancialHealthScore
                    monthlyIncome={monthlyIncome}
                    transactions={monthlyTransactions}
                    prevMonthlyIncome={prevMonthlyIncome}
                    prevTransactions={prevMonthlyTransactions}
                    startDate={monthStart}
                    endDate={monthEnd}
                    isLoading={isLoading}
                    settings={settings}
                />

                {/* 2. Historical Context & Future Projection */}
                <div className="w-full">
                    <ProjectionChart
                        transactions={transactions}
                        categories={categories}
                        settings={settings}
                        projectionData={projectionData}
                    />
                </div>

                {/* 3. Detailed Breakdown & Goals */}
                <div className="grid lg:grid-cols-3 gap-8">
                    <div className="lg:col-span-2 h-full">

                        <MonthlyBreakdown
                            transactions={monthlyTransactions}
                            categories={categories}
                            monthlyIncome={monthlyIncome}
                            isLoading={isLoading}
                            selectedMonth={selectedMonth}
                            selectedYear={selectedYear}
                        />
                    </div>
                    <div className="lg:col-span-1 h-full">
                        <PriorityChart
                            transactions={monthlyTransactions}
                            categories={categories}
                            goals={goals}
                            monthlyIncome={monthlyIncome}
                            isLoading={isLoading}
                            settings={settings}
                        />

                    </div>
                </div>
            </div>
        </div>
    );
}