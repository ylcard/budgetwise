import { format } from "date-fns";

/**
 * Date utility functions
 * Centralized date parsing, formatting, and period calculation helpers
 * Created: 11-Nov-2025 - Consolidated from budgetCalculations.js and formatDate.js
 */

/**
 * Format a date according to a specified format
 * @param {string|Date} date - The date to format
 * @param {string} dateFormat - The desired format string
 * @returns {string} The formatted date string
 */
export const formatDate = (date, dateFormat = "MMM dd, yyyy") => {
  if (!date) return "";
  
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  
  // Map our format strings to date-fns format strings
  const formatMap = {
    "MM/dd/yyyy": "MM/dd/yyyy",
    "dd/MM/yyyy": "dd/MM/yyyy",
    "yyyy-MM-dd": "yyyy-MM-dd",
    "dd MMM yyyy": "dd MMM yyyy",
    "MMM dd, yyyy": "MMM dd, yyyy"
  };
  
  const fnsFormat = formatMap[dateFormat] || "MMM dd, yyyy";
  
  return format(dateObj, fnsFormat);
};

/**
 * Create a timezone-agnostic date from YYYY-MM-DD string
 * @param {string} dateString - Date string in YYYY-MM-DD format
 * @returns {Date|null} Date object or null if invalid
 */
export const parseDate = (dateString) => {
    if (!dateString) return null;
    const [year, month, day] = dateString.split('-').map(Number);
    return new Date(year, month - 1, day);
};

/**
 * Format date as YYYY-MM-DD (timezone-agnostic)
 * @param {Date|string} date - Date to format
 * @returns {string} Formatted date string
 */
export const formatDateString = (date) => {
    if (!date) return '';
    const d = date instanceof Date ? date : new Date(date);
    const year = d.getFullYear();
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