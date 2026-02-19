import { useMemo } from 'react';
import { startOfMonth, subMonths, endOfMonth, getDaysInMonth, isAfter, isToday, isSameDay, getDate, format } from 'date-fns';
import { useTransactions } from './useBase44Entities';
import { formatDateString, parseDate } from '../utils/dateUtils';
import { calculateIncomeProjections, calculateExpenseProjections } from '../utils/projectionEngine';

/**
 * HOOK: useProjections
 * Orchestrates historical data fetching and projection engine execution.
 * Provides both granular chart data and high-level aggregated totals.
 */
export const useProjections = (currentTransactions = [], selectedMonth, selectedYear) => {
    // 1. Define Historical Window (Last 6 full months)
    // We memoize the dates so they don't trigger re-fetches on every render
    const historyStart = useMemo(() => formatDateString(startOfMonth(subMonths(new Date(), 6))), []);
    const historyEnd = useMemo(() => formatDateString(endOfMonth(subMonths(new Date(), 1))), []);

    // 2. Fetch Historical Data quietly in the background
    const { transactions: historyTxns, isLoading: isLoadingHistory } = useTransactions(historyStart, historyEnd);

    // 3. Process Projections and Chart Data
    const projectionData = useMemo(() => {
        const today = new Date();
        const daysInMonth = getDaysInMonth(new Date(selectedYear, selectedMonth));
        const isCurrentMonth = selectedYear === today.getFullYear() && selectedMonth === today.getMonth();
        const todayDay = getDate(today);

        let predictedExpensesMap = {};
        let predictedIncomesMap = {};

        // --- PROJECTION ENGINE EXECUTION ---
        // Only run if viewing the current month and historical context is available
        if (isCurrentMonth && historyTxns?.length > 0) {
            // Isolate current month's context strictly
            const currentExpenses = currentTransactions.filter(t => {
                const tDate = t.paidDate ? parseDate(t.paidDate) : parseDate(t.date);
                return t.type === 'expense' && tDate && tDate.getMonth() === selectedMonth && tDate.getFullYear() === selectedYear;
            });
            
            const currentIncomes = currentTransactions.filter(t => {
                const tDate = t.paidDate ? parseDate(t.paidDate) : parseDate(t.date);
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
            const dateObj = new Date(selectedYear, selectedMonth, currentDay);
            const dateStr = formatDateString(dateObj);
            const isFutureDate = isAfter(dateObj, today);
            const isTodayDate = isToday(dateObj);

            // Filter real transactions for this specific day
            const dayTxns = currentTransactions.filter(t => {
                const tDate = t.paidDate ? parseDate(t.paidDate) : parseDate(t.date);
                if (!tDate) return false;
                return isSameDay(tDate, dateObj);
            });

            const income = dayTxns.filter(t => t.type === 'income').reduce((sum, t) => sum + Number(t.amount), 0);
            const expense = dayTxns.filter(t => t.type === 'expense').reduce((sum, t) => sum + Number(t.amount), 0);

            // Add to running Actuals
            actualIncomeTotal += income;
            actualExpenseTotal += expense;

            // Determine day's projected values
            const dayPredictedExpense = isFutureDate ? (predictedExpensesMap[currentDay] || 0) : (isTodayDate ? expense : null);
            const dayPredictedIncome = isFutureDate ? (predictedIncomesMap[currentDay] || 0) : (isTodayDate ? income : null);

            // Add to running Future Projections
            if (isFutureDate) {
                projectedRemainingExpense += (predictedExpensesMap[currentDay] || 0);
                projectedRemainingIncome += (predictedIncomesMap[currentDay] || 0);
            }

            return {
                day: currentDay,
                fullDate: dateStr,
                income: isFutureDate ? null : income,
                expense: isFutureDate ? null : expense,
                predictedExpense: dayPredictedExpense,
                predictedIncome: dayPredictedIncome,
                isFuture: isFutureDate,
                label: format(dateObj, 'MMM d'),
                isPrediction: isFutureDate && ((predictedExpensesMap[currentDay] > 0) || (predictedIncomesMap[currentDay] > 0))
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

    return { ...projectionData, isLoadingHistory, historyTxns };
};
