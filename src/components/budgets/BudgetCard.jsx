import { useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { CustomButton } from "@/components/ui/CustomButton";
import { Link } from "react-router-dom";
import { formatCurrency } from "../utils/currencyUtils";
import { parseDate } from "../utils/dateUtils";
import { motion } from "framer-motion";
import { CheckCircle, Clock, AlertTriangle } from "lucide-react";
import { getCustomBudgetStats } from "../utils/financialCalculations";
import { FINANCIAL_PRIORITIES } from "../utils/constants";

export default function BudgetCard({ budgets = [], transactions = [], settings, onActivateBudget, size = 'md' }) {
  const budget = budgets?.[0];

  if (!budget) return null;

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
    const alloc = budget.calculatedTotal || 0;
    const pd = budget.calculatedPaid || 0;
    const unpd = budget.calculatedUnpaid || 0;

    const used = pd + unpd;
    let pct = alloc > 0 ? (used / alloc) * 100 : 0;
    if (isNaN(pct)) pct = 0;

    let isOver = used > alloc;
    let rem = Math.max(0, alloc - used);
    let over = Math.max(0, used - alloc);

    let statColor = isOver ? 'text-destructive' : 'text-primary';
    let statLabel = isOver ? 'Over Limit' : 'Under Limit';

    // For Needs/Wants (Ceilings), "Remaining" sounds like "Spend me!".
    // We change this to "Under Limit" (Blue) to indicate capacity, not wealth.
    if (!isOver) {
      statColor = 'text-primary';
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
    // }, [stats, isSystemBudget, budget]);
  }, [isSystemBudget, budget]);

  // Visual Theme Helper
  const theme = useMemo(() => {
    // 1. Priority: Use System Budget Type definition from Constants
    if (isSystemBudget && budget.systemBudgetType && FINANCIAL_PRIORITIES[budget.systemBudgetType]) {
      const config = FINANCIAL_PRIORITIES[budget.systemBudgetType];
      return {
        main: config.color,
        overlay: config.color, // Using main color as overlay foundation
        textStyle: { color: config.color }
      };
    }

    // 2. Fallback: Legacy Name Matching (mapping to constants to ensure consistency)
    const name = budget.name?.toLowerCase() || '';
    if (name.includes('need')) return { main: FINANCIAL_PRIORITIES.needs.color, overlay: FINANCIAL_PRIORITIES.needs.color, textStyle: { color: FINANCIAL_PRIORITIES.needs.color } };
    if (name.includes('want')) return { main: FINANCIAL_PRIORITIES.wants.color, overlay: FINANCIAL_PRIORITIES.wants.color, textStyle: { color: FINANCIAL_PRIORITIES.wants.color } };

    // Keep Savings visual support even if not a system budget anymore
    if (name.includes('saving') || name.includes('invest')) {
      const savingsColor = FINANCIAL_PRIORITIES.savings?.color || '#10B981';
      return { main: savingsColor, overlay: savingsColor, textStyle: { color: savingsColor } };
    }

    // 3. Default (Custom Budgets)
    const defaultColor = budget.color || '#3B82F6';
    return { main: defaultColor, overlay: defaultColor, textStyle: { color: defaultColor } };
  }, [budget.name, budget.color, budget.systemBudgetType, isSystemBudget]);

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
              <h3 className={`font-bold text-foreground hover:text-primary transition-colors truncate flex-1 ${currentStyle.title}`}>
                {budget.name}
              </h3>
              {/* Status Icons */}
              {!isSystemBudget && (
                <>
                  {budget.status === 'completed' && (
                    <CheckCircle className="w-3 h-3 text-[hsl(var(--status-paid-text))] flex-shrink-0" />
                  )}
                  {/* Alert icon for planned budgets */}
                  {budget.status === 'planned' && !shouldActivate && (
                    <Clock className="w-3 h-3 text-primary flex-shrink-0" />
                  )}
                  {/* Warning icon for planned budgets that should be activated */}
                  {shouldActivate && (
                    <AlertTriangle className="w-3 h-3 text-warning flex-shrink-0 animate-pulse" />
                  )}
                </>
              )}
            </div>
          </Link>

          {/* Activation prompt for planned budgets */}
          {shouldActivate && onActivateBudget && (
            <div className="mb-3 p-2 bg-warning/10 border border-warning/20 rounded-md">
              <p className="text-xs text-warning mb-2">This budget's start date has arrived</p>
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
                  stroke="hsl(var(--muted))"
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
                <span className={`font-bold ${currentStyle.circleText}`} style={theme.textStyle}>
                  {Math.round(percentage)}%
                </span>
                {isOverBudget && (
                  <span className={`font-bold text-destructive-foreground bg-destructive rounded uppercase shadow-sm ${currentStyle.overText}`}>
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
              <p className={`text-muted-foreground mb-px ${currentStyle.statLabel}`}>Budget</p>
              <p className={`font-semibold text-foreground/80 truncate ${currentStyle.statVal}`}>
                {formatCurrency(allocated, settings)}
              </p>
            </div>
            <div className="text-right">
              <p className={`text-muted-foreground mb-px ${currentStyle.statLabel}`}>
                {statusLabel}
              </p>
              <p className={`font-semibold truncate ${statusColor} ${currentStyle.statVal}`}>
                {formatCurrency(isOverBudget ? overAmount : remaining, settings)}
              </p>
              {/* Subliminal reinforcement: If we are under limit, hint that this is savings */}
              {!isOverBudget && (
                <p className="text-[9px] md:text-[10px] text-[hsl(var(--stat-income-text))]/80 font-medium mt-0.5 text-right">
                  (Potential Savings)
                </p>
              )}
            </div>

            {/* Divider */}
            <div className="col-span-2 h-px bg-border" />

            {/* Row 2: Paid & Unpaid */}
            <div>
              <p className={`text-muted-foreground mb-px ${currentStyle.statLabel}`}>Paid</p>
              <p className={`font-semibold text-foreground truncate ${currentStyle.statVal}`}>
                {formatCurrency(paid, settings)}
              </p>
            </div>
            <div className="text-right">
              <p className={`text-muted-foreground mb-px ${currentStyle.statLabel}`}>Unpaid</p>
              <div className="flex items-center justify-end gap-1">
                <p className={`font-semibold truncate ${unpaid > 0 ? 'text-warning' : 'text-muted-foreground/50'} ${currentStyle.statVal}`}>
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