/**
 * Budget Feasibility Engine
 * CREATED: 16-Jan-2026
 * 
 * Analyzes the financial impact of proposed custom budgets and provides
 * feasibility grades and recommendations for funding strategies.
 */

import { differenceInMonths, subMonths, isDate } from "date-fns";
import { getMonthlyIncome, getMonthlyPaidExpenses } from "./financialCalculations";
import { getMonthBoundaries, parseDate } from "./dateUtils";

/**
 * Check if a proposed budget is feasible and calculate its impact
 * 
 * @param {number} proposedAmount - Proposed budget amount
 * @param {Date} startDate - Budget start date
 * @param {Date} endDate - Budget end date
 * @param {Array} transactions - Full transaction history
 * @param {Object} settings - User settings
 * @returns {Object} Feasibility analysis with grade and recommendations
 */
export function checkBudgetImpact(proposedAmount, startDate, endDate, transactions, settings) {
  if (!proposedAmount || !startDate || !endDate || !transactions) {
    return {
      feasibilityGrade: 'F',
      isAffordable: false,
      message: 'Insufficient data for analysis',
      temporalContext: 'unknown'
    };
  }

  // ADDED: 16-Jan-2026 - Temporal awareness
  const now = new Date();
  // Ensure consistent parsing with dateUtils or Date object
  const budgetStart = isDate(startDate) ? startDate : parseDate(startDate);
  const budgetEnd = isDate(endDate) ? endDate : parseDate(endDate);

  const isFuture = budgetStart > now;
  const isOngoing = budgetStart <= now && budgetEnd >= now;
  const isPast = budgetEnd < now;

  const temporalContext = isFuture ? 'future' : isOngoing ? 'ongoing' : 'past';

  // Calculate historical net flow (last 6 months)
  const today = new Date();

  const monthlyFlows = [];
  for (let i = 0; i < 6; i++) {
    // setMonth fails on the 31st (jumps to March). subMonths handles this safely.
    const targetDate = subMonths(today, i);

    const { monthStart, monthEnd } = getMonthBoundaries(
      targetDate.getMonth(),
      targetDate.getFullYear()
    );

    const income = getMonthlyIncome(transactions, monthStart, monthEnd);
    const expenses = getMonthlyPaidExpenses(transactions, monthStart, monthEnd);

    monthlyFlows.push({
      income,
      expenses,
      netFlow: income - expenses
    });
  }

  const avgMonthlyIncome = monthlyFlows.reduce((sum, m) => sum + m.income, 0) / 6;
  const avgMonthlyExpenses = monthlyFlows.reduce((sum, m) => sum + m.expenses, 0) / 6;
  const avgNetFlow = avgMonthlyIncome - avgMonthlyExpenses;

  // Calculate budget duration in months
  const durationMonths = Math.max(1, differenceInMonths(endDate, startDate) + 1);
  const monthlyBudgetCost = proposedAmount / durationMonths;

  // Calculate savings rate impact
  const currentSavingsRate = avgMonthlyIncome > 0
    ? (avgNetFlow / avgMonthlyIncome) * 100
    : 0;

  const projectedNetFlow = avgNetFlow - monthlyBudgetCost;
  const projectedSavingsRate = avgMonthlyIncome > 0
    ? (projectedNetFlow / avgMonthlyIncome) * 100
    : 0;

  const savingsRateImpact = currentSavingsRate - projectedSavingsRate;

  // Calculate affordability score
  const affordabilityRatio = avgNetFlow > 0 ? (monthlyBudgetCost / avgNetFlow) : 999;

  // Determine feasibility grade
  let grade = 'F';
  let isAffordable = false;
  let message = '';

  if (affordabilityRatio <= 0.3 && projectedSavingsRate > 15) {
    grade = 'A';
    isAffordable = true;
    message = 'Highly affordable with minimal impact on your savings';
  } else if (affordabilityRatio <= 0.5 && projectedSavingsRate > 10) {
    grade = 'B';
    isAffordable = true;
    message = 'Affordable with moderate impact on savings';
  } else if (affordabilityRatio <= 0.7 && projectedSavingsRate > 5) {
    grade = 'C';
    isAffordable = true;
    message = 'Manageable but will significantly reduce savings';
  } else if (affordabilityRatio <= 1.0) {
    grade = 'D';
    isAffordable = false;
    message = 'Challenging - would consume most of your available surplus';
  } else {
    grade = 'F';
    isAffordable = false;
    message = 'Not recommended - exceeds your typical monthly surplus';
  }

  // Calculate opportunity cost
  const opportunityCost = proposedAmount;
  const monthsToRecover = avgNetFlow > 0 ? Math.ceil(proposedAmount / avgNetFlow) : 999;

  return {
    feasibilityGrade: grade,
    isAffordable,
    message,
    temporalContext, // ADDED: 16-Jan-2026
    metrics: {
      avgMonthlyIncome: Math.round(avgMonthlyIncome),
      avgMonthlyExpenses: Math.round(avgMonthlyExpenses),
      avgNetFlow: Math.round(avgNetFlow),
      currentSavingsRate: Math.round(currentSavingsRate * 10) / 10,
      projectedSavingsRate: Math.round(projectedSavingsRate * 10) / 10,
      savingsRateImpact: Math.round(savingsRateImpact * 10) / 10,
      monthlyBudgetCost: Math.round(monthlyBudgetCost),
      affordabilityRatio: Math.round(affordabilityRatio * 100) / 100,
      opportunityCost: Math.round(opportunityCost),
      monthsToRecover
    }
  };
}

/**
 * Calculate optimal savings sprint schedule
 * Uses stability scores to distribute savings across months
 * 
 * @param {number} targetAmount - Total amount to save
 * @param {number} months - Number of months to save over
 * @param {Array} transactions - Transaction history
 * @returns {Array} Monthly contribution schedule
 */
export function calculateSavingsSprint(targetAmount, months, transactions) {
  if (!targetAmount || !months || months <= 0) return [];

  // Get historical monthly volatility (last 6 months)
  const today = new Date();
  const monthlyData = [];

  for (let i = 0; i < Math.min(months, 6); i++) {
    // Safe date subtraction
    const targetDate = subMonths(today, i);

    const { monthStart, monthEnd } = getMonthBoundaries(
      targetDate.getMonth(),
      targetDate.getFullYear()
    );

    const expenses = getMonthlyPaidExpenses(transactions, monthStart, monthEnd);
    monthlyData.push(expenses);
  }

  if (monthlyData.length < 2) {
    // Not enough data - use equal distribution
    const monthlyAmount = targetAmount / months;
    let accumulated = 0;

    return Array(months).fill(0).map((_, i) => ({
      month: i + 1,
      // Checksum logic - last month takes the remainder to ensure exact total
      amount: i === months - 1
        ? Number((targetAmount - accumulated).toFixed(2))
        : (accumulated += Number(monthlyAmount.toFixed(2)), Number(monthlyAmount.toFixed(2))),
      confidence: 'low'
    }));
  }

  // Calculate coefficient of variation (volatility measure)
  const avg = monthlyData.reduce((sum, e) => sum + e, 0) / monthlyData.length;
  const variance = monthlyData.reduce((sum, e) => sum + Math.pow(e - avg, 2), 0) / monthlyData.length;
  const stdDev = Math.sqrt(variance);
  const cv = stdDev / avg;

  // If volatility is low, distribute evenly
  if (cv < 0.15) {
    const monthlyAmount = targetAmount / months;
    let accumulated = 0;

    return Array(months).fill(0).map((_, i) => ({
      month: i + 1,
      // Checksum logic
      amount: i === months - 1
        ? Number((targetAmount - accumulated).toFixed(2))
        : (accumulated += Number(monthlyAmount.toFixed(2)), Number(monthlyAmount.toFixed(2))),
      confidence: 'high'
    }));
  }

  // Otherwise, front-load savings in "stable" periods
  // Assume first half is more stable (user can adjust)
  const schedule = [];
  const frontLoadFactor = 1.3; // 30% more in first half
  const firstHalfMonths = Math.ceil(months / 2);
  const secondHalfMonths = months - firstHalfMonths;

  const firstHalfTotal = targetAmount * 0.6;
  const secondHalfTotal = targetAmount * 0.4;

  let accumulated = 0;

  for (let i = 0; i < firstHalfMonths; i++) {
    const val = Number((firstHalfTotal / firstHalfMonths).toFixed(2));
    accumulated += val;

    schedule.push({
      month: i + 1,
      amount: val,
      confidence: 'high',
      note: 'Higher contribution during stable period'
    });
  }

  for (let i = 0; i < secondHalfMonths; i++) {
    // Last item of entire array must catch remainder
    const isLast = i === secondHalfMonths - 1;
    const val = isLast
      ? Number((targetAmount - accumulated).toFixed(2))
      : Number((secondHalfTotal / secondHalfMonths).toFixed(2));
    accumulated += val;

    schedule.push({
      month: firstHalfMonths + i + 1,
      amount: val,
      confidence: 'medium',
      note: 'Reduced contribution for flexibility'
    });
  }

  return schedule;
}

/**
 * Suggest funding strategy based on expense elasticity
 * 
 * @param {number} neededAmount - Amount needed for the budget
 * @param {Object} elasticity - Expense elasticity data from historicalAnalyzer
 * @param {Array} categories - Category definitions
 * @returns {Object} Funding recommendations
 */
export function suggestFundingStrategy(neededAmount, elasticity, categories) {
  if (!elasticity || Object.keys(elasticity).length === 0) {
    return {
      strategy: 'reduce_all',
      message: 'Reduce spending across all categories proportionally',
      recommendations: []
    };
  }

  // Find most flexible categories (highest reduction rate in lean months)
  const flexibleCategories = Object.entries(elasticity)
    .filter(([_, data]) => data.flexible && data.abundantAvg > 0)
    .sort((a, b) => b[1].reduction - a[1].reduction)
    .map(([category, data]) => ({
      category,
      reductionPotential: data.abundantAvg - data.leanAvg,
      reductionRate: data.reduction,
      currentAvg: data.abundantAvg
    }));

  if (flexibleCategories.length === 0) {
    return {
      strategy: 'savings',
      message: 'Use existing savings or build up over time',
      recommendations: []
    };
  }

  // Build funding recommendations
  const recommendations = [];
  let remainingAmount = neededAmount;

  for (const cat of flexibleCategories) {
    if (remainingAmount <= 0) break;

    const suggestedReduction = Math.min(
      cat.reductionPotential * 0.8, // Use 80% of historical reduction
      remainingAmount
    );

    if (suggestedReduction > 0) {
      recommendations.push({
        category: cat.category,
        suggestedReduction: Math.round(suggestedReduction),
        currentSpending: Math.round(cat.currentAvg),
        historicalReductionRate: Math.round(cat.reductionRate)
      });

      remainingAmount -= suggestedReduction;
    }
  }

  const strategy = remainingAmount <= 0 ? 'category_reduction' : 'hybrid';
  const message = remainingAmount <= 0
    ? 'Fund this budget by temporarily reducing flexible spending'
    : `Reduce flexible spending and save ${Math.round(remainingAmount)} from income`;

  return {
    strategy,
    message,
    recommendations,
    remainingToFund: Math.max(0, Math.round(remainingAmount))
  };
}