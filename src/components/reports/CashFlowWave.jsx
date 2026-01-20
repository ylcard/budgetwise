import { useMemo } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { formatCurrency } from "../utils/currencyUtils";
import { estimateCurrentMonth } from "../utils/projectionUtils";
import { getMonthBoundaries } from "../utils/dateUtils";
import { getMonthlyIncome, getMonthlyPaidExpenses, isTransactionInDateRange } from "../utils/financialCalculations";
import { useTransactions } from "../hooks/useBase44Entities";
import { TrendingUp, TrendingDown, Loader2 } from "lucide-react";
import InfoTooltip from "@/components/ui/InfoTooltip";
import {
    ComposedChart,
    Area,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    ReferenceLine,
    Legend
} from "recharts";

export default function CashFlowWave({ settings }) {
    const today = useMemo(() => new Date(), []);

    // 1. Independent Window: 6 Months Back -> END of Current Month
    const horizonWindow = useMemo(() => {
        const start = new Date(today.getFullYear(), today.getMonth() - 6, 1);
        const endOfCurrentMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);
        return {
            from: start.toISOString().split('T')[0],
            to: endOfCurrentMonth.toISOString().split('T')[0]
        };
    }, [today]);

    // 2. Fetch data
    const { transactions, isLoading } = useTransactions(horizonWindow.from, horizonWindow.to);

    const { data, sixMonthAvg, currentNet, isPositive } = useMemo(() => {
        if (isLoading || !transactions || transactions.length === 0) {
            return { data: [], sixMonthAvg: 0, currentNet: 0, isPositive: true };
        }

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

        // --- 1. LAST MONTH (Actuals) ---
        const lastMonthDate = new Date(today.getFullYear(), today.getMonth() - 1, 1);
        const lastBoundaries = getMonthBoundaries(lastMonthDate.getMonth(), lastMonthDate.getFullYear());
        const lastIncome = transactions
            .filter(t => t.type === 'income' && isTransactionInDateRange(t, lastBoundaries.monthStart, lastBoundaries.monthEnd))
            .reduce((sum, t) => sum + t.amount, 0);
        const lastExpenses = Math.abs(getMonthlyPaidExpenses(transactions, lastBoundaries.monthStart, lastBoundaries.monthEnd));
        const lastNet = lastIncome - lastExpenses;

        // --- 2. THIS MONTH (Full Month Projection) ---
        const currentBoundaries = getMonthBoundaries(today.getMonth(), today.getFullYear());
        const currentMonthTransactions = transactions.filter(t =>
            isTransactionInDateRange(t, currentBoundaries.monthStart, currentBoundaries.monthEnd)
        );

        const currentIncome = currentMonthTransactions
            .filter(t => t.type === 'income')
            .reduce((sum, t) => sum + t.amount, 0);

        const currentExpenseProj = estimateCurrentMonth(currentMonthTransactions, safeBaseline).total;
        const currentNetCalc = currentIncome - currentExpenseProj;

        // --- 3. NEXT MONTH (Target) ---
        const nextIncome = lastIncome;
        const nextExpense = safeBaseline;
        const nextNet = nextIncome - nextExpense;

        const chartData = [
            {
                month: lastMonthDate.toLocaleDateString('en-US', { month: 'short' }),
                income: lastIncome,
                expense: lastExpenses,
                netFlow: lastNet,
                type: 'history'
            },
            {
                month: 'This Month',
                income: currentIncome,
                expense: currentExpenseProj,
                netFlow: currentNetCalc,
                type: 'current'
            },
            {
                month: 'Next',
                income: nextIncome,
                expense: nextExpense,
                netFlow: nextNet,
                type: 'projection'
            }
        ];

        return {
            data: chartData,
            sixMonthAvg: safeBaseline,
            currentNet: currentNetCalc,
            isPositive: currentNetCalc >= 0
        };
    }, [transactions, isLoading, today]);

    if (isLoading || data.length < 3) {
        return (
            <Card className="border-none shadow-sm h-full flex items-center justify-center min-h-[300px]">
                <Loader2 className="w-8 h-8 animate-spin text-gray-300" />
            </Card>
        );
    }

    // Custom Tooltip
    const CustomTooltip = ({ active, payload }) => {
        if (!active || !payload || !payload.length) return null;

        const data = payload[0].payload;
        const isProjection = data.type === 'projection';

        return (
            <div className="bg-gray-900 text-white text-xs p-3 rounded-lg shadow-xl">
                <p className="font-bold mb-2 border-b border-gray-700 pb-2">{data.month}</p>
                <div className="space-y-1.5">
                    <div className="flex justify-between gap-6">
                        <span className="text-emerald-300">Income:</span>
                        <span className="font-semibold">{formatCurrency(data.income, settings)}</span>
                    </div>
                    <div className="flex justify-between gap-6">
                        <span className="text-rose-300">Expense:</span>
                        <span className="font-semibold">{formatCurrency(data.expense, settings)}</span>
                    </div>
                    <div className="flex justify-between gap-6 pt-1 border-t border-gray-700">
                        <span className={data.netFlow >= 0 ? 'text-emerald-400' : 'text-rose-400'}>Net Flow:</span>
                        <span className="font-bold">{formatCurrency(data.netFlow, settings)}</span>
                    </div>
                    {isProjection && (
                        <p className="text-[10px] text-gray-400 italic pt-1">
                            *Based on 6-month baseline
                        </p>
                    )}
                </div>
            </div>
        );
    };

    // Custom Bar Shape for dashed projection bars
    const CustomBar = (props) => {
        const { fill, x, y, width, height, payload } = props;
        
        if (payload.type === 'projection') {
            // Dashed pattern for projection
            return (
                <g>
                    <defs>
                        <pattern
                            id={`dash-${payload.month}`}
                            patternUnits="userSpaceOnUse"
                            width="4"
                            height="4"
                            patternTransform="rotate(45)"
                        >
                            <rect width="2" height="4" fill={fill} />
                        </pattern>
                    </defs>
                    <rect
                        x={x}
                        y={y}
                        width={width}
                        height={height}
                        fill={`url(#dash-${payload.month})`}
                        stroke={fill}
                        strokeWidth={1.5}
                        strokeDasharray="4 2"
                        opacity={0.7}
                    />
                </g>
            );
        }

        // Solid bar for history
        return <rect x={x} y={y} width={width} height={height} fill={fill} />;
    };

    return (
        <Card className="border-none shadow-sm h-full flex flex-col">
            <CardHeader className="pb-2 flex-none">
                <div className="flex items-center justify-between">
                    <CardTitle className="text-lg font-semibold text-gray-800">
                        Cash Flow Wave
                        <InfoTooltip
                            title="Cash Flow Wave"
                            description="Visualizes your income and expenses as flowing rivers, with net cash flow shown as bars. Green bars indicate savings, red bars show deficits. Dashed areas represent projections based on your 6-month spending baseline."
                            wikiUrl="https://en.wikipedia.org/wiki/Cash_flow"
                        />
                    </CardTitle>
                    <div className={`flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium ${isPositive ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>
                        {isPositive ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                        {isPositive ? 'Savings Projected' : 'Overspend Risk'}
                    </div>
                </div>
                <p className="text-sm text-gray-500">
                    {isPositive
                        ? `On track to save ${formatCurrency(currentNet, settings)} this month.`
                        : `Projected to overspend by ${formatCurrency(Math.abs(currentNet), settings)}.`}
                </p>
            </CardHeader>
            <CardContent className="flex-1 min-h-0">
                <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart
                        data={data}
                        margin={{ top: 20, right: 20, bottom: 20, left: 20 }}
                    >
                        <defs>
                            {/* Gradient for Income Area */}
                            <linearGradient id="incomeGradient" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                                <stop offset="95%" stopColor="#10b981" stopOpacity={0.05} />
                            </linearGradient>
                            {/* Gradient for Expense Area */}
                            <linearGradient id="expenseGradient" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3} />
                                <stop offset="95%" stopColor="#ef4444" stopOpacity={0.05} />
                            </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                        <XAxis
                            dataKey="month"
                            stroke="#9ca3af"
                            fontSize={12}
                            fontWeight={500}
                        />
                        <YAxis
                            stroke="#9ca3af"
                            fontSize={11}
                            tickFormatter={(value) => `${settings.currencySymbol}${(value / 1000).toFixed(0)}k`}
                        />
                        <Tooltip content={<CustomTooltip />} />
                        <Legend
                            verticalAlign="top"
                            height={36}
                            iconType="line"
                            wrapperStyle={{ fontSize: '11px', paddingBottom: '10px' }}
                        />

                        {/* Reference Line for 6-Month Average */}
                        <ReferenceLine
                            y={sixMonthAvg}
                            stroke="#9ca3af"
                            strokeDasharray="5 5"
                            strokeWidth={1.5}
                            label={{
                                value: '6M Avg',
                                position: 'right',
                                fill: '#6b7280',
                                fontSize: 10
                            }}
                        />

                        {/* Income River (Area behind bars) */}
                        <Area
                            type="monotone"
                            dataKey="income"
                            stroke="#10b981"
                            strokeWidth={2}
                            fill="url(#incomeGradient)"
                            name="Income"
                            strokeDasharray={(entry) => entry.type === 'projection' ? '5 5' : '0'}
                        />

                        {/* Expense River (Area behind bars) */}
                        <Area
                            type="monotone"
                            dataKey="expense"
                            stroke="#ef4444"
                            strokeWidth={2}
                            fill="url(#expenseGradient)"
                            name="Expense"
                            strokeDasharray={(entry) => entry.type === 'projection' ? '5 5' : '0'}
                        />

                        {/* Net Flow Bars (Main focus) */}
                        <Bar
                            dataKey="netFlow"
                            fill="#8884d8"
                            name="Net Flow"
                            radius={[4, 4, 0, 0]}
                            shape={<CustomBar />}
                        >
                            {data.map((entry, index) => (
                                <Bar
                                    key={`bar-${index}`}
                                    fill={entry.netFlow >= 0 ? '#10b981' : '#ef4444'}
                                />
                            ))}
                        </Bar>
                    </ComposedChart>
                </ResponsiveContainer>
            </CardContent>
        </Card>
    );
}

// CREATED: 20-Jan-2026
// Replaces ProjectionChart with a fluid, interactive visualization using recharts
// Features:
// - Net Flow Bars: Green (savings) vs Red (deficit)
// - Income/Expense Rivers: Smooth area charts showing the gap
// - Visual Separation: Solid lines/bars for history, dashed for projections
// - Interactive tooltips with detailed breakdown
// - 6-month average reference line