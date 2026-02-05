import React from 'react';
import { formatCurrency } from '../utils/currencyUtils';
import { Link } from 'react-router-dom';

/**
 * CREATED: 02-Feb-2026
 * UPDATED: 03-Feb-2026 - Refactored to single-item component for Grid layout
 * Budget Health Compact - Variation B: Compact List View with Stacked Bars
 * Horizontal bar-based list view
 */

import { useMemo } from 'react';
import { getCustomBudgetStats } from '../utils/financialCalculations';

const BudgetHealthCompact = ({ budget, transactions, settings }) => {

    // Calculate stats for this specific budget
    const stats = useMemo(() => {
        const budgetTransactions = transactions.filter(t => t.budgetId === budget.id);
        return getCustomBudgetStats(budget, budgetTransactions);
    }, [budget, transactions]);

    const getBarColor = (budget) => {
        return budget.color || '#F97316';
    };

    const getGlowColor = (budget) => {
        return budget.color || '#F97316';
    };

    const calculatePercentage = (spent, total) => {
        if (!total) return 0;
        return Math.round((spent / total) * 100);
    };

    const spent = stats.spent || 0;
    const total = budget.allocatedAmount || 0;
    const remaining = total - spent;
    const percentage = calculatePercentage(spent, total)

    return (
        <div className="bg-white h-full rounded-xl p-4 border border-gray-200 shadow-sm flex flex-col justify-center min-h-[120px]">
            {/* Header */}
            <div className="flex items-center gap-3 mb-3">
                <Link
                    to={`/BudgetDetail?id=${budget.id}`}
                    state={{ from: '/Dashboard' }}
                    className="text-gray-900 font-semibold text-base cursor-pointer hover:opacity-80 transition-opacity truncate"
                    title={budget.name}
                >
                    {budget.name}
                </Link>
            </div>

            {/* Progress Bar */}
            <div className="relative mb-2">
                <div className="bg-gray-100 rounded-full h-6 overflow-hidden shadow-inner">
                    <div
                        className="h-full transition-all duration-500 relative"
                        style={{
                            width: `${percentage}%`,
                            background: getBarColor(budget),
                            boxShadow: `0 0 10px 1px ${getGlowColor(budget)}50`
                        }}
                    >
                        {/* Top Gloss Sheen */}
                        <div className="absolute inset-x-0 top-0 h-[40%] bg-gradient-to-b from-white/30 to-transparent" />
                        {/* Leading Spark Edge */}
                        <div className="absolute right-0 top-0 bottom-0 w-[1.5px] bg-white/90 shadow-[0_0_6px_2px_rgba(255,255,255,0.8)]" />
                    </div>
                </div>
            </div>

            {/* Stats */}
            <div className="flex items-center justify-between text-xs">
                <span className="text-gray-500">
                    {percentage}% used ({formatCurrency(spent, settings)})
                </span>
                <span className="text-gray-500">
                    {formatCurrency(remaining, settings)} left
                </span>
            </div>
        </div>
    );
};

export default BudgetHealthCompact;