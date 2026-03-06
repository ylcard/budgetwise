import { useMemo } from "react";
import { useSettings } from "../utils/SettingsContext";
import { getMonthBoundaries, formatDateString, isDateInRange } from "../utils/dateUtils";
import { calculateFinancialHealth } from "../utils/financialHealthAlgorithms";
import { useTransactions, useGoals, useCustomBudgetsForPeriod } from "./useBase44Entities";
import { useMergedCategories } from "./useMergedCategories";
import { useMonthlyIncome } from "./useDerivedData";

/**
 * A unified hook to fetch the 6+1 month data block and calculate the Financial Health Score.
 * Relies on TanStack Query to deduplicate network requests across the app.
 * The hook fetches a 7-month window: the target month plus a 6-month historical 
 * look-back used to calculate burn rates, lifestyle creep, and stability.
 * * @param {Object} user - The current user object
 * @param {number} targetMonth - The viewing month (0-11)
 * @param {number} targetYear - The viewing year (YYYY)
 * @returns {{ healthData: Object|null, isLoading: boolean }}
 */
export const useFinancialHealthScore = (user, targetMonth, targetYear) => {
  const { settings } = useSettings();

  // 1. Calculate the exact 7-month temporal boundary
  const { historyStart, monthStart, monthEnd } = useMemo(() => {
    if (targetMonth === undefined || targetYear === undefined) {
      return { historyStart: null, monthStart: null, monthEnd: null };
    }

    // Current viewing month boundaries
    const current = getMonthBoundaries(targetMonth, targetYear);

    // 6 Months prior start date (JS Date safely handles negative months to wrap years)
    const historyDate = new Date(targetYear, targetMonth - 6, 1);
    const historyStart = formatDateString(historyDate);

    return {
      historyStart,
      monthStart: current.monthStart,
      monthEnd: current.monthEnd
    };
  }, [targetMonth, targetYear]);

  // 2. Fetch the required entities
  const { transactions: fullHistory, isLoading: txnsLoading } = useTransactions(historyStart, monthEnd);

  const { categories, isLoading: categoriesLoading } = useMergedCategories();
  const { goals, isLoading: goalsLoading } = useGoals(user);
  const { customBudgets, isLoading: budgetsLoading } = useCustomBudgetsForPeriod(user, monthStart, monthEnd);

  const isLoading = txnsLoading || categoriesLoading || goalsLoading || budgetsLoading;

  // 3. Slice the current month's transactions for the 'Current' metrics (Pacing, Burn)
  const currentTransactions = useMemo(() => {
    if (!fullHistory || !monthStart || !monthEnd) return [];
    return fullHistory.filter(t => isDateInRange(t.date, monthStart, monthEnd));
  }, [fullHistory, monthStart, monthEnd]);

  // 4. Calculate current monthly income safely
  const monthlyIncome = useMonthlyIncome(currentTransactions, targetMonth, targetYear);

  // 5. Compute the optimized score
  const healthData = useMemo(() => {
    if (isLoading || !fullHistory?.length || !categories?.length) {
      return null;
    }

    return calculateFinancialHealth(
      currentTransactions,
      fullHistory,
      monthlyIncome,
      monthStart,
      settings,
      goals,
      categories,
      customBudgets
    );
  }, [
    currentTransactions,
    fullHistory,
    monthlyIncome,
    monthStart,
    settings,
    goals,
    categories,
    customBudgets,
    txnsLoading,
    categoriesLoading,
    goalsLoading,
    budgetsLoading,
    isLoading
  ]);

  return { healthData, isLoading };
};
