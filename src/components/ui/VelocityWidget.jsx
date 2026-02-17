import { useState, useMemo, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis } from "recharts";
import { format, getDaysInMonth, isSameDay, subMonths, startOfMonth, endOfMonth, isAfter, isBefore, getDate, isToday } from "date-fns";
import { formatCurrency } from "../utils/currencyUtils";
import { useTransactions } from "../hooks/useBase44Entities";
import { formatDateString, parseDate } from "../utils/dateUtils";

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
    }, [transactions, selectedMonth, selectedYear, historyTxns]);

    // Calculate Totals for the "Idle" state
    const monthTotals = useMemo(() => {
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
        if (activeIndex !== null) {
            const data = chartData[activeIndex];
            return {
                ...data,
                // If it's a future prediction, use the predicted value for the display
                expense: data.isFuture ? data.predictedExpense : data.expense,
                income: data.isFuture ? data.predictedIncome : data.income,
                label: data.isPrediction ? `${data.label} (Est.)` : data.label
            };
        }
        // For total, we sum Actual + Future Predictions
        return {
            income: monthTotals.income + monthTotals.predictedIncome,
            expense: monthTotals.expense + monthTotals.predictedExpense,
            label: 'Total Projected Flow'
        };
    }, [activeIndex, chartData, monthTotals]);

    // Haptic feedback function (browser support varies, but good for mobile)
    const triggerHaptic = () => {
        if (navigator.vibrate) navigator.vibrate(5);
    };

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
            triggerHaptic();
        }
    };

    const onMouseMove = (e) => handleInteraction(e.clientX);
    const onTouchMove = (e) => {
        // Prevent scroll while scrubbing
        // e.preventDefault(); // Optional: might block page scroll
        handleInteraction(e.touches[0].clientX);
    };

    const handleReset = () => {
        setActiveIndex(null);
    };

    return (
        <div
            className="w-full bg-slate-900 rounded-3xl p-6 text-white shadow-2xl overflow-hidden relative isolate"
        >
            {/* Background Glow */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/10 blur-[80px] rounded-full -z-10" />
            <div className="absolute bottom-0 left-0 w-64 h-64 bg-rose-500/10 blur-[80px] rounded-full -z-10" />

            {/* Header Info */}
            <div className="flex justify-between items-end mb-8">
                <div>
                    <AnimatePresence mode="popLayout" initial={false}>
                        <motion.div
                            key={displayData.label}
                            initial={{ opacity: 0, y: 10, filter: "blur(4px)" }}
                            animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                            exit={{ opacity: 0, y: -10, filter: "blur(4px)" }}
                            transition={{ type: "spring", stiffness: 300, damping: 30 }}
                            className="flex flex-col"
                        >
                            <p className="text-sm font-medium uppercase tracking-wider text-slate-400">
                                {displayData.label}
                            </p>
                            <div className="flex items-baseline gap-4 mt-1">
                                <h2 className="text-3xl font-bold tabular-nums text-emerald-400">
                                    +{formatCurrency(displayData.income || 0, settings)}
                                </h2>
                                <h2 className="text-2xl font-bold tabular-nums text-rose-400 opacity-90">
                                    -{formatCurrency(displayData.expense || 0, settings)}
                                </h2>
                            </div>
                        </motion.div>
                    </AnimatePresence>
                </div>
            </div>

            {/* Interactive Chart */}
            {/* We add the Ref here to measure the exact visual width of the chart area */}
            <div
                className="h-40 -mx-6 relative cursor-crosshair touch-none"
                ref={containerRef}
                onMouseMove={onMouseMove}
                onMouseLeave={handleReset}
                onTouchMove={onTouchMove}
                onTouchEnd={handleReset}
            >
                <ResponsiveContainer width="100%" height="100%">
                    <AreaChart
                        data={chartData}
                        margin={{ top: 0, right: 0, left: 0, bottom: 0 }}
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
                        <Tooltip
                            cursor={{ stroke: "#fff", strokeWidth: 1, strokeDasharray: "4 4" }}
                            content={<></>} // Hide default tooltip, we use the header
                        />
                        <Area
                            type="monotone"
                            dataKey="income"
                            stroke="#10b981"
                            strokeWidth={3}
                            fillOpacity={1}
                            fill="url(#colorIncome)"
                            animationDuration={500}
                            connectNulls={true}
                        />

                        {/* PREDICTED INCOME (Dashed) */}
                        <Area
                            type="monotone"
                            dataKey="predictedIncome"
                            stroke="#10b981"
                            strokeWidth={2}
                            strokeDasharray="5 5"
                            fillOpacity={0.1}
                            fill="url(#colorIncome)"
                            animationDuration={0}
                            connectNulls={true}
                        />

                        <Area
                            type="monotone"
                            dataKey="expense"
                            stroke="#f43f5e"
                            strokeWidth={3}
                            fillOpacity={1}
                            fill="url(#colorExpense)"
                            animationDuration={500}
                            connectNulls={true}
                        />

                        {/* PREDICTED DATA (Dashed) */}
                        <Area
                            type="monotone"
                            dataKey="predictedExpense"
                            stroke="#f43f5e"
                            strokeWidth={2}
                            strokeDasharray="5 5"
                            fillOpacity={0.1}
                            fill="url(#colorExpense)"
                            animationDuration={0}
                            connectNulls={true}
                        />
                    </AreaChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
};
