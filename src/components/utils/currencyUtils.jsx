/**
 * Currency utility functions
 * Centralized currency symbol mapping and conversion helpers
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