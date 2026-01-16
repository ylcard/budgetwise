import { useMemo } from "react"; // ADDED: 16-Jan-2026
import { Card, CardContent } from "@/components/ui/card";
import { TrendingUp, Wallet, ArrowUpRight, ArrowDownRight, Target, PiggyBank, Activity, TrendingDown, ShieldCheck } from "lucide-react";
import { formatCurrency } from "../utils/currencyUtils";
import { getMonthlyPaidExpenses } from "../utils/financialCalculations";
import { estimateCurrentMonth } from "../utils/projectionUtils";
import { calculateFinancialHealth } from "../utils/financialHealthAlgorithms"; // ADDED: 16-Jan-2026
import { motion } from "framer-motion";

// COMMENTED OUT: 16-Jan-2026 - Moved to financialHealthAlgorithms.jsx
// // Helper: Calculate spend up to a specific day of the month
// const getSpendByDayX = (allTransactions, targetMonth, targetYear, dayLimit) => {
//     return allTransactions.reduce((sum, t) => {
//         const tDate = new Date(t.date || t.created_date); // Adjust key if needed

//         // 1. Match Month/Year
//         if (tDate.getMonth() !== targetMonth || tDate.getFullYear() !== targetYear) return sum;

//         // 2. Stop if transaction is after "Day X"
//         if (tDate.getDate() > dayLimit) return sum;

//         // 3. Sum Expenses (Positive numbers, exclude Income)
//         if (t.category?.name === 'Income' || t.type === 'income') return sum;
//         return sum + (Number(t.amount) || 0);
//     }, 0);
// };

export default function ReportStats({
    transactions = [],
    monthlyIncome = 0,
    prevTransactions = [],
    prevMonthlyIncome = 0,
    isLoading,
    settings,
    safeBaseline = 0,
    startDate,
    endDate,
    bonusSavingsPotential = 0
}) {
    if (isLoading) {
        return (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {[1, 2].map((i) => (
                    <div key={i} className="h-32 bg-gray-100 animate-pulse rounded-xl" />
                ))}
            </div>
        );
    }

    const totalPaidExpenses = Math.abs(getMonthlyPaidExpenses(transactions, startDate, endDate));
    // const prevPaidExpenses = Math.abs(getMonthlyPaidExpenses(prevTransactions));
    const prevPaidExpenses = prevTransactions.reduce((sum, t) => {
        // If your DB doesn't use 'type', remove the condition and just return sum + t.amount
        if (t.category?.name === 'Income' || t.type === 'income') return sum;
        return sum + (Number(t.amount) || 0);
    }, 0);

    const netFlow = monthlyIncome - totalPaidExpenses;
    const prevNetFlow = prevMonthlyIncome - prevPaidExpenses;

    const savingsRate = monthlyIncome > 0
        ? ((monthlyIncome - totalPaidExpenses) / monthlyIncome) * 100
        : 0;

    const prevSavingsRate = prevMonthlyIncome > 0
        ? ((prevMonthlyIncome - prevPaidExpenses) / prevMonthlyIncome) * 100
        : 0;

    // --- Analysis & Projection Logic ---
    const today = new Date();
    // Ensure startDate is a real Date object before reading properties
    const start = new Date(startDate);
    const isCurrentMonth = today.getMonth() === start.getMonth() && today.getFullYear() === start.getFullYear();

    // 1. Get projection for the current month using the Safe Baseline
    const estimate = estimateCurrentMonth(transactions, safeBaseline);

    // 2. Determine what to show as "Projected"
    // If current month: Show the hybrid estimate (Spent + Remaining Baseline)
    // If past month: Show actuals
    const projectedExpenses = isCurrentMonth ? estimate.total : totalPaidExpenses;
    const projectedNetFlow = monthlyIncome - projectedExpenses;

    // 3. Comparisons
    const savingsRateDiff = savingsRate - prevSavingsRate;

    // Helper for Net Flow % change (handles negative numbers safely)
    // Formula: (Current - Prev) / |Prev|
    const netFlowDiffPercent = prevNetFlow !== 0
        ? ((netFlow - prevNetFlow) / Math.abs(prevNetFlow)) * 100
        : 0;

    const getArrow = (diff) => diff >= 0
        ? <ArrowUpRight className="w-3 h-3" />
        : <ArrowDownRight className="w-3 h-3" />;

    return (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="border-none shadow-sm">
                <CardContent className="p-6 text-center">
                    <div className="flex flex-col items-center">
                        <p className="text-sm font-medium text-gray-500">Savings Rate</p>
                        <motion.h3
                            initial={{ y: 5, opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            transition={{ duration: 0.5 }}
                            className={`text-2xl font-bold mt-1 ${savingsRate >= 20 ? 'text-emerald-600' : savingsRate > 0 ? 'text-blue-600' : 'text-rose-600'}`}
                        >
                            {savingsRate.toFixed(1)}%
                        </motion.h3>
                        {/* Analysis Badge */}
                        <div className={`flex items-center gap-1 mt-2 text-xs font-medium ${savingsRateDiff >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                            {getArrow(savingsRateDiff)}
                            <span>{Math.abs(savingsRateDiff).toFixed(1)}% vs last month</span>
                        </div>
                    </div>
                    <div className="mt-4 flex justify-center">
                        <div className={`p-3 rounded-full ${savingsRate >= 0 ? 'bg-emerald-100 text-emerald-600' : 'bg-rose-100 text-rose-600'}`}>
                            <TrendingUp className="w-5 h-5" />
                        </div>
                    </div>
                </CardContent>
            </Card>

            <Card className="border-none shadow-sm">
                <CardContent className="p-6 text-center">
                    <div className="flex flex-col items-center">
                        <p className="text-sm font-medium text-gray-500">Net Flow</p>
                        <motion.h3
                            initial={{ y: 5, opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            transition={{ delay: 0.1, duration: 0.5 }}
                            className={`text-2xl font-bold mt-1 ${netFlow >= 0 ? 'text-gray-900' : 'text-rose-600'}`}
                        >
                            {formatCurrency(netFlow, settings)}
                        </motion.h3>
                        {/* Analysis Badge - Comparison vs Last Month */}
                        <div className={`flex items-center gap-1 mt-2 text-xs font-medium ${netFlowDiffPercent >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                            {getArrow(netFlowDiffPercent)}
                            <span>{Math.abs(netFlowDiffPercent).toFixed(0)}% vs last month</span>
                        </div>
                        {/* Projection Badge */}
                        {isCurrentMonth ? (
                            <div className={`flex items-center gap-1 mt-2 text-xs font-medium ${projectedNetFlow >= 0 ? 'text-blue-600' : 'text-rose-500'}`}>
                                <Target className="w-3 h-3" />
                                <span>Proj. End of Month: {formatCurrency(projectedNetFlow, settings)}</span>
                            </div>
                        ) : (
                            <div className="flex items-center gap-1 mt-2 text-xs font-medium text-gray-400">
                                <span>Closed</span>
                            </div>
                        )}
                    </div>
                    <div className="mt-4 flex justify-center">
                        <div className="p-3 rounded-full bg-blue-100 text-blue-600">
                            <Wallet className="w-5 h-5" />
                        </div>
                    </div>
                </CardContent>
            </Card>

            <Card className="border-none shadow-sm">
                <CardContent className="p-6 text-center">
                    <div className="flex flex-col items-center">
                        <p className="text-sm font-medium text-gray-500">Efficiency Bonus</p>
                        <motion.h3
                            initial={{ y: 5, opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            transition={{ delay: 0.2, duration: 0.5 }}
                            className="text-2xl font-bold mt-1 text-emerald-600"
                        >
                            {formatCurrency(bonusSavingsPotential, settings)}
                        </motion.h3>
                        <div className="flex items-center gap-1 mt-2 text-xs font-medium text-emerald-600/80">
                            <span>Unspent Needs & Wants</span>
                        </div>
                    </div>
                    <div className="mt-4 flex justify-center">
                        <div className="p-3 rounded-full bg-emerald-100 text-emerald-600">
                            <PiggyBank className="w-5 h-5" />
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}


// --- Financial Health Score Component (Appended to existing file) ---
export function FinancialHealthScore({
    monthlyIncome,
    transactions,
    fullHistory = [],
    prevMonthlyIncome,
    prevTransactions,
    startDate,
    endDate,
    isLoading,
    settings
}) {
    if (isLoading) return null;

    // COMMENTED OUT: 16-Jan-2026 - All calculation logic moved to financialHealthAlgorithms.jsx
    // // 1. Current Month Data
    // // const currentExpenses = Math.abs(getMonthlyPaidExpenses(transactions, startDate, endDate));
    // // const currentNet = monthlyIncome - currentExpenses;
    // // const currentSavingsRate = monthlyIncome > 0 ? (currentNet / monthlyIncome) : 0;

    // // 2. Previous Month Data (Approximate using available prevTransactions)
    // // const prevExpenses = Math.abs(getMonthlyPaidExpenses(prevTransactions));
    // // const prevExpenses = prevTransactions.reduce((sum, t) => {
    // //     if (t.category?.name === 'Income' || t.type === 'income') return sum; 
    // //     return sum + (Number(t.amount) || 0);
    // // }, 0);

    // // --- INTELLIGENT PACING ALGORITHM ---    
    // const today = new Date();
    // const start = new Date(startDate);
    // // If viewing current month, compare "Day 1 to Today". If past month, compare "Day 1 to 31".
    // const isCurrentMonthView = today.getMonth() === start.getMonth() && today.getFullYear() === start.getFullYear();
    // const dayCursor = isCurrentMonthView ? today.getDate() : new Date(start.getFullYear(), start.getMonth() + 1, 0).getDate();

    // // 1. Current Spend (Day 1 to X)
    // const currentSpend = getSpendByDayX(transactions, start.getMonth(), start.getFullYear(), dayCursor);

    // // 2. Historical Context (Average of Last 3 Months by Day X)
    // // We calculate the same "Day 1 to X" spend for M-1, M-2, M-3
    // const m1 = new Date(start); m1.setMonth(start.getMonth() - 1);
    // const m2 = new Date(start); m2.setMonth(start.getMonth() - 2);
    // const m3 = new Date(start); m3.setMonth(start.getMonth() - 3);

    // const spendM1 = getSpendByDayX(fullHistory, m1.getMonth(), m1.getFullYear(), dayCursor);
    // const spendM2 = getSpendByDayX(fullHistory, m2.getMonth(), m2.getFullYear(), dayCursor);
    // const spendM3 = getSpendByDayX(fullHistory, m3.getMonth(), m3.getFullYear(), dayCursor);

    // // Calculate Baseline (Average of non-zero months)
    // const historyPoints = [spendM1, spendM2, spendM3].filter(v => v > 0);
    // const averageSpendAtPointX = historyPoints.length > 0
    //     ? historyPoints.reduce((a, b) => a + b, 0) / historyPoints.length
    //     : currentSpend; // No history fallback


    // // --- SCORING ALGORITHM (Max 100) ---
    // // A. Savings Score (Max 50)
    // // let savingsScore = 0;
    // // if (currentSavingsRate > 0) {
    // //     savingsScore = Math.min(50, (currentSavingsRate / 0.20) * 50);
    // // }

    // // // B. Efficiency Score (Max 30) - Rewards staying under budget ceilings
    // // let efficiencyScore = 0;
    // // if (currentNet >= 0) {
    // //     efficiencyScore = 15; // Base solvency
    // //     // Bonus for every 1% saved
    // //     efficiencyScore += Math.min(15, (currentSavingsRate * 100) * 0.5);
    // // } else {
    // //     const overspendRatio = monthlyIncome > 0 ? (Math.abs(currentNet) / monthlyIncome) : 1;
    // //     efficiencyScore = Math.max(0, 15 - (overspendRatio * 100));
    // // }

    // // // C. Trend Score (Max 20)
    // // let trendScore = 0;
    // // console.log(currentExpenses);
    // // console.log(prevExpenses);
    // // console.log(prevMonthlyIncome);
    // // if (currentExpenses < prevExpenses) {
    // //     trendScore += 10;
    // // }
    // // if (currentNet > (prevMonthlyIncome - prevExpenses)) {
    // //     trendScore += 10;
    // // }


    // // Metric 1: Pacing Score (Max 40) - "Are you spending less than USUAL by this day?"
    // let pacingScore = 0;
    // const diff = currentSpend - averageSpendAtPointX;
    // if (diff <= 0) {
    //     pacingScore = 40; // Under average = Perfect
    // } else {
    //     // Lose points for being over average
    //     const deviation = averageSpendAtPointX > 0 ? diff / averageSpendAtPointX : 1;
    //     pacingScore = Math.max(0, 40 - (deviation * 100));
    // }

    // // Metric 2: Burn Ratio (Max 40) - "Is your spending rate sustainable for your income?"
    // // Target: Spend < 80% of income by end of month.
    // // Allowed Spend at Day X = (Income * 0.8) * (Day X / 30)
    // let efficiencyScore = 0;
    // const targetMaxSpend = monthlyIncome * 0.8 * (dayCursor / 30);

    // if (currentSpend <= targetMaxSpend) {
    //     efficiencyScore = 40;
    // } else {
    //     const overRatio = targetMaxSpend > 0 ? (currentSpend - targetMaxSpend) / targetMaxSpend : 1;
    //     efficiencyScore = Math.max(0, 40 - (overRatio * 100));
    // }

    // // Metric 3: Control (Max 20) - "Did you behave better than last month specifically?"
    // let trendScore = 0;
    // if (currentSpend <= spendM1) trendScore = 20; // Better than last month
    // else if (currentSpend <= spendM1 * 1.1) trendScore = 10; // Within 10% margin
    // else trendScore = 0;


    // // const totalScore = Math.round(savingsScore + efficiencyScore + trendScore);
    // const totalScore = Math.round(pacingScore + efficiencyScore + trendScore);

    // ADDED: 16-Jan-2026 - Use new centralized algorithm
    const healthData = useMemo(() => {
        return calculateFinancialHealth(transactions, fullHistory, monthlyIncome, startDate);
    }, [transactions, fullHistory, monthlyIncome, startDate]);

    const { totalScore, breakdown, label } = healthData;
    const { pacing: pacingScore, ratio: ratioScore, stability: stabilityScore, sharpe: sharpeScore, creep: creepScore } = breakdown;

    // COMMENTED OUT: 16-Jan-2026 - Label now comes from algorithm
    // // Visuals
    // let color = '#10B981'; // Green
    // let label = 'Excellent';
    // if (totalScore < 80) { color = '#3B82F6'; label = 'Good'; }
    // if (totalScore < 60) { color = '#F59E0B'; label = 'Fair'; }
    // if (totalScore < 40) { color = '#EF4444'; label = 'Needs Work'; }

    // ADDED: 16-Jan-2026 - Color mapping for label
    let color = '#10B981'; // Green
    if (totalScore < 90) color = '#3B82F6'; // Blue for Good
    if (totalScore < 75) color = '#F59E0B'; // Orange for Fair
    if (totalScore < 60) color = '#EF4444'; // Red for Needs Work

    return (
        <Card className="border-none shadow-sm h-full overflow-hidden relative mt-6">
            <CardContent className="p-6 flex flex-col sm:flex-row items-center gap-6">
                {/* Score Circle */}
                <div className="relative w-32 h-32 flex-shrink-0">
                    <svg className="w-full h-full transform -rotate-90" viewBox="0 0 120 120">
                        <circle cx="60" cy="60" r="50" fill="none" stroke="#F3F4F6" strokeWidth="10" />
                        <motion.circle
                            initial={{ strokeDashoffset: 314 }}
                            animate={{ strokeDashoffset: 314 - (totalScore / 100) * 314 }}
                            transition={{ duration: 1 }}
                            cx="60" cy="60" r="50"
                            fill="none"
                            stroke={color}
                            strokeWidth="10"
                            strokeLinecap="round"
                            strokeDasharray="314"
                        />
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                        <span className="text-3xl font-bold text-gray-900">{totalScore}</span>
                        <span className="text-xs font-medium" style={{ color }}>{label}</span>
                    </div>
                </div>
                {/* Text Summary */}
                <div className="flex-1">
                    <h3 className="font-bold text-lg text-gray-900 flex items-center gap-2">
                        <Activity className="w-5 h-5 text-blue-600" /> Financial Health
                    </h3>
                    <p className="text-sm text-gray-500 mt-1">
                        Composite score analyzing real-time pacing, sustainability, volatility, savings consistency, and lifestyle trends.
                    </p>
                    <div className="grid grid-cols-5 gap-2 mt-4">
                        <div className="text-xs">
                            <span className="block text-gray-400">Pacing</span>
                            <span className="font-semibold">{pacingScore}</span>
                        </div>
                        <div className="text-xs">
                            <span className="block text-gray-400">Burn</span>
                            <span className="font-semibold">{ratioScore}</span>
                        </div>
                        <div className="text-xs">
                            <span className="block text-gray-400">Stable</span>
                            <span className="font-semibold">{stabilityScore}</span>
                        </div>
                        <div className="text-xs">
                            <span className="block text-gray-400">Sharpe</span>
                            <span className="font-semibold">{sharpeScore}</span>
                        </div>
                        <div className="text-xs">
                            <span className="block text-gray-400">Creep</span>
                            <span className="font-semibold">{creepScore}</span>
                        </div>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}