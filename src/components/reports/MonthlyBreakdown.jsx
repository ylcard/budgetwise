
import React from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useSettings } from "../utils/SettingsContext";
import { useMonthlyBreakdown } from "../hooks/useDerivedData";
import { formatCurrency } from "../utils/currencyUtils";
import { getCategoryIcon } from "../utils/iconMapConfig";

export default function MonthlyBreakdown({ transactions, categories, monthlyIncome, isLoading }) {
    const { settings } = useSettings();

    // Use the extracted hook for calculations
    const { categoryBreakdown, totalExpenses } = useMonthlyBreakdown(transactions, categories, monthlyIncome);

    // SORTING: Ensure highest expenses are first (Top Left)
    const sortedBreakdown = [...categoryBreakdown].sort((a, b) => b.amount - a.amount);

    return (
        <Card className="w-full h-full border-none shadow-lg flex flex-col bg-white">
            {isLoading ? (
                <div className="p-6 space-y-6">
                    <div className="flex justify-between">
                        <Skeleton className="h-8 w-48" />
                        <Skeleton className="h-12 w-32" />
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                        {[...Array(8)].map((_, i) => (
                            <Skeleton key={i} className="h-28 rounded-2xl" />
                        ))}
                    </div>
                </div>
            ) : (
                <>
                    {/* Integrated Header - Replaces the floating black pill */}
                    <CardHeader className="pb-2 border-b border-gray-50">
                        <div className="flex justify-between items-center">
                            <div>
                                <CardTitle className="text-xl font-bold text-gray-900">Monthly Breakdown</CardTitle>
                                <p className="text-sm text-gray-500 mt-1">Overview by category</p>
                            </div>

                            {/* The "Fancier" Summary Section */}
                            <div className="flex items-center gap-6 bg-gray-50 px-4 py-2 rounded-lg border border-gray-100">
                                <div className="text-right">
                                    <p className="text-[10px] text-gray-500 uppercase font-bold tracking-wider">Total Income</p>
                                    <p className="text-sm font-bold text-gray-900">{formatCurrency(monthlyIncome, settings)}</p>
                                </div>
                                <div className="h-8 w-px bg-gray-300"></div>
                                <div className="text-right">
                                    <p className="text-[10px] text-gray-500 uppercase font-bold tracking-wider">Total Expenses</p>
                                    <p className="text-sm font-bold text-gray-900">{formatCurrency(totalExpenses, settings)}</p>
                                </div>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent className="pt-6 flex-1">
                        {sortedBreakdown.length === 0 ? (
                            <div className="h-full flex items-center justify-center text-gray-400 bg-gray-50 rounded-2xl border border-dashed border-gray-200 min-h-[200px]">
                                <p>No expenses to show yet</p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                                {sortedBreakdown.map((item) => {
                                    const IconComponent = getCategoryIcon(item.icon);
                                    return (
                                        <div
                                            key={item.id || item.name}
                                            className="group relative bg-white p-3 rounded-2xl border border-gray-100 hover:border-gray-200 hover:shadow-md transition-all duration-200 flex flex-col justify-between h-28 overflow-hidden"
                                        >
                                            {/* Top Row: Icon & Amount */}
                                            <div className="flex justify-between items-start mb-2">
                                                <div
                                                    className="p-2 rounded-xl transition-colors"
                                                    style={{ backgroundColor: `${item.color}15` }}
                                                >
                                                    <IconComponent size={18} strokeWidth={2.5} style={{ color: item.color }} />
                                                </div>
                                                <span className="font-bold text-gray-900 text-sm">
                                                    {formatCurrency(item.amount, settings)}
                                                </span>
                                            </div>
                                            {/* Bottom Row: Label & Stats */}
                                            <div>
                                                <h3 className="font-medium text-gray-700 text-sm mb-1 truncate" title={item.name}>
                                                    {item.name}
                                                </h3>

                                                {/* Progress Bar Background */}
                                                <div className="w-full bg-gray-100 h-1.5 rounded-full overflow-hidden flex mb-1.5">
                                                    <div
                                                        className="h-full rounded-full transition-all duration-500"
                                                        style={{
                                                            width: `${item.expensePercentage}%`,
                                                            backgroundColor: item.color
                                                        }}
                                                    />
                                                </div>

                                                <div className="flex justify-between items-center">
                                                    <p className="text-[10px] text-gray-500 font-medium" title="% of Total Expenses">
                                                        {item.expensePercentage.toFixed(1)}% <span className="text-gray-400 font-normal">of Exp</span>
                                                    </p>
                                                    <p className="text-[10px] text-gray-400" title="% of Total Income">
                                                        {item.percentage.toFixed(1)}% <span className="text-gray-300">of Inc</span>
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </CardContent>
                </>
            )}
        </Card >
    );
}
