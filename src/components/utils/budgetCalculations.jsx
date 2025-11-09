
// Utility function to create a map from an array of entities
// Can optionally extract a specific field value instead of the whole entity
export const createEntityMap = (entities, keyField = 'id', valueExtractor = null) => {
    if (!Array.isArray(entities)) return {};
    return entities.reduce((acc, entity) => {
        if (entity && entity[keyField]) {
            acc[entity[keyField]] = valueExtractor ? valueExtractor(entity) : entity;
        }
        return acc;
    }, {});
};

// Filter custom budgets by status
export const filterActiveCustomBudgets = (customBudgets) => {
    return customBudgets.filter(cb => cb.status === 'active');
};

export const filterCompletedCustomBudgets = (customBudgets) => {
    return customBudgets.filter(cb => cb.status === 'completed');
};

export const filterActiveOrCompletedCustomBudgets = (customBudgets) => {
    return customBudgets.filter(cb => cb.status === 'active' || cb.status === 'completed');
};

// Normalize amount input by removing non-numeric characters except decimal separators
// Converts comma to period for standardization
export const normalizeAmount = (amount) => {
    if (!amount) return '';
    return amount.toString().replace(/[^\d.,]/g, '').replace(',', '.');
};

// Utility function to create timezone-agnostic date from YYYY-MM-DD string
export const parseDate = (dateString) => {
    if (!dateString) return null;
    const [year, month, day] = dateString.split('-').map(Number);
    return new Date(year, month - 1, day);
};

// Utility function to format date as YYYY-MM-DD (timezone-agnostic)
export const formatDateString = (date) => {
    if (!date) return '';
    const d = date instanceof Date ? date : new Date(date);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

// Get first day of month as YYYY-MM-DD
export const getFirstDayOfMonth = (month, year) => {
    return formatDateString(new Date(year, month, 1));
};

// Get last day of month as YYYY-MM-DD
export const getLastDayOfMonth = (month, year) => {
    return formatDateString(new Date(year, month + 1, 0));
};

// Helper to check if a transaction should be counted toward budgets
// Cash expenses from wallet should NOT be counted (the withdrawal already counted)
export const shouldCountTowardBudget = (transaction) => {
    if (!transaction.isCashTransaction) return true;
    
    // Only count withdrawals to wallet and deposits from wallet to bank
    // Do NOT count expenses from wallet (they're already counted via the withdrawal)
    return transaction.cashTransactionType === 'withdrawal_to_wallet' || 
           transaction.cashTransactionType === 'deposit_from_wallet_to_bank';
};

export const getCurrentMonthTransactions = (transactions, month, year) => {
    const monthStart = new Date(year, month, 1);
    const monthEnd = new Date(year, month + 1, 0);

    return transactions.filter(t => {
        // For income, just check the date
        if (t.type === 'income') {
            const transactionDate = parseDate(t.date);
            return transactionDate >= monthStart && transactionDate <= monthEnd;
        }

        // For expenses, check if paid in this month
        if (!t.isPaid || !t.paidDate) return false;
        const paidDate = parseDate(t.paidDate);
        return paidDate >= monthStart && paidDate <= monthEnd;
    });
};

export const getUnpaidExpensesForMonth = (transactions, month, year) => {
    const monthStart = new Date(year, month, 1);
    const monthEnd = new Date(year, month + 1, 0);

    return transactions.filter(t => {
        if (t.type !== 'expense') return false;
        if (t.isPaid) return false;

        const transactionDate = parseDate(t.date);
        return transactionDate >= monthStart && transactionDate <= monthEnd;
    });
};

export const calculateRemainingBudget = (transactions, month, year) => {
    const currentMonthTransactions = getCurrentMonthTransactions(transactions, month, year);

    const income = currentMonthTransactions
        .filter(t => t.type === 'income')
        .reduce((sum, t) => sum + t.amount, 0);

    // Only count expenses that should be counted toward budget
    const paidExpenses = currentMonthTransactions
        .filter(t => t.type === 'expense' && shouldCountTowardBudget(t))
        .reduce((sum, t) => sum + t.amount, 0);

    // Add unpaid expenses for the month (exclude cash expenses from wallet)
    const unpaidExpenses = getUnpaidExpensesForMonth(transactions, month, year)
        .filter(t => shouldCountTowardBudget(t));
    const unpaidExpenseAmount = unpaidExpenses.reduce((sum, t) => sum + t.amount, 0);

    return income - paidExpenses - unpaidExpenseAmount;
};

export const getCustomBudgetStats = (customBudget, transactions) => {
    const budgetStart = parseDate(customBudget.startDate);
    const budgetEnd = parseDate(customBudget.endDate);

    // Only include transactions within the budget period
    const budgetTransactions = transactions.filter(t => {
        if (t.customBudgetId !== customBudget.id) return false;

        // For paid transactions, check if paid date is within budget period
        if (t.isPaid && t.paidDate) {
            const paidDate = parseDate(t.paidDate);
            return paidDate >= budgetStart && paidDate <= budgetEnd;
        }

        // For unpaid transactions, check if transaction date is within budget period
        const transactionDate = parseDate(t.date);
        return transactionDate >= budgetStart && transactionDate <= budgetEnd;
    });

    // Separate card and cash transactions
    const cardTransactions = budgetTransactions.filter(t => !t.isCashTransaction || t.cashTransactionType !== 'expense_from_wallet');
    const cashTransactions = budgetTransactions.filter(t => t.isCashTransaction && t.cashTransactionType === 'expense_from_wallet');

    const totalSpent = budgetTransactions
        .filter(t => t.type === 'expense')
        .reduce((sum, t) => sum + t.amount, 0);

    const cardSpent = cardTransactions
        .filter(t => t.type === 'expense')
        .reduce((sum, t) => sum + t.amount, 0);

    const cashSpent = cashTransactions
        .filter(t => t.type === 'expense')
        .reduce((sum, t) => sum + t.amount, 0);

    const paidAmount = budgetTransactions
        .filter(t => t.type === 'expense' && t.isPaid)
        .reduce((sum, t) => sum + t.amount, 0);

    const unpaidAmount = budgetTransactions
        .filter(t => t.type === 'expense' && !t.isPaid)
        .reduce((sum, t) => sum + t.amount, 0);

    // Calculate total allocated amount including cash allocations
    const cashAllocatedTotal = customBudget.cashAllocations?.reduce((sum, alloc) => sum + alloc.amount, 0) || 0;
    const totalBudget = customBudget.allocatedAmount + cashAllocatedTotal;
    const remaining = totalBudget - totalSpent;
    const cardRemaining = customBudget.allocatedAmount - cardSpent;
    const cashRemaining = cashAllocatedTotal - cashSpent;
    const percentageUsed = totalBudget > 0 ? (totalSpent / totalBudget) * 100 : 0;

    return {
        totalSpent,
        cardSpent,
        cashSpent,
        paidAmount,
        unpaidAmount,
        remaining,
        cardRemaining,
        cashRemaining,
        percentageUsed,
        transactionCount: budgetTransactions.length
    };
};

export const getSystemBudgetStats = (systemBudget, transactions, categories, allCustomBudgets = []) => {
    const budgetStart = parseDate(systemBudget.startDate);
    const budgetEnd = parseDate(systemBudget.endDate);

    // Create a map of category_id to priority
    const categoryPriorityMap = {};
    if (categories && categories.length > 0) {
        categories.forEach(cat => {
            categoryPriorityMap[cat.id] = cat.priority;
        });
    }

    // Filter transactions using effective priority
    const budgetTransactions = transactions.filter(t => {
        if (t.type !== 'expense' || !t.category_id) return false;

        // Use effective priority to determine if transaction belongs to this system budget
        const effectivePriority = getTransactionEffectivePriority(t, categories, allCustomBudgets);
        if (effectivePriority !== systemBudget.systemBudgetType) return false;

        // For paid transactions, check if paid date is within budget period
        if (t.isPaid && t.paidDate) {
            const paidDate = parseDate(t.paidDate);
            return paidDate >= budgetStart && paidDate <= budgetEnd;
        }

        // For unpaid expenses, check if transaction date is within budget period
        if (!t.isPaid) {
            const transactionDate = parseDate(t.date);
            return transactionDate >= budgetStart && transactionDate <= budgetEnd;
        }

        return false;
    });

    // Separate card and cash transactions
    const cardTransactions = budgetTransactions.filter(t => !t.isCashTransaction || t.cashTransactionType !== 'expense_from_wallet');
    const cashTransactions = budgetTransactions.filter(t => t.isCashTransaction && t.cashTransactionType === 'expense_from_wallet');

    const totalSpent = budgetTransactions.reduce((sum, t) => sum + t.amount, 0);
    const cardSpent = cardTransactions.reduce((sum, t) => sum + t.amount, 0);
    const cashSpent = cashTransactions.reduce((sum, t) => sum + t.amount, 0);

    const paidAmount = budgetTransactions
        .filter(t => t.isPaid)
        .reduce((sum, t) => sum + t.amount, 0);
    const unpaidAmount = budgetTransactions
        .filter(t => !t.isPaid)
        .reduce((sum, t) => sum + t.amount, 0);

    const totalBudget = systemBudget.budgetAmount + (systemBudget.cashAllocatedAmount || 0);
    const cardRemaining = systemBudget.budgetAmount - cardSpent;
    const cashRemaining = (systemBudget.cashAllocatedAmount || 0) - cashSpent;

    return {
        totalSpent,
        cardSpent,
        cashSpent,
        paidAmount,
        unpaidAmount,
        remaining: totalBudget - totalSpent,
        cardRemaining,
        cashRemaining,
        percentageUsed: totalBudget > 0 ? (totalSpent / totalBudget) * 100 : 0,
        transactionCount: budgetTransactions.length
    };
};

// Helper function to get direct unpaid expenses (not linked to any custom budget)
export const getDirectUnpaidExpenses = (systemBudget, transactions, categories, allCustomBudgets = []) => {
    const budgetStart = parseDate(systemBudget.startDate);
    const budgetEnd = parseDate(systemBudget.endDate);

    // Create a map of category_id to priority
    const categoryPriorityMap = {};
    if (categories && categories.length > 0) {
        categories.forEach(cat => {
            categoryPriorityMap[cat.id] = cat.priority;
        });
    }

    // Get IDs of ALL custom budgets to exclude their transactions
    const allCustomBudgetIds = allCustomBudgets.map(cb => cb.id);

    // Get unpaid transactions for this system budget type, excluding those in custom budgets
    const directUnpaidTransactions = transactions.filter(t => {
        if (t.type !== 'expense' || !t.category_id) return false;
        if (t.isPaid) return false;

        // Check if category priority matches system budget type
        const categoryPriority = categoryPriorityMap[t.category_id];
        if (categoryPriority !== systemBudget.systemBudgetType) return false;

        // Exclude transactions tied to ANY custom budget
        if (t.customBudgetId && allCustomBudgetIds.includes(t.customBudgetId)) {
            return false;
        }

        // Check if transaction date is within budget period
        const transactionDate = parseDate(t.date);
        return transactionDate >= budgetStart && transactionDate <= budgetEnd;
    });

    return directUnpaidTransactions.reduce((sum, t) => sum + t.amount, 0);
};

export const getCustomBudgetAllocationStats = (customBudget, allocations, transactions) => {
    const budgetStart = parseDate(customBudget.startDate);
    const budgetEnd = parseDate(customBudget.endDate);

    // Filter transactions for this custom budget within date range
    const budgetTransactions = transactions.filter(t => {
        if (t.customBudgetId !== customBudget.id) return false;

        if (t.isPaid && t.paidDate) {
            const paidDate = parseDate(t.paidDate);
            return paidDate >= budgetStart && paidDate <= budgetEnd;
        }

        const transactionDate = parseDate(t.date);
        return transactionDate >= budgetStart && transactionDate <= budgetEnd;
    });

    // Calculate total allocated
    const totalAllocated = allocations.reduce((sum, a) => sum + a.allocatedAmount, 0);
    const unallocated = customBudget.allocatedAmount - totalAllocated;

    // Calculate spending per category
    const categorySpending = {};
    allocations.forEach(allocation => {
        const spent = budgetTransactions
            .filter(t => t.type === 'expense' && t.category_id === allocation.categoryId)
            .reduce((sum, t) => sum + t.amount, 0);

        const remaining = allocation.allocatedAmount - spent;

        categorySpending[allocation.categoryId] = {
            allocated: allocation.allocatedAmount,
            spent,
            remaining,
            percentageUsed: allocation.allocatedAmount > 0 ? (spent / allocation.allocatedAmount) * 100 : 0
        };
    });

    // Calculate unallocated spending (transactions without category or category not in allocations)
    const allocatedCategoryIds = allocations.map(a => a.categoryId);
    const unallocatedSpent = budgetTransactions
        .filter(t => t.type === 'expense' && (!t.category_id || !allocatedCategoryIds.includes(t.category_id)))
        .reduce((sum, t) => sum + t.amount, 0);

    return {
        totalAllocated,
        unallocated,
        unallocatedSpent,
        unallocatedRemaining: unallocated - unallocatedSpent,
        categorySpending
    };
};

// Helper function to get effective priority of a transaction
// Handles cases where a "Needs" category expense is linked to a "Wants" custom budget
export const getTransactionEffectivePriority = (transaction, categories, allCustomBudgets = []) => {
    if (transaction.type === 'income') return 'income';
    if (transaction.type !== 'expense') return 'uncategorized';

    // If the transaction is linked to ANY custom budget (that is NOT a system budget itself),
    // then its effective priority is 'wants'.
    if (transaction.customBudgetId) {
        const customBudget = allCustomBudgets.find(cb => cb.id === transaction.customBudgetId);
        // Crucial check: Ensure it's a *custom* budget, not one of the system-generated budgets.
        // System custom budgets have isSystemBudget: true.
        if (customBudget && !customBudget.isSystemBudget) {
            return 'wants'; // Any expense in a custom budget is a 'wants'
        }
    }

    // If not linked to a custom budget, then use its category's priority.
    if (transaction.category_id) {
        const category = categories.find(c => c.id === transaction.category_id);
        if (category && category.priority) {
            return category.priority;
        }
    }

    return 'uncategorized'; // Fallback for uncategorized expenses not in custom budgets
};

// Filter custom budgets that are active during a specific transaction date
export const filterBudgetsByTransactionDate = (customBudgets, transactionDate) => {
    if (!transactionDate || !customBudgets) return [];
    
    const txDate = parseDate(transactionDate);
    if (!txDate) return [];
    
    return customBudgets.filter(budget => {
        const startDate = parseDate(budget.startDate);
        const endDate = parseDate(budget.endDate);
        
        if (!startDate || !endDate) return false;
        
        // Include budget if transaction date falls within budget period
        return txDate >= startDate && txDate <= endDate;
    });
};
