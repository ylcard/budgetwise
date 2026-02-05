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
import { resolveBudgetLimit } from "./financialCalculations";
import { getMonthBoundaries } from "./dateUtils";

/**
 * ADDED 05-Feb-2026: Helper function to get or create a SystemBudget for a specific transaction.
 * This is the PRIMARY function to use when adding/importing transactions.
 * 
 * @param {string} userEmail - User's email address
 * @param {string} transactionDate - Transaction date (or paidDate for expenses) in YYYY-MM-DD format
 * @param {string} financialPriority - 'needs', 'wants', or 'savings'
 * @param {Array} budgetGoals - Array of BudgetGoal entities (for initial amounts)
 * @param {Object} settings - App settings (for calculating initial amounts)
 * @param {number} monthlyIncome - Monthly income for the period (optional)
 * @returns {Promise<string>} The ID of the existing or newly created SystemBudget
 */
export const getOrCreateSystemBudgetForTransaction = async (
    userEmail,
    transactionDate,
    financialPriority,
    budgetGoals = [],
    settings = {},
    monthlyIncome = 0
) => {
    if (!userEmail || !transactionDate || !financialPriority) {
        throw new Error('getOrCreateSystemBudgetForTransaction: userEmail, transactionDate, and financialPriority are required');
    }

    // Extract month/year from transaction date
    const date = new Date(transactionDate);
    const { monthStart, monthEnd } = getMonthBoundaries(date.getMonth(), date.getFullYear());

    // Ensure all three system budgets exist for this month
    const budgets = await ensureSystemBudgetsExist(
        userEmail,
        monthStart,
        monthEnd,
        budgetGoals,
        settings,
        monthlyIncome
    );

    // Return the ID of the specific budget for this priority
    return budgets[financialPriority]?.id || null;
};

/**
 * Ensures SystemBudget entities exist for a given user, month, and priority types.
 * This function is the SINGLE SOURCE OF TRUTH for creating system budgets.
 * It prevents duplicate budgets by checking existence before creation.
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
 * @returns {Promise<Object>} Object with budgets by type: { needs: Budget, wants: Budget, savings: Budget }
 */
export const ensureSystemBudgetsExist = async (
    userEmail,
    startDate,
    endDate,
    budgetGoals = [],
    settings = {},
    monthlyIncome = 0
) => {
    if (!userEmail || !startDate || !endDate) {
        throw new Error('ensureSystemBudgetsExist: userEmail, startDate, and endDate are required');
    }

    const priorityTypes = ['needs', 'wants', 'savings'];
    const results = {};

    // Color and name mappings for system budgets
    const colorMap = {
        needs: '#EF4444',
        wants: '#F59E0B',
        savings: '#10B981'
    };

    const nameMap = {
        needs: 'Needs',
        wants: 'Wants',
        savings: 'Savings'
    };

    // CRITICAL OPTIMIZATION: Fetch all existing budgets for the given month and user in a single query
    // This prevents race conditions during concurrent operations
    const existingBudgetsForMonth = await base44.entities.SystemBudget.filter({
        user_email: userEmail,
        startDate: startDate,
        endDate: endDate
    });

    for (const priorityType of priorityTypes) {
        const existingForThisPriority = existingBudgetsForMonth.find(
            (b) => b.systemBudgetType === priorityType
        );

        if (existingForThisPriority) {
            // Budget already exists - use it
            results[priorityType] = existingForThisPriority;
        } else {
            // Create a new SystemBudget
            const goal = budgetGoals.find(g => g.priority === priorityType);
            // If income is 0, the limit is 0 (or the absolute amount if in absolute mode)
            const budgetAmount = resolveBudgetLimit(goal, monthlyIncome || 0, settings);

            const newBudget = await base44.entities.SystemBudget.create({
                name: nameMap[priorityType],
                budgetAmount: parseFloat((budgetAmount || 0).toFixed(2)),
                startDate,
                endDate,
                color: colorMap[priorityType],
                user_email: userEmail,
                systemBudgetType: priorityType,
                cashAllocations: [],
                // Store the goal data for reference if available
                target_percentage: goal?.target_percentage || 0,
                target_amount: goal?.target_amount || 0
            });

            results[priorityType] = newBudget;
        }
    }

    return results;
};