import { Card, CardContent } from "@/components/ui/card";
import { TrendingUp, AlertCircle, Target, Zap, LayoutList, BarChart3 } from "lucide-react";
import { formatCurrency } from "../utils/currencyUtils";
import { Link } from "react-router-dom";
import { useSettings } from "../utils/SettingsContext";
import { motion } from "framer-motion";

export default function RemainingBudgetCard({
    bonusSavingsPotential,
    currentMonthIncome,
    currentMonthExpenses, // Used for headline total
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

    // --- DATA EXTRACTION ---
    const needsBudget = systemBudgets.find(sb => sb.systemBudgetType === 'needs');
    const wantsBudget = systemBudgets.find(sb => sb.systemBudgetType === 'wants');
    const needsLimit = needsBudget?.budgetAmount || 0;
    const wantsLimit = wantsBudget?.budgetAmount || 0;

    // Use breakdown for granular segments
    const needsData = breakdown?.needs || { paid: 0, unpaid: 0, total: 0 };
    const wantsData = breakdown?.wants || { total: 0 };

    // Aggregates
    const needsTotal = needsData.total;
    const wantsTotal = wantsData.total;

    // Use the passed total prop for the headline to ensure consistency with other widgets
    const totalSpent = currentMonthExpenses;

    const needsColor = needsBudget?.color || '#3B82F6';
    const wantsColor = wantsBudget?.color || '#F59E0B';

    // --- GOAL SUMMARY TEXT ---
    const isAbsolute = settings.goalAllocationMode === 'absolute';
    const needsGoal = goals.find(g => g.priority === 'needs');
    const wantsGoal = goals.find(g => g.priority === 'wants');
    const savingsGoal = goals.find(g => g.priority === 'savings');

    const goalSummary = isAbsolute
        ? `${formatCurrency(needsGoal?.target_amount || 0, settings)} / ${formatCurrency(wantsGoal?.target_amount || 0, settings)} / ${formatCurrency(savingsGoal?.target_amount || 0, settings)}`
        : `${needsGoal?.target_percentage || 50}% / ${wantsGoal?.target_percentage || 30}% / ${savingsGoal?.target_percentage || 20}%`;


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

    // Calculate common percentages
    const needsPct = (needsTotal / safeIncome) * 100;
    const wantsPct = (wantsTotal / safeIncome) * 100;
    const savingsPct = Math.max(0, 100 - needsPct - wantsPct);

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

        // Wants Warning: >90% usage before end of month
        if (type === 'wants' && ratio > 0.90) {
            if (isCurrentMonth && isEndOfMonth) return "text-white/90 font-medium";
            return "text-amber-100 font-bold flex items-center justify-center gap-1";
        }
        return "text-white/90 font-medium";
    };

    // --- RENDER: SIMPLE BAR ---
    const renderSimpleBar = () => {
        const needsLabel = `${Math.round(needsPct)}%`;
        const wantsLabel = `${Math.round(wantsPct)}%`;
        const savingsLabel = `${Math.round(savingsPct)}%`;

        return (
            // STANDARDIZED HEIGHT: h-10
            <div className="relative h-10 w-full bg-gray-100 rounded-xl overflow-hidden flex shadow-inner border border-gray-200">
                {/* NEEDS */}
                <div
                    className="h-full flex items-center justify-center transition-all duration-500 relative group cursor-default border-r border-white/10"
                    style={{ width: `${needsPct}%`, backgroundColor: needsColor }}
                >
                    {needsPct > 8 && (
                        <div className={`text-xs sm:text-sm z-10 transition-all ${getStatusStyles(needsTotal, needsLimit, 'needs')}`}>
                            {needsTotal > needsLimit && <AlertCircle className="w-3 h-3 inline mr-1" />}
                            Needs {needsLabel}
                        </div>
                    )}
                </div>

                {/* WANTS */}
                <div
                    className="h-full flex items-center justify-center transition-all duration-500 relative group cursor-default border-r border-white/10"
                    style={{ width: `${wantsPct}%`, backgroundColor: wantsColor }}
                >
                    {wantsPct > 8 && (
                        <div className={`text-xs sm:text-sm z-10 transition-all ${getStatusStyles(wantsTotal, wantsLimit, 'wants')}`}>
                            {(wantsTotal / wantsLimit) > 0.9 && !(isCurrentMonth && isEndOfMonth && (wantsTotal / wantsLimit) <= 1) && (
                                <Zap className="w-3 h-3 inline mr-1 fill-current" />
                            )}
                            Wants {wantsLabel}
                        </div>
                    )}
                </div>

                {/* SAVINGS */}
                {savingsPct > 0 && (
                    <div
                        className="h-full bg-emerald-500 flex items-center justify-center transition-all duration-500 relative"
                        style={{ width: `${savingsPct}%` }}
                    >
                        {savingsPct > 8 && (
                            <div className="text-white/90 font-medium text-xs sm:text-sm flex items-center gap-1">
                                Save {savingsLabel}
                            </div>
                        )}
                    </div>
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

        const stripePattern = {
            backgroundImage: `linear-gradient(45deg,rgba(255,255,255,.3) 25%,transparent 25%,transparent 50%,rgba(255,255,255,.3) 50%,rgba(255,255,255,.3) 75%,transparent 75%,transparent)`,
            backgroundSize: '8px 8px'
        };

        return (
            // STANDARDIZED HEIGHT: h-10
            <div className="relative h-10 w-full bg-gray-100 rounded-lg overflow-hidden flex shadow-inner">
                {/* NEEDS */}
                <Link
                    to={needsBudget ? `/BudgetDetail?id=${needsBudget.id}` : '#'}
                    className={`h-full transition-all duration-500 relative group hover:brightness-110 cursor-pointer border-r border-white/20 overflow-hidden flex`}
                    style={{ width: `${needsVisualPct}%` }}
                >
                    {needsSegs.safePaid > 0 && <div className="h-full" style={{ width: `${(needsSegs.safePaid / needsSegs.total) * 100}%`, backgroundColor: needsColor }} />}
                    {needsSegs.safeUnpaid > 0 && <div className="h-full bg-blue-500 opacity-60" style={{ width: `${(needsSegs.safeUnpaid / needsSegs.total) * 100}%`, ...stripePattern }} />}
                    {needsSegs.overflow > 0 && <div className="h-full opacity-60" style={{ width: `${(needsSegs.overflow / needsSegs.total) * 100}%`, backgroundColor: 'red', ...stripePattern }} />}
                    <div className={`absolute inset-0 flex items-center justify-center text-[10px] font-bold text-white transition-opacity ${needsVisualPct > 10 ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}>Needs</div>
                </Link>

                {/* WANTS */}
                <Link
                    to={wantsBudget ? `/BudgetDetail?id=${wantsBudget.id}` : '#'}
                    className={`h-full transition-all duration-500 relative group hover:brightness-110 cursor-pointer border-r border-white/20 overflow-hidden flex`}
                    style={{ width: `${wantsVisualPct}%` }}
                >
                    {wantsSegs.safePaid > 0 && <div className="h-full" style={{ width: `${(wantsSegs.safePaid / wantsSegs.total) * 100}%`, backgroundColor: wantsColor }} />}
                    {wantsSegs.safeUnpaid > 0 && <div className="h-full opacity-60" style={{ width: `${(wantsSegs.safeUnpaid / wantsSegs.total) * 100}%`, backgroundColor: wantsColor, ...stripePattern }} />}
                    {wantsSegs.overflow > 0 && <div className="h-full bg-red-500" style={{ width: `${(wantsSegs.overflow / wantsSegs.total) * 100}%`, ...stripePattern }} />}
                    <div className={`absolute inset-0 flex items-center justify-center text-[10px] font-bold text-white transition-opacity ${wantsVisualPct > 10 ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}>Lifestyle</div>
                </Link>

                {/* SAVINGS */}
                {efficiencyBarPct > 0 && (
                    <div className="h-full bg-emerald-300 relative group border-r border-white/20" style={{ width: `${efficiencyBarPct}%` }}>
                        <div className="absolute inset-0 flex items-center justify-center text-[10px] font-bold text-emerald-800 opacity-75 group-hover:opacity-100 transition-opacity whitespace-nowrap overflow-hidden">Extra</div>
                    </div>
                )}
                {targetSavingsBarPct > 0 && (
                    <div className="h-full bg-emerald-500 relative group" style={{ width: `${targetSavingsBarPct}%` }}>
                        <div className="absolute inset-0 flex items-center justify-center text-[10px] font-bold text-white transition-opacity opacity-75 group-hover:opacity-100 whitespace-nowrap overflow-hidden">Target</div>
                    </div>
                )}
            </div>
        );
    };

    const savingsAmount = Math.max(0, currentMonthIncome - totalSpent);
    const savingsPctDisplay = (savingsAmount / safeIncome) * 100;
    const isTotalOver = totalSpent > currentMonthIncome;

    const fluidSpring = { type: "spring", stiffness: 150, damping: 25, mass: 1.4 };

    const ViewToggle = () => (
        <div className="flex bg-gray-100/80 p-1 rounded-lg border border-gray-200/50 relative isolate">
            <button
                onClick={() => handleViewToggle(true)}
                className={`relative flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded transition-colors w-24 z-10 ${isSimpleView ? "text-gray-900" : "text-gray-500 hover:text-gray-700"}`}
            >
                {isSimpleView && (
                    <motion.div layoutId="active-view-pill" className="absolute inset-0 bg-white rounded-md shadow-[0_1px_3px_rgba(0,0,0,0.1)] -z-10" transition={fluidSpring} />
                )}
                <LayoutList className="w-3.5 h-3.5" />
                Simple
            </button>
            <button
                onClick={() => handleViewToggle(false)}
                className={`relative flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded transition-colors w-24 z-10 ${!isSimpleView ? "text-gray-900" : "text-gray-500 hover:text-gray-700"}`}
            >
                {!isSimpleView && (
                    <motion.div layoutId="active-view-pill" className="absolute inset-0 bg-white rounded-md shadow-[0_1px_3px_rgba(0,0,0,0.1)] -z-10" transition={fluidSpring} />
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

                        {/* --- Legend Row (NOW ALWAYS VISIBLE) --- */}
                        <div className="flex flex-col sm:flex-row justify-between text-xs text-gray-400 pt-1 gap-2">
                            <div className="flex gap-4 items-center">
                                <span className="flex items-center gap-1.5">
                                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: needsColor }}></div>
                                    Essentials
                                </span>
                                <span className="flex items-center gap-1.5">
                                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: wantsColor }}></div>
                                    Lifestyle
                                </span>
                                {/* Add Status Legend only for Detailed View if needed, or keep it generic */}
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
                                {/* GOAL SUMMARY TEXT */}
                                <span className="hidden sm:inline font-medium text-gray-400/80">{goalSummary}</span>
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
