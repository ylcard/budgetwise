import { useState, useMemo, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis } from "recharts";
import { format, getDaysInMonth, parseISO, isSameDay } from "date-fns";
import { formatCurrency } from "../utils/currencyUtils";

export const VelocityWidget = ({ transactions = [], settings, selectedMonth, selectedYear }) => {
    // 1. Process Data for the selected month
    const chartData = useMemo(() => {
        const daysInMonth = getDaysInMonth(new Date(selectedYear, selectedMonth));

        // Create an array of days 1..N
        return Array.from({ length: daysInMonth }, (_, i) => {
            const currentDay = i + 1;
            const dateObj = new Date(selectedYear, selectedMonth, currentDay);
            const dateStr = format(dateObj, 'yyyy-MM-dd');

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

            return {
                day: currentDay,
                fullDate: dateStr,
                income,
                expense,
                label: format(dateObj, 'MMM d')
            };
        });
    }, [transactions, selectedMonth, selectedYear]);

    // Calculate Totals for the "Idle" state
    const monthTotals = useMemo(() => {
        return chartData.reduce((acc, day) => ({
            income: acc.income + day.income,
            expense: acc.expense + day.expense
        }), { income: 0, expense: 0 });
    }, [chartData]);

    const [activeIndex, setActiveIndex] = useState(null);
    const containerRef = useRef(null);

    // Determine what to show: Hovered Day OR Month Total
    const displayData = activeIndex !== null
        ? chartData[activeIndex]
        : { ...monthTotals, label: 'Total Monthly Flow' };

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
                        />
                        <Area
                            type="monotone"
                            dataKey="expense"
                            stroke="#f43f5e"
                            strokeWidth={3}
                            fillOpacity={1}
                            fill="url(#colorExpense)"
                            animationDuration={500}
                        />
                    </AreaChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
};
