import { Card, CardContent } from "@/components/ui/card";
import { TrendingUp, AlertCircle, Target } from "lucide-react";
import { formatCurrency } from "../utils/currencyUtils";
import { Link } from "react-router-dom";

export default function RemainingBudgetCard({
    bonusSavingsPotential,
    currentMonthIncome,
    currentMonthExpenses,
    settings,
    monthNavigator,
    addIncomeButton,
    addExpenseButton,
    importDataButton,
    systemBudgets = [],
    goals = [],
    breakdown = null // Now expecting the granular breakdown object
}) {
    if (!settings) return null;

    // 1. Safe Income Calculation (Prevent Division by Zero)
    const safeIncome = currentMonthIncome || 1;

    // 2. Goal Summary Text (Top Right)
    const isAbsolute = settings.goalAllocationMode === 'absolute';
    const needsGoal = goals.find(g => g.priority === 'needs');
    const wantsGoal = goals.find(g => g.priority === 'wants');
    const savingsGoal = goals.find(g => g.priority === 'savings');

    const goalSummary = isAbsolute
        ? `${formatCurrency(needsGoal?.target_amount || 0, settings)} / ${formatCurrency(wantsGoal?.target_amount || 0, settings)} / ${formatCurrency(savingsGoal?.target_amount || 0, settings)}`
        : `${needsGoal?.target_percentage || 50}% / ${wantsGoal?.target_percentage || 30}% / ${savingsGoal?.target_percentage || 20}%`;

    // 3. Extract Budget Limits & Colors
    const needsBudget = systemBudgets.find(sb => sb.systemBudgetType === 'needs');
    const wantsBudget = systemBudgets.find(sb => sb.systemBudgetType === 'wants');

    const needsColor = needsBudget?.color || '#3B82F6'; // Default Blue
    const wantsColor = wantsBudget?.color || '#F59E0B'; // Default Amber

    const needsLimit = needsBudget?.budgetAmount || 0;
    const wantsLimit = wantsBudget?.budgetAmount || 0;

    // 4. Extract Actual Spending (Paid vs Unpaid)
    // Fallback to 0s if breakdown isn't ready yet
    const needsData = breakdown?.needs || { paid: 0, unpaid: 0, total: 0 };
    const wantsData = breakdown?.wants || { total: 0, directPaid: 0, directUnpaid: 0, customPaid: 0, customUnpaid: 0 };

    // Aggregate Wants (Direct + Custom)
    const wantsPaidTotal = (wantsData.directPaid || 0) + (wantsData.customPaid || 0);
    const wantsUnpaidTotal = (wantsData.directUnpaid || 0) + (wantsData.customUnpaid || 0);

    /**
     * CORE LOGIC: Calculate Bar Segments
     * Splits spending into: 
     * 1. Safe Paid (Solid)
     * 2. Safe Unpaid (Striped)
     * 3. Overflow (Red Striped)
     */
    const calculateSegments = (paid, unpaid, limit) => {
        const total = paid + unpaid;

        // If no limit is set (0), treat everything as "Safe" spending (no overflow possible)
        if (!limit || limit <= 0) {
            return { safePaid: paid, safeUnpaid: unpaid, overflow: 0, total };
        }

        // Calculate Overflow
        const overflow = Math.max(0, total - limit);

        // Calculate what fits inside the Limit
        const safeTotal = total - overflow;

        // Within the safe limit, fill with Paid first, then Unpaid
        const safePaid = Math.min(paid, safeTotal);
        const safeUnpaid = Math.max(0, safeTotal - safePaid);

        return { safePaid, safeUnpaid, overflow, total };
    };

    const needsSegs = calculateSegments(needsData.paid, needsData.unpaid, needsLimit);
    const wantsSegs = calculateSegments(wantsPaidTotal, wantsUnpaidTotal, wantsLimit);

    // 5. Visual Calculations
    // We inflate very small bars to be clickable (min 5%), but this distorts the "Savings" bar slightly.
    // This is a trade-off for usability.
    const CLICKABLE_MIN_PCT = 5;

    const rawNeedsPct = (needsSegs.total / safeIncome) * 100;
    const needsVisualPct = needsSegs.total > 0 ? Math.max(rawNeedsPct, CLICKABLE_MIN_PCT) : 0;

    const rawWantsPct = (wantsSegs.total / safeIncome) * 100;
    const wantsVisualPct = wantsSegs.total > 0 ? Math.max(rawWantsPct, CLICKABLE_MIN_PCT) : 0;

    const totalSpent = currentMonthExpenses;
    const isTotalOver = totalSpent > currentMonthIncome;

    // 6. Savings Bars Logic
    // We calculate two "phantom" bars for the empty space:
    // A. Efficiency Bar: The gap between Actual Spending and the Budget Limit.
    // B. Target Bar: The gap between Budget Limit and 100% Income.

    const needsLimitPct = (needsLimit / safeIncome) * 100;
    const wantsLimitPct = (wantsLimit / safeIncome) * 100;
    const totalLimitPct = needsLimitPct + wantsLimitPct;

    const visualSpendingEnd = needsVisualPct + wantsVisualPct;

    // "Efficiency": Amount budget that was allocated but NOT spent.
    // Logic: BudgetLimit - ActualVisualSpend
    const efficiencyBarPct = Math.max(0, totalLimitPct - visualSpendingEnd);

    // "Target": Pure unallocated savings
    // Logic: 100% - Max(BudgetLimit, ActualVisualSpend)
    // If we overspend, we eat into this bar.
    const targetSavingsBarPct = Math.max(0, 100 - Math.max(totalLimitPct, visualSpendingEnd));

    // Display Percentage (Strict Math, ignore visual inflation)
    const savingsPct = Math.max(0, 100 - (totalSpent / safeIncome) * 100);

    // CSS Pattern for "Unpaid" or "Overflow"
    const stripePattern = {
        backgroundImage: `linear-gradient(45deg,rgba(255,255,255,.3) 25%,transparent 25%,transparent 50%,rgba(255,255,255,.3) 50%,rgba(255,255,255,.3) 75%,transparent 75%,transparent)`,
        backgroundSize: '8px 8px'
    };

    return (
        <Card className="border-none shadow-md bg-white overflow-hidden h-full flex flex-col">
            <CardContent className="p-5 flex-1 flex flex-col">

                {/* --- Header / Controls --- */}
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

                {/* --- Main Content Grid --- */}
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

                    {/* 2. The Visualization Bar */}
                    <div className="space-y-2">
                        <div className="relative h-8 w-full bg-gray-100 rounded-lg overflow-hidden flex shadow-inner">

                            {/* --- NEEDS SEGMENT --- */}
                            <Link
                                to={needsBudget ? `/BudgetDetail?id=${needsBudget.id}` : '#'}
                                className={`h-full transition-all duration-500 relative group hover:brightness-110 cursor-pointer border-r border-white/20 overflow-hidden flex`}
                                style={{ width: `${needsVisualPct}%` }}
                            >
                                {/* A. Safe Paid (Solid) */}
                                {needsSegs.safePaid > 0 && (
                                    <div className="h-full" style={{ width: `${(needsSegs.safePaid / needsSegs.total) * 100}%`, backgroundColor: needsColor }} />
                                )}

                                {/* B. Safe Unpaid (Striped) */}
                                {needsSegs.safeUnpaid > 0 && (
                                    <div className="h-full bg-blue-500 opacity-60" style={{ width: `${(needsSegs.safeUnpaid / needsSegs.total) * 100}%`, ...stripePattern }} />
                                )}

                                {/* C. Overflow (Red Striped) */}
                                {needsSegs.overflow > 0 && (
                                    <div className="h-full opacity-60" style={{ width: `${(needsSegs.overflow / needsSegs.total) * 100}%`, backgroundColor: 'red', ...stripePattern }} />
                                )}

                                <div className={`absolute inset-0 flex items-center justify-center text-[10px] font-bold text-white transition-opacity ${needsVisualPct > 10 ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}>
                                    Needs
                                </div>
                            </Link>

                            {/* --- WANTS SEGMENT --- */}
                            <Link
                                to={wantsBudget ? `/BudgetDetail?id=${wantsBudget.id}` : '#'}
                                className={`h-full transition-all duration-500 relative group hover:brightness-110 cursor-pointer border-r border-white/20 overflow-hidden flex`}
                                style={{ width: `${wantsVisualPct}%` }}
                            >
                                {/* A. Safe Paid (Solid) */}
                                {wantsSegs.safePaid > 0 && (
                                    <div className="h-full" style={{ width: `${(wantsSegs.safePaid / wantsSegs.total) * 100}%`, backgroundColor: wantsColor }} />
                                )}

                                {/* B. Safe Unpaid (Striped) */}
                                {wantsSegs.safeUnpaid > 0 && (
                                    <div className="h-full opacity-60" style={{ width: `${(wantsSegs.safeUnpaid / wantsSegs.total) * 100}%`, backgroundColor: wantsColor, ...stripePattern }} />
                                )}

                                {/* C. Overflow (Red Striped) */}
                                {wantsSegs.overflow > 0 && (
                                    <div className="h-full bg-red-500" style={{ width: `${(wantsSegs.overflow / wantsSegs.total) * 100}%`, ...stripePattern }} />
                                )}

                                <div className={`absolute inset-0 flex items-center justify-center text-[10px] font-bold text-white transition-opacity ${wantsVisualPct > 10 ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}>
                                    Lifestyle
                                </div>
                            </Link>

                            {/* --- EFFICIENCY SAVINGS SEGMENT (Gap between Actual & Budget) --- */}
                            {efficiencyBarPct > 0 && (
                                <div
                                    className="h-full bg-emerald-300 relative group border-r border-white/20"
                                    style={{ width: `${efficiencyBarPct}%` }}
                                >
                                    <div className="absolute inset-0 flex items-center justify-center text-[10px] font-bold text-emerald-800 opacity-75 group-hover:opacity-100 transition-opacity whitespace-nowrap overflow-hidden">
                                        Extra
                                    </div>
                                </div>
                            )}

                            {/* --- TARGET SAVINGS SEGMENT (Gap between Budget & Income) --- */}
                            {targetSavingsBarPct > 0 && (
                                <div
                                    className="h-full bg-emerald-500 relative group"
                                    style={{ width: `${targetSavingsBarPct}%` }}
                                >
                                    <div className="absolute inset-0 flex items-center justify-center text-[10px] font-bold text-white transition-opacity opacity-75 group-hover:opacity-100 whitespace-nowrap overflow-hidden">
                                        Target
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* --- Legend Row --- */}
                        <div className="flex flex-col sm:flex-row justify-between text-xs text-gray-400 pt-1 gap-2">
                            {/* Amounts Legend */}
                            <div className="flex gap-4 items-center">
                                <span className="flex items-center gap-1.5">
                                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: needsColor }}></div>
                                    Essentials: {formatCurrency(needsSegs.total, settings)}
                                </span>
                                <span className="flex items-center gap-1.5">
                                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: wantsColor }}></div>
                                    Lifestyle: {formatCurrency(wantsSegs.total, settings)}
                                </span>
                            </div>

                            {/* Status Key */}
                            <div className="flex gap-3 items-center text-[10px] bg-gray-50 px-2 py-1 rounded border border-gray-100">
                                <span className="flex items-center gap-1">
                                    <div className="w-2 h-2 bg-gray-400 rounded-sm"></div> Paid
                                </span>
                                <span className="flex items-center gap-1">
                                    <div className="w-2 h-2 bg-gray-400/50 rounded-sm" style={stripePattern}></div> Plan
                                </span>
                                <span className="flex items-center gap-1 text-red-500 font-medium">
                                    <div className="w-2 h-2 bg-red-500/80 rounded-sm" style={stripePattern}></div> Over
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