import React from 'react';
import { Home, Heart, Plane } from 'lucide-react';
import { useSettings } from '../utils/SettingsContext';
import { formatCurrency } from '../utils/currencyUtils';

/**
 * CREATED: 02-Feb-2026
 * Budget Health Circular - Variation A: Modern Cards with Circular Gauges
 * Stacked cards with circular progress indicators
 */

const BudgetHealthCircular = ({ budgets }) => {
    const { settings } = useSettings();

    const getBudgetIcon = (budget) => {
        if (budget.systemBudgetType === 'needs') return Home;
        if (budget.systemBudgetType === 'wants') return Heart;
        return Plane;
    };

    const getBorderColor = (budget) => {
        if (budget.systemBudgetType === 'needs') return 'border-cyan-500/50';
        if (budget.systemBudgetType === 'wants') return 'border-purple-500/50';
        return 'border-orange-500/50';
    };

    const getCircleColor = (budget) => {
        if (budget.systemBudgetType === 'needs') return 'stroke-cyan-400';
        if (budget.systemBudgetType === 'wants') return 'stroke-purple-500';
        return 'stroke-orange-500';
    };

    const getBudgetLabel = (budget) => {
        if (budget.systemBudgetType === 'needs') return 'Needs';
        if (budget.systemBudgetType === 'wants') return 'Wants';
        return `Custom (${budget.name})`;
    };

    const calculatePercentage = (spent, total) => {
        if (!total) return 0;
        return Math.round((spent / total) * 100);
    };

    return (
        <div className="w-full max-w-sm bg-[#1a1d29] p-6 rounded-2xl space-y-4">
            {budgets.map((budget) => {
                const Icon = getBudgetIcon(budget);
                const spent = budget.spent || 0;
                const total = budget.allocatedAmount || budget.budgetAmount || 0;
                const remaining = total - spent;
                const percentage = calculatePercentage(spent, total);

                const radius = 40;
                const circumference = 2 * Math.PI * radius;
                const offset = circumference - (percentage / 100) * circumference;

                return (
                    <div
                        key={budget.id}
                        className={`bg-[#252838] rounded-2xl p-5 border-2 ${getBorderColor(budget)} shadow-lg`}
                    >
                        <div className="flex items-center justify-between">
                            {/* Left: Circular Progress */}
                            <div className="relative w-24 h-24 flex-shrink-0">
                                <svg className="transform -rotate-90 w-24 h-24">
                                    {/* Background Circle */}
                                    <circle
                                        cx="48"
                                        cy="48"
                                        r={radius}
                                        stroke="rgba(255,255,255,0.1)"
                                        strokeWidth="8"
                                        fill="none"
                                    />
                                    {/* Progress Circle */}
                                    <circle
                                        cx="48"
                                        cy="48"
                                        r={radius}
                                        className={getCircleColor(budget)}
                                        strokeWidth="8"
                                        fill="none"
                                        strokeDasharray={circumference}
                                        strokeDashoffset={offset}
                                        strokeLinecap="round"
                                        style={{ transition: 'stroke-dashoffset 0.3s ease' }}
                                    />
                                </svg>
                                {/* Percentage Text */}
                                <div className="absolute inset-0 flex items-center justify-center">
                                    <span className="text-white text-lg font-bold">{percentage}%</span>
                                </div>
                            </div>

                            {/* Right: Budget Details */}
                            <div className="flex-1 ml-5">
                                <div className="flex items-center justify-between mb-2">
                                    <h3 className="text-white font-semibold text-base">{getBudgetLabel(budget)}</h3>
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

            {/* Label */}
            <div className="text-center text-gray-400 text-sm mt-6">
                <p className="font-semibold">Variation A</p>
                <p className="text-xs">Modern Cards with Circular Gauges</p>
            </div>
        </div>
    );
};

export default BudgetHealthCircular;