import { useMemo } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { formatCurrency } from "../utils/currencyUtils";
import { estimateCurrentMonth } from "../utils/projectionUtils";
import { getMonthBoundaries, parseDate } from "../utils/dateUtils";
import { getMonthlyIncome, getMonthlyPaidExpenses, isTransactionInDateRange } from "../utils/financialCalculations";
import { useTransactions } from "../hooks/useBase44Entities";
import { ArrowRight, TrendingUp, TrendingDown, Loader2 } from "lucide-react";
import InfoTooltip from "@/components/ui/InfoTooltip";

export default function ProjectionChart({ settings }) {
    const today = useMemo(() => new Date(), []); // Absolute "Today" - never changes

    // 1. Independent Window: 6 Months Back -> END of Current Month
    const horizonWindow = useMemo(() => {
        const start = new Date(today.getFullYear(), today.getMonth() - 6, 1);
        const endOfCurrentMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);
        return {
            from: start.toISOString().split('T')[0],
            to: endOfCurrentMonth.toISOString().split('T')[0]
        };
    }, [today]);

    // 2. Fetch data (Now includes the "Future" of the current month)
    const { transactions, isLoading } = useTransactions(horizonWindow.from, horizonWindow.to);

    const { data, sixMonthAvg } = useMemo(() => {
        if (isLoading || !transactions || transactions.length === 0) {
            return { data: [], sixMonthAvg: 0 };
        }

        const realToday = new Date();

        // --- 0. CALCULATE 6-MONTH EXPENSE BASELINE ---
        let totalPastExpenses = 0;
        let validMonths = 0;
        for (let i = 1; i <= 6; i++) {
            const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
            const bounds = getMonthBoundaries(d.getMonth(), d.getFullYear());
            const spent = Math.abs(getMonthlyPaidExpenses(transactions, bounds.monthStart, bounds.monthEnd));
            if (spent > 0) {
                totalPastExpenses += spent;
                validMonths++;
            }
        }
        const safeBaseline = validMonths > 0 ? totalPastExpenses / validMonths : 0;

        // --- 1. BAR: LAST MONTH (Actuals) ---
        const lastMonthDate = new Date(today.getFullYear(), today.getMonth() - 1, 1);
        const lastBoundaries = getMonthBoundaries(lastMonthDate.getMonth(), lastMonthDate.getFullYear());
        const lastIncome = transactions
            .filter(t => t.type === 'income' && isTransactionInDateRange(t, lastBoundaries.monthStart, lastBoundaries.monthEnd))
            .reduce((sum, t) => sum + t.amount, 0);
        const lastExpenses = Math.abs(getMonthlyPaidExpenses(transactions, lastBoundaries.monthStart, lastBoundaries.monthEnd));

        // --- 2. BAR: THIS MONTH (Full Month Projection) ---
        const currentBoundaries = getMonthBoundaries(today.getMonth(), today.getFullYear());

        // Filter strictly by this month's boundaries (Day 1 to Day 31)
        const currentMonthTransactions = transactions.filter(t =>
            isTransactionInDateRange(t, currentBoundaries.monthStart, currentBoundaries.monthEnd)
        );

        // Income: Sum ALL income for the month (past + future scheduled)
        const currentIncome = currentMonthTransactions
            .filter(t => t.type === 'income')
            .reduce((sum, t) => sum + t.amount, 0);

        // Expense: Hybrid Projection (Spent so far + Expected baseline for remaining days)

        const currentExpenseProj = estimateCurrentMonth(currentMonthTransactions, safeBaseline).total;

        // --- 3. BAR: NEXT MONTH (Target) ---
        const nextIncome = lastIncome;
        const nextExpense = safeBaseline;

        const chartData = [
            { label: 'Last Month', subLabel: lastMonthDate.toLocaleDateString('en-US', { month: 'short' }), income: lastIncome, expense: lastExpenses, type: 'past' },
            { label: 'This Month', subLabel: 'Projected', income: currentIncome, expense: currentExpenseProj, type: 'current' },
            { label: 'Next Month', subLabel: 'Target', income: nextIncome, expense: nextExpense, type: 'future' }
        ];
        return { data: chartData, sixMonthAvg: safeBaseline };
    }, [transactions, isLoading, today]);

    if (isLoading || data.length < 3) {
        return (
            <Card className="border-none shadow-sm h-full flex items-center justify-center min-h-[300px] w-full">
                <Loader2 className="w-8 h-8 animate-spin text-gray-300" />
            </Card>
        );
    }

    // Scaling for the chart
    const maxVal = Math.max(...data.map(d => Math.max(d.income, d.expense)), 100) * 1.1;
    const avgHeight = Math.min((sixMonthAvg / maxVal) * 100, 100);

    // Insight Text Logic
    const currentNet = data[1].income - data[1].expense;
    const isPositive = currentNet >= 0;

    return (
        <Card className="border-none shadow-sm h-full flex flex-col">
            <CardHeader className="pb-2 flex-none">
                <div className="flex items-center justify-between">
                    <CardTitle className="text-lg font-semibold text-gray-800">
                        Financial Horizon
                        <InfoTooltip
                            title="Financial Horizon"
                            description="A 6-month projection of your future spending based on historical patterns and trends. Helps you anticipate upcoming expenses and plan accordingly."
                            wikiUrl="https://en.wikipedia.org/wiki/Time_horizon"
                        />
                    </CardTitle>
                    <div className={`flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium ${isPositive ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>
                        {isPositive ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                        {isPositive ? 'Savings Proj.' : 'Overspend Risk'}
                    </div>
                </div>
                <p className="text-sm text-gray-500">
                    {isPositive
                        ? `On track to save ${formatCurrency(currentNet, settings)} this month.`
                        : `Projected to overspend by ${formatCurrency(Math.abs(currentNet), settings)}.`}
                </p>
            </CardHeader>
            <CardContent className="flex-1 min-h-0 shadow-lg">
                <div className="h-64 flex flex-col justify-end mt-4">
                    {/* The Chart Area - 3 distinct columns */}
                    <div className="flex items-end justify-between h-full gap-4 pt-6 px-2 relative">

                        {/* 6-Month Average Line (Background) */}
                        <div
                            className="absolute w-full border-t-2 border-gray-300 border-dashed z-0 opacity-50 left-0"
                            style={{ bottom: `calc(${avgHeight}% + 24px)` }}
                        />
                        <span className="absolute right-0 text-[10px] text-gray-400 bg-white px-1 z-0" style={{ bottom: `calc(${avgHeight}% + 24px)` }}>
                            6M Avg
                        </span>

                        {data.map((item, idx) => {
                            const incomeHeight = Math.max((item.income / maxVal) * 100, 2);
                            const expenseHeight = Math.max((item.expense / maxVal) * 100, 2);
                            const isTarget = item.type === 'future';

                            return (
                                <div key={idx} className="flex-1 flex flex-col items-center justify-end h-full relative group">
                                    {/* Arrow connector (Current -> Next) */}
                                    {idx === 1 && (
                                        <div className="absolute top-1/2 -translate-y-1/2 -right-4 text-gray-300 z-0">
                                            <ArrowRight className="w-4 h-4" />
                                        </div>
                                    )}

                                    {/* Visual Bars Container */}
                                    <div className="flex items-end justify-center gap-1 w-full flex-1 px-2 z-10">
                                        {/* Income Bar */}
                                        <div
                                            className={`flex-1 max-w-[40px] rounded-t-sm transition-all duration-300 ${isTarget ? 'bg-emerald-100 border border-emerald-200 border-dashed' : 'bg-emerald-300'}`}
                                            style={{ height: `${incomeHeight}%` }}
                                        />
                                        {/* Expense Bar */}
                                        <div
                                            className={`flex-1 max-w-[40px] rounded-t-sm transition-all duration-300 ${isTarget ? 'bg-rose-100 border border-rose-200 border-dashed' : 'bg-rose-300'}`}
                                            style={{ height: `${expenseHeight}%` }}
                                        />
                                    </div>

                                    {/* Labels */}
                                    <div className="text-center mt-2 min-h-[32px]">
                                        <p className={`text-[11px] md:text-xs font-bold leading-tight ${item.type === 'current' ? 'text-blue-600' : 'text-gray-700'}`}>{item.label}</p>
                                        <p className="text-[10px] text-gray-400 font-medium uppercase tracking-wider">{item.subLabel}</p>
                                    </div>

                                    {/* Hover Tooltip - Smart Alignment for Mobile Edges */}
                                    <div className={`
                                        absolute bottom-full mb-2 opacity-0 group-hover:opacity-100 transition-opacity bg-gray-900 text-white text-xs p-2 rounded shadow-lg z-20 whitespace-nowrap pointer-events-none
                                        ${idx === 0 ? 'left-0' : idx === 2 ? 'right-0' : 'left-1/2 -translate-x-1/2'}
                                    `}>
                                        <p className="font-bold mb-1 border-b border-gray-700 pb-1">{item.label}</p>
                                        <div className="space-y-1">
                                            <p className="flex justify-between gap-4 text-emerald-300">
                                                <span>Income:</span> <span>{formatCurrency(item.income, settings)}</span>
                                            </p>
                                            <p className="flex justify-between gap-4 text-rose-300">
                                                <span>Expense:</span> <span>{formatCurrency(item.expense, settings)}</span>
                                            </p>
                                            {isTarget && (
                                                <p className="text-[10px] text-gray-400 italic pt-1">
                                                    *Based on Safe Baseline
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
