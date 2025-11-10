import { base44 } from "@/api/base44Client";

// Get balance for a specific currency from cash wallet
export const getCurrencyBalance = (cashWallet, currencyCode) => {
    if (!cashWallet || !cashWallet.balances) return 0;
    const balance = cashWallet.balances.find(b => b.currencyCode === currencyCode);
    return balance ? balance.amount : 0;
};

// Update balance for a specific currency (helper function)
export const updateCurrencyBalance = (balances, currencyCode, amountChange) => {
    const existingBalanceIndex = balances.findIndex(b => b.currencyCode === currencyCode);
    
    if (existingBalanceIndex !== -1) {
        const updatedBalances = balances.map((b, index) => 
            index === existingBalanceIndex 
                ? { ...b, amount: b.amount + amountChange }
                : b
        );
        // Filter out balances that become zero or negative (considering floating point precision)
        return updatedBalances.filter(b => b.amount > 0.01); 
    } else if (amountChange > 0) { // Only add if it's a positive amount
        return [...balances, { currencyCode, amount: amountChange }];
    }
    return balances;
};

// Get total cash allocated across all currencies
export const getTotalCashAllocated = (cashAllocations) => {
    if (!cashAllocations || cashAllocations.length === 0) return 0;
    return cashAllocations.reduce((sum, alloc) => sum + alloc.amount, 0);
};

// Validate that cash wallet has sufficient balance for allocations
export const validateCashAllocations = (cashWallet, requestedAllocations, baseCurrency) => {
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

// Allocate cash from wallet (deduct from wallet balance)
// Filters by user_email to find wallet, uses id to update
export const allocateCashFromWallet = async (userEmail, allocations) => {
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

// Return cash to wallet (add back to wallet balance)
// Filters by user_email to find wallet, uses id to update
export const returnCashToWallet = async (userEmail, allocations) => {
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

// Calculate remaining cash allocations for a budget
export const calculateRemainingCashAllocations = (budget, transactions) => {
    if (!budget.cashAllocations || budget.cashAllocations.length === 0) {
        return [];
    }

    // Get cash expenses for this budget (only those from wallet)
    const cashExpenses = transactions.filter(
        t => t.customBudgetId === budget.id && 
             t.isCashTransaction && 
             t.cashTransactionType === 'expense_from_wallet'
    );

    // Calculate spent per currency
    const spentByCurrency = {};
    cashExpenses.forEach(expense => {
        const currency = expense.cashCurrency;
        const amount = expense.cashAmount || 0;
        spentByCurrency[currency] = (spentByCurrency[currency] || 0) + amount;
    });

    // Calculate remaining per currency
    const remaining = [];
    budget.cashAllocations.forEach(allocation => {
        const spent = spentByCurrency[allocation.currencyCode] || 0;
        const remainingAmount = allocation.amount - spent;
        if (remainingAmount > 0) {
            remaining.push({
                currencyCode: allocation.currencyCode,
                amount: remainingAmount
            });
        }
    });

    return remaining;
};

// Get remaining allocated cash for a specific budget and currency
// This is used for validating cash expense transactions
export const getRemainingAllocatedCash = (budget, transactions, currencyCode) => {
    if (!budget || !budget.cashAllocations || budget.cashAllocations.length === 0) {
        return 0;
    }

    // Find the allocation for this currency
    const allocation = budget.cashAllocations.find(alloc => alloc.currencyCode === currencyCode);
    if (!allocation) {
        return 0;
    }

    // Calculate spent for this currency
    const cashExpenses = transactions.filter(
        t => t.customBudgetId === budget.id && 
             t.isCashTransaction && 
             t.cashTransactionType === 'expense_from_wallet' &&
             t.cashCurrency === currencyCode
    );

    const spent = cashExpenses.reduce((sum, expense) => sum + (expense.cashAmount || 0), 0);

    return allocation.amount - spent;
};

// Calculate changes in cash allocations (for budget updates)
export const calculateAllocationChanges = (oldAllocations, newAllocations) => {
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
        
        if (Math.abs(difference) > 0.01) { // Avoid floating point precision issues
            changes.push({
                currencyCode: currency,
                amount: Math.abs(difference),
                isIncrease: difference > 0
            });
        }
    });
    
    return changes;
};