import React from "react";
import { useSettings } from "../components/utils/SettingsContext";
import { usePeriod } from "../components/hooks/usePeriod";
import { useTransactions, useCategories, useGoals } from "../components/hooks/useBase44Entities";
import { useMonthlyTransactions, useMonthlyIncome } from "../components/hooks/useDerivedData";
import MonthlyBreakdown from "../components/reports/MonthlyBreakdown";
import PriorityChart from "../components/reports/PriorityChart";
import TrendChart from "../components/reports/TrendChart";
import ProjectionChart from "../components/reports/ProjectionChart";
import ReportStats from "../components/reports/ReportStats";

export default function Reports() {
    const { user, settings } = useSettings();

    // Period management
    const {
        selectedMonth,
        setSelectedMonth,
        selectedYear,
        setSelectedYear,
        displayDate,
        monthStart,
        monthEnd
    } = usePeriod();

    // Data fetching
    const { transactions, isLoading: loadingTransactions } = useTransactions();
    const { categories, isLoading: loadingCategories } = useCategories();
    const { goals, isLoading: loadingGoals } = useGoals(user);

    // Derived data
    const monthlyTransactions = useMonthlyTransactions(transactions, selectedMonth, selectedYear);
    const monthlyIncome = useMonthlyIncome(transactions, selectedMonth, selectedYear);

    const isLoading = loadingTransactions || loadingCategories || loadingGoals;

    return (
        <div className="min-h-screen px-4 md:px-8 pb-4 md:pb-8 pt-2 md:pt-4">
            <div className="max-w-7xl mx-auto space-y-8">
                {/* Header Section */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 mb-4">
                    <div>
                        <h1 className="text-3xl md:text-4xl font-bold text-gray-900">Financial Reports</h1>
                        <p className="text-gray-500 mt-1">
                            Performance analysis for {displayDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                        </p>
                    </div>
                </div>

                {/* 1. High-Level KPIs (New) */}
                <ReportStats
                    transactions={monthlyTransactions}
                    monthlyIncome={monthlyIncome}
                    isLoading={isLoading}
                    settings={settings}
                    startDate={monthStart}
                    endDate={monthEnd}
                />

                {/* 2. Historical Context & Future Projection */}
                <div className="grid lg:grid-cols-2 gap-8">
                    <TrendChart
                        allTransactions={transactions}
                        currentMonth={selectedMonth}
                        currentYear={selectedYear}
                        settings={settings}
                        setSelectedMonth={setSelectedMonth}
                        setSelectedYear={setSelectedYear}
                    />
                    <ProjectionChart
                        transactions={transactions}
                        categories={categories}
                        settings={settings}
                    />
                </div>

                {/* 3. Detailed Breakdown & Goals */}
                <div className="grid lg:grid-cols-3 gap-8">
                    <div className="lg:col-span-2 h-full">

                        <MonthlyBreakdown
                            transactions={monthlyTransactions}
                            categories={categories}
                            monthlyIncome={monthlyIncome}
                            isLoading={isLoading}
                        />
                    </div>
                    <div className="lg:col-span-1 h-full">
                        <PriorityChart
                            transactions={monthlyTransactions}
                            categories={categories}
                            goals={goals}
                            monthlyIncome={monthlyIncome}
                            isLoading={isLoading}
                        />

                    </div>
                </div>
            </div>
        </div>
    );
}