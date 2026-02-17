import { useState, useMemo, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Download, TrendingUp, TrendingDown, Award, Calendar, ChevronDown } from "lucide-react";
import { formatCurrency } from "../utils/currencyUtils";
import { format } from "date-fns";
import { BudgetAvatar } from "../ui/BudgetAvatar"; // Re-using your ghost!
import html2canvas from "html2canvas";
import { jsPDF } from "jspdf";
import { getMonthBoundaries } from "../utils/dateUtils";
import { useTransactions, useCustomBudgetsForPeriod } from "../hooks/useBase44Entities";
import { useMergedCategories } from "../hooks/useMergedCategories";
import { useMonthlyIncome, useMonthlyBreakdown } from "../hooks/useDerivedData";
import { getCategoryIcon } from "../utils/iconMapConfig"; // Assuming this utility exists based on context

// Slide Transition Variants
const variants = {
    enter: (direction) => ({
        x: direction > 0 ? "100%" : "-100%",
        opacity: 0,
        scale: 0.9
    }),
    center: {
        zIndex: 1,
        x: 0,
        opacity: 1,
        scale: 1
    },
    exit: (direction) => ({
        zIndex: 0,
        x: direction < 0 ? "100%" : "-100%",
        opacity: 0,
        scale: 0.9
    })
};

// Helper to calculate actuals locally (Fixing Math Issue #1)
const useActualCategoryStats = (transactions, categories) => {
    return useMemo(() => {
        if (!Array.isArray(transactions) || !Array.isArray(categories)) return [];

        // 1. Raw Summation of Expenses
        const sums = transactions
            .filter(t => t.type === 'expense')
            .reduce((acc, t) => {
                acc[t.category_id] = (acc[t.category_id] || 0) + Number(t.amount);
                return acc;
            }, {});

        // 2. Map to Categories and Sort
        const totalExpenses = Object.values(sums).reduce((a, b) => a + b, 0);

        return categories
            .map(c => {
                const amount = sums[c.id] || 0;
                return {
                    ...c,
                    amount,
                    percentage: totalExpenses > 0 ? (amount / totalExpenses) * 100 : 0
                };
            })
            .filter(c => c.amount > 0)
            .sort((a, b) => b.amount - a.amount)
            .slice(0, 10); // Get Top 10
    }, [transactions, categories]);
};

export const WrappedStory = ({
    isOpen,
    onClose,
    month, // Target month (0-11)
    year,  // Target year
    settings,
    user
}) => {
    // 1. Calculate boundaries for the target month
    const { monthStart, monthEnd } = useMemo(() =>
        (month !== undefined && year !== undefined)
            ? getMonthBoundaries(month, year)
            : { monthStart: null, monthEnd: null },
        [month, year]);

    // 2. Fetch data specific to this story's period
    const { transactions } = useTransactions(monthStart, monthEnd);
    const { categories: rawCategories } = useMergedCategories();
    const { customBudgets } = useCustomBudgetsForPeriod(user, monthStart, monthEnd);

    // Filter out the 30-day buffer fetched by useTransactions
    // We need strictly the transactions for this month's story
    const storyTransactions = useMemo(() => {
        return transactions.filter(t => t.date >= monthStart && t.date <= monthEnd);
    }, [transactions, monthStart, monthEnd]);

    // Using raw transactions for calculations instead of the hook which might lean on Budgeted Amounts
    const income = useMonthlyIncome(transactions, month, year);

    // Calculate total expenses strictly from transactions
    const expenses = useMemo(() =>
        storyTransactions
            .filter(t => t.type === 'expense')
            .reduce((sum, t) => sum + Number(t.amount), 0),
        [storyTransactions]
    );

    // Get Top 10 based on actuals
    const topCategories = useActualCategoryStats(storyTransactions, rawCategories);

    const monthName = useMemo(() =>
        (month !== undefined && year !== undefined) ? format(new Date(year, month), 'MMMM') : '',
        [month, year]);

    const [page, setPage] = useState(0);
    const [direction, setDirection] = useState(0);
    const exportRef = useRef(null);

    // 3. Internalized Vibe Check Logic (matches HealthContext)
    const healthScore = useMemo(() => {
        if (!income || income === 0) return 0.5;
        const spendRatio = expenses / income;

        if (spendRatio >= 1.0) return 0.1;
        if (spendRatio >= 0.90) return 0.3;
        if (spendRatio >= 0.70) return 0.6;
        return 1.0;
    }, [income, expenses]);

    const savingsRate = income > 0 ? ((income - expenses) / income) * 100 : 0;

    const paginate = (newDirection) => {
        const nextPage = page + newDirection;
        if (nextPage >= 0 && nextPage < 5) { // 5 Slides total
            setPage(nextPage);
            setDirection(newDirection);
        }
    };

    const handleDownload = async () => {
        if (!exportRef.current) return;
        try {
            const canvas = await html2canvas(exportRef.current, {
                backgroundColor: '#0f172a', // Slate-900
                scale: 3 // High res
            });
            const imgData = canvas.toDataURL('image/png');
            const pdf = new jsPDF('p', 'mm', 'a4');
            const pdfWidth = pdf.internal.pageSize.getWidth();
            const pdfHeight = (canvas.height * pdfWidth) / canvas.width;

            pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
            pdf.save(`BudgetWise-${monthName}-${year}.pdf`);
        } catch (err) {
            console.error("Export failed", err);
        }
    };

    if (!isOpen) return null;

    const slides = [
        // SLIDE 1: INTRO
        <div className="flex flex-col items-center justify-center h-full text-center p-8 space-y-6">
            <motion.div
                initial={{ scale: 0 }} animate={{ scale: 1 }}
                className="w-24 h-24 bg-gradient-to-tr from-indigo-500 to-purple-500 rounded-3xl flex items-center justify-center shadow-2xl mb-4"
            >
                <Calendar className="text-white w-12 h-12" />
            </motion.div>
            <h2 className="text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-indigo-200 to-purple-200">
                {monthName} <br /> Wrapped
            </h2>
            <p className="text-slate-400 text-lg">Your financial story for {year}.</p>
        </div>,

        // SLIDE 2: THE FLOW
        <div className="h-full w-full overflow-y-auto no-scrollbar relative">
            {/* Content Container - Flex column start to allow scrolling */}
            <div className="flex flex-col items-center min-h-full p-8 pb-24">
                <h3 className="text-xl text-slate-400 uppercase tracking-widest font-bold mb-6 sticky top-0 bg-slate-900/95 backdrop-blur-sm w-full text-center py-2 z-10">
                    Heavy Hitters
                </h3>

                <div className="w-full space-y-4">
                    {/* Top 3 - The Medals */}
                    {topCategories.slice(0, 3).map((cat, index) => (
                        <motion.div
                            key={cat.id}
                            initial={{ x: -50, opacity: 0 }}
                            animate={{ x: 0, opacity: 1 }}
                            transition={{ delay: index * 0.1 }}
                            className={`p-5 rounded-2xl flex items-center justify-between text-left ${index === 0 ? 'bg-gradient-to-r from-amber-600/80 to-orange-600/80 border border-amber-500/30' :
                                index === 1 ? 'bg-slate-800 border border-slate-700' :
                                    'bg-slate-800/50 border border-slate-800'
                                }`}
                        >
                            <div className="flex items-center gap-4">
                                <div className="text-2xl">{index === 0 ? '🥇' : index === 1 ? '🥈' : '🥉'}</div>
                                <div>
                                    <h4 className={`font-bold ${index === 0 ? 'text-white' : 'text-slate-200'}`}>
                                        {cat.name}
                                    </h4>
                                    <p className={`text-xs ${index === 0 ? 'text-amber-100' : 'text-slate-400'}`}>
                                        {cat.percentage > 0 ? `${cat.percentage.toFixed(1)}% of month` : 'Top Expense'}
                                    </p>
                                </div>
                            </div>
                            <div className={`text-lg font-mono font-bold ${index === 0 ? 'text-white' : 'text-slate-300'}`}>
                                {formatCurrency(cat.amount, settings)}
                            </div>
                        </motion.div>
                    ))}

                    {/* The Rest - Dense List */}
                    {topCategories.length > 3 && (
                        <div className="pt-4 space-y-2">
                            <p className="text-slate-500 text-xs uppercase font-bold tracking-wider mb-2 text-left px-2">The Rest</p>
                            {topCategories.slice(3).map((cat, index) => {
                                // const Icon = getCategoryIcon(cat.icon); // Assuming you have this helper or pass generic
                                return (
                                    <motion.div
                                        key={cat.id}
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        transition={{ delay: 0.3 + (index * 0.05) }}
                                        className="flex items-center justify-between p-3 rounded-xl bg-slate-800/30 border border-slate-800 hover:bg-slate-800/50 transition-colors"
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center text-slate-300 text-xs">
                                                {index + 4}
                                            </div>
                                            <span className="text-slate-300 font-medium">{cat.name}</span>
                                        </div>
                                        <span className="text-slate-400 font-mono text-sm">{formatCurrency(cat.amount, settings)}</span>
                                    </motion.div>
                                );
                            })}
                        </div>
                    )}
                </div>

                {topCategories.length === 0 ? (
                    <div className="text-slate-500 italic mt-8">No expenses recorded yet.</div>
                ) : null}
            </div>
            {/* Scroll Indicator */}
            {topCategories.length > 3 && (
                <motion.div
                    animate={{ y: [0, 5, 0] }}
                    transition={{ repeat: Infinity, duration: 2 }}
                    className="absolute bottom-6 left-0 right-0 flex justify-center pointer-events-none"
                >
                    <div className="bg-slate-900/80 backdrop-blur rounded-full p-2 text-slate-400 shadow-lg border border-slate-700">
                        <ChevronDown size={20} />
                    </div>
                </motion.div>
            )}
        </div>,

        // SLIDE 5: SUMMARY (EXPORTABLE)
        <div className="flex flex-col items-center justify-center h-full text-center p-6" ref={exportRef}>
            <div className="bg-slate-800/50 p-8 rounded-3xl border border-slate-700 w-full relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/20 blur-[60px] rounded-full" />

                <div className="flex items-center justify-center mb-6">
                    <Award className="text-yellow-400 w-12 h-12" />
                </div>

                <h2 className="text-2xl font-bold text-white mb-2">{monthName} Recap</h2>
                <p className="text-slate-400 text-sm mb-6">BudgetWise</p>

                <div className="space-y-4 text-left">
                    <div className="flex justify-between border-b border-slate-700 pb-2">
                        <span className="text-slate-400">Net Saved</span>
                        <span className={`font-bold ${income - expenses >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                            {formatCurrency(income - expenses, settings)}
                        </span>
                    </div>
                    <div className="flex justify-between border-b border-slate-700 pb-2">
                        <span className="text-slate-400">Top Spend</span>
                        <span className="font-bold text-white truncate max-w-[150px]">{topCategories[0]?.name || '-'}</span>
                    </div>
                    <div className="flex justify-between">
                        <span className="text-slate-400">Vibe Check</span>
                        <span className="font-bold text-white">{healthScore >= 0.5 ? 'Passed ✅' : 'Failed ❌'}</span>
                    </div>
                </div>
            </div>

            <button
                onClick={handleDownload}
                className="mt-8 bg-white text-indigo-900 px-6 py-3 rounded-full font-bold flex items-center gap-2 hover:bg-indigo-50 transition-colors"
            >
                <Download size={18} /> Save Receipt
            </button>
        </div>
    ];

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm">
            {/* Close Button */}
            <button onClick={onClose} className="absolute top-4 right-4 z-50 text-white/50 hover:text-white p-2">
                <X size={32} />
            </button>

            {/* Story Container */}
            <div className="relative w-full h-full md:w-[400px] md:h-[700px] md:rounded-[40px] bg-slate-900 overflow-hidden shadow-2xl border-none md:border border-slate-800">

                {/* Progress Bars */}
                <div className="absolute top-6 left-4 right-4 z-20 flex gap-1.5">
                    {slides.map((_, i) => (
                        <div key={i} className="h-1 flex-1 bg-white/20 rounded-full overflow-hidden">
                            <motion.div
                                className="h-full bg-white"
                                initial={{ width: "0%" }}
                                animate={{ width: i < page ? "100%" : i === page ? "100%" : "0%" }}
                                transition={{ duration: i === page ? 5 : 0.3 }} // Auto-advance simulation
                            />
                        </div>
                    ))}
                </div>

                {/* Slide Content */}
                <AnimatePresence initial={false} custom={direction} mode="popLayout">
                    <motion.div
                        key={page}
                        custom={direction}
                        variants={variants}
                        initial="enter"
                        animate="center"
                        exit="exit"
                        transition={{ x: { type: "spring", stiffness: 300, damping: 30 }, opacity: { duration: 0.2 } }}
                        className="absolute inset-0 flex flex-col"
                        drag="x"
                        dragConstraints={{ left: 0, right: 0 }}
                        dragElastic={1}
                        onDragEnd={(e, { offset, velocity }) => {
                            const swipe = Math.abs(offset.x) * velocity.x;
                            if (swipe < -100) paginate(1);
                            else if (swipe > 100) paginate(-1);
                        }}
                    >
                        {slides[page]}
                    </motion.div>
                </AnimatePresence>

                {/* Navigation Tap Zones */}
                <div className="absolute inset-0 z-10 flex">
                    <div className="w-1/3 h-full" onClick={() => paginate(-1)} />
                    <div className="w-1/3 h-full" /> {/* Center deadzone for scrolling/dragging */}
                    <div className="w-1/3 h-full" onClick={() => paginate(1)} />
                </div>
            </div>
        </div>
    );
};
