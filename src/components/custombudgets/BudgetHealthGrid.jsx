import React from 'react';
import { useSettings } from '../utils/SettingsContext';
import { formatCurrency } from '../utils/currencyUtils';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '../../utils';

/**
 * CREATED: 02-Feb-2026
 * Budget Health Grid - Variation C: Minimalist Data Grid with Background Fill
 * Grid layout with gradient background fills
 */

const BudgetHealthGrid = ({ budgets }) => {
    const { settings } = useSettings();
    const navigate = useNavigate();

    // UPDATED 02-Feb-2026: Use budget's color property, fallback to defaults
    const getBudgetColor = (budget) => {
        if (budget.systemBudgetType === 'needs') return '#06b6d4'; // cyan-500
        if (budget.systemBudgetType === 'wants') return '#a855f7'; // purple-500
        return budget.color || '#f97316'; // orange-500
    };

    const calculatePercentage = (spent, total) => {
        if (!total) return 0;
        return Math.min(100, Math.round((spent / total) * 100));
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
                    const percentage = calculatePercentage(spent, total);
                    const color = getBudgetColor(budget);

                    return (
                        <div
                            key={budget.id}
                            className="relative rounded-xl overflow-hidden border border-gray-600/30 shadow-lg h-32"
                        >
                            {/* Progressive Fill Background */}
                            <div 
                                className="absolute inset-0 transition-all duration-300"
                                style={{ 
                                    background: `linear-gradient(to top, ${color} ${percentage}%, #252838 ${percentage}%)`
                                }}
                            />
                            
                            {/* Content */}
                            <div className="relative z-10 h-full flex flex-col items-center justify-center p-4 text-white text-center">
                                <div 
                                    className="text-3xl font-bold mb-2 cursor-pointer hover:opacity-80 transition-opacity"
                                    onClick={() => navigate(createPageUrl('BudgetDetail', { id: budget.id }))}
                                >
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

            {/* COMMENTED OUT 02-Feb-2026: Removed variation label per user request
            <div className="text-center text-gray-400 text-sm mt-6">
                <p className="font-semibold">Variation C</p>
                <p className="text-xs">Minimalist Data Grid with Background Fill</p>
            </div>
            */}
        </div>
    );
};

export default BudgetHealthGrid;