import { useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { CustomButton } from "@/components/ui/CustomButton";
import { Link } from "react-router-dom";
import { formatCurrency } from "../utils/currencyUtils";
import { parseDate } from "../utils/dateUtils";
import { motion } from "framer-motion";
import { CheckCircle, Clock, AlertTriangle } from "lucide-react";
import { getCustomBudgetStats } from "../utils/financialCalculations";

export default function BudgetCard({ budgets = [], transactions = [], settings, onActivateBudget, size = 'md' }) {
    const budget = budgets?.[0];

    if (!budget) return null;

    // Calculate stats from raw data
    const stats = useMemo(() => {
        const budgetTransactions = transactions?.filter(t => t.budgetId === budget.id) || [];
        return getCustomBudgetStats(budget, budgetTransactions);
    }, [budget, transactions]);

    const isSystemBudget = budget.isSystemBudget || false;

    // Check if planned budget's start date has arrived
    const shouldActivate = useMemo(() => {
        if (isSystemBudget || budget.status !== 'planned') return false;

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const startDate = parseDate(budget.startDate);

        // Return true if start date has arrived (today or in the past)
        return startDate <= today;
    }, [budget.status, budget.startDate, isSystemBudget]);

    // Unified Data Calculation
    const { allocated, paid, unpaid, percentage, isOverBudget, remaining, overAmount, statusLabel, statusColor } = useMemo(() => {
        let alloc = 0;
        let pd = 0;
        let unpd = 0;

        if (isSystemBudget) {
            alloc = Number(stats?.totalAllocatedUnits ?? budget.budgetAmount ?? 0);
            pd = Number(stats?.paid?.totalBaseCurrencyAmount ?? stats?.paidAmount ?? 0);
            unpd = Number(stats?.unpaid?.totalBaseCurrencyAmount ?? stats?.unpaid ?? 0);
        } else {
            alloc = Number(stats?.totalAllocatedUnits ?? 0);
            pd = Number(stats?.paid?.totalBaseCurrencyAmount ?? 0);
            unpd = Number(stats?.unpaid?.totalBaseCurrencyAmount ?? stats?.unpaid ?? 0);
        }

        const used = pd + unpd;
        let pct = alloc > 0 ? (used / alloc) * 100 : 0;
        if (isNaN(pct)) pct = 0;

        let isOver = used > alloc;
        let rem = Math.max(0, alloc - used);
        let over = Math.max(0, used - alloc);

        let statColor = isOver ? 'text-red-500' : 'text-blue-600';
        let statLabel = isOver ? 'Over Limit' : 'Under Limit';

        // For Needs/Wants (Ceilings), "Remaining" sounds like "Spend me!".
        // We change this to "Under Limit" (Blue) to indicate capacity, not wealth.
        if (!isOver) {
            statColor = 'text-blue-600';
        }

        return {
            allocated: alloc,
            paid: pd,
            unpaid: unpd,
            percentage: pct,
            isOverBudget: isOver,
            remaining: rem,
            overAmount: over,
            statusColor: statColor,
            statusLabel: statLabel
        };
    }, [stats, isSystemBudget, budget]);

    // Visual Theme Helper
    const theme = useMemo(() => {
        const name = budget.name?.toLowerCase() || '';

        // Needs (Red)
        if (name.includes('need')) {
            return { main: '#EF4444', overlay: '#991B1B', bg: '#FEF2F2', text: 'text-red-600' };
        }
        // Wants (Amber/Orange)
        if (name.includes('want')) {
            return { main: '#F59E0B', overlay: '#B45309', bg: '#FFFBEB', text: 'text-amber-600' };
        }
        // Savings (Green)
        if (name.includes('saving') || name.includes('invest')) {
            return { main: '#10B981', overlay: '#047857', bg: '#ECFDF5', text: 'text-emerald-600' };
        }

        // Default (Blue)
        const defaultColor = budget.color || '#3B82F6';
        return { main: defaultColor, overlay: '#1E40AF', bg: '#EFF6FF', text: 'text-blue-600' };
    }, [budget.name, budget.color]);

    // SVG Calculations
    // Size Configuration
    const sizeConfig = {
        sm: {
            radius: 34, stroke: 5, p: 'p-3', title: 'text-xs', mb: 'mb-2',
            circleText: 'text-sm', overText: 'text-[8px] px-1 py-px mt-px',
            statLabel: 'text-[10px]', statVal: 'text-[11px]', gap: 'gap-x-2 gap-y-1'
        },
        md: {
            radius: 42, stroke: 8, p: 'p-4 md:p-5', title: 'text-sm', mb: 'mb-3 md:mb-4',
            circleText: 'text-lg md:text-xl', overText: 'text-[10px] px-1.5 py-0.5 mt-0.5',
            statLabel: 'text-xs', statVal: 'text-sm', gap: 'gap-x-3 gap-y-2 md:gap-x-4 md:gap-y-3'
        },
        lg: {
            radius: 56, stroke: 10, p: 'p-6', title: 'text-lg', mb: 'mb-6',
            circleText: 'text-2xl', overText: 'text-xs px-2 py-1 mt-1',
            statLabel: 'text-sm', statVal: 'text-base', gap: 'gap-x-6 gap-y-4'
        }
    };

    const currentStyle = sizeConfig[size] || sizeConfig.md;
    const radius = currentStyle.radius;
    const normalizedRadius = radius - currentStyle.stroke / 2;
    const circumference = 2 * Math.PI * normalizedRadius;


    // Main progress (capped at 100% for the base ring)
    // const mainProgress = Math.min(percentage, 100);
    // const mainOffset = circumference - (mainProgress / 100) * circumference;
    // REVERSE LOGIC for Needs/Wants
    let displayPercentage = 0;
    let mainOffset = 0;

    // Needs/Wants: Shrink from 100% -> 0%
    // If percentage (used) is 20%, we want to show 80% full.
    // If percentage is 110%, we show 0% full (empty).
    const remainingPct = Math.max(0, 100 - percentage);
    displayPercentage = remainingPct;
    mainOffset = circumference - (remainingPct / 100) * circumference;

    // Overlay progress (amount over 100%, capped purely for visual sanity if needed)
    // const overlayProgress = Math.max(0, percentage - 100);
    // For Needs/Wants, if overbudget, we might want a red ring? 
    // For now, let's stick to the empty bucket + red text.

    // We map the overlay to the circle. If it's 150% total, overlay is 50%.
    // const overlayOffset = circumference - (Math.min(overlayProgress, 100) / 100) * circumference;
    const overlayProgress = Math.max(0, percentage - 100);
    const overlayOffset = circumference - (Math.min(overlayProgress, 100) / 100) * circumference;

    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            whileHover={{ scale: 1.02 }}
            className="h-full"
        >
            <Card className="border shadow-sm hover:shadow-md transition-all overflow-hidden h-full flex flex-col rounded-xl">
                <div className={`${size === 'sm' ? 'h-1' : 'h-1.5'} w-full`} style={{ backgroundColor: theme.main }} />

                <CardContent className={`${currentStyle.p} flex-1 flex flex-col`}>
                    {/* Header */}
                    <Link to={`/BudgetDetail?id=${budget.id}`} state={{ from: '/Budgets' }}>
                        <div className={`flex items-center gap-2 ${currentStyle.mb}`}>
                            <h3 className={`font-bold text-gray-900 hover:text-blue-600 transition-colors truncate flex-1 ${currentStyle.title}`}>
                                {budget.name}
                            </h3>
                            {/* Status Icons */}
                            {!isSystemBudget && (
                                <>
                                    {budget.status === 'completed' && (
                                        <CheckCircle className="w-3 h-3 text-green-500 flex-shrink-0" />
                                    )}
                                    {/* Alert icon for planned budgets */}
                                    {budget.status === 'planned' && !shouldActivate && (
                                        <Clock className="w-3 h-3 text-blue-500 flex-shrink-0" />
                                    )}
                                    {/* Warning icon for planned budgets that should be activated */}
                                    {shouldActivate && (
                                        <AlertTriangle className="w-3 h-3 text-amber-500 flex-shrink-0 animate-pulse" />
                                    )}
                                </>
                            )}
                        </div>
                    </Link>

                    {/* Activation prompt for planned budgets */}
                    {shouldActivate && onActivateBudget && (
                        <div className="mb-3 p-2 bg-amber-50 border border-amber-200 rounded-md">
                            <p className="text-xs text-amber-800 mb-2">This budget's start date has arrived</p>
                            <CustomButton
                                variant="warning"
                                size="xs"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onActivateBudget(budget.id);
                                }}
                                className="w-full text-xs"
                            >
                                Activate Now
                            </CustomButton>
                        </div>
                    )}

                    {/* Circular Progress */}
                    <div className={`flex items-center justify-center flex-1 mt-1 ${currentStyle.mb}`}>
                        <div className="relative" style={{ width: radius * 2, height: radius * 2 }}>
                            <svg
                                className="w-full h-full transform -rotate-90"
                                viewBox={`0 0 ${radius * 2} ${radius * 2}`}
                            >
                                {/* Track */}
                                <circle
                                    cx="50%"
                                    cy="50%"
                                    r={normalizedRadius}
                                    stroke="#F3F4F6"
                                    strokeWidth={currentStyle.stroke}
                                    fill="none"
                                />

                                {/* Main Progress Ring */}
                                <circle
                                    cx="50%" cy="50%" r={normalizedRadius}
                                    stroke={theme.main}
                                    strokeWidth={currentStyle.stroke}
                                    fill="none"
                                    strokeDasharray={circumference}
                                    strokeDashoffset={mainOffset}
                                    strokeLinecap="round"
                                    className="transition-all duration-1000 ease-out"
                                />

                                {/* Overlay Ring (if > 100%) - Red for Expenses */}
                                {/* For Needs/Wants, if overbudget, show a thin red warning ring */}
                                {isOverBudget && (
                                    <circle
                                        cx="50%" cy="50%" r={normalizedRadius}
                                        stroke={theme.overlay}
                                        // strokeWidth={currentStyle.stroke}
                                        strokeWidth={2} // Thin warning line
                                        fill="none"
                                        strokeDasharray={circumference}
                                        // strokeDashoffset={overlayOffset}
                                        strokeDashoffset={0} // Full circle red border
                                        strokeLinecap="round"
                                        className="transition-all duration-1000 ease-out opacity-90"
                                    />
                                )}
                            </svg>

                            {/* Center Content */}
                            <div className="absolute inset-0 flex flex-col items-center justify-center">
                                <span className={`font-bold ${theme.text} ${currentStyle.circleText}`}>
                                    {Math.round(percentage)}%
                                </span>
                                {isOverBudget && (
                                    <span className={`font-bold text-white bg-red-500 rounded uppercase shadow-sm ${currentStyle.overText}`}>
                                        Over
                                    </span>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Info Grid */}
                    <div className={`grid grid-cols-2 mt-auto ${currentStyle.gap}`}>
                        {/* Row 1: Budget & Remaining */}
                        <div>
                            <p className={`text-gray-400 mb-px ${currentStyle.statLabel}`}>Budget</p>
                            <p className={`font-semibold text-gray-700 truncate ${currentStyle.statVal}`}>
                                {formatCurrency(allocated, settings)}
                            </p>
                        </div>
                        <div className="text-right">
                            <p className={`text-gray-400 mb-px ${currentStyle.statLabel}`}>
                                {statusLabel}
                            </p>
                            <p className={`font-semibold truncate ${statusColor} ${currentStyle.statVal}`}>
                                {formatCurrency(isOverBudget ? overAmount : remaining, settings)}
                            </p>
                            {/* Subliminal reinforcement: If we are under limit, hint that this is savings */}
                            {!isOverBudget && (
                                <p className="text-[9px] md:text-[10px] text-emerald-600/80 font-medium mt-0.5 text-right">
                                    (Potential Savings)
                                </p>
                            )}
                        </div>

                        {/* Divider */}
                        <div className="col-span-2 h-px bg-gray-100" />

                        {/* Row 2: Paid & Unpaid */}
                        <div>
                            <p className={`text-gray-400 mb-px ${currentStyle.statLabel}`}>Paid</p>
                            <p className={`font-semibold text-gray-900 truncate ${currentStyle.statVal}`}>
                                {formatCurrency(paid, settings)}
                            </p>
                        </div>
                        <div className="text-right">
                            <p className={`text-gray-400 mb-px ${currentStyle.statLabel}`}>Unpaid</p>
                            <div className="flex items-center justify-end gap-1">
                                <p className={`font-semibold truncate ${unpaid > 0 ? 'text-amber-600' : 'text-gray-300'} ${currentStyle.statVal}`}>
                                    {formatCurrency(unpaid, settings)}
                                </p>
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </motion.div>
    );
}