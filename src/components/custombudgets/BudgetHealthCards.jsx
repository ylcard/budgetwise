// COMMENTED OUT 03-Feb-2026: File deprecated per user request
// This view has been removed from the application
// import React from 'react';
// import { Home, Heart, Plane } from 'lucide-react';
// import { useSettings } from '../utils/SettingsContext';
// import { formatCurrency } from '../utils/currencyUtils';
// import { useNavigate } from 'react-router-dom';
// import { createPageUrl } from '../../utils';

/**
 * DEPRECATED: 03-Feb-2026
 * Budget Health Cards - Horizontal cards with gradient borders and progress bars
 * Main view from screenshot 1
 */

// const BudgetHealthCards = ({ budgets, totalSpent, totalBudget }) => {
    const { settings } = useSettings();
    const navigate = useNavigate();

    const getBudgetIcon = (budget) => {
        if (budget.systemBudgetType === 'needs') return Home;
        if (budget.systemBudgetType === 'wants') return Heart;
        return Plane;
    };

    const getBudgetGradient = (budget) => {
        if (budget.systemBudgetType === 'needs') return 'from-cyan-500 to-cyan-400';
        if (budget.systemBudgetType === 'wants') return 'from-purple-500 to-pink-500';
        return 'from-orange-500 to-amber-500';
    };

    const getBorderColor = (budget) => {
        if (budget.systemBudgetType === 'needs') return 'border-cyan-500/50';
        if (budget.systemBudgetType === 'wants') return 'border-purple-500/50';
        return 'border-orange-500/50';
    };

    const getProgressGradient = (budget) => {
        if (budget.systemBudgetType === 'needs') return 'bg-gradient-to-r from-cyan-400 to-cyan-300';
        if (budget.systemBudgetType === 'wants') return 'bg-gradient-to-r from-purple-500 to-pink-500';
        return 'bg-gradient-to-r from-orange-500 to-amber-500';
    };

    // UPDATED 02-Feb-2026: Removed parenthetical labels, just use budget name
    const getBudgetLabel = (budget) => {
        if (budget.systemBudgetType === 'needs') return 'NEEDS';
        if (budget.systemBudgetType === 'wants') return 'WANTS';
        return budget.name?.toUpperCase() || 'CUSTOM';
    };

    const calculatePercentage = (spent, total) => {
        if (!total) return 0;
        return Math.round((spent / total) * 100);
    };

    return (
        <div className="w-full bg-[#1a1d29] p-8 rounded-2xl">
            {/* Header */}
            <div className="text-center mb-8">
                <h1 className="text-4xl font-bold text-white mb-2">October Budget Health</h1>
                <p className="text-gray-400 text-lg">
                    Total Spent: <span className="text-white font-semibold">{formatCurrency(totalSpent, settings)}</span> / {formatCurrency(totalBudget, settings)}
                </p>
            </div>

            {/* Budget Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {budgets.map((budget) => {
                    const Icon = getBudgetIcon(budget);
                    const spent = budget.spent || 0;
                    const total = budget.allocatedAmount || budget.budgetAmount || 0;
                    const remaining = total - spent;
                    const percentage = calculatePercentage(spent, total);

                    return (
                        <div
                            key={budget.id}
                            className={`bg-[#252838] rounded-2xl p-6 border-2 ${getBorderColor(budget)} shadow-lg`}
                        >
                            {/* Header */}
                            <div className="flex items-center justify-between mb-6">
                                <h3 
                                    className="text-white font-semibold text-sm tracking-wide cursor-pointer hover:opacity-80 transition-opacity"
                                    onClick={() => navigate(createPageUrl('BudgetDetail', { id: budget.id }))}
                                >
                                    {getBudgetLabel(budget)}
                                </h3>
                                <Icon className={`w-5 h-5 text-${budget.systemBudgetType === 'needs' ? 'cyan' : budget.systemBudgetType === 'wants' ? 'purple' : 'orange'}-400`} />
                            </div>

                            {/* Progress Bar */}
                            <div className="mb-6">
                                <div className="bg-gray-700/50 rounded-full h-10 overflow-hidden border border-gray-600">
                                    <div
                                        className={`h-full ${getProgressGradient(budget)} flex items-center justify-end pr-4 transition-all duration-300`}
                                        style={{ width: `${percentage}%` }}
                                    >
                                        <span className="text-white text-sm font-bold">{percentage}%</span>
                                    </div>
                                </div>
                            </div>

                            {/* Remaining Amount */}
                            <div className="mb-2">
                                <div className="text-white text-4xl font-bold mb-1">
                                    {formatCurrency(remaining, settings)}
                                    <span className="text-gray-400 text-lg font-normal ml-2">Remaining</span>
                                </div>
                            </div>

                            {/* Budget Details */}
                            <p className="text-gray-400 text-sm">
                                {formatCurrency(spent, settings)} spent of {formatCurrency(total, settings)} budget
                            </p>
                        </div>
                    );
                })}
            </div>
        </div>
    // );
// };

// export default BudgetHealthCards;