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
import CashFlowWave from "../components/reports/CashFlowWave"; // UPDATED: 20-Jan-2026
import ReportStats, { FinancialHealthScore } from "../components/reports/ReportStats";
import { calculateProjection } from "../components/utils/projectionUtils";
import { calculateBonusSavingsPotential } from "../components/utils/financialCalculations";
import GoalSettings from "../components/reports/GoalSettings";
import { useGoalActions } from "../components/hooks/useActions";
import { useState, useEffect, useRef } from "react";
import { parseDate } from "../components/utils/dateUtils";

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
    const { allCustomBudgets } = useCustomBudgetsAll(user);
    const { systemBudgets } = useSystemBudgetsForPeriod(user, monthStart, monthEnd);

    // Goal Settings state management
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

    const prevMonthlyTransactions = useMonthlyTransactions(transactions, previousMonth, previousYear);
    console.log(prevMonthlyTransactions);
    const prevMonthlyIncome = useMonthlyIncome(transactions, previousMonth, previousYear);

    const isLoading = loadingTransactions || loadingCategories || loadingGoals;

    // Calculate Efficiency Bonus
    const bonusSavingsPotential = useMemo(() => {
        if (!monthStart || !monthEnd || !systemBudgets) return 0;
        const goalMode = settings?.goalMode ?? true;
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
                <div className="w-full">
                    <CashFlowWave settings={settings} />
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