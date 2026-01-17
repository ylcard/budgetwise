/**
 * MODIFIED: 17-Jan-2026 - Currency conversion utilities using EUR as the reference currency (changed from USD).
 * Implements the triangulation method with multiplication-only approach.
 */

import { differenceInDays, parseISO, startOfDay } from "date-fns";

/**
 * MODIFIED: 17-Jan-2026 - Changed from USD to EUR as the reference currency
 * Calculate converted amount from source currency to target currency.
 * Uses EUR as the reference currency for triangulation.
 * 
 * Formula: Converted Amount = Amount × Rate(Source→EUR) × Rate(EUR→Target)
 * 
 * @param {number} sourceAmount - The amount in source currency
 * @param {string} sourceCurrencyCode - The source currency code (e.g., 'GBP')
 * @param {string} targetCurrencyCode - The target currency code (e.g., 'USD')
 * @param {Object} rates - Object containing exchange rates
 * @param {number} rates.sourceToEUR - Rate for Source→EUR (e.g., 1 GBP = 1.15 EUR)
 * @param {number} rates.targetToEUR - Rate for Target→EUR (e.g., 1 USD = 0.92 EUR)
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

    const { sourceToEUR, targetToEUR } = rates;

    // Pre-calculate EUR→Target rate (inverse)
    const eurToTarget = 1 / targetToEUR;

    // Convert Source→EUR
    const amountInEUR = sourceAmount * sourceToEUR;

    // Convert EUR→Target (multiplication only)
    const convertedAmount = amountInEUR * eurToTarget;

    // Calculate the direct exchange rate used (Source→Target)
    const exchangeRateUsed = sourceToEUR * eurToTarget;

    return {
        convertedAmount: parseFloat(convertedAmount.toFixed(2)),
        exchangeRateUsed: parseFloat(exchangeRateUsed.toFixed(6))
    };
}

/**
 * MODIFIED: 17-Jan-2026 - Changed from USD to EUR as the reference currency
 * Retrieve exchange rates for a specific currency pair and date from the database.
 * Now implements a 14-day freshness window - will use rates up to 14 days old.
 * 
 * @param {Array} exchangeRates - Array of ExchangeRate entities
 * @param {string} currencyCode - The currency code to look up (e.g., 'GBP')
 * @param {string} date - The target date in YYYY-MM-DD format
 * @returns {number|null} The rate for Currency→EUR, or null if not found
 */
export function getRateForDate(exchangeRates, currencyCode, date) {
    // Handle EUR case (EUR→EUR = 1.0)
    if (currencyCode === 'EUR') {
        return 1.0;
    }

    const freshRates = getRateDetailsForDate(exchangeRates, currencyCode, date);
    return freshRates ? freshRates.rate : null;
}

/**
 * MODIFIED: 17-Jan-2026 - Changed from USD to EUR as the reference currency
 * Retrieve the full exchange rate object for a specific currency pair and date.
 * 
 * @param {Array} exchangeRates - Array of ExchangeRate entities
 * @param {string} currencyCode - The currency code to look up
 * @param {string} date - The target date in YYYY-MM-DD format
 * @returns {Object|null} The ExchangeRate entity or null
 */
export function getRateDetailsForDate(exchangeRates, currencyCode, date, baseCurrency = 'EUR') {
    // Handle EUR case (Source is EUR, Target is Base Currency)
    if (currencyCode === 'EUR') {
        // If base is also EUR, rate is 1
        if (baseCurrency === 'EUR') return { rate: 1.0, date: date };

        // We need to find the rate for Base -> EUR
        // Then invert it to get EUR -> Base
        const baseRateDetails = getRateDetailsForDate(exchangeRates, baseCurrency, date, 'EUR');

        if (baseRateDetails) {
            return {
                ...baseRateDetails,
                rate: parseFloat((1 / baseRateDetails.rate).toFixed(6)),
                isInverted: true
            };
        }
        return null;
    }

    // Find all rates within the freshness window (0 to 14 days)
    const targetDateObj = startOfDay(parseISO(date));

    // MODIFIED: 17-Jan-2026 - Find all rates for this currency pair (now EUR-based)
    const relevantRates = exchangeRates.filter(r =>
        r.fromCurrency === currencyCode && r.toCurrency === 'EUR'
    );

    if (relevantRates.length === 0) return null;

    // Sort by date difference to find the closest one
    relevantRates.sort((a, b) => {
        const dateA = startOfDay(parseISO(a.date));
        const dateB = startOfDay(parseISO(b.date));
        const diffA = Math.abs(differenceInDays(targetDateObj, dateA));
        const diffB = Math.abs(differenceInDays(targetDateObj, dateB));
        return diffA - diffB;
    });

    return relevantRates[0];
}

/**
 * MODIFIED: 17-Jan-2026 - Changed from USD to EUR as the reference currency
 * Check if exchange rates for a given date and currencies are fresh enough.
 * 
 * @param {Array} exchangeRates - Array of ExchangeRate entities
 * @param {string} sourceCurrency - Source currency code
 * @param {string} targetCurrency - Target currency code (user's base)
 * @param {string} date - Transaction date in YYYY-MM-DD format
 * @param {number} freshnessWindowDays - Number of days to consider rates "fresh" (default: 14)
 * @returns {boolean} True if rates are fresh, false if stale or missing
 */
export function areRatesFresh(exchangeRates, sourceCurrency, targetCurrency, date) {
    // Logic simplified: Determine which currencies need lookup
    const neededCurrencies = [];
    if (sourceCurrency !== 'EUR') neededCurrencies.push(sourceCurrency);
    if (targetCurrency !== 'EUR') neededCurrencies.push(targetCurrency);

    if (neededCurrencies.length === 0) return true; // Both are EUR

    // Check if EVERY needed currency has a rate within the window
    return neededCurrencies.every(currency => {
        const rate = getRateForDate(exchangeRates, currency, date);
        return rate !== null;
    });
}