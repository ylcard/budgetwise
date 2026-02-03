import React from 'react';
import { Home, Heart, Plane } from 'lucide-react';
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
        const budgetTransactions = transactions.filter(t => t.customBudgetId === budget.id);
        return getCustomBudgetStats(budget, budgetTransactions);
    }, [budget, transactions]);

    const getBudgetIcon = (b) => {
        if (b.systemBudgetType === 'needs') return Home;
        if (b.systemBudgetType === 'wants') return Heart;
        return Plane;
    };

    const getBarGradient = (budget) => {
        if (budget.systemBudgetType === 'needs') return 'bg-gradient-to-r from-cyan-500 to-cyan-400';
        if (budget.systemBudgetType === 'wants') return 'bg-gradient-to-r from-purple-500 to-pink-500';
        // UPDATED 03-Feb-2026: Use custom budget color instead of default orange
        return budget.color || '#F97316'; // orange-500 as fallback
    };

    const getIconColor = (budget) => {
        if (budget.systemBudgetType === 'needs') return 'text-cyan-400';
        if (budget.systemBudgetType === 'wants') return 'text-purple-400';
        // UPDATED 03-Feb-2026: Use custom budget color instead of default orange
        return budget.color || '#FB923C'; // orange-400 as fallback
    };

    const getBudgetLabel = (budget) => {
        if (budget.systemBudgetType === 'needs') return 'Needs';
        if (budget.systemBudgetType === 'wants') return 'Wants';
        return budget.name || 'Trip';
    };

    const calculatePercentage = (spent, total) => {
        if (!total) return 0;
        return Math.round((spent / total) * 100);
    };

    const getGlowColor = (budget) => {
        if (budget.systemBudgetType === 'needs') return '#22d3ee'; // cyan-400 equivalent
        if (budget.systemBudgetType === 'wants') return '#e879f9'; // purple-400 equivalent
        return budget.color || '#F97316';
    };

    const Icon = getBudgetIcon(budget);
    const spent = stats.spent || 0;
    const total = budget.allocatedAmount || 0;
    const remaining = total - spent;
    const percentage = calculatePercentage(spent, total)

    return (
        <div className="bg-[#252838] h-full rounded-xl p-4 border border-gray-700/50 flex flex-col justify-center">
            {/* Header */}
            <div className="flex items-center gap-3 mb-3">
                <div
                    className={`w-8 h-8 rounded-lg bg-gray-700/50 flex items-center justify-center ${budget.systemBudgetType ? getIconColor(budget) : ''}`}
                    style={!budget.systemBudgetType ? { color: getIconColor(budget) } : {}}
                >
                    <Icon className="w-5 h-5" />
                </div>
                <Link
                    to={`/BudgetDetail?id=${budget.id}`}
                    state={{ from: '/Dashboard' }}
                    className="text-white font-semibold text-base cursor-pointer hover:opacity-80 transition-opacity truncate"
                >
                    {getBudgetLabel(budget)}
                </Link>
            </div>

            {/* Progress Bar */}
            <div className="relative mb-2">
                <div className="bg-gray-700/50 rounded-full h-6 overflow-hidden shadow-inner">
                    <div
                        className={`h-full ${budget.systemBudgetType ? getBarGradient(budget) : ''} transition-all duration-500 relative`}
                        style={{
                            width: `${percentage}%`,
                            background: !budget.systemBudgetType ? getBarGradient(budget) : undefined,
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
                <span className="text-gray-400">
                    {percentage}% used ({formatCurrency(spent, settings)})
                </span>
                <span className="text-gray-400">
                    {formatCurrency(remaining, settings)} left
                </span>
            </div>
        </div>
    );
};

export default BudgetHealthCompact;