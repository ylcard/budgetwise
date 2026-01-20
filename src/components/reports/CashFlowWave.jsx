import { memo, useMemo } from "react";
import {
    ComposedChart,
    Area,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
    ResponsiveContainer,
    ReferenceLine,
    Cell,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency } from "../utils/currencyUtils";
import { TrendingUp, TrendingDown } from "lucide-react";

/**
 * CashFlowWave Component
 * 
 * CREATED: 20-Jan-2026
 * 
 * A fluid, interactive visualization of cash flow over time.
 * 
 * Features:
 * - Net Flow Bars: Green for savings, Red for deficits (most prominent metric)
 * - Income & Expense Areas: Smooth "rivers" showing the gap between in/out
 * - Projection Separation: Visual distinction between historical (solid) vs projected (dashed) data
 * 
 * Props:
 * - data: Array of monthly data points with { month, income, expense, netFlow, isProjection }
 * - settings: User settings for currency formatting
 */

const CashFlowWave = memo(function CashFlowWave({ data = [], settings }) {
    // Calculate summary stats
    const stats = useMemo(() => {
        const historical = data.filter(d => !d.isProjection);
        const avgIncome = historical.reduce((sum, d) => sum + (d.income || 0), 0) / (historical.length || 1);
        const avgExpense = historical.reduce((sum, d) => sum + (d.expense || 0), 0) / (historical.length || 1);
        const totalNetFlow = historical.reduce((sum, d) => sum + (d.netFlow || 0), 0);

        return {
            avgIncome,
            avgExpense,
            totalNetFlow,
            isPositive: totalNetFlow >= 0,
        };
    }, [data]);

    // Custom tooltip
    const CustomTooltip = ({ active, payload, label }) => {
        if (!active || !payload || payload.length === 0) return null;

        const dataPoint = payload[0].payload;
        const isProjection = dataPoint.isProjection;

        return (
            <div className="bg-white/95 backdrop-blur-sm border border-gray-200 rounded-lg p-3 shadow-lg">
                <p className="font-semibold text-gray-900 mb-2">
                    {label}
                    {isProjection && (
                        <span className="ml-2 text-xs px-2 py-0.5 rounded-full bg-blue-100 text-blue-700">
                            Projected
                        </span>
                    )}
                </p>
                <div className="space-y-1 text-sm">
                    <div className="flex items-center justify-between gap-4">
                        <span className="text-green-600 font-medium">Income:</span>
                        <span className="font-semibold">{formatCurrency(dataPoint.income || 0, settings)}</span>
                    </div>
                    <div className="flex items-center justify-between gap-4">
                        <span className="text-red-600 font-medium">Expenses:</span>
                        <span className="font-semibold">{formatCurrency(dataPoint.expense || 0, settings)}</span>
                    </div>
                    <div className="border-t border-gray-200 pt-1 mt-1">
                        <div className="flex items-center justify-between gap-4">
                            <span className={`font-bold ${dataPoint.netFlow >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                Net Flow:
                            </span>
                            <span className={`font-bold ${dataPoint.netFlow >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                {formatCurrency(dataPoint.netFlow || 0, settings)}
                            </span>
                        </div>
                    </div>
                </div>
            </div>
        );
    };

    // Custom legend
    const CustomLegend = () => (
        <div className="flex items-center justify-center gap-6 mt-4 text-sm">
            <div className="flex items-center gap-2">
                <div className="w-4 h-3 bg-green-500/20 border-2 border-green-500 rounded" />
                <span className="text-gray-700">Income</span>
            </div>
            <div className="flex items-center gap-2">
                <div className="w-4 h-3 bg-red-500/20 border-2 border-red-500 rounded" />
                <span className="text-gray-700">Expenses</span>
            </div>
            <div className="flex items-center gap-2">
                <div className="w-4 h-3 bg-blue-600 rounded" />
                <span className="text-gray-700">Net Flow (Positive)</span>
            </div>
            <div className="flex items-center gap-2">
                <div className="w-4 h-3 bg-red-600 rounded" />
                <span className="text-gray-700">Net Flow (Negative)</span>
            </div>
            <div className="flex items-center gap-2">
                <div className="w-4 h-1 border-t-2 border-dashed border-gray-400" />
                <span className="text-gray-700">Projected</span>
            </div>
        </div>
    );

    if (!data || data.length === 0) {
        return (
            <Card className="border-none shadow-lg">
                <CardHeader>
                    <CardTitle>Cash Flow Wave</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="text-center py-12 text-gray-500">
                        No data available for visualization
                    </div>
                </CardContent>
            </Card>
        );
    }

    return (
        <Card className="border-none shadow-lg">
            <CardHeader>
                <div className="flex items-center justify-between">
                    <CardTitle>Cash Flow Wave</CardTitle>
                    <div className="flex items-center gap-4 text-sm">
                        <div className="flex items-center gap-2">
                            <TrendingUp className="w-4 h-4 text-green-600" />
                            <div>
                                <p className="text-xs text-gray-500">Avg Income</p>
                                <p className="font-semibold text-green-600">
                                    {formatCurrency(stats.avgIncome, settings)}
                                </p>
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            <TrendingDown className="w-4 h-4 text-red-600" />
                            <div>
                                <p className="text-xs text-gray-500">Avg Expenses</p>
                                <p className="font-semibold text-red-600">
                                    {formatCurrency(stats.avgExpense, settings)}
                                </p>
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className={`w-2 h-2 rounded-full ${stats.isPositive ? 'bg-green-600' : 'bg-red-600'}`} />
                            <div>
                                <p className="text-xs text-gray-500">Total Net</p>
                                <p className={`font-semibold ${stats.isPositive ? 'text-green-600' : 'text-red-600'}`}>
                                    {formatCurrency(stats.totalNetFlow, settings)}
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </CardHeader>
            <CardContent>
                <ResponsiveContainer width="100%" height={400}>
                    <ComposedChart
                        data={data}
                        margin={{ top: 20, right: 30, left: 20, bottom: 20 }}
                    >
                        <defs>
                            {/* Gradient for income area */}
                            <linearGradient id="incomeGradient" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#10b981" stopOpacity={0.2} />
                                <stop offset="50%" stopColor="#10b981" stopOpacity={0} />
                            </linearGradient>

                            {/* Gradient for expense area */}
                            <linearGradient id="expenseGradient" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#ef4444" stopOpacity={0.2} />
                                <stop offset="50%" stopColor="#ef4444" stopOpacity={0} />
                            </linearGradient>

                            {/* Pattern for projected areas */}
                            <pattern
                                id="projectionPattern"
                                patternUnits="userSpaceOnUse"
                                width="8"
                                height="8"
                                patternTransform="rotate(45)"
                            >
                                <line
                                    x1="0"
                                    y1="0"
                                    x2="0"
                                    y2="8"
                                    stroke="#94a3b8"
                                    strokeWidth="1"
                                    strokeDasharray="2,2"
                                />
                            </pattern>

                            {/* MASK: Fades the left and right edges so the "wall" disappears */}
                            <linearGradient id="fadeGradient" x1="0" y1="0" x2="1" y2="0">
                                <stop offset="0%" stopColor="white" stopOpacity={0} />
                                <stop offset="5%" stopColor="white" stopOpacity={1} />
                                <stop offset="95%" stopColor="white" stopOpacity={1} />
                                <stop offset="100%" stopColor="white" stopOpacity={0} />
                            </linearGradient>
                            <mask id="fadeMask">
                                <rect x="0" y="0" width="100%" height="100%" fill="url(#fadeGradient)" />
                            </mask>
                        </defs>

                        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />

                        <XAxis
                            dataKey="month"
                            tick={{ fill: '#6b7280', fontSize: 12 }}
                            tickLine={{ stroke: '#e5e7eb' }}
                            padding={{ left: 20, right: 20 }}
                        />

                        {/* AXIS 1: For NET FLOW (Bars) - Anchored to 0 */}
                        <YAxis
                            yAxisId="flow"
                            tick={{ fill: '#6b7280', fontSize: 12 }}
                            tickLine={{ stroke: '#e5e7eb' }}
                            tickCount={5}
                            tickFormatter={(value) => formatCurrency(value, settings)}
                        />

                        {/* AXIS 2: For TOTALS (Lines) - Hidden & Scaled to float higher */}
                        {/* 'domain' hack: We force the min value to be lower than 0 to push lines up */}
                        <YAxis
                            yAxisId="totals"
                            orientation="right"
                            hide={true}
                            domain={[dataMin => dataMin * 0.5, 'auto']} // Pushes curves up visually
                        />

                        <Tooltip content={<CustomTooltip />} />

                        {/* Zero reference line */}
                        <ReferenceLine yAxisId="flow" y={0} stroke="#4b5563" strokeWidth={1} strokeDasharray="3 3" />

                        {/* 1. BARS FIRST (Draws behind the lines/dots to prevent obscuring) */}
                        <Bar
                            yAxisId="flow"
                            dataKey="netFlow"
                            radius={[4, 4, 0, 0]}
                            maxBarSize={50}
                            isAnimationActive={true}
                            animationDuration={800}
                        >
                            {data.map((entry, index) => (
                                <Cell
                                    key={`bar-${index}`}
                                    fill={entry.netFlow >= 0 ? '#3b82f6' : '#ef4444'}
                                    fillOpacity={entry.isProjection ? 0.3 : 1}
                                    stroke={entry.isProjection ? (entry.netFlow >= 0 ? '#3b82f6' : '#ef4444') : 'none'}
                                    strokeWidth={entry.isProjection ? 2 : 0}
                                    strokeDasharray={entry.isProjection ? '4 4' : '0'}
                                />
                            ))}
                        </Bar>

                        {/* 2. AREAS LAST (Draws on top so dots align and stay visible) */}
                        <Area
                            yAxisId="totals"
                            type="monotone"
                            dataKey="income"
                            stroke="#10b981"
                            strokeWidth={3}
                            fill="url(#incomeGradient)"
                            fillOpacity={1}
                            mask="url(#fadeMask)"
                            activeDot={{ r: 6, strokeWidth: 0 }}
                            isAnimationActive={true}
                            animationDuration={1000}
                        />

                        <Area
                            yAxisId="totals"
                            type="monotone"
                            dataKey="expense"
                            stroke="#ef4444"
                            strokeWidth={3}
                            fill="url(#expenseGradient)"
                            fillOpacity={1}
                            mask="url(#fadeMask)"
                            activeDot={{ r: 6, strokeWidth: 0 }}
                            isAnimationActive={true}
                            animationDuration={1000}
                        />
                    </ComposedChart>
                </ResponsiveContainer>

                <CustomLegend />
            </CardContent>
        </Card>
    );
});

export default CashFlowWave;