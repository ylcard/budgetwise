import { format, getDate } from "date-fns";
import { parseDate } from "./dateUtils";
import Decimal from "decimal.js";

/**
 * PURE FUNCTION: Income Projection Engine
 * Predicts future income based on historical anchors (Salary, Secondary) and petty averages.
 */
export const calculateIncomeProjections = (historyTxns, currentTxns, daysInMonth, todayDay) => {
  const predictionMap = {};
  if (!historyTxns || historyTxns.length === 0) return predictionMap;

  const months = {}; // Grouped by YYYY-MM

  historyTxns.forEach(t => {
    if (t.type !== 'income') return;
    const date = t.paidDate ? parseDate(t.paidDate) : parseDate(t.date);
    if (!date) return;
    const key = format(date, 'yyyy-MM');
    if (!months[key]) months[key] = [];
    months[key].push({ amount: Math.abs(Number(t.amount)), day: getDate(date) });
  });

  const monthKeys = Object.keys(months);
  const numMonths = Math.max(1, monthKeys.length);

  // 1. Extract Salary (Max transaction per month)
  const monthlySalaries = monthKeys.map(k => {
    const sorted = months[k].sort((a, b) => b.amount - a.amount);
    return sorted[0] || { amount: 0, day: 25 };
  });

  const avgSalary = monthlySalaries.reduce((sum, s) => new Decimal(sum).plus(s.amount).toNumber(), 0) / numMonths;
  const salaryDays = monthlySalaries.map(s => s.day).sort((a, b) => a - b);
  const medianSalaryDay = salaryDays[Math.floor(salaryDays.length / 2)] || 25;

  // 2. Extract "Large Secondary" (> €100 and not the Salary)
  const secondaryMonthlyTotals = monthKeys.map(k => {
    const sorted = months[k].sort((a, b) => b.amount - a.amount);
    return sorted.slice(1)
      .filter(t => t.amount >= 100)
      .reduce((sum, t) => new Decimal(sum).plus(t.amount).toNumber(), 0);
  }).sort((a, b) => a - b);

  const medianSecondaryAmount = secondaryMonthlyTotals[Math.floor(secondaryMonthlyTotals.length / 2)] || 0;

  // 3. Petty Rewards (Average of everything else)
  const totalPetty = monthKeys.reduce((sum, k) => {
    const sorted = months[k].sort((a, b) => b.amount - a.amount);
    const pettySum = sorted.slice(1)
      .filter(t => t.amount < 100)
      .reduce((s, t) => new Decimal(s).plus(t.amount).toNumber(), 0);
    return new Decimal(sum).plus(pettySum).toNumber();
  }, 0);
  const avgPettyTotal = totalPetty / numMonths;

  // 4. Check Current Month Progress
  const currentIncomes = currentTxns.map(t => Math.abs(Number(t.amount))).sort((a, b) => b - a);
  const currentMax = currentIncomes[0] || 0;
  const currentSecondaryTotal = currentTxns
    .filter(t => {
      const amt = Math.abs(Number(t.amount));
      return amt >= 100 && amt < (avgSalary * 0.8);
    })
    .reduce((sum, t) => new Decimal(sum).plus(Math.abs(Number(t.amount))).toNumber(), 0);

  // --- APPLY PREDICTIONS ---

  // A. Predict Salary if missing (Threshold 80% of average)
  if (currentMax < (avgSalary * 0.8) && medianSalaryDay > todayDay) {
    predictionMap[medianSalaryDay] = new Decimal(predictionMap[medianSalaryDay] || 0).plus(avgSalary).toNumber();
  }

  // B. Predict Secondary if missing and "likely" (occurred in > 50% of months)
  const secondaryLikelihood = secondaryMonthlyTotals.filter(v => v > 0).length / numMonths;
  if (currentSecondaryTotal < (medianSecondaryAmount * 0.7) && secondaryLikelihood > 0.5) {
    const middleDay = Math.min(daysInMonth, Math.max(todayDay + 1, 15));
    predictionMap[middleDay] = new Decimal(predictionMap[middleDay] || 0).plus(medianSecondaryAmount).toNumber();
  }

  // C. Predict Petty (Aggregate into one single expected "Bonus" on the last day)
  if (avgPettyTotal > 0 && todayDay < daysInMonth) {
    predictionMap[daysInMonth] = new Decimal(predictionMap[daysInMonth] || 0).plus(avgPettyTotal).toNumber();
  }

  return predictionMap;
};

/**
 * PURE FUNCTION: Expense Projection Engine (Heatmap & Burn Rate)
 * Distributes remaining expected monthly volume across future days based on historical intensity.
 */
export const calculateExpenseProjections = (historyTxns, currentTxns, daysInMonth, todayDay) => {
  const predictionMap = {};
  let totalHistory = new Decimal(0);
  const dayWeights = new Array(32).fill(0); // Index 1-31
  const uniqueMonths = new Set();

  if (!historyTxns || historyTxns.length === 0) return predictionMap;

  // 1. Build Heatmap & Totals
  historyTxns.forEach(t => {
    if (t.type !== 'expense') return;

    const effectiveDate = t.paidDate ? parseDate(t.paidDate) : parseDate(t.date);
    if (!effectiveDate) return;

    const amt = Math.abs(Number(t.amount));
    totalHistory = totalHistory.plus(amt);

    // Weighting: Add the AMOUNT to the day's weight.
    dayWeights[getDate(effectiveDate)] = new Decimal(dayWeights[getDate(effectiveDate)]).plus(amt).toNumber();
    uniqueMonths.add(format(effectiveDate, 'yyyy-MM'));
  });

  const numMonths = Math.max(1, uniqueMonths.size);
  const avgMonthly = totalHistory.dividedBy(numMonths).toNumber();

  // 2. Calculate Remaining "Gap" to fill
  const currentTotal = currentTxns.reduce((sum, t) => sum.plus(Math.abs(Number(t.amount))), new Decimal(0)).toNumber();
  let remainingGap = Math.max(0, new Decimal(avgMonthly).minus(currentTotal).toNumber());

  if (remainingGap <= 0) return predictionMap;

  // 3. Distribute Gap into Future Days
  let totalFutureWeight = 0;
  for (let d = todayDay + 1; d <= daysInMonth; d++) {
    totalFutureWeight += dayWeights[d];
  }

  const remainingDays = daysInMonth - todayDay;

  if (totalFutureWeight > 0) {
    // Weighted distribution based on historical "gravity wells"
    for (let d = todayDay + 1; d <= daysInMonth; d++) {
      const share = remainingGap * (dayWeights[d] / totalFutureWeight);
      predictionMap[d] = share;
    }
  } else if (remainingDays > 0) {
    // Fallback: Even distribution if no historical weights exist for future days
    for (let d = todayDay + 1; d <= daysInMonth; d++) {
      predictionMap[d] = remainingGap / remainingDays;
    }
  }

  return predictionMap;
};
