import { useMemo, memo, useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { TrendingUp, Wallet, ArrowUpRight, ArrowDownRight, Target, PiggyBank, Activity, TrendingDown, ShieldCheck, Loader2 } from "lucide-react";
import { formatCurrency } from "../utils/currencyUtils";
import { getMonthlyPaidExpenses } from "../utils/financialCalculations";
import { estimateCurrentMonth } from "../utils/projectionUtils";
import { calculateFinancialHealth } from "../utils/financialHealthAlgorithms"; // ADDED: 16-Jan-2026
import { motion, useSpring, useTransform, animate, useMotionValue } from "framer-motion";
import InfoTooltip from "../ui/InfoTooltip"; // ADDED: 16-Jan-2026

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

const ReportStats = memo(function ReportStats({
    transactions = [],
    monthlyIncome = 0,
    prevTransactions = [],
    prevMonthlyIncome = 0,
    isLoading,
    settings,
    categories = [],
    allCustomBudgets = [],
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
            <Card className="border-none shadow-lg">
                <CardContent className="p-6 text-center">
                    <div className="flex flex-col items-center">
                        <p className="text-sm font-medium text-gray-500 inline-flex items-center">
                            Savings Rate
                            <InfoTooltip
                                title="Savings Rate"
                                description="The percentage of your income that you save after expenses. A higher savings rate indicates better financial health and more money available for future goals."
                                wikiUrl="https://en.wikipedia.org/wiki/Savings_rate"
                            />
                        </p>
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

            <Card className="border-none shadow-lg">
                <CardContent className="p-6 text-center">
                    <div className="flex flex-col items-center">
                        <p className="text-sm font-medium text-gray-500 inline-flex items-center">
                            Net Flow
                            <InfoTooltip
                                title="Net Flow"
                                description="Your total income minus total expenses. A positive net flow means you're earning more than you spend. A negative net flow indicates overspending."
                                wikiUrl="https://en.wikipedia.org/wiki/Cash_flow"
                            />
                        </p>
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
                            <span>{Math.abs(netFlowDiffPercent).toFixed(0)}% vs the previous month</span>
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

            <Card className="border-none shadow-lg">
                <CardContent className="p-6 text-center">
                    <div className="flex flex-col items-center">
                        <p className="text-sm font-medium text-gray-500 inline-flex items-center">
                            Efficiency Bonus
                            <InfoTooltip
                                title="Efficiency Bonus"
                                description="The amount of money you saved by spending less than your allocated Needs and Wants budgets. This represents your behavioral savings from disciplined spending."
                            />
                        </p>
                        <motion.h3
                            initial={{ y: 5, opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            transition={{ delay: 0.2, duration: 0.5 }}
                            className="text-2xl font-bold mt-1 text-emerald-600"
                        >
                            {formatCurrency(bonusSavingsPotential, settings)}
                        </motion.h3>
                        <div className="flex items-center gap-1 mt-2 text-xs font-medium text-emerald-600/80">
                            <span>{bonusSavingsPotential >= 0 ? 'Unspent Needs & Wants' : 'Budget Overspend'}</span>
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
});

export default ReportStats;

// --- HELPER COMPONENTS (Moved outside to prevent re-animation on parent render) ---

const getScoreStyle = (score) => {
    if (score >= 90) return { color: 'text-emerald-600', bg: 'bg-emerald-50', bar: 'bg-emerald-500', label: 'Excellent' };
    if (score >= 75) return { color: 'text-blue-600', bg: 'bg-blue-50', bar: 'bg-blue-500', label: 'Good' };
    if (score >= 60) return { color: 'text-amber-600', bg: 'bg-amber-50', bar: 'bg-amber-500', label: 'Fair' };
    return { color: 'text-rose-600', bg: 'bg-rose-50', bar: 'bg-rose-500', label: 'Risk' };
};

// Helper: A "slot machine" style rolling number for the "Calculating" effect
const RollingNumber = ({ value, duration = 1.5 }) => {
    const motionValue = useMotionValue(0);
    const rounded = useTransform(motionValue, (latest) => Math.round(latest));

    useEffect(() => {
        const controls = animate(motionValue, value, {
            duration: duration,
            ease: "circOut", // Starts fast, slows down at the end like a wheel
        });
        return controls.stop;
    }, [value, duration, motionValue]);

    return <motion.span className="tabular-nums tracking-tight">{rounded}</motion.span>;
};

// Renders a single "DNA" cell - Memoized so it only re-animates if the score actually changes
const HealthCell = memo(({ label, score, description, wiki }) => {
    const style = getScoreStyle(score);

    return (
        <div className="flex flex-col h-full justify-between p-3 rounded-lg border border-gray-100 bg-white shadow-md hover:shadow-lg transition-all">
            <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">{label}</span>
                <InfoTooltip title={label} description={description} wikiUrl={wiki} />
            </div>
            <div className="flex items-end justify-between mb-2">
                <span className={`text-2xl font-bold ${style.color}`}>
                    <RollingNumber value={score} />
                </span>
                {/* Fade in the verdict label only after numbers start settling to reduce visual noise */}
                <motion.span
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.5, duration: 0.5 }}
                    className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${style.bg} ${style.color}`}
                >
                    {style.label}
                </motion.span>
            </div>
            <div className="h-1.5 w-full bg-gray-100 rounded-full overflow-hidden">
                <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${score}%` }}
                    transition={{ duration: 1, delay: 0.2 }}
                    className={`h-full ${style.bar}`}
                />
            </div>
        </div>
    );
});


// --- Financial Health Score Component (Appended to existing file) ---
export const FinancialHealthScore = memo(function FinancialHealthScore({
    monthlyIncome,
    transactions,
    fullHistory = [],
    startDate,
    isLoading,
    settings,
    goals,
    categories,
    allCustomBudgets,
    className
}) {
    // if (isLoading) return null;

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
        if (isLoading && (!transactions || transactions.length === 0)) return null;
        return calculateFinancialHealth(transactions, fullHistory, monthlyIncome, startDate, settings, goals, categories, allCustomBudgets);
    }, [transactions, fullHistory, monthlyIncome, startDate, settings, goals, categories, allCustomBudgets]);

    // 2. If no healthData (First time loading this month), show Skeleton
    if (!healthData) {
        return (
            <div className={`flex flex-col gap-4 h-full animate-pulse ${className || ''}`}>
                <div className="h-24 bg-gray-100 rounded-xl border border-gray-200" />
                <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3">
                    {[1, 2, 3, 4, 5].map((i) => (
                        <div key={i} className="h-32 bg-gray-50 rounded-lg border border-gray-100" />
                    ))}
                </div>
            </div>
        );
    }

    // const { totalScore, breakdown, label } = healthData;
    if (!healthData) return <div className="animate-pulse bg-gray-50 rounded-xl h-48" />;

    const { totalScore, breakdown } = healthData;
    const { pacing: pacingScore, ratio: ratioScore, stability: stabilityScore, sharpe: sharpeScore, creep: creepScore } = breakdown;

    // COMMENTED OUT: 16-Jan-2026 - Label now comes from algorithm
    // // Visuals
    // let color = '#10B981'; // Green
    // let label = 'Excellent';
    // if (totalScore < 80) { color = '#3B82F6'; label = 'Good'; }
    // if (totalScore < 60) { color = '#F59E0B'; label = 'Fair'; }
    // if (totalScore < 40) { color = '#EF4444'; label = 'Needs Work'; }

    // HELPER: Dynamic styling for the DNA cards
    const getScoreStyle = (score) => {
        if (score >= 90) return { color: 'text-emerald-600', bg: 'bg-emerald-50', bar: 'bg-emerald-500', label: 'Excellent' };
        if (score >= 75) return { color: 'text-blue-600', bg: 'bg-blue-50', bar: 'bg-blue-500', label: 'Good' };
        if (score >= 60) return { color: 'text-amber-600', bg: 'bg-amber-50', bar: 'bg-amber-500', label: 'Fair' };
        return { color: 'text-rose-600', bg: 'bg-rose-50', bar: 'bg-rose-500', label: 'At Risk' };
    };

    // HELPER: Dynamic styling for the Main Header
    const getHeaderStyle = (score) => {
        if (score >= 90) return {
            bg: 'bg-emerald-50',
            border: 'border-emerald-100',
            text: 'text-emerald-900',
            subtext: 'text-emerald-600',
            iconBg: 'bg-emerald-200',
            iconColor: 'text-emerald-700',
            gradient: 'from-emerald-50 to-white',
            verdict: 'Excellent Health'
        };
        if (score >= 75) return {
            bg: 'bg-blue-50',
            border: 'border-blue-100',
            text: 'text-blue-900',
            subtext: 'text-blue-600',
            iconBg: 'bg-blue-200',
            iconColor: 'text-blue-700',
            gradient: 'from-blue-50 to-white',
            verdict: 'Good Health'
        };
        if (score >= 60) return {
            bg: 'bg-amber-50',
            border: 'border-amber-100',
            text: 'text-amber-900',
            subtext: 'text-amber-600',
            iconBg: 'bg-amber-200',
            iconColor: 'text-amber-700',
            gradient: 'from-amber-50 to-white',
            verdict: 'Fair Health'
        };
        return {
            bg: 'bg-rose-50',
            border: 'border-rose-100',
            text: 'text-rose-900',
            subtext: 'text-rose-600',
            iconBg: 'bg-rose-200',
            iconColor: 'text-rose-700',
            gradient: 'from-rose-50 to-white',
            verdict: 'Needs Attention'
        };
    };

    const headerStyle = getHeaderStyle(totalScore);

    // ADDED: 16-Jan-2026 - Color mapping for label
    let color = '#10B981'; // Green
    if (totalScore < 90) color = '#3B82F6'; // Blue for Good
    if (totalScore < 75) color = '#F59E0B'; // Orange for Fair
    if (totalScore < 60) color = '#EF4444'; // Red for Needs Work

    return (
        <div className={`flex flex-col gap-4 h-full ${className || ''}`}>
            {/* Main Header Card - Redesigned with color and badge */}
            <div className={`flex-none relative overflow-hidden flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 md:p-5 rounded-xl border shadow-md transition-colors duration-300 gap-4 ${headerStyle.bg} ${headerStyle.border}`}>

                {/* Subtle Gradient Overlay */}
                <div className={`absolute inset-0 bg-gradient-to-br ${headerStyle.gradient} opacity-60`} />

                <div className="relative z-10 flex items-center gap-3 md:gap-4 w-full sm:w-auto">
                    <div className={`w-14 h-14 rounded-2xl flex items-center justify-center ${headerStyle.iconBg} shadow-sm`}>
                        <Activity className={`w-7 h-7 ${headerStyle.iconColor}`} />
                    </div>
                    <div>
                        <h3 className={`font-bold text-base md:text-lg leading-tight ${headerStyle.text}`}>Financial Health Score</h3>
                        <p className={`text-sm font-medium ${headerStyle.subtext}`}>Composite wellness analysis</p>
                    </div>
                </div>
                <div className="relative z-10 flex flex-row sm:flex-col items-center sm:items-end justify-between w-full sm:w-auto mt-2 sm:mt-0">
                    <div className="flex items-baseline gap-1">
                        <span className={`text-4xl font-extrabold ${headerStyle.text}`}>
                            <RollingNumber value={totalScore} duration={2} />
                        </span>
                        <span className={`text-sm font-semibold ${headerStyle.subtext}`}>/100</span>
                    </div>
                    <motion.span
                        initial={{ opacity: 0, y: 5 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 1 }} // Wait for the big number to finish rolling
                        className={`text-xs font-bold uppercase tracking-wider px-2.5 py-1 rounded-full bg-white/60 backdrop-blur-sm ${headerStyle.iconColor} ml-auto sm:ml-0 sm:mt-1`}
                    >
                        {headerStyle.verdict}
                    </motion.span>
                </div>
            </div>

            {/* DNA Grid - 5 Cards */}
            <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3">
                <HealthCell
                    label="Pacing"
                    score={pacingScore}
                    description="Compares your current spending to your 3-month historical average for the same day of the month."
                />
                <HealthCell
                    label="Burn"
                    score={ratioScore}
                    description="Sustainability: Will you run out of money before the month ends?"
                    wiki="https://en.wikipedia.org/wiki/Burn_rate"
                />
                <HealthCell
                    label="Stability"
                    score={stabilityScore}
                    description="Measures how predictable your monthly expenses are. High stability = fewer surprises."
                    wiki="https://en.wikipedia.org/wiki/Coefficient_of_variation"
                />
                <HealthCell
                    label="Sharpe"
                    score={sharpeScore}
                    description="Risk-adjusted savings consistency. High score = you save consistently, not just occasionally."
                    wiki="https://en.wikipedia.org/wiki/Sharpe_ratio"
                />
                <HealthCell
                    label="Creep"
                    score={creepScore}
                    description="Lifestyle Creep: Are your expenses growing faster than your income?"
                    wiki="https://en.wikipedia.org/wiki/Lifestyle_inflation"
                />
            </div>
        </div>
    );
});