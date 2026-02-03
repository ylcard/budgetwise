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
 * Budget Health Circular - Variation A: Modern Cards with Circular Gauges
 * Stacked cards with circular progress indicators
 */

import { useMemo } from 'react';
import { getCustomBudgetStats } from '../utils/financialCalculations';

const BudgetHealthCircular = ({ budgets, transactions, settings }) => {
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

    const getBorderColor = (budget) => {
        if (budget.systemBudgetType === 'needs') return 'border-cyan-500/50';
        if (budget.systemBudgetType === 'wants') return 'border-purple-500/50';
        // UPDATED 03-Feb-2026: Use custom budget color instead of default orange
        return budget.color ? `border-[${budget.color}]/50` : 'border-orange-500/50';
    };

    const getCircleColor = (budget) => {
        if (budget.systemBudgetType === 'needs') return 'stroke-cyan-400';
        if (budget.systemBudgetType === 'wants') return 'stroke-purple-500';
        // UPDATED 03-Feb-2026: Use custom budget color instead of default orange
        return budget.color || '#F97316'; // orange-500
    };

    // UPDATED 02-Feb-2026: Removed parenthetical labels, just use budget name
    const getBudgetLabel = (budget) => {
        if (budget.systemBudgetType === 'needs') return 'Needs';
        if (budget.systemBudgetType === 'wants') return 'Wants';
        return budget.name || 'Custom';
    };

    const calculatePercentage = (spent, total) => {
        if (!total) return 0;
        return Math.round((spent / total) * 100);
    };

    return (
        <div className="w-full max-w-sm bg-[#1a1d29] p-6 rounded-2xl space-y-4">
            {budgetsWithStats.map((budget) => {
                const Icon = getBudgetIcon(budget);
                const spent = budget.stats.spent || 0;
                const total = budget.allocatedAmount || 0;
                const remaining = total - spent;
                const percentage = calculatePercentage(spent, total);

                // UPDATED 02-Feb-2026: Changed to semi-circle (speedometer style)
                const radius = 40;
                const circumference = Math.PI * radius; // Half circle
                const offset = circumference - (percentage / 100) * circumference;

                return (
                    <div
                        key={budget.id}
                        className={`bg-[#252838] rounded-2xl p-5 border-2 ${getBorderColor(budget)} shadow-lg`}
                    >
                        <div className="flex items-center justify-between">
                            {/* Left: Semi-Circular Progress (Speedometer Style) */}
                            <div className="relative w-24 h-16 flex-shrink-0">
                                <svg className="w-24 h-16" viewBox="0 0 96 60">
                                    {/* Background Semi-Circle */}
                                    <path
                                        d="M 8 56 A 40 40 0 0 1 88 56"
                                        stroke="rgba(255,255,255,0.1)"
                                        strokeWidth="8"
                                        fill="none"
                                        strokeLinecap="round"
                                    />
                                    {/* Progress Semi-Circle */}
                                    <path
                                        d="M 8 56 A 40 40 0 0 1 88 56"
                                        stroke={budget.systemBudgetType ? undefined : getCircleColor(budget)}
                                        className={budget.systemBudgetType ? getCircleColor(budget) : undefined}
                                        strokeWidth="8"
                                        fill="none"
                                        strokeDasharray={circumference}
                                        strokeDashoffset={offset}
                                        strokeLinecap="round"
                                        style={{ transition: 'stroke-dashoffset 0.3s ease' }}
                                    />
                                </svg>
                                {/* Percentage Text */}
                                <div className="absolute inset-0 flex items-center justify-center pt-2">
                                    <span className="text-white text-lg font-bold">{percentage}%</span>
                                </div>
                            </div>

                            {/* Right: Budget Details */}
                            <div className="flex-1 ml-5">
                                <div className="flex items-center justify-between mb-2">
                                    <Link 
                                        to={`/BudgetDetail?id=${budget.id}`}
                                        state={{ from: '/Dashboard' }}
                                        className="text-white font-semibold text-base cursor-pointer hover:opacity-80 transition-opacity"
                                    >
                                        {getBudgetLabel(budget)}
                                    </Link>
                                    <Icon className="w-5 h-5 text-gray-400" />
                                </div>
                                <div className="text-white text-3xl font-bold mb-1">
                                    {formatCurrency(remaining, settings)}
                                </div>
                                <p className="text-gray-400 text-xs">Remaining</p>
                                <p className="text-gray-500 text-xs mt-2">
                                    {formatCurrency(spent, settings)} / {formatCurrency(total, settings)}
                                </p>
                            </div>
                        </div>
                    </div>
                );
            })}

            {/* COMMENTED OUT 02-Feb-2026: Removed variation label per user request
            <div className="text-center text-gray-400 text-sm mt-6">
                <p className="font-semibold">Variation A</p>
                <p className="text-xs">Modern Cards with Circular Gauges</p>
            </div>
            */}
        </div>
    );
};

export default BudgetHealthCircular;