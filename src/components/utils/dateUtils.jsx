
/**
 * Date utility functions
 * Centralized date parsing, formatting, and period calculation helpers
 * Created: 11-Nov-2025 - Consolidated from budgetCalculations.js and formatDate.js
 * Updated: 2025-11-13 - Consolidated local date string formatting for consistency
 */

import { format } from "date-fns";

/**
 * Create a timezone-safe local date from YYYY-MM-DD string
 * @param {string} dateString - Date string in YYYY-MM-DD format
 * @returns {Date|null} Date object (set to local midnight) or null if invalid
 */
export const parseDate = (dateString) => {
    if (!dateString) return null;
    const [year, month, day] = dateString.split('-').map(Number);
    return new Date(year, month - 1, day);
};

/**
 * Format a date according to a specified format
 * @param {string|Date} date - The date to format
 * @param {string} dateFormat - The desired format string
 * @returns {string} The formatted date string
 */
export const formatDate = (date, dateFormat = "MMM dd, yyyy") => {
    if (!date) return "";

    let dateObj;
    if (typeof date === 'string') {
        // Try to use parseDate for YYYY-MM-DD strings to ensure local time
        if (date.match(/^\d{4}-\d{2}-\d{2}$/)) {
            dateObj = parseDate(date);
        } else {
            dateObj = new Date(date);
        }
    } else {
        dateObj = date;
    }

    const fnsFormat = dateFormat || "MMM dd, yyyy";

    return format(dateObj, fnsFormat);
};



/**
 * Format date as YYYY-MM-DD (timezone-agnostic, local midnight).
 * This function ensures the date components are derived from the local timezone at midnight, 
 * which is CRITICAL for consistent financial date boundary comparisons.
 * * @param {Date|string} date - Date object or date string to format
 * @returns {string} Local date string in YYYY-MM-DD format, or empty string on failure.
 */
export const formatDateString = (date) => {
    if (!date) return '';

    // Normalize input to a Date object
    let inputDate;
    if (date instanceof Date) {
        inputDate = date;
    } else if (typeof date === 'string' && date.match(/^\d{4}-\d{2}-\d{2}$/)) {
        inputDate = parseDate(date);
    } else {
        // Handle other string formats or timestamp input
        inputDate = new Date(date);
    }

    if (isNaN(inputDate)) {
        // Return empty string for invalid dates
        return '';
    }

    // CRITICAL STEP: Construct a NEW Date object using the input's LOCAL year, month, and day.
    // This resets the time to 00:00:00 in the LOCAL timezone, nullifying any offset issues.
    const d = new Date(
        inputDate.getFullYear(),
        inputDate.getMonth(),
        inputDate.getDate()
    );

    const year = d.getFullYear();
    // Months are 0-indexed, so add 1
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');

    return `${year}-${month}-${day}`;
};


/**
 * Get first day of month as YYYY-MM-DD
 * @param {number} month - Month (0-11)
 * @param {number} year - Year
 * @returns {string} First day of month as YYYY-MM-DD
 */
export const getFirstDayOfMonth = (month, year) => {
    return formatDateString(new Date(year, month, 1));
};

/**
 * Get last day of month as YYYY-MM-DD
 * @param {number} month - Month (0-11)
 * @param {number} year - Year
 * @returns {string} Last day of month as YYYY-MM-DD
 */
export const getLastDayOfMonth = (month, year) => {
    return formatDateString(new Date(year, month + 1, 0));
};

/**
 * ADDED 13-Jan-2025: Get both first and last day of month as YYYY-MM-DD strings
 * Convenience function that returns both month boundaries in one call
 * @param {number} month - Month (0-11)
 * @param {number} year - Year
 * @returns {{ monthStart: string, monthEnd: string }} Object with monthStart and monthEnd
 */
export const getMonthBoundaries = (month, year) => {
    return {
        monthStart: getFirstDayOfMonth(month, year),
        monthEnd: getLastDayOfMonth(month, year)
    };
};

/**
 * Returns the full month name for a given month index (0-11)
 * @param {number} monthIndex - 0 for January, 11 for December
 * @param {string} [locale='en-US'] - The locale to use
 * @returns {string} e.g. "January"
 */
export const getMonthName = (monthIndex, locale = 'en-US') => {
    const date = new Date(2000, monthIndex, 1); // Year doesn't matter
    return date.toLocaleString(locale, { month: 'long' });
};

/**
 * Normalizes a date input to a Date object at local midnight.
 * @param {string|Date} dateInput - The date to normalize.
 * @returns {Date|null} Date object at midnight or null if invalid.
 */
export const normalizeToMidnight = (dateInput) => {
    if (!dateInput) return null;
    if (typeof dateInput === 'string') {
        return parseDate(dateInput);
    }
    if (dateInput instanceof Date) {
        return new Date(dateInput.getFullYear(), dateInput.getMonth(), dateInput.getDate());
    }
    return null;
};

/**
 * Checks if a date is within a start and end date range (inclusive).
 * @param {string|Date} date - The date to check.
 * @param {string|Date} startDate - The start of the range.
 * @param {string|Date} endDate - The end of the range.
 * @returns {boolean} True if date is within range.
 */
export const isDateInRange = (date, startDate, endDate) => {
    const d = normalizeToMidnight(date);
    const start = normalizeToMidnight(startDate);
    const end = normalizeToMidnight(endDate);

    if (!d || !start || !end) return false;
    return d >= start && d <= end;
};

/**
 * Checks if two date ranges overlap.
 * @param {string|Date} start1 - Start of first range.
 * @param {string|Date} end1 - End of first range.
 * @param {string|Date} start2 - Start of second range.
 * @param {string|Date} end2 - End of second range.
 * @returns {boolean} True if ranges overlap.
 */
export const doDateRangesOverlap = (start1, end1, start2, end2) => {
    const s1 = normalizeToMidnight(start1);
    const e1 = normalizeToMidnight(end1);
    const s2 = normalizeToMidnight(start2);
    const e2 = normalizeToMidnight(end2);

    if (!s1 || !e1 || !s2 || !e2) return false;
    return s1 <= e2 && e1 >= s2;
};