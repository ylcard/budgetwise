import { Card, CardContent } from "@/components/ui/card";
import { AlertCircle, Calendar, Wallet, TrendingUp, Target, Activity } from "lucide-react";
import { formatCurrency } from "../utils/currencyUtils";
import { motion, AnimatePresence } from "framer-motion";
import { FINANCIAL_PRIORITIES } from "../utils/constants";
import { resolveBudgetLimit } from "../utils/financialCalculations";
import { memo, useEffect, useRef, useState } from "react";
import { getMonthName, normalizeToMidnight, getLastDayOfMonth, parseDate } from "../utils/dateUtils";
import confetti from "canvas-confetti";
import { Link } from "react-router-dom";

// --- HEALTH BADGE HELPERS (matching desktop) ---
const getHealthBadgeStyle = (score) => {
  if (!score) return "bg-muted text-muted-foreground border-border hover:bg-muted/80";
  if (score >= 90) return "bg-[hsl(var(--stat-income-bg))] text-[hsl(var(--stat-income-text))] border-[hsl(var(--stat-income-text))/0.2] hover:brightness-95 dark:hover:brightness-110";
  if (score >= 75) return "bg-[hsl(var(--stat-balance-pos-bg))] text-[hsl(var(--stat-balance-pos-text))] border-[hsl(var(--stat-balance-pos-text))/0.2] hover:brightness-95 dark:hover:brightness-110";
  if (score >= 60) return "bg-[hsl(var(--stat-balance-neg-bg))] text-[hsl(var(--stat-balance-neg-text))] border-[hsl(var(--stat-balance-neg-text))/0.2] hover:brightness-95 dark:hover:brightness-110";
  return "bg-[hsl(var(--stat-expense-bg))] text-[hsl(var(--stat-expense-text))] border-[hsl(var(--stat-expense-text))/0.2] hover:brightness-95 dark:hover:brightness-110";
};

const getHealthIconColor = (score) => {
  if (!score) return "text-muted-foreground";
  if (score >= 90) return "text-[hsl(var(--stat-income-text))]";
  if (score >= 75) return "text-[hsl(var(--stat-balance-pos-text))]";
  if (score >= 60) return "text-[hsl(var(--stat-balance-neg-text))]";
  return "text-[hsl(var(--stat-expense-text))]";
};

const MobileRemainingBudgetCard = memo(function MobileRemainingBudgetCard({
  currentMonthIncome,
  currentMonthExpenses,
  projectedIncome = 0,
  isUsingProjection = false,
  projectedRemainingExpense = 0,
  // ADDED 13-Mar-2026: Per-priority projected expense amounts from the priority-aware engine
  projectedRemainingExpenseNeeds = 0,
  projectedRemainingExpenseWants = 0,
  settings,
  isLoading,
  monthNavigator,
  selectedMonth,
  breakdown,
  selectedYear,
  systemBudgets = [],
  goals = [],
  monthStatus = 'current',
  healthData = null
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

  // --- LOGIC: Projection Integration (matching desktop) ---
  // Use projected income if provided and active, otherwise actual income
  const effectiveIncome = isUsingProjection ? projectedIncome : income;
  const safeIncome = effectiveIncome && effectiveIncome > 0 ? effectiveIncome : 1;

  // Empty state only if NO income (real or projected) AND NO expenses
  const isDisplayedEmpty = (!effectiveIncome || effectiveIncome === 0) && (!expenses || expenses === 0);

  const totalSpent = expenses;

  // --- LOGIC: Resolve budget limits from goals (matching desktop) ---
  const resolveLimit = (type) => {
    const budget = systemBudgets.find(sb => sb.systemBudgetType === type);
    if (budget && typeof budget.targetAmount === 'number') return budget.targetAmount;
    const goal = goals.find(g => g.priority === type);
    if (!goal) return 0;
    return resolveBudgetLimit(goal, safeIncome, settings, 0);
  };

  // COMMENTED 10-Mar-2026: Old simple calculation without goal limits
  // const savingsAmount = Math.max(0, effectiveIncome - totalSpent);
  // const overAmount = Math.max(0, totalSpent - effectiveIncome);
  // const isTotalOver = totalSpent > effectiveIncome;

  const savingsLimit = resolveLimit('savings');

  // --- LOGIC: Net balance calculation (matching desktop) ---
  // Account for BOTH actual expenses AND future projected expenses
  const netBalance = effectiveIncome - totalSpent - projectedRemainingExpense;
  const isActuallyOver = netBalance < 0;

  const savingsAmount = Math.max(0, netBalance);
  const extraSavingsAmount = Math.max(0, netBalance - savingsLimit);
  const overAmount = Math.abs(Math.min(0, netBalance));

  // Calculate display percentage based on safeIncome (matching desktop)
  const absPctDisplay = (Math.abs(netBalance) / safeIncome) * 100;

  // --- LOGIC: Breakdown extraction (matching desktop) ---
  const needsData = displayBreakdown?.needs || { paid: 0, unpaid: 0, total: 0 };
  const needsActual = needsData.total || ((needsData.paid || 0) + (needsData.unpaid || 0));

  const wantsData = displayBreakdown?.wants || {};
  const wantsActual = (wantsData.directPaid || 0) + (wantsData.customPaid || 0) +
    (wantsData.directUnpaid || 0) + (wantsData.customUnpaid || 0);

  // UPDATED 13-Mar-2026: Use per-priority projected amounts from the priority-aware engine
  // instead of the proportional heuristic based on goal ratios.
  const needsTotal = needsActual + projectedRemainingExpenseNeeds;
  const wantsTotal = wantsActual + projectedRemainingExpenseWants;

  // Calculate Percentages. If Empty, everything forces to 0 to create the "Morph" to empty effect.
  const needsPct = isDisplayedEmpty ? 0 : (needsTotal / safeIncome) * 100;
  const wantsPct = isDisplayedEmpty ? 0 : (wantsTotal / safeIncome) * 100;
  const savingsPct = (isDisplayedEmpty || isActuallyOver) ? 0 : Math.max(0, 100 - needsPct - wantsPct);

  // --- Extract IDs for Routing ---
  const needsBudget = systemBudgets.find(sb => sb.systemBudgetType === 'needs');
  const wantsBudget = systemBudgets.find(sb => sb.systemBudgetType === 'wants');

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
  const needsLength = (needsPct / 100) * circumference;
  const wantsLength = (wantsPct / 100) * circumference;
  const savingsLength = (savingsPct / 100) * circumference;

  // Rotation angles for each segment (in degrees)
  const needsRotation = 0;
  const wantsRotation = needsPct * 3.6;
  const savingsRotation = (needsPct + wantsPct) * 3.6;

  // Get explicit month name for the empty state message
  const monthName = getMonthName(selectedMonth);

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

  // Center text: savings percentage display (matching desktop logic)
  const savingsPctDisplay = isActuallyOver ? absPctDisplay : (savingsAmount / safeIncome) * 100;

  return (
    <Card className="w-auto mx-4 max-w-md md:mx-auto border-none shadow-md bg-card overflow-hidden h-auto flex flex-col relative">
      <CardContent className="p-4 md:p-5 flex-1 flex flex-col gap-6">
        {/* Top Navigation Bar - Centered Month Navigator */}
        <div className="flex justify-center -mb-2">
          {monthNavigator}
        </div>

        {/* Main Content */}
        <div className="relative flex flex-col items-center justify-start flex-1 gap-6">
          <div className="w-full space-y-4 relative">
            {/* Empty State Overlay - Positioned Absolutely over the content */}
            {isDisplayedEmpty ? (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.5, delay: 0.2 }}
                className="absolute inset-0 z-10 flex flex-col items-center justify-center text-center bg-background/90 backdrop-blur-[2px] rounded-full"
              >
                <div className="w-16 h-16 bg-[hsl(var(--stat-income-bg))] rounded-full flex items-center justify-center shadow-sm mb-4">
                  <Calendar className="w-8 h-8 text-[hsl(var(--stat-income-text))]" />
                </div>
                <h3 className="text-lg font-bold text-foreground mb-2">Plan for {monthName}</h3>
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
                    initial={{ strokeDasharray: `0 ${circumference}`, rotate: 0 }}
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

                {/* Center Text - Matching desktop logic for over/saved display */}
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  {!isDisplayedEmpty && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="text-center"
                    >
                      {isActuallyOver ? (
                        <>
                          <div className="text-3xl font-extrabold text-destructive">
                            {Math.round(absPctDisplay)}%
                          </div>
                          <div className="text-xs font-semibold text-destructive">
                            {monthStatus === 'current' ? 'Over (proj.)' : 'Over budget'}
                          </div>
                        </>
                      ) : (
                        <>
                          <div className="text-3xl font-extrabold text-foreground">
                            {Math.round(savingsPctDisplay)}%
                          </div>
                          <div className="text-xs font-semibold text-[hsl(var(--stat-income-text))]">
                            {monthStatus === 'current' ? 'Proj. saved' : 'Saved'}
                          </div>
                        </>
                      )}
                    </motion.div>
                  )}
                </div>
              </div>

              {/* Summary Stats */}
              <motion.div
                className="w-full space-y-3 mt-6"
                animate={{ opacity: isDisplayedEmpty ? 0 : 1 }}
              >
                {/* Status Summary - matching desktop messaging */}
                <div className="text-center space-y-1.5">
                  {isActuallyOver ? (
                    <>
                      <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border bg-destructive/10 border-destructive/20 text-destructive">
                        <AlertCircle className="w-3.5 h-3.5" />
                        <span className="text-sm font-medium">
                          Over by {formatCurrency(overAmount, settings)}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground px-4">
                        {monthStatus === 'current' ? 'Spent so far: ' : 'Total spent: '}
                        <strong className="text-destructive">{formatCurrency(totalSpent, settings)}</strong>
                      </p>
                    </>
                  ) : (
                    <>
                      <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border bg-muted border-border text-muted-foreground">
                        <Wallet className="w-3.5 h-3.5" />
                        <span className="text-sm font-medium">
                          {monthStatus === 'current' ? 'Projected savings: ' : 'Savings: '}
                          {formatCurrency(savingsAmount, settings)}
                        </span>
                      </div>
                      {/* Contextual sub-text matching desktop */}
                      <p className="text-xs text-muted-foreground px-4">
                        {extraSavingsAmount > 0 ? (
                          <span className="flex items-center justify-center gap-1">
                            <TrendingUp className="w-3 h-3 text-[hsl(var(--stat-income-text))]" />
                            Goal crushed by <strong className="text-[hsl(var(--stat-income-text))]">{formatCurrency(extraSavingsAmount, settings)}</strong>
                          </span>
                        ) : savingsAmount > 0 && savingsLimit > savingsAmount ? (
                          <span className="flex items-center justify-center gap-1">
                            <Target className="w-3 h-3 text-primary" />
                            {monthStatus === 'current'
                              ? <>Reduce expenses by <strong className="text-primary">{formatCurrency(savingsLimit - savingsAmount, settings)}</strong> to hit target</>
                              : <>Missed target by <strong className="text-primary">{formatCurrency(savingsLimit - savingsAmount, settings)}</strong></>
                            }
                          </span>
                        ) : (
                          <span>
                            {monthStatus === 'current' ? 'Spent so far: ' : 'Total spent: '}
                            <strong className="text-foreground">{formatCurrency(totalSpent, settings)}</strong>
                          </span>
                        )}
                      </p>
                    </>
                  )}
                </div>

                {/* Legend */}
                <div className="flex flex-wrap justify-center items-center gap-x-4 gap-y-2 text-[10px] sm:text-xs px-1">
                  {needsPct > 0 && (
                    <Link
                      to={needsBudget?.id ? `/BudgetDetail?id=${needsBudget.id}` : undefined}
                      className="flex items-center gap-1.5 transition-opacity hover:opacity-80"
                    >
                      <div className="w-2 h-2 rounded-full" style={{ backgroundColor: needsColor }}></div>
                      <span className="font-semibold" style={{ color: needsColor }}>{FINANCIAL_PRIORITIES.needs.label}</span>
                      <span className="font-bold text-foreground">{Math.round(needsPct)}%</span>
                    </Link>
                  )}
                  {wantsPct > 0 && (
                    <Link
                      to={wantsBudget?.id ? `/BudgetDetail?id=${wantsBudget.id}` : undefined}
                      className="flex items-center gap-1.5 transition-opacity hover:opacity-80"
                    >
                      <div className="w-2 h-2 rounded-full" style={{ backgroundColor: wantsColor }}></div>
                      <span className="font-semibold" style={{ color: wantsColor }}>{FINANCIAL_PRIORITIES.wants.label}</span>
                      <span className="font-bold text-foreground">{Math.round(wantsPct)}%</span>
                    </Link>
                  )}
                  {savingsPct > 0 && (
                    <div className="flex items-center gap-1.5">
                      <div className="w-2 h-2 rounded-full" style={{ backgroundColor: savingsColor }}></div>
                      <span className="font-semibold" style={{ color: savingsColor }}>Savings</span>
                      <span className="font-bold text-foreground">{Math.round(savingsPct)}%</span>
                    </div>
                  )}
                </div>

                {/* Health Score Badge (matching desktop) */}
                {healthData && (
                  <div className="flex justify-center">
                    <Link
                      to="/reports"
                      className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[10px] font-semibold transition-colors ${getHealthBadgeStyle(healthData.totalScore)}`}
                      title={`Financial Health: ${healthData.label}`}
                    >
                      <Activity className={`w-3 h-3 ${getHealthIconColor(healthData.totalScore)}`} />
                      Score: {healthData.totalScore}
                    </Link>
                  </div>
                )}
              </motion.div>
            </motion.div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
});

export default MobileRemainingBudgetCard;