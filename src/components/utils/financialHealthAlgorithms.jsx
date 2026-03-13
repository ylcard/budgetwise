/**
 * Financial Health Algorithm Suite
 * CREATED: 16-Jan-2026
 * 
 * This module calculates a comprehensive financial health score based on 5 core metrics:
 * 1. Pacing Score (Real-time): Current spend vs 3-month historical average
 * 2. Burn Ratio (Real-time): Spending sustainability against income
 * 3. Stability Score (Historical): Spending volatility (Coefficient of Variation)
 * 4. Financial Sharpe Ratio (Historical): Risk-adjusted savings consistency
 * 5. Lifestyle Creep Index (Historical): Expense growth vs income growth
 */

import {
    getFinancialBreakdown,
    getMonthlyIncome,
    getMonthlyTarget
} from "./financialCalculations";
import { getMonthBoundaries, parseDate } from "./dateUtils";

/**
 * Calculate standard deviation
 * @param {number[]} values - Array of numerical values
 */
const calculateStdDev = (values) => {
    if (values.length < 2) return 0;
    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    const squaredDiffs = values.map(v => Math.pow(v - mean, 2));
    // USE SAMPLE VARIANCE (N-1) for small history sets
    const variance = squaredDiffs.reduce((a, b) => a + b, 0) / (values.length - 1);
    return Math.sqrt(variance);
};

// --- DATA PREP (O(N) Optimization) ---

/**
 * Single-pass bucket builder to prevent massive O(N * 18) looping in algorithms.
 * Groups raw transactions by month and pre-calculates top-level aggregates.
 * @param {Array} fullHistory - List of all historical transactions
 * @param {string} startDate - The reference start date (YYYY-MM-DD)
 * @param {Array} categories - Category definitions
 * @param {Array} allCustomBudgets - Budget definitions
 */
const buildMonthlyBuckets = (fullHistory, startDate, categories, allCustomBudgets) => {
    const start = parseDate(startDate) || new Date();

    // 1. Single pass: Group all historical transactions by YYYY-MM
    const groupedTxns = {};
    for (const t of fullHistory) {
        const monthKey = t.date.substring(0, 7); // Safe extraction of YYYY-MM
        if (!groupedTxns[monthKey]) groupedTxns[monthKey] = [];
        groupedTxns[monthKey].push(t);
    }

    // 2. Compute the precise 6 months we care about for the baseline
    const historySummary = {};
    for (let i = 1; i <= 6; i++) {
        const targetDate = new Date(start.getFullYear(), start.getMonth() - i, 1);
        const monthKey = `${targetDate.getFullYear()}-${String(targetDate.getMonth() + 1).padStart(2, '0')}`;
        const { monthStart, monthEnd } = getMonthBoundaries(targetDate.getMonth(), targetDate.getFullYear());

        const monthTxns = groupedTxns[monthKey] || [];

        historySummary[i] = {
            txns: monthTxns,
            monthStart,
            monthEnd,
            totalIncome: getMonthlyIncome(monthTxns, monthStart, monthEnd),
            totalExpenses: getFinancialBreakdown(monthTxns, categories, allCustomBudgets, monthStart, monthEnd).totalExpenses
        };
    }
    return historySummary;
};

// METRIC CALCULATORS

/**
 * METRIC 1: Pacing Score (0-100)
 * UPDATED 13-Mar-2026: When projection data is available for the current month, uses
 * full-month projected total vs full-month historical average. This eliminates
 * small-sample noise from partial-month comparisons.
 * Fallback: Original partial-month comparison (day 1→today vs history day 1→today).
 * @param {Array} transactions - Current month transactions
 * @param {Object} historySummary - Pre-calculated history buckets
 * @param {Array} categories - Category definitions
 * @param {Array} allCustomBudgets - Budget definitions
 * @param {string} startDate - Current view date (YYYY-MM-DD)
 * @param {Object|null} projectionTotals - Projection engine totals (from useProjections)
 */
const calculatePacingScore = (transactions, historySummary, categories, allCustomBudgets, startDate, projectionTotals = null) => {
    const today = new Date();
    const start = parseDate(startDate) || new Date();
    const isCurrentMonthView = today.getMonth() === start.getMonth() && today.getFullYear() === start.getFullYear();

    const dayCursor = isCurrentMonthView ? today.getDate() : new Date(start.getFullYear(), start.getMonth() + 1, 0).getDate();
    const { monthStart, monthEnd } = getMonthBoundaries(start.getMonth(), start.getFullYear());

    // --- 1. VELOCITY COMPONENT (MTD Actual vs MTD History) ---
    const currentSpend = getFinancialBreakdown(transactions, categories, allCustomBudgets, monthStart, monthEnd, dayCursor).totalExpenses;

    const getHistoryByDayX = (offset) => {
        const summary = historySummary[offset];
        if (!summary || !summary.txns) return 0;
        return getFinancialBreakdown(summary.txns, categories, allCustomBudgets, summary.monthStart, summary.monthEnd, dayCursor).totalExpenses;
    };

    const spendM1 = getHistoryByDayX(1);
    const spendM2 = getHistoryByDayX(2);
    const spendM3 = getHistoryByDayX(3);

    const historyPoints = [spendM1, spendM2, spendM3].filter(v => v > 0);
    const averageSpendAtPointX = historyPoints.length > 0
        ? historyPoints.reduce((a, b) => a + b, 0) / historyPoints.length
        : null;

    let velocityScore = 100;
    if (averageSpendAtPointX !== null) {
        const diff = currentSpend - averageSpendAtPointX;
        if (diff > 0) {
            const deviation = averageSpendAtPointX > 0 ? diff / averageSpendAtPointX : 1;
            velocityScore = Math.max(0, 100 - (deviation * 100));
        }
    }

    // --- 2. TRAJECTORY COMPONENT (Projected vs Full Month History) ---
    if (isCurrentMonthView && projectionTotals?.finalProjectedExpense > 0) {
        const projectedFullMonthSpend = projectionTotals.finalProjectedExpense;

        const fullMonthPoints = [];
        for (let i = 1; i <= 3; i++) {
            if (historySummary[i]?.totalExpenses > 0) {
                fullMonthPoints.push(historySummary[i].totalExpenses);
            }
        }
        const historicalFullMonthAvg = fullMonthPoints.length > 0
            ? fullMonthPoints.reduce((a, b) => a + b, 0) / fullMonthPoints.length
            : null;

        let trajectoryScore = 100;
        if (historicalFullMonthAvg !== null) {
            const diffFull = projectedFullMonthSpend - historicalFullMonthAvg;
            if (diffFull > 0) {
                const deviationFull = historicalFullMonthAvg > 0 ? diffFull / historicalFullMonthAvg : 1;
                trajectoryScore = Math.max(0, 100 - (deviationFull * 100));
            }
        }

        // Debugging pacing score
        console.log("=== PACING SCORE DEBUG ===", {
            currentSpend,
            averageSpendAtPointX,
            velocityScore,
            projectedFullMonthSpend,
            historicalFullMonthAvg,
            trajectoryScore,
            finalScore: (velocityScore + trajectoryScore) / 2
        });

        return (velocityScore + trajectoryScore) / 2;
    }

    // debugging pacing score
    console.log("=== PACING SCORE DEBUG (MTD ONLY) ===", { currentSpend, averageSpendAtPointX, velocityScore });
    return velocityScore;
};

/**
 * METRIC 2: Burn Ratio (0-100)
 * UPDATED 13-Mar-2026: When projection data is available for the current month, uses the
 * projection engine's full-month forecast (actual + predicted remaining) compared against
 * the full-month budget. Per-priority projected expenses drive the wants-ratio penalty
 * for more accurate weighting than partial-month actuals.
 * Fallback: Original linear-interpolation approach for past months or missing projections.
 * @param {Array} transactions - Current month transactions
 * @param {Array} categories - Category definitions
 * @param {Array} allCustomBudgets - Budget definitions
 * @param {number} monthlyIncome - Current income
 * @param {string} startDate - Current view date (YYYY-MM-DD)
 * @param {Object} settings - User settings
 * @param {Array} goals - User goals
 * @param {Object} historySummary - Pre-calculated history buckets
 * @param {Object|null} projectionTotals - Projection engine totals (from useProjections)
 */
const calculateBurnRatio = (transactions, categories, allCustomBudgets, monthlyIncome, startDate, settings, goals, historySummary, projectionTotals = null) => {
    const start = parseDate(startDate) || new Date();
    const year = start.getFullYear();
    const month = start.getMonth();
    const { monthStart, monthEnd } = getMonthBoundaries(month, year);
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    const today = new Date();
    const isCurrentMonthView = today.getMonth() === month && today.getFullYear() === year;

    const needsLimit = getMonthlyTarget(goals, 'needs', monthlyIncome, settings);
    const wantsLimit = getMonthlyTarget(goals, 'wants', monthlyIncome, settings);
    const totalBudget = needsLimit + wantsLimit;
    const dayCursor = isCurrentMonthView ? today.getDate() : daysInMonth;

    // --- 1. VELOCITY COMPONENT (MTD) ---
    const linearTarget = totalBudget * (dayCursor / daysInMonth);

    let historicalAvgByDayX = 0;
    let count = 0;
    for (let i = 1; i <= 3; i++) {
        const h = historySummary[i];
        if (h && h.totalExpenses > 0) {
            historicalAvgByDayX += (h.totalExpenses * (dayCursor / daysInMonth));
            count++;
        }
    }
    historicalAvgByDayX = count > 0 ? historicalAvgByDayX / count : linearTarget;

    const smartTarget = Math.max(linearTarget, historicalAvgByDayX);
    const bufferedTarget = smartTarget * 1.10;

    const breakdown = getFinancialBreakdown(transactions, categories, allCustomBudgets, monthStart, monthEnd, dayCursor);
    const currentSpend = breakdown.totalExpenses;

    let velocityScore = 100;
    if (currentSpend > bufferedTarget) {
        const needsSpend = breakdown.needsTotal || 0;
        const wantsSpend = breakdown.wantsTotal || 0;
        const totalTracked = needsSpend + wantsSpend;
        const wantsRatio = totalTracked > 0 ? (wantsSpend / totalTracked) : 1;
        const penaltyMultiplier = 0.5 + wantsRatio;
        const overRatio = bufferedTarget > 0 ? (currentSpend - bufferedTarget) / bufferedTarget : 1;
        velocityScore = Math.max(0, 100 - (overRatio * penaltyMultiplier * 200));
    }

    // --- 2. TRAJECTORY COMPONENT (Projections) ---
    if (isCurrentMonthView && projectionTotals?.finalProjectedExpense > 0 && totalBudget > 0) {
        const projectedFullMonthSpend = projectionTotals.finalProjectedExpense;

        let historicalFullMonthAvg = 0;
        let histCount = 0;
        for (let i = 1; i <= 3; i++) {
            if (historySummary[i]?.totalExpenses > 0) {
                historicalFullMonthAvg += historySummary[i].totalExpenses;
                histCount++;
            }
        }
        historicalFullMonthAvg = histCount > 0 ? historicalFullMonthAvg / histCount : totalBudget;

        const smartTargetFull = Math.max(totalBudget, historicalFullMonthAvg);
        const bufferedTargetFull = smartTargetFull * 1.10;

        let trajectoryScore = 100;
        if (projectedFullMonthSpend > bufferedTargetFull) {
            const projectedNeeds = (projectionTotals.actualExpense || 0) > 0 ? (projectionTotals.projectedRemainingExpenseNeeds || 0) : 0;
            const projectedWants = (projectionTotals.actualExpense || 0) > 0 ? (projectionTotals.projectedRemainingExpenseWants || 0) : 0;

            const fullBreakdown = getFinancialBreakdown(transactions, categories, allCustomBudgets, monthStart, monthEnd);
            const totalProjectedNeeds = (fullBreakdown.needsTotal || 0) + projectedNeeds;
            const totalProjectedWants = (fullBreakdown.wantsTotal || 0) + projectedWants;
            const totalTracked = totalProjectedNeeds + totalProjectedWants;

            const wantsRatio = totalTracked > 0 ? (totalProjectedWants / totalTracked) : 1;
            const penaltyMultiplier = 0.5 + wantsRatio;
            const overRatioFull = bufferedTargetFull > 0 ? (projectedFullMonthSpend - bufferedTargetFull) / bufferedTargetFull : 1;

            trajectoryScore = Math.max(0, 100 - (overRatioFull * penaltyMultiplier * 200));
        }

        // debugging burn score
        console.log("=== BURN RATIO DEBUG ===", {
            totalBudget,
            currentSpend,
            needsSpend: breakdown.needsTotal || 0,
            wantsSpend: breakdown.wantsTotal || 0,
            bufferedTarget,
            velocityScore,
            projectedFullMonthSpend,
            bufferedTargetFull,
            trajectoryScore,
            finalScore: (velocityScore + trajectoryScore) / 2
        });
        return (velocityScore + trajectoryScore) / 2;
    }

    // debugging burn score
    console.log("=== BURN RATIO DEBUG (MTD ONLY) ===", { totalBudget, currentSpend, bufferedTarget, velocityScore });
    return velocityScore;
};

/**
 * METRIC 3: Stability Score (0-100)
 * Historical: Coefficient of Variation of monthly expenses over last 6 months
 * Lower CV = Higher stability = Better score
 * @param {Object} historySummary - Pre-calculated history buckets
 */
const calculateStabilityScore = (historySummary) => {
    const monthlyExpenses = [];

    // Collect last 6 months of expenses
    for (let i = 1; i <= 6; i++) {
        if (historySummary[i].totalExpenses > 0) {
            monthlyExpenses.push(historySummary[i].totalExpenses);
        }
    }

    if (monthlyExpenses.length < 2) return 50; // Not enough data, neutral score

    const mean = monthlyExpenses.reduce((a, b) => a + b, 0) / monthlyExpenses.length;
    const stdDev = calculateStdDev(monthlyExpenses);
    const cv = mean > 0 ? stdDev / mean : 1; // Prevent div/0, default to high variance if mean 0

    // Score: CV of 0 = 100, CV of 0.5 or higher = 0
    // Linear scale: Score = 100 - (CV * 200)
    return Math.max(0, Math.min(100, 100 - (cv * 200)));
};

/**
 * METRIC 4: Financial Sharpe Ratio (0-100)
 * Historical: Risk-adjusted savings consistency
 * Formula: (Average Monthly Net Savings) / (Std Dev of Net Savings)
 * @param {Object} historySummary - Pre-calculated history buckets
 */
const calculateSharpeRatio = (historySummary) => {
    const monthlySavings = [];

    // Collect last 6 months of net savings
    for (let i = 1; i <= 6; i++) {
        const income = historySummary[i].totalIncome;
        const expenses = historySummary[i].totalExpenses;
        if (income > 0) {
            monthlySavings.push(income - expenses);
        }
    }

    if (monthlySavings.length < 2) return 50; // Not enough data, neutral score

    const avgSavings = monthlySavings.reduce((a, b) => a + b, 0) / monthlySavings.length;
    let stdDev = calculateStdDev(monthlySavings);

    // FLOOR STDDEV to prevent infinite ratios on perfect consistency
    // 1% of average or 1.0, whichever is larger
    const minDev = Math.max(1, Math.abs(avgSavings * 0.01));
    stdDev = Math.max(stdDev, minDev);

    // Standard Sharpe Ratio
    const sharpe = avgSavings / stdDev;

    // Map Sharpe to 0-100 scale using a more forgiving curve
    // If Sharpe is negative (Average is a loss), score is 0-25
    if (sharpe < 0) {
        return Math.max(0, 25 + (sharpe * 25));
    }

    // If Sharpe is positive, we use a multiplier that rewards getting 
    // closer to a 1.0 ratio (Consistency).
    // 0.16 Sharpe will now result in ~40/100 (Fair/Warning)
    // 0.50 Sharpe will result in ~70/100 (Good)
    let score = 25 + (Math.sqrt(sharpe) * 65);

    return Math.min(100, Math.round(score));
};

/**
 * METRIC 5: Lifestyle Creep Index (0-100)
 * Historical: Compare expense growth vs income growth over last 6 months
 * Penalize if expenses grow faster than income
 * @param {Object} historySummary - Pre-calculated history buckets
 */
const calculateLifestyleCreepIndex = (historySummary) => {
    const dataPoints = [];

    // Collect last 6 months of income and expenses
    for (let i = 1; i <= 6; i++) {
        const income = historySummary[i].totalIncome;
        const expenses = historySummary[i].totalExpenses;
        if (income > 0) dataPoints.push({ income, expenses });
    }

    if (dataPoints.length < 3) return 50; // Not enough data, neutral score

    dataPoints.reverse(); // Oldest to newest

    // Calculate growth rates (simple linear regression slope approximation)
    // Smoothing: Compare average of first 2 months vs last 2 months
    const startInc = (dataPoints[0].income + dataPoints[1].income) / 2;
    const endInc = (dataPoints[dataPoints.length - 1].income + dataPoints[dataPoints.length - 2].income) / 2;
    const startExp = (dataPoints[0].expenses + dataPoints[1].expenses) / 2;
    const endExp = (dataPoints[dataPoints.length - 1].expenses + dataPoints[dataPoints.length - 2].expenses) / 2;

    const incomeGrowth = (endInc - startInc) / startInc;
    const expenseGrowth = (endExp - startExp) / startExp;

    // Score: If expense growth <= income growth, score 100
    // For every 1% that expenses outpace income, lose 5 points
    const creepDelta = expenseGrowth - incomeGrowth;

    if (creepDelta <= 0) return 100; // No lifestyle creep

    return Math.max(0, 100 - (creepDelta * 500)); // Penalize excess expense growth
};

// MASTER CALCULATION FUNCTION

/**
 * Calculate comprehensive financial health score
 * 
 * @param {Array} transactions - Current period's transactions
 * @param {Array} fullHistory - All historical transactions
 * @param {number} monthlyIncome - Current period income
 * @param {string} startDate - Start date of current viewing period (YYYY-MM-DD)
 * @param {Object} settings - User settings
 * @param {Array} goals - User goals
 * @param {Array} categories - User categories
 * @param {Array} allCustomBudgets - Custom budgets list
 * @returns {Object} { totalScore, breakdown, label }
 */
// UPDATED 13-Mar-2026: Added projectionTotals param for projection-enhanced Pacing & Burn Ratio
export const calculateFinancialHealth = (transactions, fullHistory, monthlyIncome, startDate, settings, goals, categories, allCustomBudgets, projectionTotals = null) => {
    // --- 1. PREP PHASE (Tier 2 Optimization) ---
    const historySummary = buildMonthlyBuckets(fullHistory, startDate, categories, allCustomBudgets);

    // --- 2. CALCULATE METRICS ---
    const pacing = calculatePacingScore(transactions, historySummary, categories, allCustomBudgets, startDate, projectionTotals);
    const ratio = calculateBurnRatio(transactions, categories, allCustomBudgets, monthlyIncome, startDate, settings, goals, historySummary, projectionTotals);
    const stability = calculateStabilityScore(historySummary);
    const sharpe = calculateSharpeRatio(historySummary);
    const creep = calculateLifestyleCreepIndex(historySummary);

    // Weighted average (can adjust weights as needed)
    // Current weights: Pacing 25%, Ratio 25%, Stability 20%, Sharpe 15%, Creep 15%
    const totalScore = Math.round(
        (pacing * 0.25) +
        (ratio * 0.25) +
        (stability * 0.20) +
        (sharpe * 0.15) +
        (creep * 0.15)
    );

    // Determine label
    let label = 'Needs Work';
    if (totalScore >= 90) label = 'Excellent';
    else if (totalScore >= 75) label = 'Good';
    else if (totalScore >= 60) label = 'Fair';

    return {
        totalScore,
        breakdown: {
            pacing: Math.round(pacing),
            ratio: Math.round(ratio),
            stability: Math.round(stability),
            sharpe: Math.round(sharpe),
            creep: Math.round(creep)
        },
        label
    };
};