import { getCustomBudgetStats } from "./budgetCalculations";
import { getCurrencySymbol } from "./currencyUtils";

// DEPRECATED: getCurrencySymbol function moved to components/utils/currencyUtils.js
// This helper is now imported from the centralized utility file
// Scheduled for removal in next refactoring cycle
/*
const getCurrencySymbol = (currencyCode) => {
  const currencySymbols = {
    'USD': '$', 'EUR': '€', 'GBP': '£', 'JPY': '¥', 'CAD': 'CA$', 'AUD': 'A$',
    'CHF': 'CHF', 'CNY': '¥', 'INR': '₹', 'MXN': 'MX$', 'BRL': 'R$', 'ZAR': 'R',
    'KRW': '₩', 'SGD': 'S$', 'NZD': 'NZ$', 'HKD': 'HK$', 'SEK': 'kr', 'NOK': 'kr',
    'DKK': 'kr', 'PLN': 'zł', 'THB': '฿', 'MYR': 'RM', 'IDR': 'Rp', 'PHP': '₱',
    'CZK': 'Kč', 'ILS': '₪', 'CLP': 'CLP$', 'AED': 'د.إ', 'SAR': '﷼', 'TWD': 'NT$', 'TRY': '₺'
  };
  return currencySymbols[currencyCode] || currencyCode;
};
*/

/**
 * Calculates aggregated remaining amounts from custom budgets.
 * This includes:
 * - Digital remaining amounts (in base currency)
 * - Digital unpaid amounts (in base currency)
 * - Cash remaining amounts (separated by currency)
 * 
 * Used for:
 * 1. Calculating "Expected" amounts for system budget bars
 * 2. Calculating "Unpaid" amounts for system budget detail pages
 * 
 * @param {Array} allCustomBudgets - All custom budgets
 * @param {Array} transactions - All transactions
 * @param {string} baseCurrency - User's base currency (e.g., 'EUR', 'USD')
 * @param {Object} options - Additional options
 * @param {boolean} options.includeCompleted - Include completed budgets (default: true)
 * @param {string} options.budgetType - Filter by budget type (e.g., 'wants', 'needs', 'savings')
 * @returns {Object} { mainSum: number, separateCashAmounts: Array<{currencyCode, amount, symbol}> }
 */
export const calculateAggregatedRemainingAmounts = (
  allCustomBudgets,
  transactions,
  baseCurrency = 'USD',
  options = {}
) => {
  const {
    includeCompleted = true,
    budgetType = null
  } = options;

  let mainSum = 0;
  const separateCashAmounts = {};

  // Loop through all custom budgets
  allCustomBudgets.forEach(cb => {
    // Skip system budgets
    if (cb.isSystemBudget) return;

    // Filter by status
    if (cb.status === 'active') {
      // Active budgets are always included
    } else if (cb.status === 'completed' && includeCompleted) {
      // Completed budgets are included only if option is set
    } else {
      // Skip other statuses (archived, etc.)
      return;
    }

    const cbStats = getCustomBudgetStats(cb, transactions);

    // For ACTIVE budgets: include digital remaining and digital unpaid
    if (cb.status === 'active') {
      mainSum += cbStats.digital.remaining;
      mainSum += cbStats.digital.unpaid;
    }

    // For COMPLETED budgets: include ONLY digital unpaid (not remaining)
    if (cb.status === 'completed') {
      mainSum += cbStats.digital.unpaid;
    }

    // For ALL budgets (active or completed): handle cash remaining
    Object.keys(cbStats.cashByCurrency).forEach(currencyCode => {
      const cashData = cbStats.cashByCurrency[currencyCode];
      
      if (currencyCode === baseCurrency) {
        // Cash in base currency: add to main sum
        mainSum += cashData.remaining;
      } else {
        // Cash in different currency: accumulate separately
        if (!separateCashAmounts[currencyCode]) {
          separateCashAmounts[currencyCode] = 0;
        }
        separateCashAmounts[currencyCode] += cashData.remaining;
      }
    });
  });

  // Convert separateCashAmounts object to array with currency symbols
  const separateCashArray = Object.keys(separateCashAmounts)
    .filter(currencyCode => separateCashAmounts[currencyCode] > 0)
    .map(currencyCode => ({
      currencyCode,
      amount: separateCashAmounts[currencyCode],
      symbol: getCurrencySymbol(currencyCode)
    }));

  return {
    mainSum,
    separateCashAmounts: separateCashArray
  };
};