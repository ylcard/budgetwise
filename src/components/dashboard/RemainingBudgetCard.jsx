import { Card, CardContent } from "@/components/ui/card";
import { TrendingUp, AlertCircle, Target, Zap, LayoutList, BarChart3, GripVertical, Calendar, Wallet, Sparkles } from "lucide-react";
import { formatCurrency } from "../utils/currencyUtils";
import { Link } from "react-router-dom";
import { useSettings } from "../utils/SettingsContext";
import { motion, AnimatePresence } from "framer-motion";
import { FINANCIAL_PRIORITIES } from "../utils/constants";
import { resolveBudgetLimit } from "../utils/financialCalculations";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useGoalActions } from "../hooks/useActions";
import React, { useState, useEffect, useRef, memo } from "react";
import { getMonthName } from "../utils/dateUtils";
import confetti from "canvas-confetti";

// --- SHARED CONFIG ---
const fluidSpring = {
    type: "spring",
    stiffness: 120,
    damping: 20,
    mass: 1
};

const STRIPE_PATTERN = {
    backgroundImage: `linear-gradient(45deg,rgba(255,255,255,.3) 25%,transparent 25%,transparent 50%,rgba(255,255,255,.3) 50%,rgba(255,255,255,.3) 75%,transparent 75%,transparent)`,
    backgroundSize: '8px 8px'
};

// --- SMART SEGMENT (Handles Hover Expansion) ---
// REFACTORED: 23-Jan-2026 - Clean rebuild with percentage-based detection and stable flex
const SmartSegment = memo(({
    widthPct,
    color,
    children,
    className = "",
    style = {}
}) => {
    const [isHovered, setIsHovered] = useState(false);
    const containerRef = useRef(null);

    // If segment is effectively invisible, don't render
    if (widthPct <= 0.001) return null;

    const MIN_WIDTH_PX = 120;

    // Determine if segment is narrow based on percentage alone (no measurement)
    // Assuming typical screen width of ~1000px for the bar, 12% = ~120px
    const isNarrow = widthPct < 12;
    const shouldExpand = isHovered && isNarrow;

    return (
        <motion.div
            ref={containerRef}
            className={`h-full flex items-center justify-center overflow-hidden ${className}`}
            style={{
                backgroundColor: color,
                position: 'relative',
                zIndex: shouldExpand ? 10 : 1,
                ...style
            }}
            initial={false}
            animate={shouldExpand ? {
                flex: `0 0 ${MIN_WIDTH_PX}px`,
            } : {
                flex: `${widthPct} 1 0%`,
            }}
            transition={{
                duration: 0.2,
                ease: [0.25, 0.1, 0.25, 1]
            }}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
        >
            <span className="px-2 whitespace-nowrap text-center">
                {children}
            </span>
        </motion.div>
    );
});

// --- COMPACT GOAL EDITOR COMPONENT ---
const QuickGoalsEditor = memo(({ goals, settings, updateSettings, user, onClose }) => {
    const { handleGoalUpdate, isSaving } = useGoalActions(user, goals);
    const [mode, setMode] = useState(settings.goalMode ?? true); // true = %, false = $

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
            map[g.priority] = { pct: g.target_percentage, amt: g.target_amount };
        });

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
                needs: parseFloat(String(absValues.needs).replace(',', '.')) || 0,
                wants: parseFloat(String(absValues.wants).replace(',', '.')) || 0,
                savings: parseFloat(String(absValues.savings).replace(',', '.')) || 0
            };
        }

        // 3. Update Goals
        const promises = Object.entries(payloadMap).map(([priority, numVal]) => {

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
                    <button onClick={() => setMode(true)} className={`px-2 py-0.5 text-[10px] font-medium rounded-sm transition-all ${mode ? 'bg-background shadow-sm text-primary' : 'text-muted-foreground hover:text-foreground'}`}>%</button>
                    <button onClick={() => setMode(false)} className={`px-2 py-0.5 text-[10px] font-medium rounded-sm transition-all ${!mode ? 'bg-background shadow-sm text-primary' : 'text-muted-foreground hover:text-foreground'}`}>$</button>
                </div>
            </div>
            {mode ? (
                // --- SLIDER VIEW ---
                <div className="pt-2 pb-1 space-y-4">
                    <div ref={containerRef} className="relative h-4 w-full bg-muted/50 rounded-full select-none touch-none">
                        {/* Zones */}
                        <div className="absolute top-0 left-0 h-full rounded-l-full" style={{ width: `${splits.split1}%`, backgroundColor: FINANCIAL_PRIORITIES.needs.color }} />
                        <div className="absolute top-0 h-full" style={{ left: `${splits.split1}%`, width: `${splits.split2 - splits.split1}%`, backgroundColor: FINANCIAL_PRIORITIES.wants.color }} />
                        <div className="absolute top-0 h-full rounded-r-full" style={{ left: `${splits.split2}%`, width: `${100 - splits.split2}%`, backgroundColor: FINANCIAL_PRIORITIES.savings.color }} />

                        {/* Thumb 1 */}
                        <div onPointerDown={(e) => handlePointerDown(e, 1)} onPointerMove={handlePointerMove} onPointerUp={handlePointerUp} className={`absolute top-0 bottom-0 w-3 -ml-1.5 bg-background shadow-sm rounded-full border border-border flex items-center justify-center z-10 hover:scale-110 transition-transform ${activeThumb === 1 ? 'cursor-grabbing' : 'cursor-grab'}`} style={{ left: `${splits.split1}%` }}>
                            <GripVertical className="w-2 h-2 text-gray-400" />
                        </div>

                        {/* Thumb 2 */}
                        <div onPointerDown={(e) => handlePointerDown(e, 2)} onPointerMove={handlePointerMove} onPointerUp={handlePointerUp} className={`absolute top-0 bottom-0 w-3 -ml-1.5 bg-background shadow-sm rounded-full border border-border flex items-center justify-center z-10 hover:scale-110 transition-transform ${activeThumb === 2 ? 'cursor-grabbing' : 'cursor-grab'}`} style={{ left: `${splits.split2}%` }}>
                            <GripVertical className="w-2 h-2 text-gray-400" />
                        </div>
                    </div>

                    {/* Readout */}
                    <div className="flex justify-between px-1">
                        {['needs', 'wants', 'savings'].map(key => (
                            <div key={key} className="flex flex-col items-center">
                                <div className="w-1.5 h-1.5 rounded-full mb-0.5" style={{ backgroundColor: FINANCIAL_PRIORITIES[key].color }} />
                                <span className="text-[10px] font-bold text-muted-foreground">{Math.round(pctValues[key])}%</span>
                            </div>
                        ))}
                    </div>
                </div>
            ) : (
                // --- INPUT VIEW ---
                <div className="flex items-end justify-between gap-2 pt-2">
                    {['needs', 'wants', 'savings'].map(key => (
                        <div key={key} className="flex flex-col items-center gap-1.5 flex-1 min-w-0">
                            {/* Dot Indicator */}
                            <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: FINANCIAL_PRIORITIES[key].color }} />

                            {/* Compact Input */}
                            <div className="relative w-full">
                                <Input
                                    type="text"
                                    inputMode="decimal"
                                    value={absValues[key]}
                                    onChange={(e) => handleAmountChange(key, e.target.value)}
                                    placeholder="0"
                                    className="h-7 text-xs px-1.5 text-center [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                />
                                {/* Optional: Tiny currency hint outside or as placeholder if preferred, 
                                    but for super-compact, relying on context + placeholder is cleaner 
                                    or we can add a tiny label below if needed. 
                                    Here I'm keeping it clean given the constraint. */}
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
});

const RemainingBudgetCard = memo(function RemainingBudgetCard({
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
    historicalAverage = 0,
    selectedMonth,
    selectedYear,
    projectedIncome = 0,
    isUsingProjection = false
}) {
    const { updateSettings, user } = useSettings();
    const [isPopoverOpen, setIsPopoverOpen] = useState(false);

    if (!settings) return null;

    // REFACTORED: 18-Feb-2026 - Integrated Smart Income Projection
    // If we are "Waiting for Payday" (isUsingProjection), we use the projected amount 
    // to render the budget bars and limits. Otherwise, we use actual income.
    const effectiveIncome = isUsingProjection ? projectedIncome : currentMonthIncome;

    // Safe fallback for division logic
    const safeIncome = effectiveIncome && effectiveIncome > 0 ? effectiveIncome : 1;
    const isSimpleView = settings.barViewMode; // true = simple

    // --- DATA EXTRACTION ---
    const needsBudget = systemBudgets.find(sb => sb.systemBudgetType === 'needs');
    const wantsBudget = systemBudgets.find(sb => sb.systemBudgetType === 'wants');

    // Helper to resolve the actual limit for the month based on Goal Mode
    const resolveLimit = (type) => {
        const budget = systemBudgets.find(sb => sb.systemBudgetType === type);
        // 1. Prefer pre-calculated targetAmount if available (from useBudgetBarsData)
        if (budget && typeof budget.targetAmount === 'number') return budget.targetAmount;

        // 2. Fallback: Calculate from goals based on settings
        const goal = goals.find(g => g.priority === type);
        if (!goal) return 0;

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
                <span className="text-muted-foreground/30">/</span>
                <span style={{ color: wantsColor }}>{getValue('wants')}</span>
                <span className="text-muted-foreground/30">/</span>
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

    // --- UNIFIED SEGMENT HELPERS ---
    // Pre-calculate segments for both views to ensure smooth transitions
    const needsSegs = calculateSegments(needsData.paid, needsData.unpaid, needsLimit);
    const wantsPaidTotal = (wantsData.directPaid || 0) + (wantsData.customPaid || 0);
    const wantsUnpaidTotal = (wantsData.directUnpaid || 0) + (wantsData.customUnpaid || 0);
    const wantsSegs = calculateSegments(wantsPaidTotal, wantsUnpaidTotal, wantsLimit);

    // --- ANIMATION HELPERS ---
    const TextSwap = ({ children, className = "" }) => (
        <AnimatePresence mode="popLayout" initial={false}>
            <motion.div
                key={children?.toString()} // Trigger animation on content change
                initial={{ opacity: 0, y: 8, filter: "blur(4px)" }}
                animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                exit={{ opacity: 0, y: -8, filter: "blur(4px)" }}
                transition={{ duration: 0.3, ease: "easeOut" }}
                className={`whitespace-nowrap ${className}`}
            >
                {children}
            </motion.div>
        </AnimatePresence>
    );

    // --- RENDER HELPERS ---
    const handleViewToggle = (checked) => {
        updateSettings({ barViewMode: checked });
    };

    const needsUtil = needsLimit > 0 ? (needsTotal / needsLimit) * 100 : 0;
    const wantsUtil = wantsLimit > 0 ? (wantsTotal / wantsLimit) * 100 : 0;

    // --- SHARED SAVINGS CALCULATIONS ---
    // Use effectiveIncome so savings potential is shown based on EXPECTED salary
    const savingsAmount = Math.max(0, effectiveIncome - totalSpent);
    const targetSavingsAmount = Math.min(savingsLimit, savingsAmount);
    const extraSavingsAmount = Math.max(0, savingsAmount - savingsLimit);

    // Date Context
    const now = new Date();
    const isCurrentMonth =
        now.getMonth() === selectedMonth &&
        now.getFullYear() === selectedYear;

    // Calculate days based strictly on the selected props
    const daysInMonth = new Date(selectedYear, selectedMonth + 1, 0).getDate();

    const currentDay = now.getDate();
    const isEndOfMonth = currentDay >= (daysInMonth - 3);

    // Detect "Clean Slate" State (No income AND no expenses)
    // If we have a projection, it's NOT an empty month (we show the template)
    const isEmptyMonth = (!effectiveIncome || effectiveIncome === 0) && (!currentMonthExpenses || currentMonthExpenses === 0);

    // Get explicit month name for the empty state message
    const monthName = getMonthName(selectedMonth);

    // --- CONFETTI LOGIC ---
    // We track the previous income to detect the specific transition from 0 -> Amount
    const prevIncomeRef = useRef(currentMonthIncome);
    const prevMonthRef = useRef(selectedMonth);
    const prevYearRef = useRef(selectedYear);
    // Track when the month last changed to ignore "fetch-induced" income jumps
    const lastContextChangeTime = useRef(Date.now());

    useEffect(() => {
        const prevIncome = prevIncomeRef.current;
        const currentIncome = currentMonthIncome || 0;
        // Ensure we are detecting a change WITHIN the same month context, not a navigation event
        const isSameContext = prevMonthRef.current === selectedMonth && prevYearRef.current === selectedYear;

        // If context changed, strictly update refs and exit to prevent false positives
        if (!isSameContext) {
            prevIncomeRef.current = currentIncome;
            prevMonthRef.current = selectedMonth;
            prevYearRef.current = selectedYear;
            lastContextChangeTime.current = Date.now();
            return;
        }

        // If context (Month/Year) changed, reset the safety timer
        if (!isSameContext) {
            lastContextChangeTime.current = Date.now();
        }

        // Safety buffer: Don't fire confetti if we just switched months < 1 second ago
        // This handles the delay where data goes 0 -> Amount during fetching
        const isWarmupPeriod = Date.now() - lastContextChangeTime.current < 1000;

        if (!isWarmupPeriod && isSameContext && (!prevIncome || prevIncome === 0) && currentIncome > 0) {
            // Trigger Confetti!
            const duration = 3000;
            const end = Date.now() + duration;

            const frame = () => {
                // Launch particles from left edge
                confetti({
                    particleCount: 2,
                    angle: 60,
                    spread: 55,
                    origin: { x: 0 },
                    colors: ['#10B981', '#34D399', '#6EE7B7'] // Emerald greens
                });
                // Launch particles from right edge
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

        // Update ref for next render
        prevIncomeRef.current = currentIncome;
        prevMonthRef.current = selectedMonth;
        prevYearRef.current = selectedYear;
    }, [currentMonthIncome, selectedMonth, selectedYear]);

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

    // --- RENDER: UNIFIED BAR (Handles both Simple & Detailed via internal sizing) ---
    const renderUnifiedBar = () => {
        const safeTotalNeeds = needsSegs.total > 0 ? needsSegs.total : 0;
        const safeTotalWants = wantsSegs.total > 0 ? wantsSegs.total : 0;

        // Ensure minimal visibility for clickable areas if they exist but are tiny
        const CLICKABLE_MIN_PCT = 5;

        // --- WIDTH CALCULATIONS ---
        const calculationBase = effectiveIncome && effectiveIncome > 0 ? effectiveIncome : 1;

        let needsOuterPct, wantsOuterPct, savingsOuterPct;

        if (isSimpleView) {
            // SIMPLE VIEW: Widths based on GOALS (Target Amount or Percentage)
            // 1. Calculate the "Total Goal Pie"
            const totalGoal = needsLimit + wantsLimit + savingsLimit;
            const goalBase = totalGoal > 0 ? totalGoal : 1;

            // 2. Calculate raw percentages relative to the Total Goal
            // 3. Rounding Logic: Round Needs/Wants, assign remainder to Savings to ensure strictly 100%
            needsOuterPct = Math.round((needsLimit / goalBase) * 100);
            wantsOuterPct = Math.round((wantsLimit / goalBase) * 100);
            savingsOuterPct = 100 - needsOuterPct - wantsOuterPct;

        } else {
            // DETAILED VIEW: Widths based on INCOME SHARE (Original Logic)
            needsOuterPct = Math.max((safeTotalNeeds / calculationBase) * 100, safeTotalNeeds > 0 ? CLICKABLE_MIN_PCT : 0);
            wantsOuterPct = Math.max((safeTotalWants / calculationBase) * 100, safeTotalWants > 0 ? CLICKABLE_MIN_PCT : 0);
            savingsOuterPct = Math.max(0, 100 - needsOuterPct - wantsOuterPct);
        }

        // Internal Split Ratios (0 to 1)
        // If Simple View: Primary = 1 (100%), Secondary = 0.
        // If Detailed View: Primary = Paid/Total, Secondary = Unpaid/Total.

        const getRatios = (segments) => {
            if (segments.total === 0) return { p: 0, u: 0, o: 0 };
            return {
                p: segments.safePaid / segments.total,
                u: segments.safeUnpaid / segments.total,
                o: segments.overflow / segments.total
            };
        };

        const nR = getRatios(needsSegs);
        const wR = getRatios(wantsSegs);

        // Savings Split
        // Simple: Target = 100%, Extra = 0% (Visually combined)
        // Detailed: Split based on actuals
        const totalSavings = Math.max(0, effectiveIncome - totalSpent); // This aligns with 'savingsAmount'
        // If we have extra savings, the "Target" bar shouldn't shrink below the target amount in detailed view
        // actually, savings logic is: 
        // Bar 1 (Dark): min(total, limit)
        // Bar 2 (Light): max(0, total - limit)
        const sTarget = Math.min(savingsLimit, totalSavings);
        const sExtra = Math.max(0, totalSavings - savingsLimit);
        const sTotal = sTarget + sExtra;

        const sTargetRatio = sTotal > 0 ? (sTarget / sTotal) : 0;
        const sExtraRatio = sTotal > 0 ? (sExtra / sTotal) : 0;

        // Utilization % (Relative to Category Limits)
        const getUtil = (val, limit) => (limit > 0 ? Math.round((val / limit) * 100) : 0);

        const needsPaidUtil = getUtil(needsSegs.safePaid, needsLimit);
        const needsUnpaidUtil = getUtil(needsSegs.safeUnpaid, needsLimit);
        const wantsPaidUtil = getUtil(wantsSegs.safePaid, wantsLimit); // Using Paid Total (Direct + Custom)
        const wantsUnpaidUtil = getUtil(wantsSegs.safeUnpaid, wantsLimit);
        const totalSavingsUtil = getUtil(totalSavings, savingsLimit);
        const targetSavingsUtil = getUtil(sTarget, savingsLimit);
        const extraSavingsUtil = getUtil(sExtra, savingsLimit);

        // Labels
        const needsLabel = `${Math.round(needsUtil)}%`;
        const wantsLabel = `${Math.round(wantsUtil)}%`;

        return (
            <div className="relative h-10 w-full bg-gray-100 rounded-xl overflow-hidden flex shadow-inner border border-gray-200">

                {/* NEEDS SEGMENT */}
                <motion.div
                    layout
                    initial={false}
                    animate={{ flex: `${needsOuterPct} 1 auto` }}
                    transition={{ ...fluidSpring, layout: fluidSpring }}
                    className="h-full relative flex"
                >
                    <Link
                        to={needsBudget?.id ? `/BudgetDetail?id=${needsBudget.id}` : undefined}
                        className={`flex h-full min-w-full ${!isSimpleView ? 'group hover:brightness-110' : ''}`}
                    >
                        {/* Paid Part (Shrinks to reveal Unpaid) */}
                        <SmartSegment
                            widthPct={isSimpleView ? 100 : nR.p * 100}
                            color={needsColor}
                            direction="left" // Always left edge
                        >
                            {/* SIMPLE VIEW: Progress Bar Style (Light Target / Dark Actual) */}
                            {isSimpleView && (
                                <>
                                    {/* Lighten the background to represent "Target" */}
                                    <div className="absolute inset-0 bg-white/60" />
                                    {/* Dark Bar for "Actual" usage */}
                                    <div
                                        className="absolute inset-y-0 left-0 transition-all duration-500 ease-out"
                                        style={{
                                            backgroundColor: needsColor,
                                            width: `${Math.min(100, (needsTotal / (needsLimit || 1)) * 100)}%`
                                        }}
                                    />
                                </>
                            )}

                            {!isSimpleView && (
                                <div className="w-full px-1 flex items-center justify-center">
                                    {/* Primary Label (Left) */}
                                    {nR.p > 0.1 && (
                                        <div className="text-[11px] sm:text-xs font-bold text-white overflow-hidden whitespace-nowrap">
                                            <TextSwap>
                                                {formatCurrency(needsSegs.safePaid, settings)} ({needsPaidUtil}%)
                                            </TextSwap>
                                        </div>
                                    )}
                                </div>
                            )}
                        </SmartSegment>

                        {/* Unpaid Part (Grows from 0) */}
                        <SmartSegment
                            widthPct={isSimpleView ? 0 : nR.u * 100}
                            color={needsColor}
                            style={{ ...STRIPE_PATTERN, opacity: 0.6 }}
                            direction={nR.p > 0 ? "center" : "left"}
                        >
                            {!isSimpleView && (
                                <div className="text-[11px] sm:text-xs font-bold text-white px-1 whitespace-nowrap">
                                    <TextSwap>
                                        {formatCurrency(needsSegs.safeUnpaid, settings)} ({needsUnpaidUtil}%)
                                    </TextSwap>
                                </div>
                            )}
                        </SmartSegment>
                        {/* Overflow Part */}
                        <SmartSegment
                            widthPct={isSimpleView ? 0 : nR.o * 100}
                            color="red"
                            style={{ ...STRIPE_PATTERN, opacity: 0.6 }}
                            direction="center"
                        />

                        {/* SIMPLE VIEW LABEL OVERLAY */}
                        <div className={`absolute inset-0 flex items-center justify-center text-xs sm:text-sm z-10 pointer-events-none transition-opacity duration-300 ${isSimpleView ? 'opacity-100' : 'opacity-0'}`}>
                            <div className={`flex items-center justify-center ${getStatusStyles(needsTotal, needsLimit, 'needs')}`}>
                                {needsTotal > needsLimit && <AlertCircle className="w-3 h-3 inline mr-1" />}
                                <TextSwap>
                                    {/* Show Amount and % instead of Label */}
                                    <span className="font-bold">{formatCurrency(needsTotal, settings)}</span>
                                    <span className="opacity-90 ml-1 font-normal">({needsLabel})</span>
                                </TextSwap>
                            </div>
                        </div>

                        {/* DETAILED HOVER LABEL OVERLAY (Fallback for tiny segments) */}
                        <div className={`absolute inset-0 flex items-center justify-center text-[10px] font-bold text-white pointer-events-none transition-opacity duration-300 ${!isSimpleView && (nR.p < 0.1 && nR.u < 0.1) ? 'opacity-100 group-hover:opacity-100' : 'opacity-0'}`}>
                            <span className="truncate px-1">
                                {formatCurrency(needsTotal, settings)}
                                <span className="opacity-80 ml-1">({Math.round(needsUtil)}%)</span>
                            </span>
                        </div>
                    </Link>
                </motion.div>

                {/* WANTS SEGMENT */}
                <motion.div
                    layout
                    initial={false}
                    animate={{ flex: `${wantsOuterPct} 1 auto` }}
                    transition={{ ...fluidSpring, layout: fluidSpring }}
                    className="h-full relative flex"
                >
                    <Link
                        to={wantsBudget?.id ? `/BudgetDetail?id=${wantsBudget.id}` : undefined}
                        className={`flex h-full min-w-full ${!isSimpleView ? 'group hover:brightness-110' : ''}`}
                    >
                        <SmartSegment
                            widthPct={isSimpleView ? 100 : wR.p * 100}
                            color={wantsColor}
                            direction="center"
                        >
                            {isSimpleView && (
                                <>
                                    <div className="absolute inset-0 bg-white/60" />
                                    <div
                                        className="absolute inset-y-0 left-0 transition-all duration-500 ease-out"
                                        style={{
                                            backgroundColor: wantsColor,
                                            width: `${Math.min(100, (wantsTotal / (wantsLimit || 1)) * 100)}%`
                                        }}
                                    />
                                </>
                            )}
                            {!isSimpleView && (
                                <div className="w-full px-1 flex items-center justify-center">
                                    {wR.p > 0.1 && (
                                        <div className="text-[11px] sm:text-xs font-bold text-white whitespace-nowrap">
                                            <TextSwap>
                                                {formatCurrency(wantsSegs.safePaid, settings)} ({wantsPaidUtil}%)
                                            </TextSwap>
                                        </div>
                                    )}
                                </div>
                            )}
                        </SmartSegment>

                        <SmartSegment
                            widthPct={isSimpleView ? 0 : wR.u * 100}
                            color={wantsColor}
                            style={{ ...STRIPE_PATTERN, opacity: 0.6 }}
                            direction="center"
                        >
                            {!isSimpleView && (
                                <div className="text-[11px] sm:text-xs font-bold text-white whitespace-nowrap px-1">
                                    <TextSwap>
                                        {formatCurrency(wantsSegs.safeUnpaid, settings)} ({wantsUnpaidUtil}%)
                                    </TextSwap>
                                </div>
                            )}
                        </SmartSegment>

                        <SmartSegment
                            widthPct={isSimpleView ? 0 : wR.o * 100}
                            color="red"
                            style={{ ...STRIPE_PATTERN, opacity: 0.6 }}
                            direction="center"
                        />

                        <div className={`absolute inset-0 flex items-center justify-center text-xs sm:text-sm z-10 pointer-events-none transition-opacity duration-300 ${isSimpleView ? 'opacity-100' : 'opacity-0'}`}>
                            <div className={`flex items-center justify-center ${getStatusStyles(wantsTotal, wantsLimit, 'wants')}`}>
                                {(wantsTotal / wantsLimit) > 0.9 && !(isCurrentMonth && isEndOfMonth && (wantsTotal / wantsLimit) <= 1) && <Zap className="w-3 h-3 inline mr-1 fill-current" />}
                                <TextSwap>
                                    <span className="font-bold">{formatCurrency(wantsTotal, settings)}</span>
                                    <span className="opacity-90 ml-1 font-normal">({wantsLabel})</span>
                                </TextSwap>
                            </div>
                        </div>

                        <div className={`absolute inset-0 flex items-center justify-center text-[10px] font-bold text-white pointer-events-none transition-opacity duration-300 ${!isSimpleView && (wR.p < 0.1 && wR.u < 0.1) ? 'opacity-100 group-hover:opacity-100' : 'opacity-0'}`}>
                            <span className="truncate px-1">
                                {formatCurrency(wantsTotal, settings)}
                                <span className="opacity-80 ml-1">({Math.round(wantsUtil)}%)</span>
                            </span>
                        </div>
                    </Link>
                </motion.div>

                {/* SAVINGS SEGMENT (Unified) */}
                {savingsOuterPct > 0 && (
                    <motion.div
                        layout
                        initial={false}
                        animate={{ flex: `${savingsOuterPct} 1 auto` }}
                        transition={{ ...fluidSpring, layout: fluidSpring }}
                        className="h-full relative flex"
                    >
                        {/* Target Savings (Dark Green) */}
                        <SmartSegment
                            widthPct={isSimpleView ? 100 : sTargetRatio * 100}
                            color="#10B981" // emerald-500
                            direction={sExtraRatio > 0 ? "center" : "right"} // If extra exists, center. Else, right edge.
                        >
                            {isSimpleView && (
                                <>
                                    <div className="absolute inset-0 bg-white/60" />
                                    {/* For Savings: "Used" is actually "Saved" */}
                                    <div
                                        className="absolute inset-y-0 left-0 transition-all duration-500 ease-out"
                                        style={{
                                            backgroundColor: "#10B981",
                                            width: `${Math.min(100, (totalSavings / (savingsLimit || 1)) * 100)}%`
                                        }}
                                    />
                                </>
                            )}
                            {!isSimpleView && (
                                <div className="w-full px-1 flex items-center justify-center">
                                    {sTargetRatio > 0.1 && (
                                        <div className="text-[11px] sm:text-xs font-bold text-white truncate px-1">
                                            <TextSwap>
                                                {formatCurrency(sTarget, settings)} ({targetSavingsUtil}%)
                                            </TextSwap>
                                        </div>
                                    )}
                                    {/* If Extra savings is tiny, show it inside Target bar if possible */}
                                    {sExtraRatio <= 0.15 && sTargetRatio > 0.15 && sExtra > 0 && (
                                        <div className="text-[10px] font-medium text-white/90 whitespace-nowrap pl-1">
                                            <TextSwap>+{formatCurrency(sExtra, settings)}</TextSwap>
                                        </div>
                                    )}
                                </div>
                            )}
                        </SmartSegment>

                        {/* Extra Savings (Light Green) */}
                        <SmartSegment
                            widthPct={isSimpleView ? 0 : sExtraRatio * 100}
                            color="#6EE7B7" // emerald-300
                            style={{ borderLeft: "1px solid rgba(255,255,255,0.2)" }}
                            direction="right" // Always right edge
                        >
                            {!isSimpleView && (
                                <div className="text-[11px] sm:text-xs font-bold text-emerald-800 truncate px-1">
                                    <TextSwap>
                                        {formatCurrency(sExtra, settings)} ({extraSavingsUtil}%)
                                    </TextSwap>
                                </div>
                            )}
                        </SmartSegment>

                        <div className={`absolute inset-0 flex items-center justify-center z-10 pointer-events-none transition-opacity duration-300 ${isSimpleView ? 'opacity-100' : 'opacity-0'}`}>
                            <div className="text-white/90 font-medium text-xs sm:text-sm flex items-center gap-1 whitespace-nowrap">
                                <TextSwap>
                                    {/* Simple View: Show Total Amount + % of Target */}
                                    <span className="font-bold">{formatCurrency(totalSavings, settings)}</span>
                                    <span className="opacity-90 ml-1 font-normal">({totalSavingsUtil}%)</span>
                                </TextSwap>
                            </div>
                        </div>
                    </motion.div>
                )}
            </div>
        );
    };

    // Calculate display percentage based on safeIncome (which includes projection)
    const savingsPctDisplay = (savingsAmount / safeIncome) * 100;

    // Over Budget logic now respects the Projection (if active)
    const isTotalOver = totalSpent > effectiveIncome;

    const ViewToggle = () => (
        <div className="flex bg-muted/50 p-1 rounded-lg border border-border/50 relative isolate">
            <button
                onClick={() => handleViewToggle(true)}
                className={`relative flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded transition-colors w-24 z-10 ${isSimpleView ? "text-foreground" : "text-muted-foreground hover:text-foreground"}`}
            >
                {isSimpleView && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9 }} // Start slightly "back" (Z-depth)
                        animate={{ opacity: 1, scale: 1 }}    // Snap to front
                        transition={{ type: "spring", stiffness: 500, damping: 30 }} // Snappy pop effect
                        className="absolute inset-0 bg-background rounded-md shadow-[0_1px_3px_rgba(0,0,0,0.1)] -z-10"
                    />
                )}
                <LayoutList className="w-3.5 h-3.5" />
                Simple
            </button>
            <button
                onClick={() => handleViewToggle(false)}
                className={`relative flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded transition-colors w-24 z-10 ${!isSimpleView ? "text-foreground" : "text-muted-foreground hover:text-foreground"}`}
            >
                {!isSimpleView && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ type: "spring", stiffness: 500, damping: 30 }}
                        className="absolute inset-0 bg-background rounded-md shadow-[0_1px_3px_rgba(0,0,0,0.1)] -z-10"
                    />
                )}
                <BarChart3 className="w-3.5 h-3.5" />
                Detailed
            </button>
        </div>
    );

    return (
        <Card className="border-none shadow-md bg-card overflow-hidden flex flex-col">
            <CardContent className="p-5 flex-1 flex flex-col">
                <div className="flex flex-col sm:flex-row items-center justify-between mb-6 gap-4">
                    <div className="flex-1 w-full sm:w-auto">
                        {monthNavigator}
                    </div>
                    <div className="flex flex-col-reverse sm:flex-row items-center gap-4 w-full sm:w-auto justify-between sm:justify-end">
                        <motion.div layout>
                            <AnimatePresence>
                                {!isEmptyMonth && (
                                    <motion.div
                                        key="view-toggle"
                                        // key={`view-toggle-${selectedMonth}-${selectedYear}`}
                                        initial={{ opacity: 0, scale: 0.8, x: 20 }}
                                        animate={{ opacity: 1, scale: 1, x: 0 }}
                                        exit={{ opacity: 0, scale: 0.8, x: 20 }}
                                        transition={fluidSpring}
                                    >
                                        <ViewToggle />
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </motion.div>
                        <div className="flex items-center gap-2">
                            {importDataButton}
                            {addExpenseButton}
                            {/* Conditionally highlight the Add Income button if the month is empty */}
                            {isEmptyMonth && addIncomeButton ? (
                                <motion.div
                                    // "Breathing" animation: scales up to 10% larger and back down
                                    animate={{ scale: [1, 1.1, 1] }}
                                    transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                                    className="relative z-10"
                                >
                                    {/* Stronger Glow: Negative inset makes it bleed out, blur makes it glow */}
                                    <div className="absolute -inset-2 bg-emerald-400/50 rounded-lg blur-md animate-pulse"></div>
                                    <div className="relative">{addIncomeButton}</div>
                                </motion.div>
                            ) : (
                                addIncomeButton
                            )}
                        </div>
                    </div>
                </div>

                <div className="flex flex-col gap-6">
                    {isEmptyMonth ? (
                        <div className="flex flex-col items-center justify-center py-10 text-center space-y-5 animate-in fade-in zoom-in-95 duration-500">
                            <div className="w-16 h-16 bg-emerald-500/10 rounded-full flex items-center justify-center shadow-sm">
                                <Calendar className="w-8 h-8 text-emerald-600" />
                            </div>
                            <div className="space-y-2 max-w-sm">
                                <h3 className="text-xl font-bold text-foreground">Ready to plan for {monthName}?</h3>
                                <p className="text-muted-foreground text-sm leading-relaxed">
                                    Start by adding your expected income to see your savings potential and unlock your budget goals.
                                </p>
                            </div>
                        </div>

                    ) : ( // Non-empty state continues below
                        <>
                            <div className="flex items-end justify-between">
                                <div>
                                    {isTotalOver ? (
                                        <h2 className="text-3xl font-bold text-red-600 flex items-center gap-2">
                                            Over Limit <AlertCircle className="w-6 h-6" />
                                        </h2>
                                    ) : (
                                        <div className="space-y-1">
                                            <h2 className="text-4xl font-extrabold text-foreground flex items-center gap-2 tracking-tight">
                                                {Math.round(savingsPctDisplay)}% <span className="text-xl font-semibold text-emerald-600">{isUsingProjection ? "Projected" : "Saved"}</span>
                                            </h2>
                                            <p className="text-sm font-medium text-muted-foreground flex items-center gap-1.5 animate-in fade-in slide-in-from-left-2 duration-500">
                                                {extraSavingsAmount > 0 ? (
                                                    <><TrendingUp className="w-4 h-4 text-emerald-500" /> You've crushed your goal by <span className="text-emerald-700 font-bold">{formatCurrency(extraSavingsAmount, settings)}</span>!</>
                                                ) : savingsAmount > 0 ? (
                                                    <><Target className="w-4 h-4 text-blue-500" /> You're <span className="text-blue-600 font-bold">{formatCurrency(savingsLimit - savingsAmount, settings)}</span> away from your monthly target.</>
                                                ) : (
                                                    "Every cent counts. Start your savings journey today!"
                                                )}
                                            </p>
                                        </div>
                                    )}
                                    <div className="text-sm text-muted-foreground mt-1">
                                        {effectiveIncome > 0 ? (
                                            <div className="flex items-center gap-2">
                                                <span>Spent <strong className={isTotalOver ? "text-red-600" : "text-foreground"}>{formatCurrency(totalSpent, settings)}</strong> of <strong>{formatCurrency(effectiveIncome, settings)}</strong> {isUsingProjection && "(Est.)"}</span>

                                                {/* Visual Badge for Projection Mode */}
                                                {isUsingProjection && (
                                                    <div className="flex items-center gap-1 text-[10px] font-bold text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded-full border border-amber-100/50 shadow-sm animate-in fade-in zoom-in-90">
                                                        <Sparkles className="w-2.5 h-2.5" />
                                                        <span>Estimated Income</span>
                                                    </div>
                                                )}
                                            </div>
                                        ) : "No income recorded."}
                                    </div>
                                </div>

                                {!isTotalOver && (
                                    <div className="hidden sm:flex flex-col items-end relative">
                                        <motion.div
                                            layout
                                            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-muted border border-border z-20 relative"
                                        >
                                            <Wallet className="w-3 h-3 text-muted-foreground" />
                                            <span className="text-xs font-medium text-muted-foreground">Left: {formatCurrency(savingsAmount, settings)}</span>
                                        </motion.div>
                                        <AnimatePresence>
                                            {!isSimpleView && bonusSavingsPotential > 0 && (
                                                <motion.div
                                                    key="efficiency-badge"
                                                    initial={{ opacity: 0, height: 0, marginTop: 0, y: 10 }}
                                                    animate={{ opacity: 1, height: "auto", marginTop: 8, y: 0 }}
                                                    exit={{ opacity: 0, height: 0, marginTop: 0, y: 10 }}
                                                    transition={{ duration: 0.3, ease: "easeInOut" }}
                                                    className="overflow-hidden flex justify-end"
                                                >
                                                    <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 border border-emerald-100">
                                                        <TrendingUp className="w-3 h-3 text-emerald-600" />
                                                        <span className="text-xs font-medium text-emerald-700">Efficiency: +{formatCurrency(bonusSavingsPotential, settings)}</span>
                                                    </div>
                                                </motion.div>
                                            )}
                                        </AnimatePresence>
                                    </div>
                                )}
                            </div>

                            <div className="space-y-2">
                                <div className="relative h-10 w-full bg-muted/50 rounded-xl overflow-hidden flex shadow-inner border border-border">
                                    {renderUnifiedBar()}
                                </div>

                                <div className="flex flex-col sm:flex-row justify-between text-xs text-muted-foreground pt-1 gap-2">
                                    <div className="flex gap-4 items-center">
                                        <span className="flex items-center gap-1.5">
                                            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: needsColor }}></div>
                                            {FINANCIAL_PRIORITIES.needs.label}
                                        </span>
                                        <span className="flex items-center gap-1.5">
                                            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: wantsColor }}></div>
                                            {FINANCIAL_PRIORITIES.wants.label}
                                        </span>
                                        <AnimatePresence>
                                            {!isSimpleView && (
                                                <motion.div
                                                    initial={{ opacity: 0, y: -15, width: 0 }}
                                                    animate={{ opacity: 1, y: 0, width: "auto" }}
                                                    exit={{ opacity: 0, y: -15, width: 0 }}
                                                    className="flex items-center gap-4 overflow-hidden"
                                                >
                                                    <span className="flex items-center gap-1.5 ml-2">
                                                        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: savingsColor }}></div>
                                                        Savings
                                                    </span>
                                                    <span className="flex items-center gap-1.5">
                                                        <div className="w-2 h-2 rounded-full bg-emerald-300"></div>
                                                        Extra
                                                    </span>
                                                    <span className="flex items-center gap-1 ml-2 border-l border-gray-200 pl-4">
                                                        <div className="w-2 h-2 bg-gray-400 rounded-sm"></div> Paid
                                                    </span>
                                                    <span className="flex items-center gap-1">
                                                        <div className="w-2 h-2 bg-gray-400/50 rounded-sm" style={STRIPE_PATTERN}></div> Unpaid
                                                    </span>
                                                </motion.div>
                                            )}
                                        </AnimatePresence>
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
                        </>
                    )}
                </div>
            </CardContent>
        </Card>
    );
});

export default RemainingBudgetCard;