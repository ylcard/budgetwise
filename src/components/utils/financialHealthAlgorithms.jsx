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
import { getMonthBoundaries } from "./dateUtils";

/**
 * Calculate standard deviation
 */
const calculateStdDev = (values) => {
    if (values.length === 0) return 0;
    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    const squaredDiffs = values.map(v => Math.pow(v - mean, 2));
    const variance = squaredDiffs.reduce((a, b) => a + b, 0) / values.length;
    return Math.sqrt(variance);
};

// METRIC CALCULATORS

/**
 * METRIC 1: Pacing Score (0-100)
 * Real-time: Compare current spend vs 3-month average for same day range
 */
const calculatePacingScore = (transactions, fullHistory, categories, allCustomBudgets, startDate) => {
    const today = new Date();
    const start = new Date(startDate);

    // If viewing current month, compare "Day 1 to Today". If past month, compare full month.
    const isCurrentMonthView = today.getMonth() === start.getMonth() && today.getFullYear() === start.getFullYear();
    const dayCursor = isCurrentMonthView ? today.getDate() : new Date(start.getFullYear(), start.getMonth() + 1, 0).getDate();

    // Current spend (Using unified breakdown logic)
    const { monthStart, monthEnd } = getMonthBoundaries(start.getMonth(), start.getFullYear());
    const currentSpend = getFinancialBreakdown(transactions, categories, allCustomBudgets, monthStart, monthEnd, dayCursor).totalExpenses;

    // Historical context (Average of last 3 months by Day X)
    const getHistoryByDayX = (offset) => {
        const d = new Date(start);
        d.setMonth(start.getMonth() - offset);
        const bounds = getMonthBoundaries(d.getMonth(), d.getFullYear());
        return getFinancialBreakdown(fullHistory, categories, allCustomBudgets, bounds.monthStart, bounds.monthEnd, dayCursor).totalExpenses;
    };

    const spendM1 = getHistoryByDayX(1);
    const spendM2 = getHistoryByDayX(2);
    const spendM3 = getHistoryByDayX(3);

    // Calculate baseline (average of non-zero months)
    const historyPoints = [spendM1, spendM2, spendM3].filter(v => v > 0);
    const averageSpendAtPointX = historyPoints.length > 0
        ? historyPoints.reduce((a, b) => a + b, 0) / historyPoints.length
        : null; // No history found

    // Score calculation
    if (averageSpendAtPointX === null) return 50; // Neutral score for new users
    const diff = currentSpend - averageSpendAtPointX;
    if (diff <= 0) return 100; // Under average = Perfect

    // Penalize for being over average
    const deviation = averageSpendAtPointX > 0 ? diff / averageSpendAtPointX : 1;
    return Math.max(0, 100 - (deviation * 100));
};

/**
 * METRIC 2: Burn Ratio (0-100)
 * Real-time: Is spending rate sustainable for income?
 * Target: Spend < 80% of income by end of month
 */
const calculateBurnRatio = (transactions, categories, allCustomBudgets, monthlyIncome, startDate, settings, goals) => {
    const start = new Date(startDate);
    const year = start.getFullYear();
    const month = start.getMonth();
    const { monthStart, monthEnd } = getMonthBoundaries(month, year);
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    const today = new Date();
    const isCurrentMonthView = today.getMonth() === month && today.getFullYear() === year;
    const dayCursor = isCurrentMonthView ? today.getDate() : daysInMonth;

    const needsLimit = getMonthlyTarget(goals, 'needs', monthlyIncome, settings);
    const wantsLimit = getMonthlyTarget(goals, 'wants', monthlyIncome, settings);

    const targetMaxSpend = (needsLimit + wantsLimit) * (dayCursor / daysInMonth);
    const currentSpend = getFinancialBreakdown(transactions, categories, allCustomBudgets, monthStart, monthEnd, dayCursor).totalExpenses;

    if (currentSpend <= targetMaxSpend) return 100;

    const overRatio = targetMaxSpend > 0 ? (currentSpend - targetMaxSpend) / targetMaxSpend : 1;
    return Math.max(0, 100 - (overRatio * 100));
};

/**
 * METRIC 3: Stability Score (0-100)
 * Historical: Coefficient of Variation of monthly expenses over last 6 months
 * Lower CV = Higher stability = Better score
 */
const calculateStabilityScore = (fullHistory, categories, allCustomBudgets, startDate) => {
    const start = new Date(startDate);
    const monthlyExpenses = [];

    // Collect last 6 months of expenses
    for (let i = 1; i <= 6; i++) {
        const targetDate = new Date(start);
        targetDate.setMonth(start.getMonth() - i);
        const { monthStart, monthEnd } = getMonthBoundaries(targetDate.getMonth(), targetDate.getFullYear());
        const expenses = getFinancialBreakdown(fullHistory, categories, allCustomBudgets, monthStart, monthEnd).totalExpenses;
        if (expenses > 0) monthlyExpenses.push(expenses);
    }

    if (monthlyExpenses.length < 2) return 50; // Not enough data, neutral score

    const mean = monthlyExpenses.reduce((a, b) => a + b, 0) / monthlyExpenses.length;
    const stdDev = calculateStdDev(monthlyExpenses);
    const cv = mean > 0 ? stdDev / mean : 0; // Coefficient of Variation

    // Score: CV of 0 = 100, CV of 0.5 or higher = 0
    // Linear scale: Score = 100 - (CV * 200)
    return Math.max(0, Math.min(100, 100 - (cv * 200)));
};

/**
 * METRIC 4: Financial Sharpe Ratio (0-100)
 * Historical: Risk-adjusted savings consistency
 * Formula: (Average Monthly Net Savings) / (Std Dev of Net Savings)
 */
const calculateSharpeRatio = (fullHistory, categories, allCustomBudgets, monthlyIncome, startDate, settings, goals) => {
    const start = new Date(startDate);
    const monthlySavings = [];

    // Collect last 6 months of net savings
    for (let i = 1; i <= 6; i++) {
        const targetDate = new Date(start);
        targetDate.setMonth(start.getMonth() - i);
        const { monthStart, monthEnd } = getMonthBoundaries(targetDate.getMonth(), targetDate.getFullYear());
        const income = getMonthlyIncome(fullHistory, monthStart, monthEnd);
        const expenses = getFinancialBreakdown(fullHistory, categories, allCustomBudgets, monthStart, monthEnd).totalExpenses;
        const netSavings = income - expenses;
        if (income > 0) monthlySavings.push(netSavings); // Only include months with income
    }

    if (monthlySavings.length < 2) return 50; // Not enough data, neutral score

    const target = getMonthlyTarget(goals, 'savings', monthlyIncome, settings);

    if (target <= 0) return 100;

    const totalShortfall = monthlySavings.reduce((acc, s) => acc + Math.max(0, target - s), 0);
    const maxAllowableShortfall = target * 2; // Bottom out at 0 if you miss 2 full months of savings over 6 months
    return Math.max(0, 100 - (totalShortfall / maxAllowableShortfall * 100));
};

/**
 * METRIC 5: Lifestyle Creep Index (0-100)
 * Historical: Compare expense growth vs income growth over last 6 months
 * Penalize if expenses grow faster than income
 */
const calculateLifestyleCreepIndex = (fullHistory, categories, allCustomBudgets, startDate) => {
    const start = new Date(startDate);
    const dataPoints = [];

    // Collect last 6 months of income and expenses
    for (let i = 1; i <= 6; i++) {
        const targetDate = new Date(start);
        targetDate.setMonth(start.getMonth() - i);
        const { monthStart, monthEnd } = getMonthBoundaries(targetDate.getMonth(), targetDate.getFullYear());
        const income = getMonthlyIncome(fullHistory, monthStart, monthEnd);
        const expenses = getFinancialBreakdown(fullHistory, categories, allCustomBudgets, monthStart, monthEnd).totalExpenses;
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
 * @returns {Object} { totalScore, breakdown, label }
 */
export const calculateFinancialHealth = (transactions, fullHistory, monthlyIncome, startDate, settings, goals, categories, allCustomBudgets) => {
    // Calculate all 5 metrics
    const pacing = calculatePacingScore(transactions, fullHistory, categories, allCustomBudgets, startDate);
    const ratio = calculateBurnRatio(transactions, categories, allCustomBudgets, monthlyIncome, startDate, settings, goals);
    const stability = calculateStabilityScore(fullHistory, categories, allCustomBudgets, startDate);
    const sharpe = calculateSharpeRatio(fullHistory, categories, allCustomBudgets, monthlyIncome, startDate, settings, goals);
    const creep = calculateLifestyleCreepIndex(fullHistory, categories, allCustomBudgets, startDate);

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