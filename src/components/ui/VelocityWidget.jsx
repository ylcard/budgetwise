import { useState, useMemo, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Area, AreaChart, ResponsiveContainer, Tooltip } from "recharts";
import { format, getDaysInMonth, isSameDay, subMonths, startOfMonth, endOfMonth, isAfter, getDate, isToday } from "date-fns";
import { formatCurrency } from "../utils/currencyUtils";
import { useTransactions } from "../hooks/useBase44Entities";
import { formatDateString, parseDate } from "../utils/dateUtils";
import { ChevronDown, ChevronUp } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * PURE FUNCTION: High-Performance Projection Engine
 * Uses a "Weighted Heatmap" approach to distribute remaining expected volume
 * across future days based on historical intensity.
 * Complexity: O(N) - Single pass over history.
 */
const calculateDailyProjections = (historyTxns, currentTxns, daysInMonth, todayDay, type, settings) => {
    const predictionMap = {};
    if (!historyTxns || historyTxns.length === 0) return predictionMap;

    // --- MODE A: DISCRETE INCOME ENGINE ---
    if (type === 'income') {
        const months = {}; // Grouped by YYYY-MM

        historyTxns.forEach(t => {
            if (t.type !== 'income') return;
            const date = t.paidDate ? parseDate(t.paidDate) : parseDate(t.date);
            if (!date) return;
            const key = format(date, 'yyyy-MM');
            if (!months[key]) months[key] = [];
            months[key].push({ amount: Math.abs(Number(t.amount)), day: getDate(date) });
        });

        const monthKeys = Object.keys(months);
        const numMonths = Math.max(1, monthKeys.size || monthKeys.length);

        // 1. Extract Salary (Max transaction per month)
        const monthlySalaries = monthKeys.map(k => {
            const sorted = months[k].sort((a, b) => b.amount - a.amount);
            return sorted[0] || { amount: 0, day: 25 };
        });

        const avgSalary = monthlySalaries.reduce((sum, s) => sum + s.amount, 0) / numMonths;
        const salaryDays = monthlySalaries.map(s => s.day).sort((a, b) => a - b);
        const medianSalaryDay = salaryDays[Math.floor(salaryDays.length / 2)] || 25;

        // 2. Extract "Large Secondary" (> €100 and not the Salary)
        // We use the Median of monthly secondary totals to kill outliers (like August)
        const secondaryMonthlyTotals = monthKeys.map(k => {
            const sorted = months[k].sort((a, b) => b.amount - a.amount);
            return sorted.slice(1)
                .filter(t => t.amount >= 100)
                .reduce((sum, t) => sum + t.amount, 0);
        }).sort((a, b) => a - b);

        const medianSecondaryAmount = secondaryMonthlyTotals[Math.floor(secondaryMonthlyTotals.length / 2)] || 0;

        // 3. Petty Rewards (Average of everything else)
        const totalPetty = monthKeys.reduce((sum, k) => {
            const sorted = months[k].sort((a, b) => b.amount - a.amount);
            const pettySum = sorted.slice(1)
                .filter(t => t.amount < 100)
                .reduce((s, t) => s + t.amount, 0);
            return sum + pettySum;
        }, 0);
        const avgPettyTotal = totalPetty / numMonths;

        // 4. Check Current Month Progress
        const currentIncomes = currentTxns.map(t => Math.abs(Number(t.amount))).sort((a, b) => b - a);
        const currentMax = currentIncomes[0] || 0;
        const currentSecondaryTotal = currentTxns
            .filter(t => {
                const amt = Math.abs(Number(t.amount));
                return amt >= 100 && amt < (avgSalary * 0.8);
            })
            .reduce((sum, t) => sum + Math.abs(Number(t.amount)), 0);

        // --- APPLY PREDICTIONS ---
        // A. Predict Salary if missing (Threshold 80% of average)
        if (currentMax < (avgSalary * 0.8) && medianSalaryDay > todayDay) {
            predictionMap[medianSalaryDay] = (predictionMap[medianSalaryDay] || 0) + avgSalary;
        }

        // B. Predict Secondary if missing and "likely" (occured in > 50% of months)
        const secondaryLikelihood = secondaryMonthlyTotals.filter(v => v > 0).length / numMonths;
        if (currentSecondaryTotal < (medianSecondaryAmount * 0.7) && secondaryLikelihood > 0.5) {
            // We place this roughly in the middle of the remaining month
            const middleDay = Math.min(daysInMonth, Math.max(todayDay + 1, 15));
            predictionMap[middleDay] = (predictionMap[middleDay] || 0) + medianSecondaryAmount;
        }

        // C. Predict Petty (Aggregate into one single expected "Bonus" on the last day)
        if (avgPettyTotal > 0 && todayDay < daysInMonth) {
            predictionMap[daysInMonth] = (predictionMap[daysInMonth] || 0) + avgPettyTotal;
        }

        return predictionMap;
    }

    // --- MODE B: WEIGHTED HEATMAP (For Expenses) ---
    return calculateExpenseHeatmap(historyTxns, currentTxns, daysInMonth, todayDay, type);
};

/**
 * HELPER: Original Heatmap Logic for Expenses
 */
const calculateExpenseHeatmap = (historyTxns, currentTxns, daysInMonth, todayDay, type) => {
    const predictionMap = {};
    let totalHistory = 0;
    const dayWeights = new Array(32).fill(0); // Index 1-31
    const uniqueMonths = new Set();

    // Single Pass: Build Heatmap & Totals
    historyTxns.forEach(t => {
        if (t.type !== type) return;
        // Priority: paidDate -> date for actual cash flow impact
        const effectiveDate = t.paidDate ? parseDate(t.paidDate) : parseDate(t.date);
        if (!effectiveDate) return;

        const amt = Number(t.amount);
        totalHistory += amt;

        // Weighting: We add the AMOUNT to the day's weight.
        dayWeights[getDate(effectiveDate)] += amt;
        uniqueMonths.add(format(effectiveDate, 'yyyy-MM'));
    });

    // Use actual month count to avoid diluting averages for new users
    const numMonths = Math.max(1, uniqueMonths.size);
    const avgMonthly = totalHistory / numMonths;

    // 2. Calculate Remaining "Gap" to fill
    // Use absolute value to ensure math is consistent regardless of sign
    const currentTotal = currentTxns.reduce((sum, t) => {
        return sum + Math.abs(Number(t.amount));
    }, 0);
    let remainingGap = Math.max(0, avgMonthly - currentTotal);

    if (remainingGap <= 0) return predictionMap;

    // 3. Distribute Gap into Future Days
    // We only look at weights for days > today (Future)
    let totalFutureWeight = 0;
    for (let d = todayDay + 1; d <= daysInMonth; d++) {
        totalFutureWeight += dayWeights[d];
    }

    const remainingDays = daysInMonth - todayDay;

    if (totalFutureWeight > 0) {
        // Weighted distribution based on historical "gravity wells"
        for (let d = todayDay + 1; d <= daysInMonth; d++) {
            const share = remainingGap * (dayWeights[d] / totalFutureWeight);
            predictionMap[d] = share;
        }
    } else if (remainingDays > 0) {
        // Fallback: Even distribution if no historical weights exist for future days
        for (let d = todayDay + 1; d <= daysInMonth; d++) {
            predictionMap[d] = remainingGap / remainingDays;
        }
    }

    return predictionMap;
};

export const VelocityWidget = ({ transactions = [], settings, selectedMonth, selectedYear }) => {
    // --- STATE: Expansion (Persisted) ---
    const [isExpanded, setIsExpanded] = useState(() => {
        const saved = localStorage.getItem("velocity_widget_expanded");
        return saved === "true"; // Defaults to false (collapsed) if null
    });

    useEffect(() => {
        localStorage.setItem("velocity_widget_expanded", isExpanded);
    }, [isExpanded]);

    // --- 0. PREDICTION ENGINE CONTEXT ---
    // We need 6 months of history to calculate the "Puzzle" (Anchors vs Fillers)
    // We fetch this quietly in the background.
    const historyStart = useMemo(() => formatDateString(startOfMonth(subMonths(new Date(), 6))), []);
    const historyEnd = useMemo(() => formatDateString(endOfMonth(subMonths(new Date(), 1))), []);

    const { transactions: historyTxns } = useTransactions(historyStart, historyEnd);

    // 1. Calculate Predictions & Data (Memoized & Synchronous but Fast)
    const chartData = useMemo(() => {
        const daysInMonth = getDaysInMonth(new Date(selectedYear, selectedMonth));
        const today = new Date();
        const isCurrentMonth = selectedYear === today.getFullYear() && selectedMonth === today.getMonth();
        const todayDay = getDate(today);

        // -- PROJECTION LOGIC --
        // Only run if viewing current month and history is available
        let predictedExpenses = {};
        let predictedIncomes = {};

        if (isCurrentMonth && historyTxns.length > 0) {
            // Filter current transactions for context
            const currentExpenses = transactions.filter(t => {
                const tDate = t.paidDate ? parseDate(t.paidDate) : parseDate(t.date);
                return t.type === 'expense' && tDate && tDate.getMonth() === selectedMonth && tDate.getFullYear() === selectedYear;
            });
            const currentIncomes = transactions.filter(t => {
                const tDate = t.paidDate ? parseDate(t.paidDate) : parseDate(t.date);
                return t.type === 'income' && tDate && tDate.getMonth() === selectedMonth && tDate.getFullYear() === selectedYear;
            });

            // Run the Heatmap Engine
            predictedExpenses = calculateDailyProjections(historyTxns, currentExpenses, daysInMonth, todayDay, 'expense', settings);
            predictedIncomes = calculateDailyProjections(historyTxns, currentIncomes, daysInMonth, todayDay, 'income', settings);
        }

        // Create an array of days 1..N
        return Array.from({ length: daysInMonth }, (_, i) => {
            const currentDay = i + 1;
            const dateObj = new Date(selectedYear, selectedMonth, currentDay);
            const dateStr = formatDateString(dateObj);
            const isFutureDate = isAfter(dateObj, today);
            const isTodayDate = isToday(dateObj);

            // Filter transactions for this specific day
            const dayTxns = transactions.filter(t => {
                // Use paidDate if available, else date
                const tDate = t.paidDate ? parseDate(t.paidDate) : parseDate(t.date);
                if (!tDate) return false;
                return isSameDay(tDate, dateObj);
            });

            const income = dayTxns
                .filter(t => t.type === 'income')
                .reduce((sum, t) => sum + Number(t.amount), 0);

            const expense = dayTxns
                .filter(t => t.type === 'expense')
                .reduce((sum, t) => sum + Number(t.amount), 0);

            // Map data for charts
            // We need continuity: "Today" needs both Real and Projected data points to connect lines
            return {
                day: currentDay,
                fullDate: dateStr,

                // Real Data (Past + Today)
                income: isFutureDate ? null : income,
                expense: isFutureDate ? null : expense,

                // Projected Data (Today + Future)
                // We read from the calculated map
                predictedExpense: isFutureDate ? (predictedExpenses[currentDay] || 0) : (isTodayDate ? expense : null),
                predictedIncome: isFutureDate ? (predictedIncomes[currentDay] || 0) : (isTodayDate ? income : null),

                isFuture: isFutureDate,
                label: format(dateObj, 'MMM d'),
                isPrediction: isFutureDate && ((predictedExpenses[currentDay] > 0) || (predictedIncomes[currentDay] > 0))
            };
        });
    }, [transactions, selectedMonth, selectedYear, historyTxns, settings]);

    // Calculate Totals for the "Idle" state
    const monthTotals = useMemo(() => {
        if (!chartData || chartData.length === 0) return { income: 0, expense: 0, predictedExpense: 0, predictedIncome: 0 };
        return chartData.reduce((acc, day) => ({
            income: acc.income + (day.income || 0),
            expense: acc.expense + (day.expense || 0),
            predictedExpense: acc.predictedExpense + (day.predictedExpense || 0),
            predictedIncome: acc.predictedIncome + (day.predictedIncome || 0)
        }), { income: 0, expense: 0, predictedExpense: 0, predictedIncome: 0 });
    }, [chartData]);

    const [activeIndex, setActiveIndex] = useState(null);
    const containerRef = useRef(null);

    // Determine what to show: Hovered Day OR Month Total
    const displayData = useMemo(() => {
        if (activeIndex !== null && chartData[activeIndex]) {
            const data = chartData[activeIndex];
            return {
                income: data.isFuture ? data.predictedIncome : data.income,
                expense: data.isFuture ? data.predictedExpense : data.expense,
                label: data.isPrediction ? `${data.label} (Est.)` : data.label,
                isTotal: false
            };
        }

        const today = new Date();
        const isPast = selectedYear < today.getFullYear() || (selectedYear === today.getFullYear() && selectedMonth < today.getMonth());

        // For total, we sum Actual + Future Predictions
        return {
            income: monthTotals.income + monthTotals.predictedIncome,
            expense: monthTotals.expense + monthTotals.predictedExpense,
            label: isPast ? 'Total Cash Flow' : 'Total Projected Flow',
            isTotal: true
        };
    }, [activeIndex, chartData, monthTotals, selectedMonth, selectedYear]);

    // Haptic feedback function (browser support varies, but good for mobile)
    /*
    const triggerHaptic = () => {
        if (navigator.vibrate) navigator.vibrate(5);
    };
    */

    // --- OUTSIDE THE BOX: Manual Hit Detection ---
    // We calculate which "slot" the mouse is in based on raw pixel width.
    // This bypasses Recharts' internal hitbox logic entirely.
    const handleInteraction = (clientX) => {
        if (!containerRef.current || chartData.length === 0) return;

        const { left, width } = containerRef.current.getBoundingClientRect();
        const x = clientX - left;

        // Calculate percentage across the container (0.0 to 1.0)
        const percent = Math.max(0, Math.min(1, x / width));

        // Map to an index
        const newIndex = Math.floor(percent * chartData.length);

        // Only update if changed
        if (newIndex !== activeIndex) {
            setActiveIndex(newIndex);
            // triggerHaptic();
            if (navigator.vibrate) navigator.vibrate(5);
        }
    };

    /*
    const onMouseMove = (e) => handleInteraction(e.clientX);
    const onTouchMove = (e) => {
        // Prevent scroll while scrubbing
        // e.preventDefault(); // Optional: might block page scroll
        handleInteraction(e.touches[0].clientX);
    };
    */

    const handleReset = () => {
        setActiveIndex(null);
    };

    return (
        <motion.div
            layout
            initial={false}
            className={cn(
                // Layout
                "mx-4 md:mx-0 overflow-hidden relative isolate",
                // Appearance
                "bg-white dark:bg-slate-900",
                "rounded-2xl shadow-sm dark:shadow-md",
                "border border-slate-100 dark:border-slate-800"
            )}
        >
            {/* Header / Trigger Area */}
            <div
                onClick={() => setIsExpanded(!isExpanded)}
                className="p-4 md:p-5 cursor-pointer flex flex-col relative z-10 group"
            >
                {/* Background Glows (Subtle) */}
                <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 dark:bg-emerald-500/10 blur-[40px] rounded-full -z-10 transition-opacity duration-500" style={{ opacity: isExpanded ? 1 : 0.5 }} />
                <div className="absolute bottom-0 left-0 w-32 h-32 bg-rose-500/5 dark:bg-rose-500/10 blur-[40px] rounded-full -z-10 transition-opacity duration-500" style={{ opacity: isExpanded ? 1 : 0.5 }} />

                <div className="flex justify-between items-center w-full">
                    {/* Left Side: Label & Data */}
                    <div className="flex flex-col flex-1">
                        <div className="flex items-center gap-2">
                            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                                {displayData.label}
                            </p>
                        </div>

                        <div className="flex items-baseline gap-3 mt-1">
                            <h2 className="text-lg md:text-xl font-bold tabular-nums text-emerald-600 dark:text-emerald-400">
                                +{formatCurrency(displayData.income || 0, settings)}
                            </h2>
                            <h2 className="text-lg md:text-xl font-bold tabular-nums text-rose-500 dark:text-rose-400 opacity-90">
                                -{formatCurrency(displayData.expense || 0, settings)}
                            </h2>
                        </div>
                    </div>

                    {/* Right Side: Chevron */}
                    <div className="text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-300 transition-colors">
                        {isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                    </div>
                </div>
            </div>

            {/* Expandable Chart Area */}
            <AnimatePresence>
                {isExpanded && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.3, ease: "easeInOut" }}
                        className="overflow-hidden bg-slate-50/50 dark:bg-slate-900/50 border-t border-slate-100 dark:border-slate-800"
                    >
                        <div
                            className="h-40 relative cursor-crosshair touch-none pt-4 pb-0"
                            ref={containerRef}
                            onMouseMove={(e) => handleInteraction(e.clientX)}
                            onMouseLeave={handleReset}
                            onTouchMove={(e) => handleInteraction(e.touches[0].clientX)}
                            onTouchEnd={handleReset}
                        >
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart
                                    data={chartData}
                                    margin={{ top: 5, right: 0, left: 0, bottom: 0 }}
                                >
                                    <defs>
                                        <linearGradient id="colorIncome" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                                            <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                                        </linearGradient>
                                        <linearGradient id="colorExpense" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.3} />
                                            <stop offset="95%" stopColor="#f43f5e" stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <Tooltip cursor={{ stroke: "#94a3b8", strokeWidth: 1, strokeDasharray: "4 4" }} content={<></>} />

                                    <Area
                                        type="monotone"
                                        dataKey="income"
                                        stroke="#10b981"
                                        strokeWidth={3}
                                        fill="url(#colorIncome)"
                                        connectNulls={true}
                                        animationDuration={500}
                                    />
                                    <Area
                                        type="monotone"
                                        dataKey="predictedIncome"
                                        stroke="#10b981"
                                        strokeWidth={2}
                                        strokeDasharray="5 5"
                                        fill="url(#colorIncome)"
                                        fillOpacity={0.1}
                                        connectNulls={true}
                                        animationDuration={0}
                                    />
                                    <Area
                                        type="monotone"
                                        dataKey="expense"
                                        stroke="#f43f5e"
                                        strokeWidth={3}
                                        fill="url(#colorExpense)"
                                        connectNulls={true}
                                        animationDuration={500}
                                    />
                                    <Area
                                        type="monotone"
                                        dataKey="predictedExpense"
                                        stroke="#f43f5e"
                                        strokeWidth={2}
                                        strokeDasharray="5 5"
                                        fill="url(#colorExpense)"
                                        fillOpacity={0.1}
                                        connectNulls={true}
                                        animationDuration={0}
                                    />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>

                        {/* Legend / Helper Text */}
                        <div className="flex justify-center gap-4 pb-4 text-[10px] text-slate-400 uppercase tracking-widest font-semibold">
                            <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-emerald-500"></div> Income</span>
                            <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-rose-500"></div> Expense</span>
                            <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-full border border-slate-400 border-dashed"></div> Projected</span>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </motion.div>
    );
};
