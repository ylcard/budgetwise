/**
 * @file Budget Initialization Utilities
 * @description Centralizes the creation and validation of SystemBudget entities.
 * @created 17-Jan-2026
 * @updated 05-Feb-2026 - ADDED: getOrCreateSystemBudgetForTransaction helper function
 * 
 * CRITICAL: This is the SINGLE SOURCE OF TRUTH for creating SystemBudget entities.
 * All code that needs to create or ensure SystemBudgets exist must call ensureSystemBudgetsExist.
 * This prevents duplicate budgets and ensures consistency across the application.
 */

import { base44 } from "@/api/base44Client";
import { getMonthBoundaries } from "./dateUtils";
import { FINANCIAL_PRIORITIES } from "./constants";
import { resolveBudgetLimit } from "./financialCalculations";
import { format, parseISO, isValid, addMonths, startOfMonth, endOfMonth } from "date-fns";

// In-memory lock to prevent race conditions during concurrent budget creation
const inFlightRequests = new Map();


/**
 * Helper to ensure consistent date strings (YYYY-MM-DD)
 * Handles both Date objects and strings.
 */
const normalizeDate = (dateInput) => {
    if (!dateInput) return null;
    try {
        const date = typeof dateInput === 'string' ? parseISO(dateInput) : dateInput;
        if (!isValid(date)) return null;
        return format(date, 'yyyy-MM-dd');
    } catch (e) { return null; }
};

/**
 * ADDED 05-Feb-2026: Helper function to get or create a SystemBudget for a specific transaction.
 * This is the PRIMARY function to use when adding/importing transactions.
 * 
 * @param {string} userEmail - User's email address
 * @param {string} transactionDate - Transaction date (or paidDate for expenses) in YYYY-MM-DD format
 * @param {string} financialPriority - 'needs' or 'wants'
 * @param {Array} budgetGoals - Array of BudgetGoal entities (for initial amounts)
 * @param {Object} settings - App settings (for calculating initial amounts)
 * @param {number} monthlyIncome - Monthly income for the period (optional)
 * @param {Object} options - Options for the operation
 * @param {boolean} options.allowUpdates - Whether to update existing budgets if amounts changed
 * @param {number} options.historicalAverage - Average income for Inflation Protection logic
 * @returns {Promise<string>} The ID of the existing or newly created SystemBudget
 */
export const getOrCreateSystemBudgetForTransaction = async (
    userEmail,
    transactionDate,
    financialPriority,
    budgetGoals = [],
    settings = {},
    monthlyIncome = 0,
    options = { allowUpdates: false, historicalAverage: 0 }
) => {
    if (!userEmail || !transactionDate || !financialPriority) {
        throw new Error('getOrCreateSystemBudgetForTransaction: userEmail, transactionDate, and financialPriority are required');
    }

    // Extract month/year from transaction date
    const date = new Date(transactionDate);
    const { monthStart, monthEnd } = getMonthBoundaries(date.getMonth(), date.getFullYear());

    // Ensure system budgets exist for this month, passing through options
    const budgets = await ensureSystemBudgetsExist(
        userEmail,
        monthStart,
        monthEnd,
        budgetGoals,
        settings,
        monthlyIncome,
        options
    );

    // Return the ID of the specific budget for this priority
    return budgets[financialPriority]?.id || null;
};

/**
 * Ensures SystemBudget entities exist for a given user, month, and priority types.
 * This function is the SINGLE SOURCE OF TRUTH for creating system budgets.
 * It prevents duplicate budgets by checking existence before creation and using bulk operations.
 * 
 * OPTIMIZATION 17-Jan-2026: Fetches all existing budgets in a single query to prevent race conditions.
 * 
 * USAGE SCENARIOS:
 * 1. When a user adds their first expense/income for a new month
 * 2. When updating system budgets (call this before update)
 * 3. When calculating budget statistics for a month with no budgets yet
 * 4. On initial user setup or goal configuration
 * 
 * @param {string} userEmail - User's email address
 * @param {string} startDate - First day of the month (YYYY-MM-DD)
 * @param {string} endDate - Last day of the month (YYYY-MM-DD)
 * @param {Array} budgetGoals - Array of BudgetGoal entities (optional, for initial amounts)
 * @param {Object} settings - App settings (optional, for calculating initial amounts)
 * @param {number} monthlyIncome - Monthly income for the period (optional, for percentage-based calculation)
 * @param {Object} options - Options for the operation
 * @param {boolean} options.allowUpdates - Whether to update existing budgets if amounts changed
 * @param {number} options.historicalAverage - Average income for Inflation Protection logic
 * @returns {Promise<Object>} Object with budgets by type: { needs: Budget, wants: Budget }
 */
export const ensureSystemBudgetsExist = async (
    userEmail,
    startDateRaw,
    endDateRaw,
    budgetGoals = [],
    settings = {},
    monthlyIncome = 0,
    options = {}
) => {
    const startDate = normalizeDate(startDateRaw);
    const endDate = normalizeDate(endDateRaw);

    if (!userEmail || !startDate || !endDate) return {};

    // Destructure options with defaults to ensure properties aren't undefined if the object is partially provided
    const { allowUpdates = false, historicalAverage = 0 } = options;

    // 1. Create a unique key for this specific user and month
    const lockKey = `${userEmail}:${startDate}`;

    // 2. If a request for this month is already in flight, return that promise
    if (inFlightRequests.has(lockKey)) {
        return inFlightRequests.get(lockKey);
    }

    // 3. Define the work as a self-executing async promise
    const work = (async () => {
        try {
            const priorityTypes = ['needs', 'wants'];
            const results = {};
            const toCreate = [];
            const toUpdate = [];

            // CRITICAL OPTIMIZATION: Fetch all existing budgets for the given month and user in a single query
            const existingBudgetsForMonth = await base44.entities.SystemBudget.filter({
                user_email: userEmail,
                startDate: startDate
            });

            // Map for O(1) lookup
            const budgetMap = new Map();
            existingBudgetsForMonth.forEach(b => budgetMap.set(b.systemBudgetType, b));

            for (const type of priorityTypes) {
                const existing = budgetMap.get(type);
                const goal = budgetGoals.find(g => g.priority === type);

                // RESPECT goalMode: true = percentage, false = absolute
                const isPercentageMode = settings?.goalMode !== false;
                let amount = 0;

                if (!isPercentageMode && goal?.target_amount > 0) {
                    amount = goal.target_amount;
                } else {
                    amount = resolveBudgetLimit(goal, monthlyIncome, settings, historicalAverage);
                }

                if (existing) {
                    // FORCE update if income/goals changed OR if initialization is needed
                    const isUninitialized = existing.budgetAmount === 0 && amount > 0;
                    const needsUpdate = (allowUpdates || isUninitialized) &&
                        Math.abs(existing.budgetAmount - amount) > 0.01;

                    if (needsUpdate) {
                        toUpdate.push({
                            id: existing.id,
                            data: {
                                budgetAmount: amount,
                                target_percentage: goal?.target_percentage || 0,
                                target_amount: goal?.target_amount || 0
                            }
                        });
                    }
                    results[type] = existing; // Return existing for now, will update memory if needed
                } else {
                    // Queue for Bulk Creation
                    toCreate.push({
                        name: FINANCIAL_PRIORITIES[type].label,
                        budgetAmount: amount,
                        startDate,
                        endDate,
                        color: FINANCIAL_PRIORITIES[type].color,
                        user_email: userEmail,
                        systemBudgetType: type,
                        target_percentage: goal?.target_percentage || 0,
                        target_amount: goal?.target_amount || 0
                    });
                }
            }

            // 4. Execute Writes (Parallel / Bulk)
            const promises = [];

            // A. Bulk Create (Atomic-ish)
            if (toCreate.length > 0) {
                promises.push(
                    base44.entities.SystemBudget.bulkCreate(toCreate).then(created => {
                        created.forEach(b => results[b.systemBudgetType] = b);
                    })
                );
            }

            // B. Updates (Parallel)
            if (toUpdate.length > 0) {
                // Batch update if API supports it, otherwise Promise.all
                const updatePromises = toUpdate.map(({ id, data }) =>
                    base44.entities.SystemBudget.update(id, data).then(updated => {
                        results[updated.systemBudgetType] = updated;
                    })
                );
                promises.push(Promise.all(updatePromises));
            }

            await Promise.all(promises);
            return results;

        } finally {
            // 4. Always clean up the lock when the work is finished (success or error)
            inFlightRequests.delete(lockKey);
        }
    })();

    // 5. Register the promise in the lock map so other callers can wait for it
    inFlightRequests.set(lockKey, work);
    return work;
};

/**
 * NEW: Bulk Sync Future Budgets
 * Fetches next 12 months, identifies missing vs existing, and performs bulk ops.
 * This guarantees NO duplicates and minimizes requests.
 */
export const snapshotFutureBudgets = async (updatedGoal, settings, userEmail, allGoals = []) => {
    if (!userEmail || !settings) return;

    const now = new Date();
    const monthsToSync = 12;
    const requiredBudgets = [];

    for (let i = 0; i < monthsToSync; i++) {
        const date = addMonths(now, i);
        const start = format(startOfMonth(date), 'yyyy-MM-dd');
        const end = format(endOfMonth(date), 'yyyy-MM-dd');
        ['needs', 'wants'].forEach(type => requiredBudgets.push({ start, end, type }));
    }

    const startOfRange = requiredBudgets[0].start;
    const existingBudgets = await base44.entities.SystemBudget.filter({
        user_email: userEmail,
        startDate: { $gte: startOfRange }
    });

    const budgetMap = new Map();
    existingBudgets.forEach(b => budgetMap.set(`${b.startDate}|${b.systemBudgetType}`, b));

    const toCreate = [];
    const toUpdate = [];

    requiredBudgets.forEach(req => {
        const existing = budgetMap.get(`${req.start}|${req.type}`);
        const goal = allGoals.find(g => g.priority === req.type);

        // Consistent Logic: Use Absolute mode if goalMode is false
        const isPercentageMode = settings?.goalMode !== false;
        let amount = 0;

        if (!isPercentageMode && goal?.target_amount > 0) {
            amount = goal.target_amount;
        } else {
            amount = resolveBudgetLimit(goal, 0, settings, 0);
        }

        if (existing) {
            if (Math.abs(existing.budgetAmount - amount) > 0.01) {
                toUpdate.push({
                    id: existing.id,
                    data: {
                        budgetAmount: amount,
                        target_percentage: goal?.target_percentage || 0,
                        target_amount: goal?.target_amount || 0
                    }
                });
            }
        } else {
            toCreate.push({
                name: FINANCIAL_PRIORITIES[req.type].label,
                budgetAmount: amount,
                startDate: req.start,
                endDate: req.end,
                color: FINANCIAL_PRIORITIES[req.type].color,
                user_email: userEmail,
                systemBudgetType: req.type,
                target_percentage: goal?.target_percentage || 0,
                target_amount: goal?.target_amount || 0
            });
        }
    });

    if (toCreate.length > 0) await base44.entities.SystemBudget.bulkCreate(toCreate);

    if (toUpdate.length > 0) {
        // Simple chunking for updates to avoid overwhelming connection pool if needed
        const chunkSize = 20;
        for (let i = 0; i < toUpdate.length; i += chunkSize) {
            await Promise.all(toUpdate.slice(i, i + chunkSize).map(u =>
                base44.entities.SystemBudget.update(u.id, u.data)
            ));
        }
    }
};


/**
 * REPAIR UTILITY: Ensures system budgets exist for any past month that has transactions.
 * This handles the "deleted by accident" scenario by restoring budgets only where needed.
 * @param {string} userEmail
 * @param {Array} budgetGoals - Current goals to use for initialization
 * @param {Object} settings 
 */
export const ensureBudgetsForActiveMonths = async (userEmail, budgetGoals = [], settings = {}) => {
    if (!userEmail) return;

    // 1. Fetch ALL transactions and ALL existing budgets for this user in parallel
    const [transactions, existingBudgets] = await Promise.all([
        base44.entities.Transaction.filter({ created_by: userEmail }),
        base44.entities.SystemBudget.filter({ user_email: userEmail })
    ]);

    // 2. Identify unique months from transactions
    const activeMonths = new Set();
    transactions.forEach(t => {
        const d = t.date || t.paidDate;
        if (d) {
            const dateObj = typeof d === 'string' ? parseISO(d) : d;
            if (isValid(dateObj)) activeMonths.add(format(dateObj, 'yyyy-MM-01'));
        }
    });

    // 3. Map existing budgets for O(1) lookup: "YYYY-MM-DD|type"
    const budgetMap = new Set(existingBudgets.map(b => `${b.startDate}|${b.systemBudgetType}`));

    // 4. Determine which budgets are missing
    const toCreate = [];
    const priorityTypes = ['needs', 'wants'];

    activeMonths.forEach(monthDate => {
        const date = parseISO(monthDate);
        const { monthStart, monthEnd } = getMonthBoundaries(date.getMonth(), date.getFullYear());

        priorityTypes.forEach(type => {
            if (!budgetMap.has(`${monthStart}|${type}`)) {
                const goal = budgetGoals.find(g => g.priority === type);

                // Consistent Logic: Use Absolute mode if goalMode is false
                const isPercentageMode = settings?.goalMode !== false;
                let amount = 0;

                if (!isPercentageMode && goal?.target_amount > 0) {
                    amount = goal.target_amount;
                } else {
                    amount = resolveBudgetLimit(goal, 0, settings, 0);
                }

                toCreate.push({
                    name: FINANCIAL_PRIORITIES[type].label,
                    budgetAmount: amount,
                    startDate: monthStart,
                    endDate: monthEnd,
                    color: FINANCIAL_PRIORITIES[type].color,
                    user_email: userEmail,
                    systemBudgetType: type,
                    target_percentage: goal?.target_percentage || 0,
                    target_amount: goal?.target_amount || 0
                });
            }
        });
    });

    // 5. Single Bulk Write
    if (toCreate.length > 0) {
        await base44.entities.SystemBudget.bulkCreate(toCreate);
    }
};

/**
 * REPAIR UTILITY: Links orphaned transactions to their correct SystemBudget.
 * Should be run AFTER ensureBudgetsForActiveMonths to ensure targets exist.
 * @param {string} userEmail 
 * @returns {Promise<number>} Number of transactions updated
 */
export const reconcileTransactionBudgets = async (userEmail) => {
    if (!userEmail) return 0;

    const [transactions, budgets] = await Promise.all([
        base44.entities.Transaction.filter({ created_by: userEmail }),
        base44.entities.SystemBudget.filter({ user_email: userEmail })
    ]);

    // Create a Lookup Map: "YYYY-MM-priority" -> budgetId
    const budgetMap = new Map();
    budgets.forEach(b => {
        const key = `${b.startDate.substring(0, 7)}-${b.systemBudgetType}`;
        budgetMap.set(key, b.id);
    });

    const updates = [];
    for (const t of transactions) {
        // Check if budget is missing OR if the linked budget ID no longer exists in our fetch
        const isOrphaned = !t.budgetId || (t.budgetId && !budgets.some(b => b.id === t.budgetId));

        if (isOrphaned) {
            const d = t.date || t.paidDate;
            const priority = t.financialPriority; // 'needs' or 'wants'

            if (d && priority) {
                const dateObj = typeof d === 'string' ? parseISO(d) : d;
                const dateKey = format(dateObj, 'yyyy-MM');
                const targetKey = `${dateKey}-${priority}`;
                const correctBudgetId = budgetMap.get(targetKey);

                // Only update if we found a valid destination budget
                if (correctBudgetId) {
                    updates.push(base44.entities.Transaction.update(t.id, { budgetId: correctBudgetId }));
                }
            }
        }
    }

    if (updates.length > 0) {
        // Process in parallel
        await Promise.all(updates);
    }

    return updates.length;
};
