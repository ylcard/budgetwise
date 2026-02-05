import { Card, CardContent } from "@/components/ui/card";
import { AlertCircle, Calendar, Wallet } from "lucide-react";
import { formatCurrency } from "../utils/currencyUtils";
import { motion } from "framer-motion";
import { FINANCIAL_PRIORITIES } from "../utils/constants";
import { memo, useEffect, useRef, useState } from "react";
import { getMonthName } from "../utils/dateUtils";
import confetti from "canvas-confetti";

const MobileRemainingBudgetCard = memo(function MobileRemainingBudgetCard({
    currentMonthIncome,
    currentMonthExpenses,
    settings,
    isLoading,
    monthNavigator,
    selectedMonth,
    breakdown,
    selectedYear
}) {
    if (!settings) return null;

    const safeIncome = currentMonthIncome && currentMonthIncome > 0 ? currentMonthIncome : 1;

    // --- Programmatic Transition Logic ---
    const isEmptyMonth = (!currentMonthIncome || currentMonthIncome === 0) && (!currentMonthExpenses || currentMonthExpenses === 0);

    // We use a local state to "hold" the previous view during loading
    const [displayAsEmpty, setDisplayAsEmpty] = useState(isEmptyMonth);
    const [isTransitioning, setIsTransitioning] = useState(isLoading);

    useEffect(() => {
        if (!isLoading) {
            setDisplayAsEmpty(isEmptyMonth);
            setIsTransitioning(false);
        } else {
            setIsTransitioning(true);
        }
    }, [isLoading, isEmptyMonth]);

    const totalSpent = currentMonthExpenses;
    const savingsAmount = Math.max(0, currentMonthIncome - totalSpent);
    const isTotalOver = totalSpent > currentMonthIncome;

    // --- LOGIC FIX: Use Actual Breakdown (Paid + Unpaid) instead of Limits ---
    const needsData = breakdown?.needs || { paid: 0, unpaid: 0 };
    const needsTotal = (needsData.paid || 0) + (needsData.unpaid || 0);

    const wantsData = breakdown?.wants || {};
    const wantsTotal = (wantsData.directPaid || 0) + (wantsData.customPaid || 0) +
        (wantsData.directUnpaid || 0) + (wantsData.customUnpaid || 0);

    // Calculate Percentages based on Income (or Expenses if over limit)
    const calculationBase = isTotalOver ? currentMonthExpenses : safeIncome;
    const needsPct = (needsTotal / calculationBase) * 100;
    const wantsPct = (wantsTotal / calculationBase) * 100;
    const savingsPct = isTotalOver ? 0 : Math.max(0, 100 - needsPct - wantsPct);

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

    const savingsPctDisplay = (savingsAmount / safeIncome) * 100;

    return (
        <Card className="border-none shadow-md bg-white overflow-hidden h-full flex flex-col relative">
            <CardContent className="p-4 flex-1 flex flex-col">
                {/* Top Navigation Bar - Centered Month Navigator */}
                <div className="flex justify-center mb-6">
                    {monthNavigator}
                </div>

                {/* Main Content */}
                <div className="relative flex flex-col items-center justify-center flex-1 gap-4 min-h-[320px]">
                    <AnimatePresence mode="wait">
                        {displayAsEmpty ? (
                            <motion.div
                                key="empty"
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, scale: 0.95 }}
                                className="flex flex-col items-center justify-center py-6 text-center space-y-5 w-full max-w-[280px] mx-auto"
                            >
                                <div className="w-16 h-16 bg-emerald-50 rounded-full flex items-center justify-center shadow-sm">
                                    <Calendar className="w-8 h-8 text-emerald-600" />
                                </div>
                                <div className="space-y-2">
                                    <h3 className="text-xl font-bold text-gray-900">Ready to plan for {getMonthName(selectedMonth)}?</h3>
                                    <p className="text-gray-500 text-sm leading-relaxed">
                                        Start by adding your expected income to see your savings potential and unlock your budget goals.
                                    </p>
                                </div>
                            </motion.div>
                        ) : (
                            <motion.div
                                key="chart"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: isTransitioning ? 0.4 : 1 }}
                                exit={{ opacity: 0 }}
                                className="w-full space-y-4"
                            >
                                {/* Donut Chart */}
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
                                            stroke="#F3F4F6"
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
                                        <motion.div
                                            animate={{ scale: [0.95, 1], opacity: 1 }}
                                            transition={{ duration: 0.3 }}
                                            className="text-center"
                                        >
                                            <div className="text-3xl font-extrabold text-gray-900">
                                                {Math.round(savingsPctDisplay)}%
                                            </div>
                                            <div className="text-xs font-semibold text-emerald-600">Saved</div>
                                        </motion.div>
                                    </div>
                                </div>

                                {/* Summary Stats */}
                                <div className="w-full space-y-3">
                                    {/* Income/Spent Summary */}
                                    <div className="text-center space-y-1">
                                        {isTotalOver ? (
                                            <h3 className="text-lg font-bold text-red-600 flex items-center justify-center gap-2">
                                                Over Limit <AlertCircle className="w-5 h-5" />
                                            </h3>
                                        ) : (
                                            <p className="text-sm font-medium text-gray-500">
                                                Spent <strong className="text-gray-900">{formatCurrency(totalSpent, settings)}</strong> of <strong>{formatCurrency(currentMonthIncome, settings)}</strong>
                                            </p>
                                        )}
                                        {!isTotalOver && (
                                            <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-gray-50 border border-gray-100">
                                                <Wallet className="w-3.5 h-3.5 text-gray-500" />
                                                <span className="text-sm font-medium text-gray-600">Left: {formatCurrency(savingsAmount, settings)}</span>
                                            </div>
                                        )}
                                    </div>

                                    {/* Legend */}
                                    <div className="flex flex-wrap justify-center items-center gap-x-4 gap-y-2 text-[10px] sm:text-xs px-1">
                                        <div className="flex items-center gap-1.5">
                                            <span className="font-semibold" style={{ color: needsColor }}>{FINANCIAL_PRIORITIES.needs.label}</span>
                                            <span className="font-bold text-gray-900">{Math.round(needsPct)}%</span>
                                        </div>
                                        <div className="flex items-center gap-1.5">
                                            <span className="font-semibold" style={{ color: wantsColor }}>{FINANCIAL_PRIORITIES.wants.label}</span>
                                            <span className="font-bold text-gray-900">{Math.round(wantsPct)}%</span>
                                        </div>
                                        <div className="flex items-center gap-1.5">
                                            <span className="font-semibold" style={{ color: savingsColor }}>Savings</span>
                                            <span className="font-bold text-gray-900">{Math.round(savingsPct)}%</span>
                                        </div>
                                    </div>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </CardContent>
        </Card>
    );
});

export default MobileRemainingBudgetCard;