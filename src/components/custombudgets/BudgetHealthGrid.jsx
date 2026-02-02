import React from 'react';
import { useSettings } from '../utils/SettingsContext';
import { formatCurrency } from '../utils/currencyUtils';

/**
 * CREATED: 02-Feb-2026
 * Budget Health Grid - Variation C: Minimalist Data Grid with Background Fill
 * Grid layout with gradient background fills
 */

const BudgetHealthGrid = ({ budgets }) => {
    const { settings } = useSettings();

    const getBackgroundGradient = (budget) => {
        if (budget.systemBudgetType === 'needs') return 'bg-gradient-to-br from-cyan-600 to-cyan-700';
        if (budget.systemBudgetType === 'wants') return 'bg-gradient-to-br from-purple-600 to-purple-700';
        return 'bg-gradient-to-br from-orange-600 to-orange-700';
    };

    const getBudgetLabel = (budget) => {
        if (budget.systemBudgetType === 'needs') return 'Needs';
        if (budget.systemBudgetType === 'wants') return 'Wants';
        return budget.name || 'Trip';
    };

    return (
        <div className="w-full max-w-lg bg-[#1a1d29] p-6 rounded-2xl">
            {/* Grid */}
            <div className="grid grid-cols-2 gap-4">
                {budgets.map((budget) => {
                    const spent = budget.spent || 0;
                    const total = budget.allocatedAmount || budget.budgetAmount || 0;
                    const remaining = total - spent;

                    return (
                        <div
                            key={budget.id}
                            className={`${getBackgroundGradient(budget)} rounded-xl p-6 border border-gray-600/30 shadow-lg`}
                        >
                            <div className="text-white text-center">
                                <div className="text-3xl font-bold mb-2">
                                    {formatCurrency(remaining, settings)}
                                </div>
                                <p className="text-white/80 text-sm">
                                    Remaining in {getBudgetLabel(budget)}
                                </p>
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Label */}
            <div className="text-center text-gray-400 text-sm mt-6">
                <p className="font-semibold">Variation C</p>
                <p className="text-xs">Minimalist Data Grid with Background Fill</p>
            </div>
        </div>
    );
};

export default BudgetHealthGrid;