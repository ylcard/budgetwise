import { useMemo } from 'react';
// REMOVED 10-Mar-2026: useTransactions — historical data now passed in via allTransactions param
// This eliminates a separate DB call that was competing with useTransactionWindow and causing 429s.
// import { useTransactions } from './useBase44Entities';
import { formatDateString, parseDate, normalizeToMidnight, getLastDayOfMonth } from '../utils/dateUtils';
import { calculateIncomeProjections, calculateExpenseProjectionsByPriority } from '../utils/projectionEngine';
// COMMENTED OUT 13-Mar-2026: Replaced by calculateExpenseProjectionsByPriority which returns per-priority maps
// import { calculateExpenseProjections } from '../utils/projectionEngine';

/**
 * HOOK: useProjections
 * UPDATED 10-Mar-2026: No longer fetches its own historical data. Uses the wide-window
 * allTransactions array from useTransactionWindow (passed by Dashboard) for history.
 * @param {Array} currentTransactions - Transactions for the current selected period (wide-window allTransactions).
 * @param {number} selectedMonth - 0-indexed month.
 * @param {number} selectedYear - Full year (e.g., 2025).
 */
export const useProjections = (currentTransactions = [], selectedMonth, selectedYear) => {
  // REMOVED 10-Mar-2026: Separate historical fetch — now uses currentTransactions which IS the wide window
  // const { historyStart, historyEnd } = useMemo(() => { ... }, []);
  // const { transactions: historyTxns, isLoading: isLoadingHistory } = useTransactions(historyStart, historyEnd);

  // Historical transactions are now extracted from the wide-window allTransactions param
  const historyTxns = useMemo(() => {
    const now = normalizeToMidnight(new Date());
    const histStart = formatDateString(new Date(now.getFullYear(), now.getMonth() - 6, 1));
    const histEnd = formatDateString(new Date(now.getFullYear(), now.getMonth(), 0));
    return currentTransactions.filter(t => t.date && t.date >= histStart && t.date <= histEnd);
  }, [currentTransactions]);

  // 3. Process Projections and Chart Data
  const result = useMemo(() => {
    const today = normalizeToMidnight(new Date());

    // Use centralized logic to determine days in month
    const lastDayStr = getLastDayOfMonth(selectedMonth, selectedYear);
    const daysInMonth = parseDate(lastDayStr).getDate();

    // Strict check for "Current Month" based on local midnight
    const isCurrentMonth = selectedYear === today.getFullYear() && selectedMonth === today.getMonth();
    const todayDay = today.getDate();

    // UPDATED 13-Mar-2026: Use priority-aware expense projection engine
    let predictedExpensesMap = {};
    let predictedExpensesNeedsMap = {};
    let predictedExpensesWantsMap = {};
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

      // UPDATED 13-Mar-2026: Generate per-priority + aggregate expense maps
      const expResult = calculateExpenseProjectionsByPriority(historyTxns, currentExpenses, daysInMonth, todayDay);
      predictedExpensesMap = expResult.aggregate;
      predictedExpensesNeedsMap = expResult.needs;
      predictedExpensesWantsMap = expResult.wants;

      predictedIncomesMap = calculateIncomeProjections(historyTxns, currentIncomes, daysInMonth, todayDay);
    }

    // --- AGGREGATION & FORMATTING ---
    let actualIncomeTotal = 0;
    let actualExpenseTotal = 0;
    let projectedRemainingIncome = 0;
    let projectedRemainingExpense = 0;
    // ADDED 13-Mar-2026: Per-priority projected expense totals
    let projectedRemainingExpenseNeeds = 0;
    let projectedRemainingExpenseWants = 0;

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
        // ADDED 13-Mar-2026: Accumulate per-priority projected expense totals
        projectedRemainingExpenseNeeds += (predictedExpensesNeedsMap[currentDay] || 0);
        projectedRemainingExpenseWants += (predictedExpensesWantsMap[currentDay] || 0);
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
        // ADDED 13-Mar-2026: Per-priority projected expense amounts
        projectedRemainingExpenseNeeds,
        projectedRemainingExpenseWants,
        finalProjectedIncome: actualIncomeTotal + projectedRemainingIncome,
        finalProjectedExpense: actualExpenseTotal + projectedRemainingExpense
      }
    };
  }, [currentTransactions, selectedMonth, selectedYear, historyTxns]);

  // UPDATED 10-Mar-2026: isLoadingHistory no longer exists (no separate fetch)
  const isLoadingHistory = false;
  return { ...result, isLoadingHistory, historyTxns };
};