import { useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { CustomButton } from "@/components/ui/CustomButton";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { formatCurrency } from "../utils/currencyUtils";
import { parseDate } from "../utils/dateUtils";
import { motion } from "framer-motion";
import { CheckCircle, Clock, AlertTriangle, AlertCircle } from "lucide-react";

export default function BudgetCard({ budget, stats, settings, onActivateBudget }) {
    const baseCurrency = settings?.baseCurrency || 'USD';
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
    const { allocated, paid, unpaid, percentage, isOverBudget, remaining, overAmount } = useMemo(() => {
        let alloc = 0;
        let pd = 0;
        let unpd = 0;

        if (isSystemBudget) {
            alloc = budget.budgetAmount || 0;
            pd = stats?.paid?.totalBaseCurrencyAmount || 0;
            unpd = stats?.unpaid?.totalBaseCurrencyAmount || 0;
        } else {
            alloc = stats?.totalAllocatedUnits || 0;
            pd = stats?.totalSpentUnits || 0;
            unpd = stats?.totalUnpaidUnits || 0;
        }

        const used = pd + unpd;
        const pct = alloc > 0 ? (used / alloc) * 100 : 0;
        const isOver = used > alloc;
        const rem = Math.max(0, alloc - used);
        const over = Math.max(0, used - alloc);

        return {
            allocated: alloc,
            paid: pd,
            unpaid: unpd,
            percentage: pct,
            isOverBudget: isOver,
            remaining: rem,
            overAmount: over
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
    const radius = 42;
    const circumference = 2 * Math.PI * radius;


    // Main progress (capped at 100% for the base ring)
    const mainProgress = Math.min(percentage, 100);
    const mainOffset = circumference - (mainProgress / 100) * circumference;

    // Overlay progress (amount over 100%, capped purely for visual sanity if needed)
    const overlayProgress = Math.max(0, percentage - 100);
    // We map the overlay to the circle. If it's 150% total, overlay is 50%.
    const overlayOffset = circumference - (Math.min(overlayProgress, 100) / 100) * circumference;

    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            whileHover={{ scale: 1.02 }}
            className="h-full"
        >
            <Card className="border shadow-sm hover:shadow-md transition-all overflow-hidden h-full flex flex-col">
                <div className="h-1 w-full" style={{ backgroundColor: theme.main }} />

                <CardContent className="p-5 flex-1 flex flex-col">
                    {/* Header */}
                    <Link to={createPageUrl(`BudgetDetail?id=${budget.id}`)}>
                        <div className="flex items-center gap-2 mb-4">
                            <h3 className="font-bold text-gray-900 text-sm hover:text-blue-600 transition-colors truncate flex-1">
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
                    <div className="flex items-center justify-center mb-6 mt-2">
                        <div className="relative w-32 h-32">
                            <svg className="w-full h-full transform -rotate-90">
                                {/* Track */}
                                <circle
                                    cx="50%"
                                    cy="50%"
                                    r={radius}
                                    stroke="#F3F4F6"
                                    strokeWidth="8"
                                    fill="none"
                                />

                                {/* Main Progress Ring */}
                                <circle
                                    cx="50%" cy="50%" r={radius}
                                    stroke={theme.main}
                                    strokeWidth="8"
                                    fill="none"
                                    strokeDasharray={circumference}
                                    strokeDashoffset={mainOffset}
                                    strokeLinecap="round"
                                    className="transition-all duration-1000 ease-out"
                                />

                                {/* Overlay Ring (if > 100%) */}
                                {isOverBudget && (
                                    <circle
                                        cx="50%" cy="50%" r={radius}
                                        stroke={theme.overlay}
                                        strokeWidth="8"
                                        fill="none"
                                        strokeDasharray={circumference}
                                        strokeDashoffset={overlayOffset}
                                        strokeLinecap="round"
                                        className="transition-all duration-1000 ease-out opacity-90"
                                    />
                                )}
                            </svg>
                            +
                            {/* Center Content */}
                            <div className="absolute inset-0 flex flex-col items-center justify-center">
                                <span className={`text-2xl font-bold ${theme.text}`}>
                                    {Math.round(percentage)}%
                                </span>
                                {isOverBudget && (
                                    <span className="text-[10px] font-bold text-white bg-red-500 px-1.5 py-0.5 rounded uppercase mt-0.5 shadow-sm">
                                        Over
                                    </span>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Info Grid */}
                    <div className="grid grid-cols-2 gap-x-4 gap-y-3 text-xs mt-auto">
                        {/* Row 1: Budget & Remaining */}
                        <div>
                            <p className="text-gray-400 mb-0.5">Budget</p>
                            <p className="font-semibold text-gray-700 truncate">
                                {formatCurrency(allocated, settings)}
                            </p>
                        </div>
                        <div className="text-right">
                            <p className="text-gray-400 mb-0.5">
                                {isOverBudget ? 'Over by' : 'Remaining'}
                            </p>
                            <p className={`font-semibold truncate ${isOverBudget ? 'text-red-500' : 'text-emerald-600'}`}>
                                {isOverBudget ? '+' : ''}
                                {formatCurrency(isOverBudget ? overAmount : remaining, settings)}
                            </p>
                        </div>

                        {/* Divider */}
                        <div className="col-span-2 h-px bg-gray-100" />

                        {/* Row 2: Paid & Unpaid */}
                        <div>
                            <p className="text-gray-400 mb-0.5">Paid</p>
                            <p className="font-semibold text-gray-900 truncate">
                                {formatCurrency(paid, settings)}
                            </p>
                        </div>
                        <div className="text-right">
                            <p className="text-gray-400 mb-0.5">Unpaid</p>
                            <div className="flex items-center justify-end gap-1">
                                {unpaid > 0 && <AlertCircle className="w-3 h-3 text-amber-500" />}
                                <p className={`font-semibold truncate ${unpaid > 0 ? 'text-amber-600' : 'text-gray-300'}`}>
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
