import { Card, CardContent } from "@/components/ui/card";
import { TrendingUp, AlertCircle, Target } from "lucide-react";
import { formatCurrency } from "../utils/currencyUtils";
import { Link } from "react-router-dom";
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip";

export default function RemainingBudgetCard({
    bonusSavingsPotential,
    currentMonthIncome,
    currentMonthExpenses,
    settings,
    monthNavigator,
    addIncomeButton,
    addExpenseButton,
    importDataButton,
    systemBudgets = [], // Expects budgets WITH stats (from useBudgetBarsData)
    goals = [],
    aggregateNeedsTotal = 0,
    aggregateWantsTotal = 0
}) {
    if (!settings) return null;

    // 1. Extract Data
    // const income = currentMonthIncome || 1; // Prevent division by zero
    // Use 'safeIncome' for calculations to avoid NaN (division by zero), but use 'currentMonthIncome' for display
    const safeIncome = currentMonthIncome || 1;

    // Goal Summary Logic
    const isAbsolute = settings.goalAllocationMode === 'absolute';
    const needsGoal = goals.find(g => g.priority === 'needs');
    const wantsGoal = goals.find(g => g.priority === 'wants');
    const savingsGoal = goals.find(g => g.priority === 'savings');

    const goalSummary = isAbsolute
        ? `${formatCurrency(needsGoal?.target_amount || 0, settings)} / ${formatCurrency(wantsGoal?.target_amount || 0, settings)} / ${formatCurrency(savingsGoal?.target_amount || 0, settings)}`
        : `${needsGoal?.target_percentage || 50}% / ${wantsGoal?.target_percentage || 30}% / ${savingsGoal?.target_percentage || 20}%`;

    // Find specific budgets (Essentials/Lifestyle) to visualize the "stack"
    const needsBudget = systemBudgets.find(sb => sb.systemBudgetType === 'needs');
    const wantsBudget = systemBudgets.find(sb => sb.systemBudgetType === 'wants');

    // Actual Spend (from pre-calculated stats)
    // const needsSpent = needsBudget?.stats?.paidAmount || 0;
    // const wantsSpent = wantsBudget?.stats?.paidAmount || 0;
    // Refactoring to differentiate between paid and unpaid
    // const needsSpent = aggregateNeedsTotal;
    // const wantsSpent = aggregateWantsTotal;

    // Needs Breakdown
    // const needsPaid = needsBudget?.stats?.paidAmount || 0;
    // const needsUnpaid = needsBudget?.expectedAmount || 0;
    // const needsTotal = needsPaid + needsUnpaid;
    // const needsPaidPct = needsTotal > 0 ? (needsPaid / needsTotal) * 100 : 0;

    // Wants Breakdown
    // const wantsPaid = wantsBudget?.stats?.paidAmount || 0;
    // const wantsUnpaid = wantsBudget?.expectedAmount || 0;
    // const wantsTotal = wantsPaid + wantsUnpaid;
    // const wantsPaidPct = wantsTotal > 0 ? (wantsPaid / wantsTotal) * 100 : 0;

    // Helper to calculate segment splits (Safe Paid, Safe Unpaid, Overflow)
    const calculateSegments = (paid, unpaid, limit) => {
        const total = paid + unpaid;
        // If limit is 0 (no budget), everything is overflow
        const overflow = limit > 0 ? Math.max(0, total - limit) : total;
        const safeTotal = total - overflow;

        // Within safe limit, prioritize showing 'Paid' first, then 'Unpaid'
        const safePaid = Math.min(paid, safeTotal);
        const safeUnpaid = Math.max(0, safeTotal - safePaid);

        return { safePaid, safeUnpaid, overflow, total };
    };

    const needsLimit = needsBudget?.budgetAmount || 0;
    const wantsLimit = wantsBudget?.budgetAmount || 0;

    const needsSegs = calculateSegments(needsBudget?.stats?.paidAmount || 0, needsBudget?.expectedAmount || 0, needsLimit);
    const wantsSegs = calculateSegments(wantsBudget?.stats?.paidAmount || 0, wantsBudget?.expectedAmount || 0, wantsLimit);

    const totalSpent = currentMonthExpenses;

    // Goals (Limits) - Use budgetAmount as the ceiling
    // const needsLimit = needsBudget?.budgetAmount || 0;
    // const wantsLimit = wantsBudget?.budgetAmount || 0;

    // Percentages for the Bar (Relative to INCOME)
    // This visualizes: "How much of my Income have I given to Needs?"
    // const needsPct = (needsSpent / income) * 100;
    // const wantsPct = (wantsSpent / income) * 100;
    // const needsPct = (needsSpent / safeIncome) * 100;
    // const wantsPct = (wantsSpent / safeIncome) * 100;
    // VISUAL TWEAK: Enforce a minimum width for segments with data so they remain visible/clickable
    // const MIN_VISIBILITY_PCT = 4; // 4% width minimum

    // Visual Width Calculation (Container Size)
    // Define a small, fixed minimum width for clickability, preventing segments from becoming un-selectable.
    const CLICKABLE_MIN_PCT = 5; // 5% minimum width if spending is > 0

    // Refatoring to differentiate between paid and unpaid
    // const rawNeedsPct = (needsSpent / safeIncome) * 100;

    // const needsPct = needsSpent > 0 ? Math.max(rawNeedsPct, MIN_VISIBILITY_PCT) : 0;
    // 1. Calculate Needs Visual Width (Min 15%)
    // const MIN_VISUAL_PCT = 15;
    // const needsVisualPct = needsSpent > 0 ? Math.max(rawNeedsPct, MIN_VISUAL_PCT) : 0;

    // Refatoring to differentiate between paid and unpaid
    // const needsVisualPct = needsSpent > 0 ? Math.max(rawNeedsPct, CLICKABLE_MIN_PCT) : 0;

    // Refatoring to differentiate between paid and unpaid
    // const rawWantsPct = (wantsSpent / safeIncome) * 100;

    // const wantsPct = wantsSpent > 0 ? Math.max(rawWantsPct, MIN_VISIBILITY_PCT) : 0;
    // const wantsVisualPct = wantsSpent > 0 ? Math.max(rawWantsPct, MIN_VISUAL_PCT) : 0;
    // Refatoring to differentiate between paid and unpaid
    // const wantsVisualPct = wantsSpent > 0 ? Math.max(rawWantsPct, CLICKABLE_MIN_PCT) : 0;

    // const rawNeedsPct = (needsTotal / safeIncome) * 100;
    // const needsVisualPct = needsTotal > 0 ? Math.max(rawNeedsPct, CLICKABLE_MIN_PCT) : 0;
    const rawNeedsPct = (needsSegs.total / safeIncome) * 100;
    const needsVisualPct = needsSegs.total > 0 ? Math.max(rawNeedsPct, CLICKABLE_MIN_PCT) : 0;

    // const rawWantsPct = (wantsTotal / safeIncome) * 100;
    // const wantsVisualPct = wantsTotal > 0 ? Math.max(rawWantsPct, CLICKABLE_MIN_PCT) : 0;
    const rawWantsPct = (wantsSegs.total / safeIncome) * 100;
    const wantsVisualPct = wantsSegs.total > 0 ? Math.max(rawWantsPct, CLICKABLE_MIN_PCT) : 0;

    // Calculate the total space required by the inflated visual bars
    const totalVisualOccupied = Math.min(100, needsVisualPct + wantsVisualPct);

    // Calculate the true remaining space (used for Savings visual bar calculation)
    const trueSavingsSpace = Math.max(0, 100 - totalVisualOccupied);

    // Savings is strictly "Income minus Spending"
    // const savingsPct = Math.max(0, 100 - (totalSpent / income) * 100);
    const savingsPct = Math.max(0, 100 - (totalSpent / safeIncome) * 100);

    // Limit Markers (Where the ceilings sit relative to Income)
    // const needsLimitPct = (needsLimit / income) * 100;
    // const totalLimitPct = ((needsLimit + wantsLimit) / income) * 100;
    const needsLimitPct = (needsLimit / safeIncome) * 100;
    const totalLimitPct = ((needsLimit + wantsLimit) / safeIncome) * 100;

    // Status Logic
    // Refactoring to differentiate between paid and unpaid
    // const isNeedsOver = needsSpent > needsLimit;
    // const isWantsOver = wantsSpent > wantsLimit;
    // const isNeedsOver = needsTotal > needsLimit;
    // const isWantsOver = wantsTotal > wantsLimit;
    const isNeedsOver = needsSegs.total > needsLimit;
    const isWantsOver = wantsSegs.total > wantsLimit;
    // const isTotalOver = totalSpent > income;
    const isTotalOver = totalSpent > currentMonthIncome; // Check against real income

    // Stripe Pattern
    const stripePattern = {
        backgroundImage: `linear-gradient(45deg,rgba(255,255,255,.3) 25%,transparent 25%,transparent 50%,rgba(255,255,255,.3) 50%,rgba(255,255,255,.3) 75%,transparent 75%,transparent)`,
        backgroundSize: '8px 8px'
    };

    return (
        <Card className="border-none shadow-md bg-white overflow-hidden h-full flex flex-col">
            <CardContent className="p-5 flex-1 flex flex-col">

                {/* Header / Controls */}
                <div className="flex items-center justify-between mb-6">
                    <div className="flex-1">
                        {monthNavigator}
                    </div>
                    <div className="flex items-center gap-2 ml-4">
                        {addIncomeButton}
                        {addExpenseButton}
                        {importDataButton}
                    </div>
                </div>

                {/* Main Content Grid */}
                <div className="flex flex-col gap-6">

                    {/* 1. The Verdict (Text) */}
                    <div className="flex items-end justify-between">
                        <div>
                            {isTotalOver ? (
                                <h2 className="text-3xl font-bold text-red-600 flex items-center gap-2">
                                    Over Limit
                                    <AlertCircle className="w-6 h-6" />
                                </h2>
                            ) : (
                                <h2 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
                                    {Math.round(savingsPct)}%
                                    <span className="text-lg font-medium text-gray-500">Saved</span>
                                </h2>
                            )}

                            <div className="text-sm text-gray-500 mt-1">
                                {currentMonthIncome > 0 ? (
                                    <>
                                        You've spent <strong className={isTotalOver ? "text-red-600" : "text-gray-900"}>{formatCurrency(totalSpent, settings)}</strong> of your <strong>{formatCurrency(currentMonthIncome, settings)}</strong> income.
                                    </>
                                ) : totalSpent > 0 ? (
                                    <>
                                        You've spent <strong className="text-red-600">{formatCurrency(totalSpent, settings)}</strong>, but have no income recorded.
                                    </>
                                ) : (
                                    "No income or expenses recorded."
                                )}
                            </div>
                        </div>

                        {/* Efficiency Bonus Badge */}
                        {bonusSavingsPotential > 0 && !isTotalOver && (
                            <div className="text-right hidden sm:block">
                                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 border border-emerald-100">
                                    <TrendingUp className="w-3 h-3 text-emerald-600" />
                                    <span className="text-xs font-medium text-emerald-700">
                                        Efficiency: +{formatCurrency(bonusSavingsPotential, settings)}
                                    </span>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* 2. The Unified Income Bar (The Visualization) */}
                    <div className="space-y-2">
                        {/* The Bar Container */}
                        <div className="relative h-8 w-full bg-gray-100 rounded-lg overflow-hidden flex shadow-inner">

                            {/* Essentials Segment (Blue/Red) */}
                            <Link
                                to={needsBudget ? `/BudgetDetail?id=${needsBudget.id}` : '#'}
                                className={`h-full transition-all duration-500 relative group hover:brightness-110 cursor-pointer border-r border-white/20 overflow-hidden flex`}
                                style={{ width: `${needsVisualPct}%` }}
                            >
                                {/* 1. Safe Paid (Solid Blue) */}
                                {needsSegs.safePaid > 0 && (
                                    <div className="h-full bg-blue-500" style={{ width: `${(needsSegs.safePaid / needsSegs.total) * 100}%` }} />
                                )}

                                {/* 2. Safe Unpaid (Striped Blue) */}
                                {needsSegs.safeUnpaid > 0 && (
                                    <div className="h-full bg-blue-500 opacity-60" style={{ width: `${(needsSegs.safeUnpaid / needsSegs.total) * 100}%`, ...stripePattern }} />
                                )}

                                {/* 3. Overflow (Striped Red) */}
                                {needsSegs.overflow > 0 && (
                                    <div className="h-full bg-red-500" style={{ width: `${(needsSegs.overflow / needsSegs.total) * 100}%`, ...stripePattern }} />
                                )}

                                {/* Show label always if bar is wide enough (>10%), otherwise hover only */}
                                <div className={`absolute inset-0 flex items-center justify-center text-[10px] font-bold text-white transition-opacity ${needsVisualPct > 10 ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}>
                                    Needs
                                </div>
                            </Link>

                            {/* Lifestyle Segment (Amber/Red) */}
                            <Link
                                to={wantsBudget ? `/BudgetDetail?id=${wantsBudget.id}` : '#'}
                                className={`h-full transition-all duration-500 relative group hover:brightness-110 cursor-pointer border-r border-white/20 overflow-hidden flex`}
                                style={{ width: `${wantsVisualPct}%` }}
                            >
                                {/* 1. Safe Paid (Solid Amber) */}
                                {wantsSegs.safePaid > 0 && (
                                    <div className="h-full bg-amber-400" style={{ width: `${(wantsSegs.safePaid / wantsSegs.total) * 100}%` }} />
                                )}

                                {/* 2. Safe Unpaid (Striped Amber) */}
                                {wantsSegs.safeUnpaid > 0 && (
                                    <div className="h-full bg-amber-400 opacity-60" style={{ width: `${(wantsSegs.safeUnpaid / wantsSegs.total) * 100}%`, ...stripePattern }} />
                                )}

                                {/* 3. Overflow (Striped Red) */}
                                {wantsSegs.overflow > 0 && (
                                    <div className="h-full bg-red-500" style={{ width: `${(wantsSegs.overflow / wantsSegs.total) * 100}%`, ...stripePattern }} />
                                )}

                                <div className={`absolute inset-0 flex items-center justify-center text-[10px] font-bold text-white transition-opacity ${wantsVisualPct > 10 ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}>
                                    Lifestyle
                                </div>
                            </Link>

                            {/* SAVINGS Segment (The Empty Space) */}
                            <div className="flex-1 h-full bg-emerald-50/50 flex items-center justify-center relative">
                                {savingsPct > 5 && (
                                    <span className="text-xs font-medium text-emerald-600/70 animate-pulse">Savings</span>
                                )}
                            </div>

                            {/* --- LIMIT MARKERS (The Ceilings) --- */}

                            {/* Savings Barrier / Guardrail */}
                            {totalLimitPct < 100 && (
                                <div
                                    className="absolute top-0 bottom-0 z-20 flex flex-col items-center"
                                    style={{ left: `${totalLimitPct}%`, transform: 'translateX(-50%)' }}
                                >
                                    {/* The visual line */}
                                    <div className="h-full w-0.5 border-l-2 border-red-400/60 border-dashed" />

                                    {/* The warning label with Tooltip */}
                                    <TooltipProvider>
                                        <Tooltip>
                                            <TooltipTrigger asChild>
                                                <div className="absolute -top-6 flex flex-col items-center cursor-help hover:scale-105 transition-transform">
                                                    <div className="px-1.5 py-0.5 bg-red-50 border border-red-200 rounded text-[9px] font-bold text-red-600 shadow-sm whitespace-nowrap flex items-center gap-1">
                                                        <span>🛡️ Savings Barrier</span>
                                                    </div>
                                                    {/* Little pointer triangle */}
                                                    <div className="w-0 h-0 border-l-4 border-l-transparent border-r-4 border-r-transparent border-t-4 border-t-red-200" />
                                                </div>
                                            </TooltipTrigger>
                                            <TooltipContent className="max-w-[200px] text-xs">
                                                <p>This line represents your Total Budget limit. Spending past this line means you are dipping into your planned savings.</p>
                                            </TooltipContent>
                                        </Tooltip>
                                    </TooltipProvider>
                                </div>
                            )}
                        </div>

                        {/* Legend Row */}
                        <div className="flex justify-between text-xs text-gray-400 pt-1">
                            <div className="flex gap-4">
                                <span className="flex items-center gap-1.5">
                                    <div className={`w-2 h-2 rounded-full ${isNeedsOver ? 'bg-red-500' : 'bg-blue-500'}`}></div>
                                    Essentials: {formatCurrency(needsSegs.total, settings)}
                                </span>
                                <span className="flex items-center gap-1.5">
                                    <div className={`w-2 h-2 rounded-full ${isWantsOver ? 'bg-red-400' : 'bg-amber-400'}`}></div>
                                    Lifestyle: {formatCurrency(wantsSegs.total, settings)}
                                </span>
                            </div>

                            <div className="flex items-center gap-2">
                                <span className="text-[10px] text-gray-400 font-medium hidden sm:inline">{goalSummary}</span>
                                <Link to="/Settings" className="flex items-center gap-1 text-[10px] hover:text-blue-600 transition-colors">
                                    <Target size={12} />
                                    <span>Adjust</span>
                                </Link>
                            </div>
                        </div>
                    </div>

                </div>
            </CardContent>
        </Card>
    );
}
