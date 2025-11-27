import { Card, CardContent } from "@/components/ui/card";
import { TrendingUp, Settings } from "lucide-react";
import { formatCurrency } from "../utils/currencyUtils";
import { Link } from "react-router-dom";

export default function RemainingBudgetCard({
    bonusSavingsPotential,
    currentMonthIncome, // Why is it unused?
    currentMonthExpenses,
    settings,
    monthNavigator,
    // These buttons are preserved in the new layout header
    addIncomeButton,
    addExpenseButton,
    importDataButton,
    systemBudgets = []
}) {
    // Safety check
    if (!settings) return null;

    // 1. Extract Needs & Wants data for the "Pressure Gauges"
    const needsBudget = systemBudgets.find(sb => sb.systemBudgetType === 'needs');
    const wantsBudget = systemBudgets.find(sb => sb.systemBudgetType === 'wants');

    // Helper to calculate "Pressure" (Spend vs Limit)
    const getPressureData = (budget) => {
        if (!budget) return { used: 0, limit: 0, percent: 0, isOver: false };

        const limit = budget.budgetAmount || 0;
        // Use pre-calculated stats if available, otherwise fallback to raw (though Dashboard usually passes stats)
        const spent = budget.stats?.paidAmount || 0;

        // Calculate percentage of the limit used
        const percent = limit > 0 ? (spent / limit) * 100 : 0;

        return {
            used: spent,
            limit: limit,
            percent: Math.min(percent, 100), // Cap visual bar at 100%
            isOver: spent > limit
        };
    };

    const needsData = getPressureData(needsBudget);
    const wantsData = getPressureData(wantsBudget);

    // 2. High Level Status Logic
    // "On Track" means you haven't blown your ceilings
    const isOnTrack = !needsData.isOver && !wantsData.isOver;

    return (
        <Card className="border-none shadow-md bg-white overflow-hidden h-full flex flex-col">
            <CardContent className="p-5 flex-1 flex flex-col">

                {/* Header / Actions Row */}
                <div className="flex items-center justify-between mb-4">
                    <div className="flex-1">
                        {monthNavigator}
                    </div>
                    <div className="flex items-center gap-2 ml-4">
                        {addIncomeButton}
                        {addExpenseButton}
                        {importDataButton}
                    </div>
                </div>

                <div className="flex flex-col md:flex-row gap-6 items-start md:items-center flex-1">

                    {/* LEFT: The "Hero" Verdict */}
                    <div className="flex-1 min-w-[200px]">
                        <h3 className="text-gray-500 font-medium text-xs uppercase tracking-wider mb-1">Monthly Pulse</h3>

                        <div className="flex items-baseline gap-2">
                            <h2 className={`text-3xl font-bold ${isOnTrack ? 'text-gray-900' : 'text-amber-600'}`}>
                                {isOnTrack ? "On Track" : "Over Limit"}
                            </h2>
                        </div>

                        <p className="text-sm text-gray-500 mt-2 leading-relaxed">
                            You have used <span className="font-semibold text-gray-900">{formatCurrency(currentMonthExpenses, settings)}</span> of your income.
                        </p>

                        {/* Efficiency Bonus Badge */}
                        {bonusSavingsPotential > 0 && (
                            <div className="mt-3 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 border border-emerald-100">
                                <TrendingUp className="w-3 h-3 text-emerald-600" />
                                <span className="text-xs font-medium text-emerald-700">
                                    Potential Savings: +{formatCurrency(bonusSavingsPotential, settings)}
                                </span>
                            </div>
                        )}
                    </div>

                    {/* RIGHT: The "Pressure Gauges" (Ceilings) */}
                    <div className="flex-1 w-full space-y-5 border-l border-gray-100 md:pl-6 py-1">

                        {/* Needs Gauge */}
                        <div className="space-y-1.5">
                            <div className="flex justify-between text-xs">
                                <span className="font-medium text-gray-700 flex items-center gap-1.5">
                                    <div className="w-2 h-2 rounded-full bg-red-500"></div> Needs
                                </span>
                                <span className="text-gray-400">
                                    {formatCurrency(needsData.used, settings)} / {formatCurrency(needsData.limit, settings)}
                                </span>
                            </div>
                            {/* The Track (Gray) = The Ceiling. The Fill (Color) = The Pressure. */}
                            <div className="h-2 w-full bg-gray-100 rounded-full overflow-hidden">
                                <div
                                    className={`h-full rounded-full transition-all duration-500 ${needsData.isOver ? 'bg-red-600' : 'bg-red-400'}`}
                                    style={{ width: `${needsData.percent}%` }}
                                />
                            </div>
                        </div>

                        {/* Wants Gauge */}
                        <div className="space-y-1.5">
                            <div className="flex justify-between text-xs">
                                <span className="font-medium text-gray-700 flex items-center gap-1.5">
                                    <div className="w-2 h-2 rounded-full bg-amber-500"></div> Wants
                                </span>
                                <span className="text-gray-400">
                                    {formatCurrency(wantsData.used, settings)} / {formatCurrency(wantsData.limit, settings)}
                                </span>
                            </div>
                            <div className="h-2 w-full bg-gray-100 rounded-full overflow-hidden">
                                <div
                                    className={`h-full rounded-full transition-all duration-500 ${wantsData.isOver ? 'bg-red-500' : 'bg-amber-400'}`}
                                    style={{ width: `${wantsData.percent}%` }}
                                />
                            </div>
                        </div>

                        {/* Quick Link */}
                        <div className="pt-2 flex justify-end">
                            <Link to="/Settings" className="text-[10px] text-gray-400 hover:text-blue-600 flex items-center gap-1 transition-colors group">
                                <Settings size={12} className="group-hover:rotate-45 transition-transform duration-300" />
                                Adjust Goals
                            </Link>
                        </div>
                    </div>

                </div>
            </CardContent>
        </Card>
    );
}
