/**
 * @file Budget Initialization Utilities
 * @description Centralizes the creation and validation of SystemBudget entities.
 * @created 17-Jan-2026
 * 
 * CRITICAL: This is the SINGLE SOURCE OF TRUTH for creating SystemBudget entities.
 * All code that needs to create or ensure SystemBudgets exist must call ensureSystemBudgetsExist.
 * This prevents duplicate budgets and ensures consistency across the application.
 */

import { base44 } from "@/api/base44Client";

/**
 * Ensures SystemBudget entities exist for a given user, month, and priority types.
 * This function is the SINGLE SOURCE OF TRUTH for creating system budgets.
 * It prevents duplicate budgets by checking existence before creation.
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

    for (const priorityType of priorityTypes) {
        // CRITICAL: Check if a SystemBudget already exists for this user, month, and priority
        // This prevents duplicate budgets
        const existing = await base44.entities.SystemBudget.filter({
            user_email: userEmail,
            systemBudgetType: priorityType,
            startDate: startDate,
            endDate: endDate
        });

        if (existing && existing.length > 0) {
            // Budget already exists - use the first one (should only be one)
            // If multiple exist (data integrity issue), we still return the first
            results[priorityType] = existing[0];
        } else {
            // Create a new SystemBudget
            const goal = budgetGoals.find(g => g.priority === priorityType);
            let budgetAmount = 0;

            // Calculate initial budget amount based on mode and available data
            if (settings.goalMode === false && goal) {
                // Absolute mode: Use the target amount directly
                budgetAmount = goal.target_amount || 0;
            } else if (goal && monthlyIncome > 0) {
                // Percentage mode: Calculate based on income and percentage
                budgetAmount = (monthlyIncome * (goal.target_percentage || 0)) / 100;
            } else if (goal) {
                // If we have a goal but no income yet, use the percentage with 0 income
                // This creates the budget structure even if there's no income yet
                budgetAmount = 0;
            }
            // If no goal exists at all, budgetAmount remains 0 (default budget)

            const newBudget = await base44.entities.SystemBudget.create({
                name: nameMap[priorityType],
                budgetAmount,
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