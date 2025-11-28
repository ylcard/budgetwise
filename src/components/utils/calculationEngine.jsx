/**
 * CREATED 20-Nov-2025: Dual-Timeline Calculation Engine
 * Implements "Commitment View" and "Settlement View" as per refactored specs
 * 
 * KEY CONCEPTS:
 * - Commitment View: Based on transactionDate, shows what's "eaten up" from a budget (encumbrance)
 * - Settlement View: Based on paidDate (or transactionDate if pending), shows actual financial impact
 * - System Budgets (SB): Time Sticky - expenses move with paidDate changes
 * - Custom Budgets (CB): Context Sticky - expenses stay with their bucket regardless of paidDate
 */

import { parseDate } from "./dateUtils";

/**
 * Get effective financial priority for a transaction
 * Hierarchy: (1) Custom Budget -> 'wants', (2) transaction.financial_priority, (3) category.priority
 * 
 * @param {object} transaction - The transaction object
 * @param {Array} categories - All categories
 * @param {Array} allCustomBudgets - All custom budgets
 * @returns {string} 'needs', 'wants', 'savings', or null
 */
export const getTransactionEffectivePriority = (transaction, categories = [], allCustomBudgets = []) => {
    // If assigned to a Custom Budget (non-system), always treat as 'wants'
    if (transaction.customBudgetId) {
        const customBudget = allCustomBudgets.find(cb => cb.id === transaction.customBudgetId);
        if (customBudget && !customBudget.isSystemBudget) {
            return 'wants';
        }
    }

    // Check transaction-specific priority (new field)
    if (transaction.financial_priority) {
        return transaction.financial_priority;
    }

    // Fallback to category priority (legacy)
    if (transaction.category_id) {
        const category = categories.find(c => c.id === transaction.category_id);
        if (category && category.priority) {
            return category.priority;
        }
    }

    return null;
};

/**
 * COMMITMENT VIEW: Calculate budget usage based on commitment date (transactionDate)
 * Used in Custom Budget cards and Category views
 * 
 * @param {string} bucketId - The bucket (Custom Budget) ID
 * @param {Array} expenses - All expense transactions
 * @returns {number} Total committed amount
 */
export const calculateCommitmentView = (bucketId, expenses) => {
    if (!bucketId || !expenses) return 0;

    return expenses
        .filter(e => e.bucketId === bucketId || e.customBudgetId === bucketId)
        .reduce((sum, e) => sum + (e.amount || 0), 0);
};

/**
 * SETTLEMENT VIEW: Calculate actual financial impact for a given period
 * Used in Monthly Dashboard and Analytics
 * 
 * Logic:
 * - PAID expenses: Use paidDate
 * - PENDING expenses: Use transactionDate
 * 
 * @param {Array} transactions - All transactions
 * @param {string} startDate - Period start (YYYY-MM-DD)
 * @param {string} endDate - Period end (YYYY-MM-DD)
 * @param {object} options - Filtering options
 * @returns {number} Total settled amount in this period
 */
export const calculateSettlementView = (transactions, startDate, endDate, options = {}) => {
    const { type = 'expense' } = options;
    const start = parseDate(startDate);
    const end = parseDate(endDate);

    return transactions
        .filter(t => {
            // Filter by type
            if (t.type !== type) return false;

            // Determine effective date
            const effectiveDate = (t.isPaid && t.paidDate)
                ? parseDate(t.paidDate)
                : parseDate(t.date);

            if (!effectiveDate) return false;

            // Check if effective date falls within period
            return effectiveDate >= start && effectiveDate <= end;
        })
        .reduce((sum, t) => sum + (t.amount || 0), 0);
};

/**
 * Detect cross-period settlements (expenses from a different period that settled in current period)
 * Used for visual indicators in the dashboard
 * 
 * @param {object} transaction - The transaction to check
 * @param {string} currentPeriodStart - Current period start date
 * @param {string} currentPeriodEnd - Current period end date
 * @returns {object} { isCrossPeriod, originalPeriod, bucketName }
 */
export const detectCrossPeriodSettlement = (transaction, currentPeriodStart, currentPeriodEnd, allBudgets = []) => {
    // Only check expenses
    if (transaction.type !== 'expense') {
        return { isCrossPeriod: false };
    }

    // Only check paid transactions with Custom Budget assignment
    if (!transaction.isPaid || !transaction.paidDate || !transaction.customBudgetId) {
        return { isCrossPeriod: false };
    }

    const transactionDate = parseDate(transaction.date);
    const paidDate = parseDate(transaction.paidDate);
    const periodStart = parseDate(currentPeriodStart);
    const periodEnd = parseDate(currentPeriodEnd);

    if (!transactionDate || !paidDate || !periodStart || !periodEnd) {
        return { isCrossPeriod: false };
    }

    // Check if paid in current period but transaction date is outside
    const paidInCurrentPeriod = paidDate >= periodStart && paidDate <= periodEnd;
    const transactionOutsidePeriod = transactionDate < periodStart || transactionDate > periodEnd;

    if (paidInCurrentPeriod && transactionOutsidePeriod) {
        // Find the budget
        const budget = allBudgets.find(b => b.id === transaction.customBudgetId);

        // Determine original period (month/year of transaction date)
        const originalPeriod = transactionDate.toLocaleDateString('en-US', {
            month: 'short',
            year: 'numeric'
        });

        return {
            isCrossPeriod: true,
            originalPeriod,
            bucketName: budget ? budget.name : 'Unknown Budget',
            bucketType: 'CB',
            bucketId: budget ? budget.id : null
        };
    }

    return { isCrossPeriod: false };
};

/**
 * SYSTEM BUDGET MIGRATION: Handle paidDate changes for System Budget expenses
 * Implements the "Time Sticky" rule
 * 
 * @param {object} expense - The expense being updated
 * @param {string} newPaidDate - New paid date (YYYY-MM-DD)
 * @param {Array} allSystemBudgets - All System Budgets
 * @returns {object} Updated expense data with new bucketId
 */
export const migrateSystemBudgetOnDateChange = (expense, newPaidDate, allSystemBudgets) => {
    // Only apply to expenses with System Budget assignment
    if (!expense.customBudgetId) {
        return { customBudgetId: expense.customBudgetId }; // No change
    }

    // Find current bucket to determine its priority
    const currentBucket = allSystemBudgets.find(b => b.id === expense.customBudgetId);

    // If not a system budget, don't migrate (Custom Budget - Context Sticky)
    if (!currentBucket || currentBucket.isSystemBudget === false) {
        return { customBudgetId: expense.customBudgetId }; // No change
    }

    // Find target System Budget matching priority and the new paid date's month
    const newDate = parseDate(newPaidDate);
    if (!newDate) {
        return { customBudgetId: expense.customBudgetId }; // Invalid date, no change
    }

    const targetBucket = allSystemBudgets.find(b => {
        if (!b.systemBudgetType) return false;
        if (b.systemBudgetType !== currentBucket.systemBudgetType) return false;

        const bucketStart = parseDate(b.startDate);
        const bucketEnd = parseDate(b.endDate);

        if (!bucketStart || !bucketEnd) return false;

        // Check if new date falls within this bucket's period
        return newDate >= bucketStart && newDate <= bucketEnd;
    });

    return {
        customBudgetId: targetBucket ? targetBucket.id : expense.customBudgetId // Fallback to current if not found
    };
};

/**
 * Helper to check if a date falls within a period
 * @param {string} date - Date to check (YYYY-MM-DD)
 * @param {string} startDate - Period start
 * @param {string} endDate - Period end
 * @returns {boolean}
 */
export const isDateInPeriod = (date, startDate, endDate) => {
    const d = parseDate(date);
    const start = parseDate(startDate);
    const end = parseDate(endDate);

    if (!d || !start || !end) return false;

    return d >= start && d <= end;
};
