/**
 * Currency utility functions
 * Centralized currency symbol mapping, formatting, and conversion helpers
 * Updated: 11-Nov-2025 - Added formatCurrency from formatCurrency.js
 */

import Big from "big.js";

/**
 * Get the currency symbol for a given currency code
 * @param {string} currencyCode - The ISO currency code (e.g., 'USD', 'EUR', 'GBP')
 * @returns {string} The currency symbol or the currency code if not found
 */
export const getCurrencySymbol = (currencyCode) => {
  try {
    return (0).toLocaleString(undefined, { style: 'currency', currency: currencyCode, minimumFractionDigits: 0, maximumFractionDigits: 0 }).replace(/\d/g, '').trim();
  } catch (e) {
    return currencyCode;
  }
};

/**
 * Converts a localized currency string back into a standard US numeric string ('1234.56')
 * for safe parsing with parseFloat().
 * * FIX: This implementation is flexible, treating the last period (.) or comma (,) 
 * as the decimal separator to accommodate various user input styles.
 * * @param {string} formattedValue - The string from the input field (e.g., '€ 1.234,56' or '$1,234.56').
 * @param {object} settings - User settings (used mainly to safely strip the currency symbol).
 * @returns {string} The unformatted numeric string (e.g., '1234.56').
 */
export function unformatCurrency(formattedValue, settings) {
  let inputString = formattedValue || '';

  // 1. Remove currency symbol and leading/trailing whitespace
  let cleanedValue = inputString.replace(settings.currencySymbol, '').trim();

  // 2. Find the last separator (period or comma) to determine the decimal point.
  const lastPeriod = cleanedValue.lastIndexOf('.');
  const lastComma = cleanedValue.lastIndexOf(',');
  const decimalIndex = Math.max(lastPeriod, lastComma);

  if (decimalIndex === -1) {
    // No decimal separator found, treat the whole string as an integer and strip all non-numeric (except minus sign)
    return cleanedValue.replace(/[^\d-]/g, '');
  }

  // 3. Separate the integer and fractional parts
  const integerPartWithThousands = cleanedValue.substring(0, decimalIndex);
  const fractionalPart = cleanedValue.substring(decimalIndex + 1);

  // 4. Strip ALL potential thousands separators (periods and commas) from the integer part.
  const integerPart = integerPartWithThousands.replace(/[\.,]/g, '');

  // 5. Recombine into the standard '1234.56' format for safe use with parseFloat()
  // This correctly handles "26.79" -> "26.79" and "26,79" -> "26.79"
  return `${integerPart}.${fractionalPart}`;
}

/**
 * Format a number as currency according to user settings
 * @param {number} amount - The amount to format
 * @param {Object} settings - User currency settings
 * @returns {string} Formatted currency string
 */
export const formatCurrency = (amount, settings) => {
  if (amount === null || amount === undefined || isNaN(amount)) {
    return settings.currencyPosition === 'before'
      ? `${settings.currencySymbol}0${settings.decimalSeparator}00`
      : `0${settings.decimalSeparator}00${settings.currencySymbol}`;
  }

  // Use big.js to handle exact absolute values and rounding to avoid native float rounding quirks
  let bigAmount;
  try {
    bigAmount = new Big(amount);
  } catch (e) {
    // Fallback if amount is somehow an invalid format for Big
    bigAmount = new Big(0);
  }

  const decimalPlaces = settings.decimalPlaces || 2;
  const isNegative = bigAmount.lt(0);

  const fixedAmount = bigAmount.abs().toFixed(decimalPlaces);
  const [integerPart, decimalPart] = fixedAmount.split('.');

  const formattedInteger = integerPart.replace(
    /\B(?=(\d{3})+(?!\d))/g,
    settings.thousandSeparator || ','
  );

  let formattedDecimal = decimalPart || '';

  // Hide trailing zeros if setting is enabled
  if (settings.hideTrailingZeros && formattedDecimal) {
    formattedDecimal = formattedDecimal.replace(/0+$/, '');
  }

  const formattedAmount = formattedDecimal && formattedDecimal.length > 0
    ? `${formattedInteger}${settings.decimalSeparator || '.'}${formattedDecimal}`
    : formattedInteger;

  const sign = isNegative ? '-' : '';

  return settings.currencyPosition === 'before'
    ? `${sign}${settings.currencySymbol}${formattedAmount}`
    : `${sign}${formattedAmount}${settings.currencySymbol}`;
};