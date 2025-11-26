// File deprecated, moving on to consumption model, no need for cash

// import { base44 } from "@/api/base44Client";

/**
 * Get balance for a specific currency from the cash wallet.
 * @param {object} cashWallet - The entire cash wallet object containing balances.
 * @param {string} currencyCode - The ISO currency code (e.g., 'USD').
 * @returns {number} The available amount for that currency, or 0 if not found.
 */
/* export const getCurrencyBalance = (cashWallet, currencyCode) => {
    if (!cashWallet || !cashWallet.balances) return 0;
    const balance = cashWallet.balances.find(b => b.currencyCode === currencyCode);
    return balance ? balance.amount : 0;
};
*/

/**
 * Helper function to filter transactions for cash expenses related to a specific budget.
 * @private
 * @param {string} budgetId - The ID of the custom budget.
 * @param {Array<object>} transactions - All relevant transaction objects.
 * @returns {Array<object>} Filtered list of cash expense transactions.
 */
/* const getBudgetCashExpenses = (budgetId, transactions) => {
    return transactions.filter(
        t => t.customBudgetId === budgetId &&
            t.isCashTransaction &&
            t.cashTransactionType === 'expense_from_wallet'
    );
}
*/

/**
 * Helper function to calculate total cash spent for a budget, grouped by currency.
 * @private
 * @param {string} budgetId - The ID of the custom budget.
 * @param {Array<object>} transactions - All relevant transaction objects.
 * @returns {object} Map of currencyCode to total spent amount.
 */
/* const calculateSpentByCurrency = (budgetId, transactions) => {
    const cashExpenses = getBudgetCashExpenses(budgetId, transactions);
    const spentByCurrency = {};

    cashExpenses.forEach(expense => {
        const currency = expense.cashCurrency;
        const amount = expense.cashAmount || 0;
        // CRITICAL: Ensure spent amount is rounded after aggregation
        spentByCurrency[currency] = Math.round(((spentByCurrency[currency] || 0) + amount) * 100) / 100;
    });

    return spentByCurrency;
}
*/

/**
 * Update balance for a specific currency in a balances array.
 * Extracted from useActions.js for reusability.
 * @param {Array<object>} balances - The current array of currency balance objects ({ currencyCode, amount }).
 * @param {string} currencyCode - The ISO currency code to update.
 * @param {number} amountChange - The amount to add (positive) or deduct (negative).
 * @returns {Array<object>} The updated array of balances, filtered for non-zero amounts.
 */
/* export const updateCurrencyBalance = (balances, currencyCode, amountChange) => {
    const existingBalanceIndex = balances.findIndex(b => b.currencyCode === currencyCode);

    if (existingBalanceIndex !== -1) {
        const updatedBalances = balances.map((b, index) =>
            index === existingBalanceIndex ?
                {
                    ...b,
                    // CRITICAL: Round result to 2 decimal places to fix floating-point math
                    amount: Math.round((b.amount + amountChange) * 100) / 100
                }
                : b
        );
        // Filter out balances that become zero or negative (considering floating point precision)
        return updatedBalances.filter(b => b.amount > 0.0001);
    } else if (amountChange > 0) { // Only add if it's a positive amount
        return [...balances, { currencyCode, amount: amountChange }];
    }
    return balances;
};
*/

/**
 * Get total cash allocated across all currencies for a budget.
 * @param {Array<object>} cashAllocations - List of allocation objects ({ currencyCode, amount }).
 * @returns {number} The total sum of all allocated amounts (summed without currency conversion).
 */
/* export const getTotalCashAllocated = (cashAllocations) => {
    if (!cashAllocations || cashAllocations.length === 0) return 0;
    return cashAllocations.reduce((sum, alloc) => sum + alloc.amount, 0);
};
*/

/**
 * Validate that the cash wallet has sufficient balance for requested allocations.
 * @param {object} cashWallet - The current cash wallet state.
 * @param {Array<object>} requestedAllocations - The list of allocations being requested.
 * @param {string} baseCurrency - The base currency code (not strictly used here, but kept for context).
 * @returns {{ valid: boolean, errors: Array<object> }} Validation result object.
 */
/* export const validateCashAllocations = (cashWallet, requestedAllocations, baseCurrency) => {
    if (!requestedAllocations || requestedAllocations.length === 0) {
        return { valid: true, errors: [] };
    }

    const errors = [];

    requestedAllocations.forEach(allocation => {
        const available = getCurrencyBalance(cashWallet, allocation.currencyCode);
        if (allocation.amount > available) {
            errors.push({
                currency: allocation.currencyCode,
                requested: allocation.amount,
                available
            });
        }
    });

    return {
        valid: errors.length === 0,
        errors
    };
};
*/

/**
 * Allocate cash from wallet (deduct from wallet balance and update database).
 * @param {string} userEmail - The email of the user whose wallet is being updated.
 * @param {Array<object>} allocations - The cash allocations to deduct.
 * @returns {Promise<void>}
 * @throws {Error} If the cash wallet is not found.
 */
/* export const allocateCashFromWallet = async (userEmail, allocations) => {
    if (!allocations || allocations.length === 0) return;

    // Fetch the user's wallet using filter by user_email
    const userWallets = await base44.entities.CashWallet.filter({ user_email: userEmail });

    if (!userWallets || userWallets.length === 0) {
        throw new Error('Cash wallet not found for user');
    }

    const wallet = userWallets[0];
    let updatedBalances = [...(wallet.balances || [])];

    allocations.forEach(allocation => {
        updatedBalances = updateCurrencyBalance(
            updatedBalances,
            allocation.currencyCode,
            -allocation.amount // Negative to deduct
        );
    });

    // Update using wallet.id (Base44 auto-generated identifier)
    await base44.entities.CashWallet.update(wallet.id, {
        balances: updatedBalances
    });
};
*/

/**
 * Return cash to wallet (add back to wallet balance and update database).
 * @param {string} userEmail - The email of the user whose wallet is being updated.
 * @param {Array<object>} allocations - The cash allocations to add back.
 * @returns {Promise<void>}
 * @throws {Error} If the cash wallet is not found.
 */
/* export const returnCashToWallet = async (userEmail, allocations) => {
    if (!allocations || allocations.length === 0) return;

    // Fetch the user's wallet using filter by user_email
    const userWallets = await base44.entities.CashWallet.filter({ user_email: userEmail });

    if (!userWallets || userWallets.length === 0) {
        throw new Error('Cash wallet not found for user');
    }

    const wallet = userWallets[0];
    let updatedBalances = [...(wallet.balances || [])];

    allocations.forEach(allocation => {
        updatedBalances = updateCurrencyBalance(
            updatedBalances,
            allocation.currencyCode,
            allocation.amount // Positive to add back
        );
    });

    // Update using wallet.id (Base44 auto-generated identifier)
    await base44.entities.CashWallet.update(wallet.id, {
        balances: updatedBalances
    });
};
*/

/**
 * Calculate remaining cash allocations for a budget after expenses.
 * @param {object} budget - The custom budget object with cashAllocations.
 * @param {Array<object>} transactions - All relevant transaction objects.
 * @returns {Array<object>} List of remaining cash allocations ({ currencyCode, amount }).
 */
/* export const calculateRemainingCashAllocations = (budget, transactions) => {
    if (!budget.cashAllocations || budget.cashAllocations.length === 0) {
        return [];
    }

    // Calculate spent per currency
    const spentByCurrency = calculateSpentByCurrency(budget.id, transactions);

    // Calculate remaining per currency
    const remaining = [];
    budget.cashAllocations.forEach(allocation => {
        const spent = spentByCurrency[allocation.currencyCode] || 0;

        // CRITICAL: Ensure remaining amount is rounded after subtraction
        const remainingAmount = Math.round((allocation.amount - spent) * 100) / 100;

        // Use epsilon check for remaining > 0
        if (remainingAmount > 0.0001) {
            remaining.push({
                currencyCode: allocation.currencyCode,
                amount: remainingAmount
            });
        }
    });

    return remaining;
};
*/

/**
 * Get remaining allocated cash for a specific budget and currency.
 * Used for validating cash expense transactions.
 * @param {object} budget - The custom budget object.
 * @param {Array<object>} transactions - All relevant transaction objects.
 * @param {string} currencyCode - The specific currency code to check.
 * @returns {number} The remaining allocated cash amount for that currency.
 */
/* export const getRemainingAllocatedCash = (budget, transactions, currencyCode) => {
    if (!budget || !budget.cashAllocations || budget.cashAllocations.length === 0) {
        return 0;
    }

    // Find the allocation for this currency
    const allocation = budget.cashAllocations.find(alloc => alloc.currencyCode === currencyCode);
    if (!allocation) {
        return 0;
    }

    // Calculate spent for this currency
    const spentByCurrency = calculateSpentByCurrency(budget.id, transactions);
    const spent = spentByCurrency[currencyCode] || 0;

    // CRITICAL: Ensure the final difference is rounded
    const remaining = Math.round((allocation.amount - spent) * 100) / 100;

    // Return only if greater than epsilon zero
    return remaining > 0.0001 ? remaining : 0;

};
*/

/**
 * Calculate changes in cash allocations (for budget updates).
 * @param {Array<object>} oldAllocations - The previous list of allocations.
 * @param {Array<object>} newAllocations - The new list of allocations.
 * @returns {Array<object>} List of changes ({ currencyCode, amount, isIncrease }).
 */
/* export const calculateAllocationChanges = (oldAllocations, newAllocations) => {
    const changes = [];

    // Create maps for easier comparison
    const oldMap = {};
    const newMap = {};

    oldAllocations.forEach(alloc => {
        oldMap[alloc.currencyCode] = alloc.amount;
    });

    newAllocations.forEach(alloc => {
        newMap[alloc.currencyCode] = alloc.amount;
    });

    // Get all unique currency codes
    const allCurrencies = new Set([
        ...Object.keys(oldMap),
        ...Object.keys(newMap)
    ]);

    allCurrencies.forEach(currency => {
        const oldAmount = oldMap[currency] || 0;
        const newAmount = newMap[currency] || 0;
        const difference = newAmount - oldAmount;

        // CRITICAL: Round the difference to 2 decimal places before comparison
        const roundedDifference = Math.round(difference * 100) / 100;

        // Use epsilon to check if rounded difference is non-zero
        if (Math.abs(roundedDifference) > 0.0001) {
            changes.push({
                currencyCode: currency,
                amount: Math.abs(roundedDifference),
                isIncrease: roundedDifference > 0
            });
        }
    });

    return changes;
};
*/