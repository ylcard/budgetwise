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

const BudgetHealthCompact = ({ budget, transactions, settings }) => {

  const getBarColor = (budget) => {
    return budget.color || 'hsl(var(--primary))';
  };

  const getGlowColor = (budget) => {
    return budget.color || 'hsl(var(--primary))';
  };

  const spent = budget.calculatedPaid || 0;
  const total = budget.calculatedTotal || 0;
  const remaining = total - spent;
  const percentage = total > 0 ? Math.round((spent / total) * 100) : 0;

  return (
    <div className="bg-card h-full rounded-xl p-4 border border-border shadow-sm flex flex-col justify-center min-h-[120px]">
      {/* Header */}
      <div className="flex items-center gap-3 mb-3">
        <Link
          to={`/BudgetDetail?id=${budget.id}`}
          state={{ from: '/Dashboard' }}
          className="text-foreground font-semibold text-base cursor-pointer hover:opacity-80 transition-opacity truncate"
          title={budget.name}
        >
          {budget.name}
        </Link>
      </div>

      {/* Progress Bar */}
      <div className="relative mb-2">
        <div className="bg-muted rounded-full h-6 overflow-hidden shadow-inner border border-border/50">
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
        <span className="text-muted-foreground">
          {percentage}% used ({formatCurrency(spent, settings)})
        </span>
        <span className="text-muted-foreground">
          {formatCurrency(remaining, settings)} left
        </span>
      </div>
    </div>
  );
};

export default BudgetHealthCompact;