import React from 'react';
import { Home, Heart, Plane } from 'lucide-react';
import { useSettings } from '../utils/SettingsContext';
import { formatCurrency } from '../utils/currencyUtils';
import { Link } from 'react-router-dom';
// COMMENTED OUT 03-Feb-2026: Replaced navigate with Link for proper routing
// import { useNavigate } from 'react-router-dom';
// import { createPageUrl } from '../../utils';

/**
 * CREATED: 02-Feb-2026
 * UPDATED: 03-Feb-2026 - Standardized to receive budgets + transactions
 * Budget Health Compact - Variation B: Compact List View with Stacked Bars
 * Horizontal bar-based list view
 */

import { useMemo } from 'react';
import { getCustomBudgetStats } from '../utils/financialCalculations';

const BudgetHealthCompact = ({ budgets, transactions, settings }) => {
    // COMMENTED OUT 03-Feb-2026: Replaced navigate with Link for proper routing
    // const navigate = useNavigate();

    // Calculate stats for all budgets
    const budgetsWithStats = useMemo(() => {
        return budgets.map(budget => {
            const budgetTransactions = transactions.filter(t => t.customBudgetId === budget.id);
            const stats = getCustomBudgetStats(budget, budgetTransactions);
            return { ...budget, stats };
        });
    }, [budgets, transactions]);

    const getBudgetIcon = (budget) => {
        if (budget.systemBudgetType === 'needs') return Home;
        if (budget.systemBudgetType === 'wants') return Heart;
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

    return (
        <div className="w-full max-w-md bg-[#1a1d29] p-6 rounded-2xl">
            <div className="space-y-6">
                {budgetsWithStats.map((budget) => {
                    const Icon = getBudgetIcon(budget);
                    const spent = budget.stats.spent || 0;
                    const total = budget.allocatedAmount || 0;
                    const remaining = total - spent;
                    const percentage = calculatePercentage(spent, total);

                    return (
                        <div key={budget.id} className="bg-[#252838] rounded-xl p-4 border border-gray-700/50">
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
                                    className="text-white font-semibold text-base cursor-pointer hover:opacity-80 transition-opacity"
                                >
                                    {getBudgetLabel(budget)}
                                </Link>
                            </div>

                            {/* Progress Bar */}
                            <div className="relative mb-2">
                                <div className="bg-gray-700 rounded-full h-6 overflow-hidden">
                                    <div
                                        className={`h-full ${budget.systemBudgetType ? getBarGradient(budget) : ''} transition-all duration-300`}
                                        style={{ 
                                            width: `${percentage}%`,
                                            background: !budget.systemBudgetType ? getBarGradient(budget) : undefined
                                        }}
                                    />
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
                })}
            </div>

            {/* COMMENTED OUT 02-Feb-2026: Removed variation label per user request
            <div className="text-center text-gray-400 text-sm mt-6">
                <p className="font-semibold">Variation B</p>
                <p className="text-xs">Compact List View with Stacked Bars</p>
            </div>
            */}
        </div>
    );
};

export default BudgetHealthCompact;