
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

// Filter mini budgets by status
export const filterActiveMiniBudgets = (miniBudgets) => {
    return miniBudgets.filter(mb => mb.status === 'active');
};

export const filterCompletedMiniBudgets = (miniBudgets) => {
    return miniBudgets.filter(mb => mb.status === 'completed');
};

export const filterActiveOrCompletedMiniBudgets = (miniBudgets) => {
    return miniBudgets.filter(mb => mb.status === 'active' || mb.status === 'completed');
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

    const paidExpenses = currentMonthTransactions
        .filter(t => t.type === 'expense')
        .reduce((sum, t) => sum + t.amount, 0);

    // Add unpaid expenses for the month
    const unpaidExpenses = getUnpaidExpensesForMonth(transactions, month, year);
    const unpaidExpenseAmount = unpaidExpenses.reduce((sum, t) => sum + t.amount, 0);

    return income - paidExpenses - unpaidExpenseAmount;
};

export const getMiniBudgetStats = (miniBudget, transactions) => {
    const budgetStart = parseDate(miniBudget.startDate);
    const budgetEnd = parseDate(miniBudget.endDate);

    // Only include transactions within the budget period
    const budgetTransactions = transactions.filter(t => {
        if (t.miniBudgetId !== miniBudget.id) return false;

        // For paid transactions, check if paid date is within budget period
        if (t.isPaid && t.paidDate) {
            const paidDate = parseDate(t.paidDate);
            return paidDate >= budgetStart && paidDate <= budgetEnd;
        }

        // For unpaid transactions, check if transaction date is within budget period
        const transactionDate = parseDate(t.date);
        return transactionDate >= budgetStart && transactionDate <= budgetEnd;
    });

    const totalSpent = budgetTransactions
        .filter(t => t.type === 'expense')
        .reduce((sum, t) => sum + t.amount, 0);

    const paidAmount = budgetTransactions
        .filter(t => t.type === 'expense' && t.isPaid)
        .reduce((sum, t) => sum + t.amount, 0);

    const unpaidAmount = budgetTransactions
        .filter(t => t.type === 'expense' && !t.isPaid)
        .reduce((sum, t) => sum + t.amount, 0);

    const remaining = miniBudget.allocatedAmount - totalSpent;
    const percentageUsed = miniBudget.allocatedAmount > 0
        ? (totalSpent / miniBudget.allocatedAmount) * 100
        : 0;

    return {
        totalSpent,
        paidAmount,
        unpaidAmount,
        remaining,
        percentageUsed,
        transactionCount: budgetTransactions.length
    };
};

export const getSystemBudgetStats = (systemBudget, transactions, categories, allMiniBudgets = []) => {
    const budgetStart = parseDate(systemBudget.startDate);
    const budgetEnd = parseDate(systemBudget.endDate);

    // Create a map of category_id to priority
    // (This map is no longer directly used for filtering but might be useful for other potential debug/logic in the future, keeping for now)
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
        const effectivePriority = getTransactionEffectivePriority(t, categories, allMiniBudgets);
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

    const totalSpent = budgetTransactions.reduce((sum, t) => sum + t.amount, 0);
    const paidAmount = budgetTransactions
        .filter(t => t.isPaid)
        .reduce((sum, t) => sum + t.amount, 0);
    const unpaidAmount = budgetTransactions
        .filter(t => !t.isPaid)
        .reduce((sum, t) => sum + t.amount, 0);

    return {
        totalSpent,
        paidAmount,
        unpaidAmount,
        remaining: systemBudget.budgetAmount - totalSpent,
        percentageUsed: systemBudget.budgetAmount > 0
            ? (totalSpent / systemBudget.budgetAmount) * 100
            : 0,
        transactionCount: budgetTransactions.length
    };
};

// Helper function to get direct unpaid expenses (not linked to any custom budget)
// This function needs to be updated similarly if it also needs to respect effective priority based on miniBudget links.
// For now, keeping it as is, assuming 'direct' means solely based on category.
export const getDirectUnpaidExpenses = (systemBudget, transactions, categories, allMiniBudgets = []) => {
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
    const allCustomBudgetIds = allMiniBudgets.map(mb => mb.id);

    // Get unpaid transactions for this system budget type, excluding those in custom budgets
    const directUnpaidTransactions = transactions.filter(t => {
        if (t.type !== 'expense' || !t.category_id) return false;
        if (t.isPaid) return false;

        // Check if category priority matches system budget type
        const categoryPriority = categoryPriorityMap[t.category_id];
        if (categoryPriority !== systemBudget.systemBudgetType) return false;

        // Exclude transactions tied to ANY custom budget
        if (t.miniBudgetId && allCustomBudgetIds.includes(t.miniBudgetId)) {
            return false;
        }

        // Check if transaction date is within budget period
        const transactionDate = parseDate(t.date);
        return transactionDate >= budgetStart && transactionDate <= budgetEnd;
    });

    return directUnpaidTransactions.reduce((sum, t) => sum + t.amount, 0);
};

export const getMiniBudgetAllocationStats = (miniBudget, allocations, transactions) => {
    const budgetStart = parseDate(miniBudget.startDate);
    const budgetEnd = parseDate(miniBudget.endDate);

    // Filter transactions for this mini budget within date range
    const budgetTransactions = transactions.filter(t => {
        if (t.miniBudgetId !== miniBudget.id) return false;

        if (t.isPaid && t.paidDate) {
            const paidDate = parseDate(t.paidDate);
            return paidDate >= budgetStart && paidDate <= budgetEnd;
        }

        const transactionDate = parseDate(t.date);
        return transactionDate >= budgetStart && transactionDate <= budgetEnd;
    });

    // Calculate total allocated
    const totalAllocated = allocations.reduce((sum, a) => sum + a.allocatedAmount, 0);
    const unallocated = miniBudget.allocatedAmount - totalAllocated;

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
export const getTransactionEffectivePriority = (transaction, categories, allMiniBudgets = []) => {
    if (transaction.type === 'income') return 'income';
    if (transaction.type !== 'expense') return 'uncategorized';

    // NEW LOGIC: If the transaction is linked to ANY mini-budget (that is NOT a system budget itself),
    // then its effective priority is 'wants'.
    if (transaction.miniBudgetId) {
        const miniBudget = allMiniBudgets.find(mb => mb.id === transaction.miniBudgetId);
        // Crucial check: Ensure it's a *custom* mini-budget, not one of the system-generated mini-budgets.
        // System mini-budgets have isSystemBudget: true.
        if (miniBudget && !miniBudget.isSystemBudget) {
            return 'wants'; // Any expense in a custom mini-budget is a 'wants'
        }
    }

    // If not linked to a custom mini-budget, then use its category's priority.
    if (transaction.category_id) {
        const category = categories.find(c => c.id === transaction.category_id);
        if (category && category.priority) {
            return category.priority;
        }
    }

    return 'uncategorized'; // Fallback for uncategorized expenses not in custom budgets
};
