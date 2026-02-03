import { useMemo } from "react";
import { useSettings } from "../components/utils/SettingsContext";
import { usePeriod } from "../components/hooks/usePeriod";
import {
    useTransactions,
    useCategories,
    useGoals,
    useSystemBudgetsForPeriod,
    useCustomBudgetsForPeriod
} from "../components/hooks/useBase44Entities";
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
import { useState, useEffect, useRef } from "react";
import { parseDate, getMonthBoundaries } from "../components/utils/dateUtils";

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
    const { categories, isLoading: loadingCategories } = useCategories();
    const { goals, isLoading: loadingGoals } = useGoals(user);
    const { allCustomBudgets } = useCustomBudgetsForPeriod(user);
    const { systemBudgets } = useSystemBudgetsForPeriod(user, monthStart, monthEnd);

    // ADDED 17-Jan-2026: Goal Settings state management
    const { handleGoalUpdate, isSaving: isGoalSaving } = useGoalActions(user, goals);
    const [localGoalMode, setLocalGoalMode] = useState(settings.goalMode ?? true);
    const [splits, setSplits] = useState({ split1: 50, split2: 80 });
    const [absoluteValues, setAbsoluteValues] = useState({ needs: '', wants: '', savings: '' });
    const [fixedLifestyleMode, setFixedLifestyleMode] = useState(settings.fixedLifestyleMode ?? false);

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

                {/* 1. Top Row: KPIs + Goal Allocation */}
                <div className="grid lg:grid-cols-3 gap-8 items-stretch">
                    <div className="lg:col-span-2 flex flex-col gap-8">
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
                            className="flex-1"
                        />
                    </div>

                    <div className="lg:col-span-1 flex">
                        <GoalSettings
                            className="w-full"
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
                    </div>
                </div>

                {/* 2. Historical Context & Future Projection */}
                <div className="w-full space-y-8">
                    {/* New Wave Chart added ABOVE the Projection Chart */}
                    <CashFlowWave
                        data={cashFlowData}
                        settings={settings}
                    />
                    <ProjectionChart
                        settings={settings}
                        projectionData={projectionData}
                    />
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
                        />
                    </div>
                    <div className="lg:col-span-1">
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