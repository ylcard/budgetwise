import { Card, CardContent } from "@/components/ui/card";
import { TrendingUp, AlertCircle, Target, Zap, LayoutList, BarChart3 } from "lucide-react";
import { formatCurrency } from "../utils/currencyUtils";
import { Link } from "react-router-dom";
import { useSettings } from "../utils/SettingsContext";
import { motion } from "framer-motion";
import { FINANCIAL_PRIORITIES } from "../utils/constants";

export default function RemainingBudgetCard({
    bonusSavingsPotential,
    currentMonthIncome,
    currentMonthExpenses,
    settings,
    monthNavigator,
    addIncomeButton,
    addExpenseButton,
    importDataButton,
    systemBudgets = [],
    goals = [],
    breakdown = null
}) {
    const { updateSettings } = useSettings();

    if (!settings) return null;

    const safeIncome = currentMonthIncome || 1;
    const isSimpleView = settings.barViewMode; // true = simple

    // --- ANIMATION CONFIG ---
    const fluidSpring = {
        type: "spring",
        stiffness: 120,
        damping: 20,
        mass: 1
    };

    // --- DATA EXTRACTION ---
    const needsBudget = systemBudgets.find(sb => sb.systemBudgetType === 'needs');
    const wantsBudget = systemBudgets.find(sb => sb.systemBudgetType === 'wants');

    // Nov 28 - bugfix wrong bar values
    // const needsLimit = needsBudget?.budgetAmount || 0;
    // const wantsLimit = wantsBudget?.budgetAmount || 0;

    // Helper to resolve the actual limit for the month based on Goal Mode
    const resolveLimit = (type) => {
        const budget = systemBudgets.find(sb => sb.systemBudgetType === type);
        // 1. Prefer pre-calculated targetAmount if available (from useBudgetBarsData)
        if (budget && typeof budget.targetAmount === 'number') return budget.targetAmount;

        // 2. Fallback: Calculate from goals based on settings
        const goal = goals.find(g => g.priority === type);
        if (!goal) return 0;

        if (settings.goalMode === false) return goal.target_amount || 0; // Absolute Mode
        return (safeIncome * (goal.target_percentage || 0)) / 100;       // Percentage Mode
    };

    const needsLimit = resolveLimit('needs');
    const wantsLimit = resolveLimit('wants');
    const savingsLimit = resolveLimit('savings');

    // Use breakdown for granular segments
    const needsData = breakdown?.needs || { paid: 0, unpaid: 0, total: 0 };
    const wantsData = breakdown?.wants || { total: 0 };

    // Aggregates
    const needsTotal = needsData.total;
    const wantsTotal = wantsData.total;
    const totalSpent = currentMonthExpenses;

    const needsColor = FINANCIAL_PRIORITIES.needs.color;
    const wantsColor = FINANCIAL_PRIORITIES.wants.color;
    const savingsColor = FINANCIAL_PRIORITIES.savings.color;

    // --- GOAL SUMMARY TEXT ---
    const GoalSummary = () => {
        // goalMode: true = Percentage, false = Absolute
        const isAbsolute = settings.goalMode === false;

        const getValue = (priority) => {
            const goal = goals.find(g => g.priority === priority);
            if (isAbsolute) {
                return formatCurrency(goal?.target_amount || 0, settings);
            }
            // Use nullish coalescing to fallback to defaults only if percentage is null/undefined
            return `${goal?.target_percentage ?? (priority === 'needs' ? 50 : priority === 'wants' ? 30 : 20)}%`;
        };

        return (
            <div className="flex items-center gap-1 text-[10px] font-medium hidden sm:flex">
                <span style={{ color: needsColor }}>{getValue('needs')}</span>
                <span className="text-gray-300">/</span>
                <span style={{ color: wantsColor }}>{getValue('wants')}</span>
                <span className="text-gray-300">/</span>
                <span style={{ color: savingsColor }}>{getValue('savings')}</span>
            </div>
        );
    };


    // --- SEGMENT LOGIC (Detailed View) ---
    const calculateSegments = (paid, unpaid, limit) => {
        const total = paid + unpaid;
        if (!limit || limit <= 0) return { safePaid: paid, safeUnpaid: unpaid, overflow: 0, total };
        const overflow = Math.max(0, total - limit);
        const safeTotal = total - overflow;
        const safePaid = Math.min(paid, safeTotal);
        const safeUnpaid = Math.max(0, safeTotal - safePaid);
        return { safePaid, safeUnpaid, overflow, total };
    };

    const needsSegs = calculateSegments(needsData.paid, needsData.unpaid, needsLimit);

    const wantsPaidTotal = (wantsData.directPaid || 0) + (wantsData.customPaid || 0);
    const wantsUnpaidTotal = (wantsData.directUnpaid || 0) + (wantsData.customUnpaid || 0);
    const wantsSegs = calculateSegments(wantsPaidTotal, wantsUnpaidTotal, wantsLimit);

    // --- RENDER HELPERS ---
    const handleViewToggle = (checked) => {
        updateSettings({ barViewMode: checked });
    };

    // 1. WIDTH CALCULATIONS (Relative to Income)
    // This determines how much physical space the bar takes up in the container
    const needsPct = (needsTotal / safeIncome) * 100;
    const wantsPct = (wantsTotal / safeIncome) * 100;
    const savingsPct = Math.max(0, 100 - needsPct - wantsPct);

    // 2. LABEL CALCULATIONS (Relative to Budget Limit)
    // This determines the % text shown to the user (Utilization)
    const needsUtil = needsLimit > 0 ? (needsTotal / needsLimit) * 100 : 0;
    const wantsUtil = wantsLimit > 0 ? (wantsTotal / wantsLimit) * 100 : 0;

    // Date Context
    const now = new Date();
    const isCurrentMonth =
        now.getMonth() === (settings.selectedMonth ?? now.getMonth()) &&
        now.getFullYear() === (settings.selectedYear ?? now.getFullYear());

    const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    const currentDay = now.getDate();
    const isEndOfMonth = currentDay >= (daysInMonth - 3);

    const getStatusStyles = (used, limit, type) => {
        if (!limit || limit === 0) return "text-white/90 font-medium";
        const ratio = used / limit;
        if (ratio > 1) return "text-red-100 font-extrabold flex items-center justify-center gap-1 animate-pulse shadow-sm";

        if (type === 'wants' && ratio > 0.90) {
            if (isCurrentMonth && isEndOfMonth) return "text-white/90 font-medium";
            return "text-amber-100 font-bold flex items-center justify-center gap-1";
        }
        return "text-white/90 font-medium";
    };

    // Helper for animated segments
    const AnimatedSegment = ({ width, color, children, className = "", style = {} }) => (
        <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${width}%` }}
            transition={fluidSpring}
            className={`h-full flex items-center justify-center relative group cursor-default overflow-hidden ${className}`}
            style={{ backgroundColor: color, ...style }}
        >
            {children}
        </motion.div>
    );

    // --- RENDER: SIMPLE BAR ---
    const renderSimpleBar = () => {
        // const needsLabel = `${Math.round(needsPct)}%`;
        // const wantsLabel = `${Math.round(wantsPct)}%`;
        const needsLabel = `${Math.round(needsUtil)}%`;
        const wantsLabel = `${Math.round(wantsUtil)}%`;
        const savingsLabel = `${Math.round(savingsPct)}%`;

        return (
            <div className="relative h-10 w-full bg-gray-100 rounded-xl overflow-hidden flex shadow-inner border border-gray-200">
                <AnimatedSegment width={needsPct} color={needsColor} className="border-r border-white/10">
                    {needsPct > 8 && (
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }} className={`text-xs sm:text-sm z-10 whitespace-nowrap ${getStatusStyles(needsTotal, needsLimit, 'needs')}`}>
                            {needsTotal > needsLimit && <AlertCircle className="w-3 h-3 inline mr-1" />}
                            {FINANCIAL_PRIORITIES.needs.label} {needsLabel}
                        </motion.div>
                    )}
                </AnimatedSegment>

                <AnimatedSegment width={wantsPct} color={wantsColor} className="border-r border-white/10">
                    {wantsPct > 8 && (
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }} className={`text-xs sm:text-sm z-10 whitespace-nowrap ${getStatusStyles(wantsTotal, wantsLimit, 'wants')}`}>
                            {(wantsTotal / wantsLimit) > 0.9 && !(isCurrentMonth && isEndOfMonth && (wantsTotal / wantsLimit) <= 1) && (
                                <Zap className="w-3 h-3 inline mr-1 fill-current" />
                            )}
                            {FINANCIAL_PRIORITIES.wants.label} {wantsLabel}
                        </motion.div>
                    )}
                </AnimatedSegment>

                {savingsPct > 0 && (
                    <AnimatedSegment width={savingsPct} className="bg-emerald-500">
                        {savingsPct > 8 && (
                            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }} className="text-white/90 font-medium text-xs sm:text-sm flex items-center gap-1 whitespace-nowrap">
                                Save {savingsLabel}
                            </motion.div>
                        )}
                    </AnimatedSegment>
                )}
            </div>
        );
    };

    // --- RENDER: DETAILED BAR ---
    const renderDetailedBar = () => {
        const CLICKABLE_MIN_PCT = 5;
        const rawNeedsPct = (needsSegs.total / safeIncome) * 100;
        const needsVisualPct = needsSegs.total > 0 ? Math.max(rawNeedsPct, CLICKABLE_MIN_PCT) : 0;
        const rawWantsPct = (wantsSegs.total / safeIncome) * 100;
        const wantsVisualPct = wantsSegs.total > 0 ? Math.max(rawWantsPct, CLICKABLE_MIN_PCT) : 0;

        const needsLimitPct = (needsLimit / safeIncome) * 100;
        const wantsLimitPct = (wantsLimit / safeIncome) * 100;
        const totalLimitPct = needsLimitPct + wantsLimitPct;
        const visualSpendingEnd = needsVisualPct + wantsVisualPct;

        const efficiencyBarPct = Math.max(0, totalLimitPct - visualSpendingEnd);
        const targetSavingsBarPct = Math.max(0, 100 - Math.max(totalLimitPct, visualSpendingEnd));

        // Calculate Savings Utilization (Actual vs Target)
        const savingsUtil = savingsLimit > 0 ? (savingsAmount / savingsLimit) * 100 : 0;

        const stripePattern = {
            backgroundImage: `linear-gradient(45deg,rgba(255,255,255,.3) 25%,transparent 25%,transparent 50%,rgba(255,255,255,.3) 50%,rgba(255,255,255,.3) 75%,transparent 75%,transparent)`,
            backgroundSize: '8px 8px'
        };

        return (
            <div className="relative h-10 w-full bg-gray-100 rounded-lg overflow-hidden flex shadow-inner">
                {/* NEEDS */}
                <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${needsVisualPct}%` }}
                    transition={fluidSpring}
                    className="h-full relative border-r border-white/20"
                >
                    <Link
                        to={needsBudget ? `/BudgetDetail?id=${needsBudget.id}` : '#'}
                        className="flex h-full w-full relative group hover:brightness-110 overflow-hidden"
                    >
                        {needsSegs.safePaid > 0 && (
                            <motion.div initial={{ width: 0 }} animate={{ width: `${(needsSegs.safePaid / needsSegs.total) * 100}%` }} transition={fluidSpring} className="h-full" style={{ backgroundColor: needsColor }} />
                        )}
                        {needsSegs.safeUnpaid > 0 && (
                            <motion.div initial={{ width: 0 }} animate={{ width: `${(needsSegs.safeUnpaid / needsSegs.total) * 100}%` }} transition={fluidSpring} className="h-full bg-blue-500 opacity-60" style={stripePattern} />
                        )}
                        {needsSegs.overflow > 0 && (
                            <motion.div initial={{ width: 0 }} animate={{ width: `${(needsSegs.overflow / needsSegs.total) * 100}%` }} transition={fluidSpring} className="h-full opacity-60" style={{ backgroundColor: 'red', ...stripePattern }} />
                        )}
                        <div className={`absolute inset-0 flex items-center justify-center text-[10px] font-bold text-white transition-opacity ${needsVisualPct > 10 ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}>
                            <span className="truncate px-1">
                                {formatCurrency(needsTotal, settings)}
                                <span className="opacity-80 ml-1">({Math.round(needsUtil)}%)</span>
                            </span>
                        </div>
                    </Link>
                </motion.div>

                {/* WANTS */}
                <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${wantsVisualPct}%` }}
                    transition={fluidSpring}
                    className="h-full relative border-r border-white/20"
                >
                    <Link
                        to={wantsBudget ? `/BudgetDetail?id=${wantsBudget.id}` : '#'}
                        className="flex h-full w-full relative group hover:brightness-110 overflow-hidden"
                    >
                        {wantsSegs.safePaid > 0 && (
                            <motion.div initial={{ width: 0 }} animate={{ width: `${(wantsSegs.safePaid / wantsSegs.total) * 100}%` }} transition={fluidSpring} className="h-full" style={{ backgroundColor: wantsColor }} />
                        )}
                        {wantsSegs.safeUnpaid > 0 && (
                            <motion.div initial={{ width: 0 }} animate={{ width: `${(wantsSegs.safeUnpaid / wantsSegs.total) * 100}%` }} transition={fluidSpring} className="h-full opacity-60" style={{ backgroundColor: wantsColor, ...stripePattern }} />
                        )}
                        {wantsSegs.overflow > 0 && (
                            <motion.div initial={{ width: 0 }} animate={{ width: `${(wantsSegs.overflow / wantsSegs.total) * 100}%` }} transition={fluidSpring} className="h-full bg-red-500" style={stripePattern} />
                        )}
                        <div className={`absolute inset-0 flex items-center justify-center text-[10px] font-bold text-white transition-opacity ${wantsVisualPct > 10 ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}>
                            <span className="truncate px-1">
                                {formatCurrency(wantsTotal, settings)}
                                <span className="opacity-80 ml-1">({Math.round(wantsUtil)}%)</span>
                            </span>
                        </div>
                    </Link>
                </motion.div>

                {/* SAVINGS */}
                {efficiencyBarPct > 0 && (
                    <AnimatedSegment width={efficiencyBarPct} className="bg-emerald-300 border-r border-white/20">
                        <div className="absolute inset-0 flex items-center justify-center text-[10px] font-bold text-emerald-800 opacity-75 group-hover:opacity-100 transition-opacity whitespace-nowrap overflow-hidden">Extra</div>
                    </AnimatedSegment>
                )}
                {targetSavingsBarPct > 0 && (
                    <AnimatedSegment width={targetSavingsBarPct} className="bg-emerald-500">
                        <div className="absolute inset-0 flex items-center justify-center text-[10px] font-bold text-white transition-opacity opacity-75 group-hover:opacity-100 whitespace-nowrap overflow-hidden">
                            <span className="truncate px-1">
                                {formatCurrency(savingsAmount, settings)}
                                {savingsLimit > 0 && <span className="opacity-80 ml-1">({Math.round(savingsUtil)}%)</span>}
                            </span>
                        </div>
                    </AnimatedSegment>
                )}
            </div>
        );
    };

    const savingsAmount = Math.max(0, currentMonthIncome - totalSpent);
    const savingsPctDisplay = (savingsAmount / safeIncome) * 100;
    const isTotalOver = totalSpent > currentMonthIncome;

    const ViewToggle = () => (
        <div className="flex bg-gray-100/80 p-1 rounded-lg border border-gray-200/50 relative isolate">
            <button
                onClick={() => handleViewToggle(true)}
                className={`relative flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded transition-colors w-24 z-10 ${isSimpleView ? "text-gray-900" : "text-gray-500 hover:text-gray-700"}`}
            >
                {isSimpleView && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9 }} // Start slightly "back" (Z-depth)
                        animate={{ opacity: 1, scale: 1 }}    // Snap to front
                        transition={{ type: "spring", stiffness: 500, damping: 30 }} // Snappy pop effect
                        className="absolute inset-0 bg-white rounded-md shadow-[0_1px_3px_rgba(0,0,0,0.1)] -z-10"
                    />
                )}
                <LayoutList className="w-3.5 h-3.5" />
                Simple
            </button>
            <button
                onClick={() => handleViewToggle(false)}
                className={`relative flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded transition-colors w-24 z-10 ${!isSimpleView ? "text-gray-900" : "text-gray-500 hover:text-gray-700"}`}
            >
                {!isSimpleView && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ type: "spring", stiffness: 500, damping: 30 }}
                        className="absolute inset-0 bg-white rounded-md shadow-[0_1px_3px_rgba(0,0,0,0.1)] -z-10"
                    />
                )}
                <BarChart3 className="w-3.5 h-3.5" />
                Detailed
            </button>
        </div>
    );

    return (
        <Card className="border-none shadow-md bg-white overflow-hidden h-full flex flex-col">
            <CardContent className="p-5 flex-1 flex flex-col">
                <div className="flex flex-col sm:flex-row items-center justify-between mb-6 gap-4">
                    <div className="flex-1 w-full sm:w-auto">
                        {monthNavigator}
                    </div>
                    <div className="flex flex-col-reverse sm:flex-row items-center gap-4 w-full sm:w-auto justify-between sm:justify-end">
                        <ViewToggle />
                        <div className="flex items-center gap-2">
                            {addIncomeButton}
                            {addExpenseButton}
                            {importDataButton}
                        </div>
                    </div>
                </div>

                <div className="flex flex-col gap-6">
                    <div className="flex items-end justify-between">
                        <div>
                            {isTotalOver ? (
                                <h2 className="text-3xl font-bold text-red-600 flex items-center gap-2">
                                    Over Limit <AlertCircle className="w-6 h-6" />
                                </h2>
                            ) : (
                                <h2 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
                                    {Math.round(savingsPctDisplay)}% <span className="text-lg font-medium text-gray-500">Saved</span>
                                </h2>
                            )}
                            <div className="text-sm text-gray-500 mt-1">
                                {currentMonthIncome > 0 ? (
                                    <>Spent <strong className={isTotalOver ? "text-red-600" : "text-gray-900"}>{formatCurrency(totalSpent, settings)}</strong> of <strong>{formatCurrency(currentMonthIncome, settings)}</strong></>
                                ) : "No income recorded."}
                            </div>
                        </div>

                        {!isSimpleView && bonusSavingsPotential > 0 && !isTotalOver && (
                            <div className="text-right hidden sm:block">
                                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 border border-emerald-100">
                                    <TrendingUp className="w-3 h-3 text-emerald-600" />
                                    <span className="text-xs font-medium text-emerald-700">Efficiency: +{formatCurrency(bonusSavingsPotential, settings)}</span>
                                </div>
                            </div>
                        )}
                        {isSimpleView && !isTotalOver && (
                            <div className="text-right hidden sm:block">
                                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-gray-50 border border-gray-100">
                                    <Target className="w-3 h-3 text-gray-500" />
                                    <span className="text-xs font-medium text-gray-600">Left: {formatCurrency(savingsAmount, settings)}</span>
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="space-y-2">
                        {isSimpleView ? renderSimpleBar() : renderDetailedBar()}

                        <div className="flex flex-col sm:flex-row justify-between text-xs text-gray-400 pt-1 gap-2">
                            <div className="flex gap-4 items-center">
                                <span className="flex items-center gap-1.5">
                                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: needsColor }}></div>
                                    {FINANCIAL_PRIORITIES.needs.label}
                                </span>
                                <span className="flex items-center gap-1.5">
                                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: wantsColor }}></div>
                                    {FINANCIAL_PRIORITIES.wants.label}
                                </span>
                                {!isSimpleView && (
                                    <>
                                        <span className="flex items-center gap-1 ml-2">
                                            <div className="w-2 h-2 bg-gray-400 rounded-sm"></div> Paid
                                        </span>
                                        <span className="flex items-center gap-1">
                                            <div className="w-2 h-2 bg-gray-400/50 rounded-sm" style={{ backgroundImage: 'linear-gradient(45deg,rgba(255,255,255,.3) 25%,transparent 25%,transparent 50%,rgba(255,255,255,.3) 50%,rgba(255,255,255,.3) 75%,transparent 75%,transparent)', backgroundSize: '8px 8px' }}></div> Plan
                                        </span>
                                    </>
                                )}
                            </div>
                            <div className="flex items-center gap-2">
                                <GoalSummary />
                                <Link to="/Settings" className="flex items-center gap-1 text-[10px] hover:text-blue-600 transition-colors">
                                    <Target size={12} />
                                    <span>Goals</span>
                                </Link>
                            </div>
                        </div>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}