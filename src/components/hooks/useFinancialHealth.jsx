import { useMemo } from "react";
import { useSettings } from "../utils/SettingsContext";
import { getMonthBoundaries, isDateInRange } from "../utils/dateUtils";
import { calculateFinancialHealth } from "../utils/financialHealthAlgorithms";
// REMOVED 10-Mar-2026: useTransactions, useGoals, useCustomBudgetsForPeriod — all data now passed in from parent
// This eliminates separate DB calls that were duplicating the Dashboard's own fetches and causing 429s.
// import { useTransactions, useGoals, useCustomBudgetsForPeriod } from "./useBase44Entities";
// import { useMergedCategories } from "./useMergedCategories";
import { useMonthlyIncome } from "./useDerivedData";

/**
 * A pure-computation hook to calculate the Financial Health Score.
 * UPDATED 10-Mar-2026: No longer fetches its own data. Accepts all data from the parent
 * to prevent redundant DB calls that caused 429 rate-limit errors.
 *
 * @param {Object} params
 * @param {Array} params.allTransactions - Wide-window transactions (7+ months) from useTransactionWindow
 * @param {Array} params.categories - Merged categories from useMergedCategories
 * @param {Array} params.goals - Budget goals from useGoals
 * @param {Array} params.customBudgets - Custom budgets for the period
 * @param {number} params.targetMonth - The viewing month (0-11)
 * @param {number} params.targetYear - The viewing year (YYYY)
 * @returns {{ healthData: Object|null }}
 */
export const useFinancialHealthScore = ({
  allTransactions = [],
  categories = [],
  goals = [],
  customBudgets = [],
  targetMonth,
  targetYear
}) => {
  const { settings } = useSettings();

  // 1. Calculate month boundaries
  const { monthStart, monthEnd } = useMemo(() => {
    if (targetMonth === undefined || targetYear === undefined) {
      return { monthStart: null, monthEnd: null };
    }
    const current = getMonthBoundaries(targetMonth, targetYear);
    return { monthStart: current.monthStart, monthEnd: current.monthEnd };
  }, [targetMonth, targetYear]);

  // 2. Slice the current month's transactions for 'Current' metrics (Pacing, Burn)
  const currentTransactions = useMemo(() => {
    if (!allTransactions.length || !monthStart || !monthEnd) return [];
    return allTransactions.filter(t => isDateInRange(t.date, monthStart, monthEnd));
  }, [allTransactions, monthStart, monthEnd]);

  // 3. Calculate current monthly income safely
  const monthlyIncome = useMonthlyIncome(currentTransactions, targetMonth, targetYear);

  // 4. Compute the optimized score
  const healthData = useMemo(() => {
    if (!allTransactions.length || !categories.length) {
      return null;
    }

    return calculateFinancialHealth(
      currentTransactions,
      allTransactions, // Full history for trend analysis
      monthlyIncome,
      monthStart,
      settings,
      goals,
      categories,
      customBudgets
    );
  }, [
    currentTransactions,
    allTransactions,
    monthlyIncome,
    monthStart,
    settings,
    goals,
    categories,
    customBudgets
  ]);

  return { healthData };
};