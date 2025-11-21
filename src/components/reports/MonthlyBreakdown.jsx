
import React from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { useSettings } from "../utils/SettingsContext";
import { useMonthlyBreakdown } from "../hooks/useDerivedData";
import { formatCurrency } from "../utils/currencyUtils";
import { getCategoryIcon } from "../utils/iconMapConfig";

export default function MonthlyBreakdown({ transactions, categories, monthlyIncome, isLoading }) {
    const { settings } = useSettings();

    // Use the extracted hook for calculations
    const { categoryBreakdown, totalExpenses } = useMonthlyBreakdown(transactions, categories, monthlyIncome);

    return (
        <div className="w-full">
            {isLoading ? (
                <div className="space-y-4">
                    <Skeleton className="h-16 w-full rounded-xl" />
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                        {[...Array(8)].map((_, i) => (
                            <Skeleton key={i} className="h-28 rounded-2xl" />
                        ))}
                    </div>
                </div>
            ) : (
                <>
                    {/* Header & Summary */}
                    <div className="flex flex-col md:flex-row justify-between items-end mb-6 gap-4 px-1">
                        <div>
                            <h2 className="text-lg font-bold text-gray-900">Monthly Breakdown</h2>
                            <p className="text-sm text-gray-500">Overview by category</p>
                        </div>

                        {/* Compact Summary Pill */}
                        <div className="flex items-center gap-4 sm:gap-6 bg-gray-900 text-white px-4 py-2.5 rounded-xl shadow-md text-sm sm:text-base">
                            <div>
                                <p className="text-[10px] uppercase tracking-wider opacity-70">Income</p>
                                <p className="font-semibold">{formatCurrency(monthlyIncome, settings)}</p>
                            </div>
                            <div className="h-8 w-px bg-white/20"></div>
                            <div>
                                <p className="text-[10px] uppercase tracking-wider opacity-70">Expenses</p>
                                <p className="font-semibold">{formatCurrency(totalExpenses, settings)}</p>
                            </div>
                        </div>
                    </div>
                    {/* Bento Grid Layout */}
                    {categoryBreakdown.length === 0 ? (
                        <div className="h-40 flex items-center justify-center text-gray-400 bg-gray-50 rounded-2xl border border-dashed border-gray-200">
                            <p>No expenses to show yet</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                            {categoryBreakdown.map((item) => {
                                const IconComponent = getCategoryIcon(item.icon);
                                return (
                                    <div
                                        key={item.id || item.name}
                                        className="group relative bg-white p-3 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-all duration-200 flex flex-col justify-between h-28 overflow-hidden"
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
                                                <p className="text-[10px] text-gray-500 font-medium">
                                                    {item.expensePercentage.toFixed(1)}% <span className="text-gray-300">exp</span>
                                                </p>
                                                <p className="text-[10px] text-gray-400">
                                                    {item.percentage.toFixed(1)}% <span className="text-gray-300">inc</span>
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </>
            )}
        </div>
    );
}