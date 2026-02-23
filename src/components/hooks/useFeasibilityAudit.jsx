import { useMemo } from 'react';
import { auditGoalFeasibility, calculatePlannedContribution } from '../utils/goalCalculations';
import { useMonthlyIncome, useDashboardSummary } from './useDerivedData';

/**
 * Hook to perform real-time feasibility audit for goals
 * @param {Object} goal - Goal object to audit
 * @param {Array} transactions - All transactions
 * @param {number} selectedMonth - Current selected month
 * @param {number} selectedYear - Current selected year
 * @returns {Object} Feasibility analysis with status and recommendations
 */
export const useGoalsFeasibility = (
  displayedGoals,
  allGoals,
  transactions,
  selectedMonth,
  selectedYear
) => {
  const monthlyIncome = useMonthlyIncome(transactions, selectedMonth, selectedYear);

  const { currentMonthExpenses } = useDashboardSummary(
    transactions,
    selectedMonth,
    selectedYear,
    [], // customBudgets
    [], // systemBudgets
    [], // categories
    {} // settings
  );

  return useMemo(() => {
    if (!displayedGoals || displayedGoals.length === 0) return [];

    // We need all active goals to accurately subtract existing commitments
    const activeGoals = (allGoals || []).filter(g => g.status === 'active');

    return displayedGoals.map(goal => {
      if (goal.status !== 'active' || !goal.funding_rule) {
        return { goal, feasibility: null };
      }

      // Calculate total commitment to other active goals
      const existingCommitment = activeGoals
        .filter(g => g.id !== goal.id)
        .reduce((sum, g) => {
          return sum + calculatePlannedContribution(g.funding_rule, monthlyIncome);
        }, 0);

      const audit = auditGoalFeasibility(
        goal,
        monthlyIncome,
        currentMonthExpenses,
        existingCommitment
      );

      // Generate user-friendly message
      let message = '';
      let recommendation = '';

      if (!audit.timelineFeasible) {
        message = 'Deadline has passed or insufficient time remaining';
        recommendation = 'Consider extending the deadline';
      } else if (audit.status === 'on_track') {
        message = 'Goal is fully funded and on track';
        recommendation = 'Keep up the great work!';
      } else if (audit.status === 'funding_gap') {
        const gapPercentage = ((audit.gap / audit.requiredMonthly) * 100).toFixed(0);
        message = `Funding gap of ${gapPercentage}% detected`;
        recommendation = `Increase contribution by ${Math.abs(audit.gap).toFixed(2)} or extend deadline`;
      } else if (audit.status === 'overfunded') {
        message = 'Contributing more than required';
        recommendation = 'Goal will be reached ahead of schedule';
      }

      return {
        goal,
        feasibility: {
          ...audit,
          message,
          recommendation,
          existingCommitment
        }
      };
    });
  }, [displayedGoals, allGoals, monthlyIncome, currentMonthExpenses]);
};