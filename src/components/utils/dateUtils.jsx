
/**
 * Date utility functions
 * Centralized date parsing, formatting, and period calculation helpers
 * Created: 11-Nov-2025 - Consolidated from budgetCalculations.js and formatDate.js
 * Updated: 2025-11-13 - Consolidated local date string formatting for consistency
 */

import { format } from "date-fns";

/**
 * Format a date according to a specified format
 * @param {string|Date} date - The date to format
 * @param {string} dateFormat - The desired format string
 * @returns {string} The formatted date string
 */
export const formatDate = (date, dateFormat = "MMM dd, yyyy") => {
    if (!date) return "";

    const dateObj = typeof date === 'string' ? new Date(date) : date;
    const fnsFormat = dateFormat || "MMM dd, yyyy";

    return format(dateObj, fnsFormat);
};

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
 * Format date as YYYY-MM-DD (Local Time)
 * @param {Date|string} date - Date to format
 * @returns {string} Formatted date string
 */
// export const formatDateString = (date) => {
//     if (!date) return '';
//     const d = date instanceof Date ? date : new Date(date);
//     const year = d.getFullYear();
//     const month = String(d.getMonth() + 1).padStart(2, '0');
//     const day = String(d.getDate()).padStart(2, '0');
//     return `${year}-${month}-${day}`;
// };

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
    } else {
        // Handle string or timestamp input
        inputDate = new Date(date);
        if (isNaN(inputDate)) {
            // Return empty string for invalid dates
            return '';
        }
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

// export const toLocalDateString = (date) => {
//     if (!date) return '';
//     // Ensures date object is local time at midnight (the standard for financial dates)
//     const d = new Date(date.getFullYear(), date.getMonth(), date.getDate());
//     const year = d.getFullYear();
//     // Months are 0-indexed, so add 1
//     const month = String(d.getMonth() + 1).padStart(2, '0');
//     const day = String(d.getDate()).padStart(2, '0');
//     return `${year}-${month}-${day}`;
// };
