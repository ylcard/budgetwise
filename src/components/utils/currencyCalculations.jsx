/**
 * Currency conversion utilities using USD as the reference currency.
 * Implements the triangulation method with multiplication-only approach.
 */

import { differenceInDays, parseISO } from "date-fns";

/**
 * Calculate converted amount from source currency to target currency.
 * Uses USD as the reference currency for triangulation.
 * 
 * Formula: Converted Amount = Amount × Rate(Source→USD) × Rate(USD→Target)
 * 
 * @param {number} sourceAmount - The amount in source currency
 * @param {string} sourceCurrencyCode - The source currency code (e.g., 'GBP')
 * @param {string} targetCurrencyCode - The target currency code (e.g., 'EUR')
 * @param {Object} rates - Object containing exchange rates
 * @param {number} rates.sourceToUSD - Rate for Source→USD (e.g., 1 GBP = 1.25 USD)
 * @param {number} rates.targetToUSD - Rate for Target→USD (e.g., 1 EUR = 1.08 USD)
 * @returns {Object} { convertedAmount: number, exchangeRateUsed: number }
 */
export function calculateConvertedAmount(sourceAmount, sourceCurrencyCode, targetCurrencyCode, rates) {
    // Handle same currency case
    if (sourceCurrencyCode === targetCurrencyCode) {
        return {
            convertedAmount: sourceAmount,
            exchangeRateUsed: 1.0
        };
    }

    const { sourceToUSD, targetToUSD } = rates;

    // Pre-calculate USD→Target rate (inverse)
    const usdToTarget = 1 / targetToUSD;

    // Convert Source→USD
    const amountInUSD = sourceAmount * sourceToUSD;

    // Convert USD→Target (multiplication only)
    const convertedAmount = amountInUSD * usdToTarget;

    // Calculate the direct exchange rate used (Source→Target)
    const exchangeRateUsed = sourceToUSD * usdToTarget;

    return {
        convertedAmount: parseFloat(convertedAmount.toFixed(2)),
        exchangeRateUsed: parseFloat(exchangeRateUsed.toFixed(6))
    };
}

/**
 * Retrieve exchange rates for a specific currency pair and date from the database.
 * Now implements a 14-day freshness window - will use rates up to 14 days old.
 * 
 * @param {Array} exchangeRates - Array of ExchangeRate entities
 * @param {string} currencyCode - The currency code to look up (e.g., 'GBP')
 * @param {string} date - The target date in YYYY-MM-DD format
 * @returns {number|null} The rate for Currency→USD, or null if not found
 */
export function getRateForDate(exchangeRates, currencyCode, date) {
    // Handle USD case (USD→USD = 1.0)
    if (currencyCode === 'USD') {
        return 1.0;
    }

    // First, try to find an exact match for the date
    // const exactMatch = exchangeRates.find(
    //   r => r.fromCurrency === currencyCode && 
    //        r.toCurrency === 'USD' && 
    //        r.date === date
    // );

    // if (exactMatch) {
    //   return exactMatch.rate;
    // }

    // If no exact match, find the most recent rate within the 14-day window
    // const targetDate = new Date(date);
    // const fourteenDaysAgo = new Date(targetDate);
    // fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);

    // const candidateRates = exchangeRates.filter(
    //   r => r.fromCurrency === currencyCode && 
    //        r.toCurrency === 'USD'
    // );

    // Find rates within the freshness window
    // const freshRates = candidateRates.filter(r => {
    //   const rateDate = new Date(r.date);
    //   return rateDate >= fourteenDaysAgo && rateDate <= targetDate;
    // });

    // ROBUST DATE LOGIC: Find all rates within the freshness window (0 to 14 days)
    const targetDateObj = parseISO(date);
    const windowDays = 14;

    const freshRates = exchangeRates.filter(r => {
        // 1. Check Currency Match
        if (r.fromCurrency !== currencyCode || r.toCurrency !== 'USD') return false;

        // 2. Check Date Window (using date-fns for safety)
        const rateDateObj = parseISO(r.date);
        const diff = Math.abs(differenceInDays(targetDateObj, rateDateObj));

        return diff <= windowDays;
    });

    if (freshRates.length === 0) {
        return null; // No fresh rates available
    }

    // Return the most recent fresh rate
    freshRates.sort((a, b) => new Date(b.date) - new Date(a.date));
    return freshRates[0].rate;
}

/**
 * Check if exchange rates for a given date and currencies are fresh enough.
 * 
 * @param {Array} exchangeRates - Array of ExchangeRate entities
 * @param {string} sourceCurrency - Source currency code
 * @param {string} targetCurrency - Target currency code (user's base)
 * @param {string} date - Transaction date in YYYY-MM-DD format
 * @param {number} freshnessWindowDays - Number of days to consider rates "fresh" (default: 14)
 * @returns {boolean} True if rates are fresh, false if stale or missing
 */
export function areRatesFresh(exchangeRates, sourceCurrency, targetCurrency, date, freshnessWindowDays = 14) {
    // If either currency is USD, we don't need to check freshness
    // if (sourceCurrency === 'USD' || targetCurrency === 'USD') {
    //   // Only need to check the non-USD currency
    //   const currencyToCheck = sourceCurrency === 'USD' ? targetCurrency : sourceCurrency;
    //   if (currencyToCheck === 'USD') {
    //     return true; // Both are USD
    //   }

    //   const rate = getRateForDate(exchangeRates, currencyToCheck, date);
    //   return rate !== null;
    // }

    // Check if both required rates are available within the freshness window
    // const sourceRate = getRateForDate(exchangeRates, sourceCurrency, date);
    // const targetRate = getRateForDate(exchangeRates, targetCurrency, date);

    // return sourceRate !== null && targetRate !== null;

    // Logic simplified: Determine which currencies need lookup
    const neededCurrencies = [];
    if (sourceCurrency !== 'USD') neededCurrencies.push(sourceCurrency);
    if (targetCurrency !== 'USD') neededCurrencies.push(targetCurrency);

    if (neededCurrencies.length === 0) return true; // Both are USD

    // Check if EVERY needed currency has a rate within the window
    return neededCurrencies.every(currency => {
        const rate = getRateForDate(exchangeRates, currency, date);
        return rate !== null;
    });
}

/**
 * List of commonly supported currencies
 */
// export const SUPPORTED_CURRENCIES = [
//   { code: 'USD', name: 'US Dollar', symbol: '$' },
//   { code: 'EUR', name: 'Euro', symbol: '€' },
//   { code: 'GBP', name: 'British Pound', symbol: '£' },
//   { code: 'JPY', name: 'Japanese Yen', symbol: '¥' },
//   { code: 'CAD', name: 'Canadian Dollar', symbol: 'C$' },
//   { code: 'AUD', name: 'Australian Dollar', symbol: 'A$' },
//   { code: 'CHF', name: 'Swiss Franc', symbol: 'CHF' },
//   { code: 'CNY', name: 'Chinese Yuan', symbol: '¥' },
//   { code: 'INR', name: 'Indian Rupee', symbol: '₹' },
//   { code: 'MXN', name: 'Mexican Peso', symbol: '$' },
// ];
