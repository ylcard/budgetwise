import { useMemo } from 'react';
import { useTransactions } from './useBase44Entities';
import { formatDateString, parseDate, normalizeToMidnight, getLastDayOfMonth } from '../utils/dateUtils';
import { calculateIncomeProjections, calculateExpenseProjections } from '../utils/projectionEngine';

/**
 * HOOK: useProjections
 * Orchestrates historical data fetching and projection engine execution.
 * Provides both granular chart data and high-level aggregated totals.
 * @param {Array} currentTransactions - Transactions for the current selected period.
 * @param {number} selectedMonth - 0-indexed month.
 * @param {number} selectedYear - Full year (e.g., 2025).
 */
export const useProjections = (currentTransactions = [], selectedMonth, selectedYear) => {
  // 1. Define Historical Window (Last 6 full months)
  // We memoize the dates so they don't trigger re-fetches on every render
  const { historyStart, historyEnd } = useMemo(() => {
    const now = normalizeToMidnight(new Date());
    // Start: 1st day of 6 months ago
    const start = new Date(now.getFullYear(), now.getMonth() - 6, 1);
    // End: Last day of previous month
    const end = new Date(now.getFullYear(), now.getMonth(), 0);

    return {
      historyStart: formatDateString(start),
      historyEnd: formatDateString(end)
    };
  }, []);

  // 2. Fetch Historical Data quietly in the background
  const { transactions: historyTxns, isLoading: isLoadingHistory } = useTransactions(historyStart, historyEnd);

  // 3. Process Projections and Chart Data
  const result = useMemo(() => {
    const today = normalizeToMidnight(new Date());

    // Use centralized logic to determine days in month
    const lastDayStr = getLastDayOfMonth(selectedMonth, selectedYear);
    const daysInMonth = parseDate(lastDayStr).getDate();

    // Strict check for "Current Month" based on local midnight
    const isCurrentMonth = selectedYear === today.getFullYear() && selectedMonth === today.getMonth();
    const todayDay = today.getDate();

    let predictedExpensesMap = {};
    let predictedIncomesMap = {};

    // --- PROJECTION ENGINE EXECUTION ---
    // Only run if viewing the current month and historical context is available
    if (isCurrentMonth && historyTxns?.length > 0) {
      // Isolate current month's context strictly
      const currentExpenses = currentTransactions.filter(t => {
        const tDate = normalizeToMidnight(t.paidDate || t.date);
        return t.type === 'expense' && tDate && tDate.getMonth() === selectedMonth && tDate.getFullYear() === selectedYear;
      });

      const currentIncomes = currentTransactions.filter(t => {
        const tDate = normalizeToMidnight(t.paidDate || t.date);
        return t.type === 'income' && tDate && tDate.getMonth() === selectedMonth && tDate.getFullYear() === selectedYear;
      });

      // Generate Maps: { [day]: amount }
      predictedExpensesMap = calculateExpenseProjections(historyTxns, currentExpenses, daysInMonth, todayDay);
      predictedIncomesMap = calculateIncomeProjections(historyTxns, currentIncomes, daysInMonth, todayDay);
    }

    // --- AGGREGATION & FORMATTING ---
    let actualIncomeTotal = 0;
    let actualExpenseTotal = 0;
    let projectedRemainingIncome = 0;
    let projectedRemainingExpense = 0;

    // Create an array of days 1..N for the chart
    const chartData = Array.from({ length: daysInMonth }, (_, i) => {
      const currentDay = i + 1;
      const dateObj = new Date(selectedYear, selectedMonth, currentDay); // Already normalized if inputs are ints
      const dateStr = formatDateString(dateObj);
      const isFutureDate = dateObj > today;
      const isTodayDate = dateObj.getTime() === today.getTime();

      // Filter real transactions for this specific day
      const dayTxns = currentTransactions.filter(t => {
        const tDate = normalizeToMidnight(t.paidDate || t.date);
        if (!tDate) return false;
        return tDate.getTime() === dateObj.getTime();
      });

      const income = dayTxns.filter(t => t.type === 'income').reduce((sum, t) => sum + Number(t.amount), 0);
      const expense = dayTxns.filter(t => t.type === 'expense').reduce((sum, t) => sum + Number(t.amount), 0);

      // Add to running Actuals
      actualIncomeTotal += income;
      actualExpenseTotal += expense;

      // Determine day's projected values
      // Use loose check for map access since keys might be strings/numbers
      const mapExp = predictedExpensesMap[currentDay] || 0;
      const mapInc = predictedIncomesMap[currentDay] || 0;

      const dayPredictedExpense = isFutureDate ? mapExp : (isTodayDate ? expense : null);
      const dayPredictedIncome = isFutureDate ? mapInc : (isTodayDate ? income : null);

      // Add to running Future Projections
      if (isFutureDate) {
        projectedRemainingExpense += mapExp;
        projectedRemainingIncome += mapInc;
      }

      return {
        day: currentDay,
        fullDate: dateStr,
        // Nullify actuals for future dates to prevent "0" lines in charts
        income: (isFutureDate && !isTodayDate) ? null : income,
        expense: (isFutureDate && !isTodayDate) ? null : expense,
        predictedExpense: dayPredictedExpense,
        predictedIncome: dayPredictedIncome,
        isFuture: isFutureDate,
        label: dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        isPrediction: isFutureDate && (mapExp > 0 || mapInc > 0)
      };
    });

    return {
      chartData,
      totals: {
        actualIncome: actualIncomeTotal,
        actualExpense: actualExpenseTotal,
        projectedRemainingIncome,
        projectedRemainingExpense,
        finalProjectedIncome: actualIncomeTotal + projectedRemainingIncome,
        finalProjectedExpense: actualExpenseTotal + projectedRemainingExpense
      }
    };
  }, [currentTransactions, selectedMonth, selectedYear, historyTxns]);

  return { ...result, isLoadingHistory, historyTxns };
};
