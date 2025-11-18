import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { TrendingUp, TrendingDown, Wallet } from "lucide-react";
import { formatCurrency } from "../utils/currencyUtils";

export default function ReportStats({ transactions = [], monthlyIncome = 0, isLoading, settings }) {
    if (isLoading) {
        return (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {[1, 2, 3].map((i) => (
                    <div key={i} className="h-32 bg-gray-100 animate-pulse rounded-xl" />
                ))}
            </div>
        );
    }

    const monthlyExpenses = transactions
        .filter(t => t.amount < 0)
        .reduce((acc, t) => acc + Math.abs(t.amount), 0);

    const netFlow = monthlyIncome - monthlyExpenses;

    const savingsRate = monthlyIncome > 0
        ? ((monthlyIncome - monthlyExpenses) / monthlyIncome) * 100
        : 0;

    const avgDailySpend = monthlyExpenses / 30;

    return (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="border-none shadow-sm">
                <CardContent className="p-6 flex items-center justify-between">
                    <div>
                        <p className="text-sm font-medium text-gray-500">Savings Rate</p>
                        <h3 className={`text-2xl font-bold mt-1 ${savingsRate >= 20 ? 'text-emerald-600' : savingsRate > 0 ? 'text-blue-600' : 'text-rose-600'}`}>
                            {savingsRate.toFixed(1)}%
                        </h3>
                    </div>
                    <div className={`p-3 rounded-full ${savingsRate >= 0 ? 'bg-emerald-100 text-emerald-600' : 'bg-rose-100 text-rose-600'}`}>
                        <TrendingUp className="w-5 h-5" />
                    </div>
                </CardContent>
            </Card>

            <Card className="border-none shadow-sm">
                <CardContent className="p-6 flex items-center justify-between">
                    <div>
                        <p className="text-sm font-medium text-gray-500">Net Flow</p>
                        <h3 className={`text-2xl font-bold mt-1 ${netFlow >= 0 ? 'text-gray-900' : 'text-rose-600'}`}>
                            {formatCurrency(netFlow, settings)}
                        </h3>
                    </div>
                    <div className="p-3 rounded-full bg-blue-100 text-blue-600">
                        <Wallet className="w-5 h-5" />
                    </div>
                </CardContent>
            </Card>

            <Card className="border-none shadow-sm">
                <CardContent className="p-6 flex items-center justify-between">
                    <div>
                        <p className="text-sm font-medium text-gray-500">Avg. Daily Spend</p>
                        <h3 className="text-2xl font-bold mt-1 text-gray-900">
                            {formatCurrency(avgDailySpend, settings)}
                        </h3>
                    </div>
                    <div className="p-3 rounded-full bg-purple-100 text-purple-600">
                        <TrendingDown className="w-5 h-5" />
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}