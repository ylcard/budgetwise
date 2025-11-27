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
    systemBudgets = [] // Expects budgets WITH stats (from useBudgetBarsData)
}) {
    if (!settings) return null;

    // 1. Extract Data
    const income = currentMonthIncome || 1; // Prevent division by zero

    // Find specific budgets (Needs/Wants) to visualize the "stack"
    const needsBudget = systemBudgets.find(sb => sb.systemBudgetType === 'needs');
    const wantsBudget = systemBudgets.find(sb => sb.systemBudgetType === 'wants');

    // Actual Spend (from pre-calculated stats)
    const needsSpent = needsBudget?.stats?.paidAmount || 0;
    const wantsSpent = wantsBudget?.stats?.paidAmount || 0;
    const totalSpent = currentMonthExpenses;

    // Goals (Limits) - Use budgetAmount as the ceiling
    const needsLimit = needsBudget?.budgetAmount || 0;
    const wantsLimit = wantsBudget?.budgetAmount || 0;

    // Percentages for the Bar (Relative to INCOME)
    // This visualizes: "How much of my Income have I given to Needs?"
    const needsPct = (needsSpent / income) * 100;
    const wantsPct = (wantsSpent / income) * 100;

    // Savings is strictly "Income minus Spending"
    const savingsPct = Math.max(0, 100 - (totalSpent / income) * 100);

    // Limit Markers (Where the ceilings sit relative to Income)
    const needsLimitPct = (needsLimit / income) * 100;
    const totalLimitPct = ((needsLimit + wantsLimit) / income) * 100;

    // Status Logic
    const isNeedsOver = needsSpent > needsLimit;
    const isWantsOver = wantsSpent > wantsLimit;
    const isTotalOver = totalSpent > income;

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

                            <p className="text-sm text-gray-500 mt-1">
                                You've spent <strong className={isTotalOver ? "text-red-600" : "text-gray-900"}>{formatCurrency(totalSpent, settings)}</strong> of your <strong>{formatCurrency(income, settings)}</strong> income.
                            </p>
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

                            {/* NEEDS Segment (Blue/Red) */}
                            <div
                                className={`h-full transition-all duration-500 relative group ${isNeedsOver ? 'bg-red-500' : 'bg-blue-500'}`}
                                style={{ width: `${Math.min(needsPct, 100)}%` }}
                            >
                                <div className="absolute inset-0 flex items-center justify-center text-[10px] font-bold text-white opacity-0 group-hover:opacity-100 transition-opacity">
                                    Needs
                                </div>
                            </div>

                            {/* WANTS Segment (Amber/Red) */}
                            {/* Stacks directly after Needs */}
                            <div
                                className={`h-full transition-all duration-500 relative group ${isWantsOver ? 'bg-red-400' : 'bg-amber-400'}`}
                                style={{ width: `${Math.min(wantsPct, 100 - needsPct)}%` }}
                            >
                                <div className="absolute inset-0 flex items-center justify-center text-[10px] font-bold text-white opacity-0 group-hover:opacity-100 transition-opacity">
                                    Wants
                                </div>
                            </div>

                            {/* SAVINGS Segment (The Empty Space) */}
                            <div className="flex-1 h-full bg-emerald-50/50 flex items-center justify-center relative">
                                {savingsPct > 5 && (
                                    <span className="text-xs font-medium text-emerald-600/70 animate-pulse">Savings</span>
                                )}
                            </div>

                            {/* --- LIMIT MARKERS (The Ceilings) --- */}

                            {/* Needs Limit Line */}
                            {needsLimitPct < 100 && (
                                <div
                                    className="absolute top-0 bottom-0 w-px bg-gray-800/30 z-10 border-r border-white/50"
                                    style={{ left: `${needsLimitPct}%` }}
                                >
                                    <div className="absolute -top-3 -left-3 text-[9px] text-gray-400 font-medium">Needs</div>
                                </div>
                            )}

                            {/* Total Spending Limit Line (Needs + Wants) */}
                            {totalLimitPct < 100 && (
                                <div
                                    className="absolute top-0 bottom-0 w-px bg-gray-800/30 z-10 border-r border-white/50"
                                    style={{ left: `${totalLimitPct}%` }}
                                >
                                    <div className="absolute -top-3 -left-3 text-[9px] text-gray-400 font-medium">Limit</div>
                                </div>
                            )}
                        </div>

                        {/* Legend Row */}
                        <div className="flex justify-between text-xs text-gray-400 pt-1">
                            <div className="flex gap-4">
                                <span className="flex items-center gap-1.5">
                                    <div className={`w-2 h-2 rounded-full ${isNeedsOver ? 'bg-red-500' : 'bg-blue-500'}`}></div>
                                    Needs: {formatCurrency(needsSpent, settings)}
                                </span>
                                <span className="flex items-center gap-1.5">
                                    <div className={`w-2 h-2 rounded-full ${isWantsOver ? 'bg-red-400' : 'bg-amber-400'}`}></div>
                                    Wants: {formatCurrency(wantsSpent, settings)}
                                </span>
                            </div>

                            <Link to="/Settings" className="flex items-center gap-1 hover:text-blue-600 transition-colors">
                                <Target size={12} />
                                <span>Adjust Goals</span>
                            </Link>
                        </div>
                    </div>

                </div>
            </CardContent>
        </Card>
    );
}
