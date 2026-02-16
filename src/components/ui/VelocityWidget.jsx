import { useState, useMemo, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { clsx } from "clsx";
import { format, getDate, getDaysInMonth, parseISO, isSameDay, startOfMonth, setDate } from "date-fns";
import { formatCurrency } from "../utils/financialCalculations";

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

    const [activeIndex, setActiveIndex] = useState(null);

    // Set default active index to today if in current month, otherwise last day
    useEffect(() => {
        const today = new Date();
        if (today.getMonth() === selectedMonth && today.getFullYear() === selectedYear) {
            setActiveIndex(today.getDate() - 1);
        } else {
            setActiveIndex(chartData.length - 1);
        }
    }, [chartData, selectedMonth, selectedYear]);

    const activeData = chartData[activeIndex] || chartData[chartData.length - 1] || {};

    // Haptic feedback function (browser support varies, but good for mobile)
    const triggerHaptic = () => {
        if (navigator.vibrate) navigator.vibrate(5);
    };

    const handleMouseMove = (e) => {
        if (!e.activeTooltipIndex) return;
        if (e.activeTooltipIndex !== activeIndex) {
            setActiveIndex(e.activeTooltipIndex);
            triggerHaptic();
        }
    };

    return (
        <div className="w-full bg-slate-900 rounded-3xl p-6 text-white shadow-2xl overflow-hidden relative isolate">
            {/* Background Glow */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/10 blur-[80px] rounded-full -z-10" />
            <div className="absolute bottom-0 left-0 w-64 h-64 bg-rose-500/10 blur-[80px] rounded-full -z-10" />

            {/* Header Info */}
            <div className="flex justify-between items-end mb-8">
                <div>
                    <motion.p
                        key={activeData.label}
                        initial={{ opacity: 0, y: 5 }}
                        animate={{ opacity: 0.7, y: 0 }}
                        className="text-sm font-medium uppercase tracking-wider text-slate-400"
                    >
                        Flow on {activeData.label}
                    </motion.p>
                    <div className="flex items-baseline gap-4 mt-1">
                        <h2 className="text-3xl font-bold tabular-nums text-emerald-400">
                            +{formatCurrency(activeData.income || 0, settings)}
                        </h2>
                        <h2 className="text-2xl font-bold tabular-nums text-rose-400 opacity-90">
                            -{formatCurrency(activeData.expense || 0, settings)}
                        </h2>
                    </div>
                </div>
            </div>

            {/* Interactive Chart */}
            <div className="h-40 -mx-6">
                <ResponsiveContainer width="100%" height="100%">
                    <AreaChart
                        data={chartData}
                        onMouseMove={handleMouseMove}
                        onTouchMove={handleMouseMove} // Mobile support
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
