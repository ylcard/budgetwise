import { Card, CardContent } from "@/components/ui/card";
import { TrendingUp, AlertCircle, Target, Zap, LayoutList, BarChart3, GripVertical } from "lucide-react";
import { formatCurrency } from "../utils/currencyUtils";
import { Link } from "react-router-dom";
import { useSettings } from "../utils/SettingsContext";
import { motion } from "framer-motion";
import { FINANCIAL_PRIORITIES } from "../utils/constants";
import { resolveBudgetLimit } from "../utils/financialCalculations";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useGoalActions } from "../hooks/useActions";
import { useState, useEffect, useRef } from "react";

// --- COMPACT GOAL EDITOR COMPONENT ---
const QuickGoalsEditor = ({ goals, settings, updateSettings, user, onClose }) => {
    const { handleGoalUpdate, isSaving } = useGoalActions(user, goals);
    const [mode, setMode] = useState(settings.goalMode ?? true); // true = %, false = $

    // Refactoring goal setting feature
    // const [values, setValues] = useState({ needs: '', wants: '', savings: '' });

    // State for Absolute Mode
    const [absValues, setAbsValues] = useState({ needs: '', wants: '', savings: '' });

    // State for Percentage Mode (Slider)
    const [splits, setSplits] = useState({ split1: 50, split2: 80 });
    const containerRef = useRef(null);
    const [activeThumb, setActiveThumb] = useState(null);

    // Initialize values based on current mode
    useEffect(() => {
        const map = {};
        goals.forEach(g => {
            // Refactoring goal setting feature
            // map[g.priority] = mode
            //     ? (g.target_percentage || 0)
            //     : (g.target_amount || 0);
            map[g.priority] = { pct: g.target_percentage, amt: g.target_amount };
        });
        // Refactoring oal setting feature
        //     setValues({
        //         needs: map.needs ?? (mode ? 50 : 0),
        //         wants: map.wants ?? (mode ? 30 : 0),
        //         savings: map.savings ?? (mode ? 20 : 0)
        //     });
        // }, [goals, mode]);

        if (mode) {
            // Percentage: Setup splits
            const n = map.needs?.pct ?? 50;
            const w = map.wants?.pct ?? 30;
            setSplits({ split1: n, split2: n + w });
        } else {
            // Absolute: Setup inputs
            setAbsValues({
                needs: map.needs?.amt ?? '',
                wants: map.wants?.amt ?? '',
                savings: map.savings?.amt ?? ''
            });
        }
    }, [goals, mode]);

    // --- SLIDER HANDLERS ---
    const handlePointerDown = (e, thumbIndex) => {
        e.preventDefault();
        e.target.setPointerCapture(e.pointerId);
        setActiveThumb(thumbIndex);
    };

    const handlePointerMove = (e) => {
        if (!activeThumb || !containerRef.current) return;
        const rect = containerRef.current.getBoundingClientRect();
        const rawPercent = ((e.clientX - rect.left) / rect.width) * 100;
        const constrained = Math.round(Math.max(0, Math.min(100, rawPercent)));

        setSplits(prev => {
            if (activeThumb === 1) return { ...prev, split1: Math.min(constrained, prev.split2 - 5) };
            else return { ...prev, split2: Math.max(constrained, prev.split1 + 5) };
        });
    };

    const handlePointerUp = (e) => {
        setActiveThumb(null);
        e.target.releasePointerCapture(e.pointerId);
    };

    // --- INPUT HANDLER (Regex Filter) ---
    const handleAmountChange = (key, val) => {
        // Allow only numbers, dots, and commas
        if (val === '' || /^[0-9]*[.,]?[0-9]*$/.test(val)) {
            setAbsValues(prev => ({ ...prev, [key]: val }));
        }
    };

    const handleSave = async () => {
        // 1. Update Mode if changed
        if (mode !== (settings.goalMode ?? true)) {
            await updateSettings({ goalMode: mode });
        }

        // Refactoring goal setting feature
        // 2. Update Goals
        // const promises = Object.entries(values).map(([priority, val]) => {

        // 2. Prepare Data
        let payloadMap = {};

        if (mode) {
            // Calc Pct from splits
            payloadMap = {
                needs: splits.split1,
                wants: splits.split2 - splits.split1,
                savings: 100 - splits.split2
            };
        } else {
            // Clean inputs
            payloadMap = {
                needs: parseFloat(absValues.needs.toString().replace(',', '.')) || 0,
                wants: parseFloat(absValues.wants.toString().replace(',', '.')) || 0,
                savings: parseFloat(absValues.savings.toString().replace(',', '.')) || 0
            };
        }

        // 3. Update Goals
        const promises = Object.entries(payloadMap).map(([priority, numVal]) => {
            // Refactoring goal setting feature
            // const numVal = Number(val) || 0;

            const payload = mode
                ? { target_percentage: numVal }
                : { target_amount: numVal };
            return handleGoalUpdate(priority, mode ? numVal : 0, payload);
        });

        await Promise.all(promises);
        if (onClose) onClose();
    };

    // Derived values for % display
    const pctValues = {
        needs: splits.split1,
        wants: splits.split2 - splits.split1,
        savings: 100 - splits.split2
    };

    return (
        <div className="space-y-3 w-60">
            <div className="flex items-center justify-between">
                <h4 className="font-medium text-xs text-muted-foreground uppercase tracking-wider">Target Goals</h4>
                <div className="flex bg-muted p-0.5 rounded-md">
                    <button onClick={() => setMode(true)} className={`px-2 py-0.5 text-[10px] font-medium rounded-sm transition-all ${mode ? 'bg-white shadow-sm text-primary' : 'text-muted-foreground hover:text-foreground'}`}>%</button>
                    <button onClick={() => setMode(false)} className={`px-2 py-0.5 text-[10px] font-medium rounded-sm transition-all ${!mode ? 'bg-white shadow-sm text-primary' : 'text-muted-foreground hover:text-foreground'}`}>$</button>
                </div>
            </div>
            {mode ? (
                // --- SLIDER VIEW ---
                <div className="pt-2 pb-1 space-y-4">
                    <div ref={containerRef} className="relative h-4 w-full bg-gray-100 rounded-full select-none touch-none">
                        {/* Zones */}
                        <div className="absolute top-0 left-0 h-full rounded-l-full" style={{ width: `${splits.split1}%`, backgroundColor: FINANCIAL_PRIORITIES.needs.color }} />
                        <div className="absolute top-0 h-full" style={{ left: `${splits.split1}%`, width: `${splits.split2 - splits.split1}%`, backgroundColor: FINANCIAL_PRIORITIES.wants.color }} />
                        <div className="absolute top-0 h-full rounded-r-full" style={{ left: `${splits.split2}%`, width: `${100 - splits.split2}%`, backgroundColor: FINANCIAL_PRIORITIES.savings.color }} />

                        {/* Thumb 1 */}
                        <div onPointerDown={(e) => handlePointerDown(e, 1)} onPointerMove={handlePointerMove} onPointerUp={handlePointerUp} className={`absolute top-0 bottom-0 w-3 -ml-1.5 bg-white shadow-sm rounded-full border flex items-center justify-center z-10 hover:scale-110 transition-transform ${activeThumb === 1 ? 'cursor-grabbing' : 'cursor-grab'}`} style={{ left: `${splits.split1}%` }}>
                            <GripVertical className="w-2 h-2 text-gray-400" />
                        </div>
                        {/* Thumb 2 */}
                        <div onPointerDown={(e) => handlePointerDown(e, 2)} onPointerMove={handlePointerMove} onPointerUp={handlePointerUp} className={`absolute top-0 bottom-0 w-3 -ml-1.5 bg-white shadow-sm rounded-full border flex items-center justify-center z-10 hover:scale-110 transition-transform ${activeThumb === 2 ? 'cursor-grabbing' : 'cursor-grab'}`} style={{ left: `${splits.split2}%` }}>
                            <GripVertical className="w-2 h-2 text-gray-400" />
                        </div>
                    </div>

                    {/* Readout */}
                    <div className="flex justify-between px-1">
                        {['needs', 'wants', 'savings'].map(key => (
                            <div key={key} className="flex flex-col items-center">
                                <div className="w-1.5 h-1.5 rounded-full mb-0.5" style={{ backgroundColor: FINANCIAL_PRIORITIES[key].color }} />
                                <span className="text-[10px] font-bold text-gray-700">{Math.round(pctValues[key])}%</span>
                            </div>
                        ))}
                    </div>
                </div>
            ) : (
                // --- INPUT VIEW ---
                <div className="space-y-2">
                    {['needs', 'wants', 'savings'].map(key => (
                        <div key={key} className="grid grid-cols-5 items-center gap-2">
                            <div className="col-span-1 flex justify-center">
                                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: FINANCIAL_PRIORITIES[key].color }} />
                            </div>
                            <div className="col-span-4 relative">
                                <Input
                                    type="text"
                                    inputMode="decimal"
                                    value={absValues[key]}
                                    onChange={(e) => handleAmountChange(key, e.target.value)}
                                    className="h-7 text-xs pr-6 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                />
                                <span className="absolute right-2 top-1.5 text-[10px] text-muted-foreground pointer-events-none">
                                    {settings.currencySymbol}
                                </span>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            <Button onClick={handleSave} disabled={isSaving} className="w-full h-7 text-xs mt-2">
                {isSaving ? 'Saving...' : 'Update Targets'}
            </Button>
        </div>
    );
};

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
    breakdown = null,
    historicalAverage = 0
}) {
    // Refactoring to add quick goal change to page
    // const { updateSettings } = useSettings();
    const { updateSettings, user } = useSettings();
    const [isPopoverOpen, setIsPopoverOpen] = useState(false);

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

        // implenting the logic for fixed mode
        // if (settings.goalMode === false) return goal.target_amount || 0; // Absolute Mode
        // return (safeIncome * (goal.target_percentage || 0)) / 100;       // Percentage Mode

        // 3. Use centralized logic (Handles Absolute, Percentage AND Inflation Protection)
        // Note: 'safeIncome' here acts as the 'monthlyIncome' argument
        return resolveBudgetLimit(goal, safeIncome, settings, historicalAverage);

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
            <div className="flex items-center gap-1 text-sm font-medium hidden sm:flex">
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
                                <Popover open={isPopoverOpen} onOpenChange={setIsPopoverOpen}>
                                    <PopoverTrigger asChild>
                                        <button className="flex items-center gap-1 text-xs hover:text-blue-600 transition-colors outline-none">
                                            <Target size={14} />
                                            <span>Goals</span>
                                        </button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-auto p-3" align="end">
                                        <QuickGoalsEditor
                                            goals={goals}
                                            settings={settings}
                                            updateSettings={updateSettings}
                                            user={user}
                                            onClose={() => setIsPopoverOpen(false)}
                                        />
                                    </PopoverContent>
                                </Popover>
                            </div>
                        </div>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}