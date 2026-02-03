import { Card, CardContent } from "@/components/ui/card";
import { TrendingUp, AlertCircle, Target, Calendar, Wallet } from "lucide-react";
import { formatCurrency } from "../utils/currencyUtils";
import { motion, AnimatePresence } from "framer-motion";
import { FINANCIAL_PRIORITIES } from "../utils/constants";
import { memo, useMemo, useEffect, useRef } from "react";
import { getMonthName } from "../utils/dateUtils";
import confetti from "canvas-confetti";

// CREATED 03-Feb-2026: Mobile-optimized version with donut chart for Essential/Lifestyle/Savings visualization
const MobileRemainingBudgetCard = memo(function MobileRemainingBudgetCard({
    currentMonthIncome,
    currentMonthExpenses,
    settings,
    monthNavigator,
    addIncomeButton,
    addExpenseButton,
    importDataButton,
    systemBudgets = [],
    selectedMonth,
    selectedYear
}) {
    if (!settings) return null;

    const safeIncome = currentMonthIncome && currentMonthIncome > 0 ? currentMonthIncome : 1;
    
    // Extract budget data
    const needsBudget = systemBudgets.find(sb => sb.systemBudgetType === 'needs');
    const wantsBudget = systemBudgets.find(sb => sb.systemBudgetType === 'wants');
    const savingsBudget = systemBudgets.find(sb => sb.systemBudgetType === 'savings');

    const needsLimit = needsBudget?.targetAmount || needsBudget?.budgetAmount || 0;
    const wantsLimit = wantsBudget?.targetAmount || wantsBudget?.budgetAmount || 0;
    const savingsLimit = savingsBudget?.targetAmount || savingsBudget?.budgetAmount || 0;

    const totalSpent = currentMonthExpenses;
    const savingsAmount = Math.max(0, currentMonthIncome - totalSpent);

    // Donut chart calculations
    const needsColor = FINANCIAL_PRIORITIES.needs.color;
    const wantsColor = FINANCIAL_PRIORITIES.wants.color;
    const savingsColor = FINANCIAL_PRIORITIES.savings.color;

    // Calculate proportions based on limits (goals)
    const totalBudget = needsLimit + wantsLimit + savingsLimit;
    const needsPct = totalBudget > 0 ? (needsLimit / totalBudget) * 100 : 33.33;
    const wantsPct = totalBudget > 0 ? (wantsLimit / totalBudget) * 100 : 33.33;
    const savingsPct = totalBudget > 0 ? (savingsLimit / totalBudget) * 100 : 33.34;

    // Donut SVG parameters
    const size = 200;
    const strokeWidth = 32;
    const radius = (size - strokeWidth) / 2;
    const circumference = 2 * Math.PI * radius;

    // Calculate stroke dash offsets for each segment
    const needsLength = (needsPct / 100) * circumference;
    const wantsLength = (wantsPct / 100) * circumference;
    const savingsLength = (savingsPct / 100) * circumference;

    const needsOffset = 0;
    const wantsOffset = needsLength;
    const savingsOffset = needsLength + wantsLength;

    // Empty month detection
    const isEmptyMonth = (!currentMonthIncome || currentMonthIncome === 0) && (!currentMonthExpenses || currentMonthExpenses === 0);
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

    const savingsPctDisplay = (savingsAmount / safeIncome) * 100;
    const isTotalOver = totalSpent > currentMonthIncome;

    return (
        <Card className="border-none shadow-md bg-white overflow-hidden h-full flex flex-col">
            <CardContent className="p-4 flex-1 flex flex-col">
                {/* Top Navigation Bar */}
                <div className="flex items-center justify-between mb-4">
                    <div className="flex-1">
                        {monthNavigator}
                    </div>
                    <div className="flex items-center gap-2">
                        {importDataButton}
                        {addExpenseButton}
                        {isEmptyMonth && addIncomeButton ? (
                            <motion.div
                                animate={{ scale: [1, 1.1, 1] }}
                                transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                                className="relative z-10"
                            >
                                <div className="absolute -inset-2 bg-emerald-400/50 rounded-lg blur-md animate-pulse"></div>
                                <div className="relative">{addIncomeButton}</div>
                            </motion.div>
                        ) : (
                            addIncomeButton
                        )}
                    </div>
                </div>

                {/* Main Content */}
                <div className="flex flex-col items-center justify-center flex-1 gap-4">
                    {isEmptyMonth ? (
                        <div className="flex flex-col items-center justify-center py-10 text-center space-y-5 animate-in fade-in zoom-in-95 duration-500">
                            <div className="w-16 h-16 bg-emerald-50 rounded-full flex items-center justify-center shadow-sm">
                                <Calendar className="w-8 h-8 text-emerald-600" />
                            </div>
                            <div className="space-y-2 max-w-sm">
                                <h3 className="text-xl font-bold text-gray-900">Ready to plan for {monthName}?</h3>
                                <p className="text-gray-500 text-sm leading-relaxed">
                                    Start by adding your expected income to see your savings potential and unlock your budget goals.
                                </p>
                            </div>
                        </div>
                    ) : (
                        <>
                            {/* Donut Chart */}
                            <div className="relative">
                                <svg width={size} height={size} className="transform -rotate-90">
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
                                        strokeDasharray={circumference}
                                        initial={{ strokeDashoffset: circumference }}
                                        animate={{ strokeDashoffset: circumference - needsLength }}
                                        transition={{ duration: 1, ease: "easeOut" }}
                                        strokeLinecap="round"
                                    />
                                    
                                    {/* Wants segment */}
                                    <motion.circle
                                        cx={size / 2}
                                        cy={size / 2}
                                        r={radius}
                                        fill="none"
                                        stroke={wantsColor}
                                        strokeWidth={strokeWidth}
                                        strokeDasharray={circumference}
                                        initial={{ strokeDashoffset: circumference }}
                                        animate={{ strokeDashoffset: circumference - wantsLength }}
                                        transition={{ duration: 1, ease: "easeOut", delay: 0.2 }}
                                        strokeLinecap="round"
                                        style={{
                                            strokeDashoffset: circumference - wantsOffset,
                                            transform: `rotate(${(needsPct / 100) * 360}deg)`,
                                            transformOrigin: 'center'
                                        }}
                                    />
                                    
                                    {/* Savings segment */}
                                    <motion.circle
                                        cx={size / 2}
                                        cy={size / 2}
                                        r={radius}
                                        fill="none"
                                        stroke={savingsColor}
                                        strokeWidth={strokeWidth}
                                        strokeDasharray={circumference}
                                        initial={{ strokeDashoffset: circumference }}
                                        animate={{ strokeDashoffset: circumference - savingsLength }}
                                        transition={{ duration: 1, ease: "easeOut", delay: 0.4 }}
                                        strokeLinecap="round"
                                        style={{
                                            strokeDashoffset: circumference - savingsOffset,
                                            transform: `rotate(${((needsPct + wantsPct) / 100) * 360}deg)`,
                                            transformOrigin: 'center'
                                        }}
                                    />
                                </svg>

                                {/* Center Text */}
                                <div className="absolute inset-0 flex flex-col items-center justify-center">
                                    <motion.div
                                        initial={{ scale: 0 }}
                                        animate={{ scale: 1 }}
                                        transition={{ delay: 0.5, type: "spring", stiffness: 200 }}
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
                                <div className="flex justify-center items-center gap-4 text-xs">
                                    <div className="flex items-center gap-1.5">
                                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: needsColor }}></div>
                                        <span className="text-gray-600">{FINANCIAL_PRIORITIES.needs.label}</span>
                                        <span className="font-bold text-gray-900">{Math.round(needsPct)}%</span>
                                    </div>
                                    <div className="flex items-center gap-1.5">
                                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: wantsColor }}></div>
                                        <span className="text-gray-600">{FINANCIAL_PRIORITIES.wants.label}</span>
                                        <span className="font-bold text-gray-900">{Math.round(wantsPct)}%</span>
                                    </div>
                                    <div className="flex items-center gap-1.5">
                                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: savingsColor }}></div>
                                        <span className="text-gray-600">Savings</span>
                                        <span className="font-bold text-gray-900">{Math.round(savingsPct)}%</span>
                                    </div>
                                </div>
                            </div>
                        </>
                    )}
                </div>
            </CardContent>
        </Card>
    );
});

export default MobileRemainingBudgetCard;