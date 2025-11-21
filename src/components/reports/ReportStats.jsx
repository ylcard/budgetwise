import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { TrendingUp, TrendingDown, Wallet, ArrowUpRight, ArrowDownRight, Target, Calculator } from "lucide-react";
import { formatCurrency } from "../utils/currencyUtils";
import { getMonthlyPaidExpenses } from "../utils/financialCalculations";
import { estimateCurrentMonth } from "../utils/projectionUtils";
import { motion } from "framer-motion";

export default function ReportStats({
    transactions = [],
    monthlyIncome = 0,
    prevTransactions = [],
    prevMonthlyIncome = 0,
    isLoading,
    settings,
    safeBaseline = 0,
    startDate,
    endDate
}) {
    if (isLoading) {
        return (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {[1, 2, 3].map((i) => (
                    <div key={i} className="h-32 bg-gray-100 animate-pulse rounded-xl" />
                ))}
            </div>
        );
    }

    const totalPaidExpenses = Math.abs(getMonthlyPaidExpenses(transactions, startDate, endDate));
    const prevPaidExpenses = Math.abs(getMonthlyPaidExpenses(prevTransactions));

    const netFlow = monthlyIncome - totalPaidExpenses;
    const prevNetFlow = prevMonthlyIncome - prevPaidExpenses;

    const savingsRate = monthlyIncome > 0
        ? ((monthlyIncome - totalPaidExpenses) / monthlyIncome) * 100
        : 0;

    const prevSavingsRate = prevMonthlyIncome > 0
        ? ((prevMonthlyIncome - prevPaidExpenses) / prevMonthlyIncome) * 100
        : 0;

    const avgDailySpend = totalPaidExpenses / 30;

    // --- Analysis & Projection Logic ---
    const today = new Date();
    const isCurrentMonth = today.getMonth() === startDate.getMonth() && today.getFullYear() === startDate.getFullYear();

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
                                <span>Est. {formatCurrency(projectedNetFlow, settings)}</span>
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
                        <p className="text-sm font-medium text-gray-500">Avg. Daily Spend</p>
                        <motion.h3
                            initial={{ y: 5, opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            transition={{ delay: 0.2, duration: 0.5 }}
                            className="text-2xl font-bold mt-1 text-gray-900"
                        >
                            {formatCurrency(avgDailySpend, settings)}
                        </motion.h3>
                        {/* Projection Badge (Total Monthly Spend) */}
                        <div className="flex items-center gap-1 mt-2 text-xs font-medium text-gray-500">
                            <Calculator className="w-3 h-3" />
                            <span>Proj. Spend: {formatCurrency(projectedExpenses, settings)}</span>
                        </div>
                    </div>
                    <div className="mt-4 flex justify-center">
                        <div className="p-3 rounded-full bg-purple-100 text-purple-600">
                            <TrendingDown className="w-5 h-5" />
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}