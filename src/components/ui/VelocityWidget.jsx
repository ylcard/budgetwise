import { useState, useMemo, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis } from "recharts";
import { format, getDaysInMonth, parseISO, isSameDay, subMonths, startOfMonth, endOfMonth, isAfter, isBefore, getDate, isToday } from "date-fns";
import { formatCurrency } from "../utils/currencyUtils";
import { useTransactions } from "../hooks/useBase44Entities";

export const VelocityWidget = ({ transactions = [], settings, selectedMonth, selectedYear }) => {
    // --- 0. PREDICTION ENGINE CONTEXT ---
    // We need 6 months of history to calculate the "Puzzle" (Anchors vs Fillers)
    // We fetch this quietly in the background.
    const historyStart = useMemo(() => format(startOfMonth(subMonths(new Date(), 6)), 'yyyy-MM-dd'), []);
    const historyEnd = useMemo(() => format(endOfMonth(subMonths(new Date(), 1)), 'yyyy-MM-dd'), []);

    const { transactions: historyTxns } = useTransactions(historyStart, historyEnd);

    // 1. Process Data for the selected month
    const chartData = useMemo(() => {
        const daysInMonth = getDaysInMonth(new Date(selectedYear, selectedMonth));

        const today = new Date();
        const isCurrentMonth = selectedYear === today.getFullYear() && selectedMonth === today.getMonth();

        // --- STEP A: CALCULATE "THE PUZZLE" PIECES ---
        let predictionMap = {};

        if (isCurrentMonth && historyTxns.length > 0) {
            // 1. Analyze History by Day of Month (1..31)
            const dayStats = {}; // { 1: { count: 0, total: 0 }, ... }
            let totalHistoryExpense = 0;

            historyTxns.forEach(t => {
                if (t.type !== 'expense') return;
                const day = getDate(parseISO(t.date));
                if (!dayStats[day]) dayStats[day] = { count: 0, amounts: [] };
                dayStats[day].count++;
                dayStats[day].amounts.push(Number(t.amount));
                totalHistoryExpense += Number(t.amount);
            });

            const avgMonthlyExpense = totalHistoryExpense / 6;

            // 2. Calculate Current "Burn"
            const currentSpent = transactions
                .filter(t => t.type === 'expense' || t.type === 'savings')
                .reduce((sum, t) => sum + Number(t.amount), 0);

            // 3. Define The Gap
            let remainingBudget = Math.max(0, avgMonthlyExpense - currentSpent);

            // 4. Identify ANCHORS (High Confidence > 85%) & FILLERS
            const todayDay = getDate(today);
            const anchors = [];
            const fillers = [];

            // Only predict for days AFTER today
            for (let d = todayDay + 1; d <= daysInMonth; d++) {
                const stat = dayStats[d];
                if (!stat) continue;

                const probability = stat.count / 6;
                const avgAmount = stat.amounts.reduce((a, b) => a + b, 0) / stat.count;

                const item = { day: d, amount: avgAmount, probability };

                if (probability > 0.8) {
                    anchors.push(item);
                } else {
                    fillers.push(item);
                }
            }

            // 5. Solve the Puzzle
            // First, place Anchors (Fixed Reality)
            anchors.forEach(a => {
                predictionMap[a.day] = (predictionMap[a.day] || 0) + a.amount;
                remainingBudget -= a.amount;
            });

            // Second, distribute Fillers if we have budget left (Variable Reality)
            if (remainingBudget > 0) {
                // Sort fillers by probability (most likely first)
                fillers.sort((a, b) => b.probability - a.probability);

                for (const filler of fillers) {
                    if (remainingBudget <= 0) break;
                    const take = Math.min(remainingBudget, filler.amount);
                    predictionMap[filler.day] = (predictionMap[filler.day] || 0) + take;
                    remainingBudget -= take;
                }
            }
        }

        // Create an array of days 1..N
        return Array.from({ length: daysInMonth }, (_, i) => {
            const currentDay = i + 1;
            const dateObj = new Date(selectedYear, selectedMonth, currentDay);
            const dateStr = format(dateObj, 'yyyy-MM-dd');
            const isFutureDate = isAfter(dateObj, today);
            const isTodayDate = isToday(dateObj);

            // Filter transactions for this specific day
            const dayTxns = transactions.filter(t => {
                // Use paidDate if available, else date
                const tDate = t.paidDate ? parseISO(t.paidDate) : parseISO(t.date);
                return isSameDay(tDate, dateObj);
            });

            const income = dayTxns
                .filter(t => t.type === 'income')
                .reduce((sum, t) => sum + Number(t.amount), 0);

            const expense = dayTxns
                .filter(t => t.type === 'expense' || t.type === 'savings') // specific logic can be adjusted
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
                // For Today: we start projection at the actual value to ensure lines connect
                predictedExpense: isFutureDate ? (predictionMap[currentDay] || 0) : (isTodayDate ? expense : null),
                // We can optionally predict income too, but sticking to expense for the "Flow" logic
                predictedIncome: isFutureDate ? 0 : (isTodayDate ? income : null),

                isFuture: isFutureDate,
                label: format(dateObj, 'MMM d'),
                isPrediction: isFutureDate && (predictionMap[currentDay] > 0)
            };
        });
    }, [transactions, selectedMonth, selectedYear, historyTxns]);

    // Calculate Totals for the "Idle" state
    const monthTotals = useMemo(() => {
        return chartData.reduce((acc, day) => ({
            income: acc.income + (day.income || 0),
            expense: acc.expense + (day.expense || 0),
            predictedExpense: acc.predictedExpense + (day.predictedExpense || 0)
        }), { income: 0, expense: 0, predictedExpense: 0 });
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
            income: monthTotals.income,
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
