import { Card, CardContent } from "@/components/ui/card";
import { AlertCircle, Calendar, Wallet } from "lucide-react";
import { formatCurrency } from "../utils/currencyUtils";
import { motion, AnimatePresence } from "framer-motion";
import { FINANCIAL_PRIORITIES } from "../utils/constants";
import { memo, useEffect, useRef, useState } from "react";
import { getMonthName } from "../utils/dateUtils";
import confetti from "canvas-confetti";

const MobileRemainingBudgetCard = memo(function MobileRemainingBudgetCard({
  currentMonthIncome,
  currentMonthExpenses,
  projectedIncome = 0,
  isUsingProjection = false,
  settings,
  isLoading,
  monthNavigator,
  selectedMonth,
  breakdown,
  selectedYear
}) {
  if (!settings) return null;

  // --- Data Holding Logic ---
  // We hold the data in local state and only update it when loading is finished.
  // This prevents the UI from flashing "Empty" or 0% values while fetching the new month.
  const [displayedData, setDisplayedData] = useState({
    income: currentMonthIncome,
    expenses: currentMonthExpenses,
    breakdown: breakdown
  });

  useEffect(() => {
    if (!isLoading) {
      setDisplayedData({
        income: currentMonthIncome,
        expenses: currentMonthExpenses,
        breakdown: breakdown
      });
    }
  }, [isLoading, currentMonthIncome, currentMonthExpenses, breakdown]);

  const { income, expenses, breakdown: displayBreakdown } = displayedData;

  // --- LOGIC FIX: Projection Integration ---
  // Use projected income if provided and active, otherwise actual income
  const effectiveIncome = isUsingProjection ? projectedIncome : income;
  const calculationBase = effectiveIncome && effectiveIncome > 0 ? effectiveIncome : 1;

  // Empty state only if NO income (real or projected) AND NO expenses
  const isDisplayedEmpty = (!effectiveIncome || effectiveIncome === 0) && (!expenses || expenses === 0);

  const totalSpent = expenses;
  const savingsAmount = Math.max(0, effectiveIncome - totalSpent);
  const overAmount = Math.max(0, totalSpent - effectiveIncome);
  const isTotalOver = totalSpent > effectiveIncome;

  // Helper: Is this "Bad" over (Real Money gone) or "Soft" over (Waiting for payday)?
  // If we are using projection, being "Over" actual cash is normal. We only alert if over PROJECTION.

  // --- LOGIC FIX: Use Actual Breakdown (Paid + Unpaid) instead of Limits ---
  const needsData = displayBreakdown?.needs || { paid: 0, unpaid: 0 };
  const needsTotal = (needsData.paid || 0) + (needsData.unpaid || 0);

  const wantsData = displayBreakdown?.wants || {};
  const wantsTotal = (wantsData.directPaid || 0) + (wantsData.customPaid || 0) +
    (wantsData.directUnpaid || 0) + (wantsData.customUnpaid || 0);

  // Calculate Percentages. If Empty, everything forces to 0 to create the "Morph" to empty effect.
  const needsPct = isDisplayedEmpty ? 0 : (needsTotal / calculationBase) * 100;
  const wantsPct = isDisplayedEmpty ? 0 : (wantsTotal / calculationBase) * 100;
  const savingsPct = (isDisplayedEmpty || isTotalOver) ? 0 : Math.max(0, 100 - needsPct - wantsPct);

  // Donut chart calculations
  const needsColor = FINANCIAL_PRIORITIES.needs.color;
  const wantsColor = FINANCIAL_PRIORITIES.wants.color;
  const savingsColor = FINANCIAL_PRIORITIES.savings.color;

  // Donut SVG parameters
  const size = 200;
  const strokeWidth = 32;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;

  // Calculate segment lengths and rotation angles
  // Each segment is drawn from 0 degrees, then rotated to its position
  const needsLength = (needsPct / 100) * circumference;
  const wantsLength = (wantsPct / 100) * circumference;
  const savingsLength = (savingsPct / 100) * circumference;

  // Rotation angles for each segment (in degrees)
  const needsRotation = 0; // Starts at top (12 o'clock due to -rotate-90)
  const wantsRotation = needsPct * 3.6; // 3.6 degrees per percentage point
  const savingsRotation = (needsPct + wantsPct) * 3.6;

  // Confetti logic (same as desktop)
  const prevIncomeRef = useRef(currentMonthIncome);
  const prevMonthRef = useRef(selectedMonth);
  const prevYearRef = useRef(selectedYear);
  const lastContextChangeTime = useRef(Date.now());

  useEffect(() => {
    const prevIncome = prevIncomeRef.current;
    const currentIncome = currentMonthIncome || 0;
    const isSameContext = prevMonthRef.current === selectedMonth && prevYearRef.current === selectedYear;

    if (!isSameContext) {
      prevIncomeRef.current = currentIncome;
      prevMonthRef.current = selectedMonth;
      prevYearRef.current = selectedYear;
      lastContextChangeTime.current = Date.now();
      return;
    }

    const isWarmupPeriod = Date.now() - lastContextChangeTime.current < 1000;

    if (!isWarmupPeriod && isSameContext && (!prevIncome || prevIncome === 0) && currentIncome > 0) {
      const duration = 3000;
      const end = Date.now() + duration;

      const frame = () => {
        confetti({
          particleCount: 2,
          angle: 60,
          spread: 55,
          origin: { x: 0 },
          colors: ['#10B981', '#34D399', '#6EE7B7']
        });
        confetti({
          particleCount: 2,
          angle: 120,
          spread: 55,
          origin: { x: 1 },
          colors: ['#10B981', '#34D399', '#6EE7B7']
        });

        if (Date.now() < end) {
          requestAnimationFrame(frame);
        }
      };
      frame();
    }

    prevIncomeRef.current = currentIncome;
    prevMonthRef.current = selectedMonth;
    prevYearRef.current = selectedYear;
  }, [currentMonthIncome, selectedMonth, selectedYear]);

  const savingsPctDisplay = (savingsAmount / calculationBase) * 100;

  return (
    <Card className="w-auto mx-4 max-w-md md:mx-auto border-none shadow-md bg-card overflow-hidden h-auto flex flex-col relative">
      <CardContent className="p-4 md:p-5 flex-1 flex flex-col gap-6">
        {/* Top Navigation Bar - Centered Month Navigator */}
        <div className="flex justify-center -mb-2">
          {monthNavigator}
        </div>

        {/* Main Content */}
        <div className="relative flex flex-col items-center justify-start flex-1 gap-6">
          {/* +                        CRITICAL FIX: Removed AnimatePresence mode="wait" wrapper.
                        We now ALWAYS render the Chart structure.
                        If data is empty, we simply animate values to 0 and crossfade the text.
                        This prevents the "Blank Section" and ensures smooth morphing.
                    */}

          <div className="w-full space-y-4 relative">
            {/* Empty State Overlay - Positioned Absolutely over the content */}
            {isDisplayedEmpty ? (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.5, delay: 0.2 }} // Delay slightly to let chart morph out
                className="absolute inset-0 z-10 flex flex-col items-center justify-center text-center bg-background/90 backdrop-blur-[2px] rounded-full"
              >
                <div className="w-16 h-16 bg-[hsl(var(--stat-income-bg))] rounded-full flex items-center justify-center shadow-sm mb-4">
                  <Calendar className="w-8 h-8 text-[hsl(var(--stat-income-text))]" />
                </div>
                <h3 className="text-lg font-bold text-foreground mb-2">Plan for {getMonthName(selectedMonth)}</h3>
                <p className="text-muted-foreground text-sm max-w-[260px]">
                  Start by adding your expected income.
                </p>
              </motion.div>
            ) : null}

            {/* Donut Chart - Always Rendered, even if 0 */}
            <motion.div
              animate={{ opacity: 1 }}
              transition={{ duration: 0.3 }}
            >
              <div className="relative w-full max-w-[180px] aspect-square mx-auto">
                <svg
                  viewBox={`0 0 ${size} ${size}`}
                  className="w-full h-full transform -rotate-90"
                >
                  {/* Background circle */}
                  <circle
                    cx={size / 2}
                    cy={size / 2}
                    r={radius}
                    fill="none"
                    className="stroke-muted"
                    strokeWidth={strokeWidth}
                  />

                  {/* Needs segment */}
                  <motion.circle
                    cx={size / 2}
                    cy={size / 2}
                    r={radius}
                    fill="none"
                    stroke={needsColor}
                    strokeWidth={strokeWidth}
                    strokeLinecap="butt"
                    style={{ transformOrigin: 'center' }}
                    // Initial is only for the very first mount
                    initial={{ strokeDasharray: `0 ${circumference}`, rotate: 0 }}
                    // Animate will catch every subsequent change in variables
                    animate={{
                      strokeDasharray: `${needsLength} ${circumference}`,
                      rotate: needsRotation
                    }}
                    transition={{ duration: 0.8, ease: "easeInOut" }}
                  />

                  {/* Wants segment */}
                  <motion.circle
                    cx={size / 2}
                    cy={size / 2}
                    r={radius}
                    fill="none"
                    stroke={wantsColor}
                    strokeWidth={strokeWidth}
                    strokeLinecap="butt"
                    style={{ transformOrigin: 'center' }}
                    initial={{ strokeDasharray: `0 ${circumference}`, rotate: 0 }}
                    animate={{
                      strokeDasharray: `${wantsLength} ${circumference}`,
                      rotate: wantsRotation
                    }}
                    transition={{ duration: 0.8, ease: "easeInOut" }}
                  />

                  {/* Savings segment */}
                  <motion.circle
                    cx={size / 2}
                    cy={size / 2}
                    r={radius}
                    fill="none"
                    stroke={savingsColor}
                    strokeWidth={strokeWidth}
                    strokeLinecap="butt"
                    style={{ transformOrigin: 'center' }}
                    initial={{ strokeDasharray: `0 ${circumference}`, rotate: 0 }}
                    animate={{
                      strokeDasharray: `${savingsLength} ${circumference}`,
                      rotate: savingsRotation
                    }}
                    transition={{ duration: 0.8, ease: "easeInOut" }}
                  />
                </svg>

                {/* Center Text */}
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  {/* Hide center text if empty, otherwise it looks weird with 0% and "Ready to plan" overlay */}
                  {!isDisplayedEmpty && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="text-center"
                    >
                      <div className="text-3xl font-extrabold text-foreground">
                        {Math.round(savingsPctDisplay)}%
                      </div>
                      <div className="text-xs font-semibold text-[hsl(var(--stat-income-text))]">Saved</div>
                    </motion.div>
                  )}
                </div>
              </div>

              {/* Summary Stats */}
              <motion.div
                className="w-full space-y-3"
                animate={{ opacity: isDisplayedEmpty ? 0 : 1 }}
              >
                {/* Income/Spent Summary */}
                <div className="text-center space-y-1">
                  {/* Always show the math, but highlight text in red if over */}
                  <p className="text-sm font-medium text-muted-foreground">
                    Spent <strong className={isTotalOver ? "text-destructive" : "text-foreground"}>
                      {formatCurrency(totalSpent, settings)}
                    </strong> of <strong>{formatCurrency(effectiveIncome, settings)}</strong>
                  </p>

                  {/* Dynamic Pill: Changes color and icon based on status, but layout stays stable */}
                  <div className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border transition-colors duration-300 ${isTotalOver
                    ? "bg-destructive/10 border-destructive/20 text-destructive"
                    : "bg-muted border-border text-muted-foreground"
                    }`}>
                    {isTotalOver ? <AlertCircle className="w-3.5 h-3.5" /> : <Wallet className="w-3.5 h-3.5" />}
                    <span className="text-sm font-medium">
                      {isTotalOver
                        ? `Over Limit: ${formatCurrency(overAmount, settings)}`
                        : `Left: ${formatCurrency(savingsAmount, settings)}`
                      }
                    </span>
                  </div>
                </div>

                {/* Legend */}
                <div className="flex flex-wrap justify-center items-center gap-x-4 gap-y-2 text-[10px] sm:text-xs px-1">
                  {needsPct > 0 && (
                    <div className="flex items-center gap-1.5">
                      <span className="font-semibold" style={{ color: needsColor }}>{FINANCIAL_PRIORITIES.needs.label}</span>
                      <span className="font-bold text-foreground">{Math.round(needsPct)}%</span>
                    </div>
                  )}
                  {wantsPct > 0 && (
                    <div className="flex items-center gap-1.5">
                      <span className="font-semibold" style={{ color: wantsColor }}>{FINANCIAL_PRIORITIES.wants.label}</span>
                      <span className="font-bold text-foreground">{Math.round(wantsPct)}%</span>
                    </div>
                  )}
                  {savingsPct > 0 && (
                    <div className="flex items-center gap-1.5">
                      <span className="font-semibold" style={{ color: savingsColor }}>Savings</span>
                      <span className="font-bold text-foreground">{Math.round(savingsPct)}%</span>
                    </div>
                  )}
                </div>
              </motion.div>
            </motion.div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
});

export default MobileRemainingBudgetCard;