import { parseISO, differenceInCalendarMonths, differenceInWeeks, differenceInDays, addMonths, addWeeks, format } from 'date-fns';
import Decimal from 'decimal.js';

/**
 * Calculate the required contribution per period to reach a goal by deadline
 * @param {number} targetAmount - Goal target amount
 * @param {number} currentBalance - Current virtual balance
 * @param {string} deadline - ISO date string
 * @param {string} frequency - 'weekly', 'biweekly', or 'monthly'
 * @returns {Object} { requiredPerPeriod, periodsRemaining, isFeasible }
 */
export const calculateRequiredContribution = (targetAmount, currentBalance, deadline, frequency) => {
  const remaining = new Decimal(targetAmount).minus(currentBalance).toNumber();
  if (remaining <= 0) {
    return { requiredPerPeriod: 0, periodsRemaining: 0, isFeasible: true, remaining: 0 };
  }

  const now = new Date();
  const deadlineDate = parseISO(deadline);

  let periodsRemaining = 0;
  switch (frequency) {
    case 'weekly':
      periodsRemaining = Math.max(1, differenceInWeeks(deadlineDate, now));
      break;
    case 'biweekly':
      periodsRemaining = Math.max(1, Math.floor(differenceInWeeks(deadlineDate, now) / 2));
      break;
    case 'monthly':
    default:
      periodsRemaining = Math.max(1, differenceInCalendarMonths(deadlineDate, now));
      break;
  }

  const requiredPerPeriod = new Decimal(remaining).dividedBy(periodsRemaining).toNumber();

  return {
    requiredPerPeriod,
    periodsRemaining,
    remaining,
    isFeasible: periodsRemaining > 0 && deadlineDate > now
  };
};

/**
 * Calculate the planned contribution amount based on funding rule
 * @param {Object} fundingRule - { type, amount, percentage, frequency }
 * @param {number} monthlyIncome - User's monthly income
 * @returns {number} Planned contribution per period
 */
export const calculatePlannedContribution = (fundingRule, monthlyIncome) => {
  if (!fundingRule) return 0;

  let baseAmount = 0;
  if (fundingRule.type === 'fixed') {
    baseAmount = fundingRule.amount || 0;
  } else if (fundingRule.type === 'percentage') {
    baseAmount = new Decimal(monthlyIncome).times(fundingRule.percentage || 0).dividedBy(100).toNumber();
  }

  // Adjust for frequency (convert to per-period amount)
  switch (fundingRule.frequency) {
    case 'weekly':
      return new Decimal(baseAmount).dividedBy(4.33).toNumber(); // Average weeks per month
    case 'biweekly':
      return new Decimal(baseAmount).dividedBy(2.16).toNumber(); // Average biweekly periods per month
    case 'monthly':
    default:
      return baseAmount;
  }
};

/**
 * Perform feasibility audit: Can the user afford this goal?
 * @param {Object} goal - Goal object
 * @param {number} monthlyIncome - User's monthly income
 * @param {number} monthlyExpenses - User's monthly expenses
 * @param {number} existingGoalsCommitment - Total committed to other active goals
 * @returns {Object} Feasibility analysis result
 */
export const auditGoalFeasibility = (goal, monthlyIncome, monthlyExpenses, existingGoalsCommitment = 0) => {
  const actualSurplus = Math.max(0, new Decimal(monthlyIncome).minus(monthlyExpenses).minus(existingGoalsCommitment).toNumber());

  const { requiredPerPeriod, periodsRemaining, remaining, isFeasible: timelineFeasible } =
    calculateRequiredContribution(goal.target_amount, goal.virtual_balance || 0, goal.deadline, goal.funding_rule?.frequency || 'monthly');

  const plannedContribution = calculatePlannedContribution(goal.funding_rule, monthlyIncome);

  // Convert required to monthly for comparison
  let requiredMonthly = requiredPerPeriod;
  if (goal.funding_rule?.frequency === 'weekly') {
    requiredMonthly = new Decimal(requiredPerPeriod).times(4.33).toNumber(); requiredMonthly = requiredPerPeriod * 4.33;
  } else if (goal.funding_rule?.frequency === 'biweekly') {
    requiredMonthly = new Decimal(requiredPerPeriod).times(2.16).toNumber();
  }

  const gap = new Decimal(requiredMonthly).minus(plannedContribution).toNumber();
  const surplusAfterGoal = new Decimal(actualSurplus).minus(plannedContribution).toNumber();

  const fundingFeasible = plannedContribution <= actualSurplus && plannedContribution >= requiredMonthly;

  return {
    isFeasible: timelineFeasible && fundingFeasible,
    timelineFeasible,
    fundingFeasible,
    actualSurplus,
    requiredMonthly,
    plannedContribution,
    gap,
    surplusAfterGoal,
    periodsRemaining,
    remaining,
    status: fundingFeasible ? 'on_track' : gap > 0 ? 'funding_gap' : 'overfunded'
  };
};

/**
 * Calculate goal progress percentage
 * @param {number} currentBalance - Current virtual balance
 * @param {number} targetAmount - Target amount
 * @returns {number} Progress percentage (0-100)
 */
export const calculateGoalProgress = (currentBalance, targetAmount) => {
  if (targetAmount <= 0) return 0;
  return Math.min(100, new Decimal(currentBalance).dividedBy(targetAmount).times(100).toNumber());
};

/**
 * Generate projected completion date based on current funding rule
 * @param {Object} goal - Goal object
 * @param {number} monthlyIncome - User's monthly income
 * @returns {Date|null} Projected completion date
 */
export const projectCompletionDate = (goal, monthlyIncome) => {
  const plannedContribution = calculatePlannedContribution(goal.funding_rule, monthlyIncome);
  if (plannedContribution <= 0) return null;

  const remaining = goal.target_amount - (goal.virtual_balance || 0);
  if (remaining <= 0) return new Date(); // Already complete

  const periodsNeeded = Math.ceil(remaining / plannedContribution);
  const now = new Date();

  switch (goal.funding_rule?.frequency) {
    case 'weekly':
      return addWeeks(now, periodsNeeded);
    case 'biweekly':
      return addWeeks(now, periodsNeeded * 2);
    case 'monthly':
    default:
      return addMonths(now, periodsNeeded);
  }
};

/**
 * Calculate next deposit date based on frequency
 * @param {Object} goal - Goal object
 * @returns {Date} Next scheduled deposit date
 */
export const calculateNextDepositDate = (goal) => {
  const now = new Date();
  const lastDeposit = goal.ledger_history && goal.ledger_history.length > 0
    ? parseISO(goal.ledger_history[goal.ledger_history.length - 1].timestamp)
    : now;

  switch (goal.funding_rule?.frequency) {
    case 'weekly':
      return addWeeks(lastDeposit, 1);
    case 'biweekly':
      return addWeeks(lastDeposit, 2);
    case 'monthly':
    default:
      return addMonths(lastDeposit, 1);
  }
};

/**
 * Check if a goal needs settlement (deposit confirmation)
 * @param {Object} goal - Goal object
 * @returns {boolean} True if settlement is due
 */
export const needsSettlement = (goal) => {
  if (goal.status !== 'active') return false;

  const nextDeposit = calculateNextDepositDate(goal);
  return new Date() >= nextDeposit;
};

/**
 * Format goal period identifier
 * @param {string} frequency - Funding frequency
 * @param {Date} date - Date for the period
 * @returns {string} Period identifier (e.g., '2026-02', '2026-W08')
 */
export const formatGoalPeriod = (frequency, date = new Date()) => {
  switch (frequency) {
    case 'weekly':
    case 'biweekly':
      return format(date, "yyyy-'W'II");
    case 'monthly':
    default:
      return format(date, 'yyyy-MM');
  }
};