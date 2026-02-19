import React from 'react';
import { formatCurrency } from '../utils/currencyUtils';
import { Link } from 'react-router-dom';

/**
 * CREATED: 02-Feb-2026
 * UPDATED: 03-Feb-2026 - Refactored to single-item component for Grid layout
 * Budget Health Circular - Variation A: Modern Cards with Circular Gauges
 * Stacked cards with circular progress indicators
 */

import { useMemo } from 'react';

const BudgetHealthCircular = ({ budget, transactions, settings }) => {

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

    const spent = budget.calculatedPaid || 0;
    const total = budget.calculatedTotal || 0;
    const remaining = total - spent;
    const percentage = total > 0 ? Math.round((spent / total) * 100) : 0;

    // UPDATED 02-Feb-2026: Changed to semi-circle (speedometer style)
    const radius = 40;
    const circumference = Math.PI * radius; // Half circle
    const offset = circumference - (percentage / 100) * circumference;

    return (
        <div
            className={`bg-white h-full rounded-2xl p-4 border border-gray-200 shadow-sm flex flex-col items-center justify-between min-h-[180px]`}
        >
            {/* Header: Title Centered */}
            <div className="w-full relative flex justify-center mb-2 px-1">
                <Link
                    to={`/BudgetDetail?id=${budget.id}`}
                    state={{ from: '/Dashboard' }}
                    className="text-gray-900 font-semibold text-sm text-center truncate max-w-[85%] cursor-pointer hover:opacity-80 transition-opacity"
                    title={getBudgetLabel(budget)}
                >
                    {getBudgetLabel(budget)}
                </Link>
            </div>

            {/* Center: Semi-Circular Progress */}
            <div className="relative w-32 h-20 flex-shrink-0 my-1">
                <svg className="w-full h-full" viewBox="0 0 96 60">
                    {/* Background Semi-Circle */}
                    <path
                        d="M 8 56 A 40 40 0 0 1 88 56"
                        stroke="#E5E7EB"
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
                {/* Percentage Text: Aligned to bottom of arc */}
                <div className="absolute inset-0 flex items-end justify-center pb-1">
                    <span className="text-gray-900 text-xl font-bold">{percentage}%</span>
                </div>
            </div>
            {/* Bottom: Budget Details */}
            <div className="w-full text-center">
                <div className="text-gray-900 text-xl font-bold mb-1 truncate">
                    {formatCurrency(remaining, settings)}
                </div>
                <p className="text-gray-500 text-[10px] uppercase tracking-wider">Remaining</p>
                {/* Optional: Show spent/total if needed, or keep clean like Cards view */}
                <p className="text-gray-400 text-[10px] mt-1">
                    {formatCurrency(spent, settings)} / {formatCurrency(total, settings)}
                </p>
            </div>
        </div>
    );
};

export default BudgetHealthCircular;