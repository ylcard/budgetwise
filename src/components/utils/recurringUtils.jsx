import { addDays, addWeeks, addMonths, addYears, setDate, startOfDay, isBefore, isAfter, parseISO } from "date-fns";
import { formatDateString } from "./dateUtils";

/**
 * Calculate the next occurrence date for a recurring transaction.
 * @param {Object} recurring - The recurring transaction data
 * @param {Date|string} fromDate - The date to calculate from (defaults to today)
 * @returns {string|null} - ISO date string of next occurrence, or null if ended
 */
export function calculateNextOccurrence(recurring, fromDate = new Date()) {
    const { frequency, dayOfMonth, dayOfWeek, startDate, endDate, lastProcessedDate } = recurring;

    // Parse the reference date
    const today = startOfDay(typeof fromDate === 'string' ? parseISO(fromDate) : fromDate);
    const start = startOfDay(parseISO(startDate));
    const end = endDate ? startOfDay(parseISO(endDate)) : null;

    // If end date has passed, no more occurrences
    if (end && isBefore(end, today)) {
        return null;
    }

    // Determine base date for calculation
    let baseDate = lastProcessedDate ? startOfDay(parseISO(lastProcessedDate)) : start;

    // If base is before start, use start
    if (isBefore(baseDate, start)) {
        baseDate = start;
    }

    let nextDate = calculateNextFromBase(baseDate, frequency, dayOfMonth, dayOfWeek);

    // Ensure next date is in the future (or today)
    while (isBefore(nextDate, today)) {
        nextDate = calculateNextFromBase(nextDate, frequency, dayOfMonth, dayOfWeek);
    }

    // Ensure next date is not before start date
    if (isBefore(nextDate, start)) {
        nextDate = start;
    }

    // Check if next date exceeds end date
    if (end && isAfter(nextDate, end)) {
        return null;
    }

    return formatDateString(nextDate);
}

/**
 * Calculate the next date from a base date based on frequency.
 */
function calculateNextFromBase(baseDate, frequency, dayOfMonth, dayOfWeek) {
    switch (frequency) {
        case 'daily':
            return addDays(baseDate, 1);

        case 'weekly':
            // Find next occurrence of the specified day of week
            let nextWeekly = addDays(baseDate, 1);
            while (nextWeekly.getDay() !== dayOfWeek) {
                nextWeekly = addDays(nextWeekly, 1);
            }
            return nextWeekly;

        case 'biweekly':
            // Find next occurrence of the specified day of week, then add 2 weeks
            let nextBiweekly = addDays(baseDate, 1);
            while (nextBiweekly.getDay() !== dayOfWeek) {
                nextBiweekly = addDays(nextBiweekly, 1);
            }
            // If we just found the same week, add 2 weeks
            if (nextBiweekly.getTime() - baseDate.getTime() < 7 * 24 * 60 * 60 * 1000) {
                nextBiweekly = addWeeks(nextBiweekly, 2);
            }
            return nextBiweekly;

        case 'monthly':
            // Go to next month, set to specified day
            let nextMonthly = addMonths(baseDate, 1);
            const targetDay = Math.min(dayOfMonth || 1, getDaysInMonth(nextMonthly));
            nextMonthly = setDate(nextMonthly, targetDay);
            return nextMonthly;

        case 'quarterly':
            // Go to 3 months ahead, set to specified day
            let nextQuarterly = addMonths(baseDate, 3);
            const targetDayQ = Math.min(dayOfMonth || 1, getDaysInMonth(nextQuarterly));
            nextQuarterly = setDate(nextQuarterly, targetDayQ);
            return nextQuarterly;

        case 'yearly':
            // Go to next year, set to specified day
            let nextYearly = addYears(baseDate, 1);
            const targetDayY = Math.min(dayOfMonth || 1, getDaysInMonth(nextYearly));
            nextYearly = setDate(nextYearly, targetDayY);
            return nextYearly;

        default:
            return addMonths(baseDate, 1);
    }
}

/**
 * Get the number of days in a month.
 */
function getDaysInMonth(date) {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
}

/**
 * Check if a recurring transaction is due (nextOccurrence is today or in the past).
 */
export function isDue(recurring) {
    if (!recurring.nextOccurrence || !recurring.isActive) return false;
    const today = startOfDay(new Date());
    const next = startOfDay(parseISO(recurring.nextOccurrence));
    return !isAfter(next, today);
}