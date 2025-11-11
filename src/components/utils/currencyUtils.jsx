/**
 * Currency utility functions
 * Centralized currency symbol mapping, formatting, and conversion helpers
 * Updated: 11-Nov-2025 - Added formatCurrency from formatCurrency.js
 */

/**
 * Get the currency symbol for a given currency code
 * @param {string} currencyCode - The ISO currency code (e.g., 'USD', 'EUR', 'GBP')
 * @returns {string} The currency symbol or the currency code if not found
 */
export const getCurrencySymbol = (currencyCode) => {
  const currencySymbols = {
    'USD': '$',
    'EUR': '€',
    'GBP': '£',
    'JPY': '¥',
    'CAD': 'CA$',
    'AUD': 'A$',
    'CHF': 'CHF',
    'CNY': '¥',
    'INR': '₹',
    'MXN': 'MX$',
    'BRL': 'R$',
    'ZAR': 'R',
    'KRW': '₩',
    'SGD': 'S$',
    'NZD': 'NZ$',
    'HKD': 'HK$',
    'SEK': 'kr',
    'NOK': 'kr',
    'DKK': 'kr',
    'PLN': 'zł',
    'THB': '฿',
    'MYR': 'RM',
    'IDR': 'Rp',
    'PHP': '₱',
    'CZK': 'Kč',
    'ILS': '₪',
    'CLP': 'CLP$',
    'AED': 'د.إ',
    'SAR': '﷼',
    'TWD': 'NT$',
    'TRY': '₺'
  };
  return currencySymbols[currencyCode] || currencyCode;
};

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

  const fixedAmount = Math.abs(amount).toFixed(settings.decimalPlaces || 2);
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
  
  const withSign = amount < 0 ? `-${formattedAmount}` : formattedAmount;
  
  return settings.currencyPosition === 'before'
    ? `${settings.currencySymbol}${withSign}`
    : `${withSign}${settings.currencySymbol}`;
};