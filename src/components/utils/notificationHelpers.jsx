import { base44 } from '@/api/base44Client';
import { getMonthName } from './dateUtils';

/**
 * CREATED 14-Feb-2026: Centralized notification creation helpers
 * Any feature can use these to create standardized notifications
 */

/**
 * Create a generic notification
 * @param {object} params
 * @param {string} params.title - Notification title
 * @param {string} params.message - Body text
 * @param {'info'|'success'|'warning'|'error'|'action'|'story'} [params.type='info'] - Visual style
 * @param {string} params.category - System category (e.g., 'budgets', 'bank_sync')
 * @param {'low'|'medium'|'high'|'urgent'} [params.priority='medium'] - Importance level
 * @param {string|null} [params.actionUrl] - Internal route to navigate to
 * @param {string|null} [params.actionLabel] - Button text
 * @param {object} [params.metadata] - Extra data for logic/analytics
 * @param {string|null} [params.expiresAt] - ISO Date string for auto-dismissal
 * @param {string} params.userEmail - User identifier
 * @returns {Promise<object|null>} The created notification object or null
 */
export const createNotification = async ({
  title,
  message,
  type = 'info',
  category,
  priority = 'medium',
  actionUrl = null,
  actionLabel = null,
  metadata = {},
  expiresAt = null,
  userEmail
}) => {
  try {
    return await base44.entities.Notification.create({
      title,
      message,
      type,
      category,
      priority,
      actionUrl,
      actionLabel,
      metadata,
      expiresAt,
      user_email: userEmail,
      isRead: false,
      isDismissed: false
    });
  } catch (error) {
    console.error('Failed to create notification:', error);
    return null;
  }
};

/**
 * Bank Sync Notifications
 * @param {string} userEmail
 * @param {number} transactionCount
 * @param {string} [dateStr='today']
 * @returns {Promise<object|null>}
 */
export const notifyBankSyncSuccess = (userEmail, transactionCount, dateStr = 'today') => {
  return createNotification({
    title: 'Bank Sync Complete',
    message: `${transactionCount} new transaction${transactionCount !== 1 ? 's' : ''} were synced on ${dateStr}.`,
    type: 'success',
    category: 'bank_sync',
    priority: 'low',
    actionUrl: '/transactions/history',
    actionLabel: 'View Transactions',
    metadata: { transactionCount, date: dateStr },
    userEmail
  });
};

/**
 * @param {string} userEmail
 * @param {number} totalCount
 * @param {number} reviewCount
 * @param {string} [dateStr='today']
 * @returns {Promise<object|null>}
 */
export const notifyBankSyncWithReviews = (userEmail, totalCount, reviewCount, dateStr = 'today') => {
  // Grammar logic: 
  // 1. "transaction" vs "transactions"
  // 2. "needs review" (singular) vs "need review" (plural)
  const txLabel = totalCount === 1 ? 'transaction' : 'transactions';
  const reviewVerb = reviewCount === 1 ? 'needs' : 'need';

  return createNotification({
    title: 'Review Required',
    message: `Synced ${totalCount} ${txLabel} (${reviewCount} ${reviewVerb} review) on ${dateStr}.`,
    type: 'action',
    category: 'bank_sync',
    priority: 'high',
    actionUrl: '/BankSync',
    actionLabel: 'Review Now',
    metadata: { totalCount, reviewCount, date: dateStr },
    userEmail
  });
};

/**
 * @param {string} userEmail
 * @param {string} errorMessage
 * @returns {Promise<object|null>}
 */
export const notifyBankSyncError = (userEmail, errorMessage) => {
  return createNotification({
    title: 'Bank Sync Failed',
    message: `Unable to sync transactions: ${errorMessage}`,
    type: 'error',
    category: 'bank_sync',
    priority: 'high',
    actionUrl: '/manage/banksync',
    actionLabel: 'Check Connection',
    userEmail
  });
};

/**
 * @param {string} userEmail
 * @param {string} bankName
 * @param {number} daysLeft
 * @returns {Promise<object|null>}
 */
export const notifyBankTokenExpiring = (userEmail, bankName, daysLeft) => {
  return createNotification({
    title: 'Bank Connection Expiring',
    message: `Your connection to ${bankName} will expire in ${daysLeft} days. Reconnect to continue automatic sync.`,
    type: 'warning',
    category: 'bank_sync',
    priority: 'high',
    actionUrl: '/manage/banksync',
    actionLabel: 'Reconnect Now',
    metadata: { bankName, daysLeft },
    userEmail
  });
};

/**
 * Budget Notifications
 */

/**
 * @param {string} userEmail
 * @param {string} budgetName
 * @param {number} percentage
 */
export const notifyBudgetExceeded = (userEmail, budgetName, percentage) => {
  return createNotification({
    title: 'Budget Alert',
    message: `You've spent ${percentage.toFixed(0)}% of your "${budgetName}" budget.`,
    type: 'warning',
    category: 'budgets',
    priority: percentage >= 100 ? 'urgent' : 'high',
    actionUrl: '/budgets',
    actionLabel: 'Review Budget',
    metadata: { budgetName, percentage },
    userEmail
  });
};

/**
 * @param {string} userEmail
 * @param {string} budgetName
 * @param {string|number} remaining - Currency formatted string or number
 */
export const notifyBudgetLowFunds = (userEmail, budgetName, remaining) => {
  return createNotification({
    title: 'Low Budget Funds',
    message: `Only ${remaining} remaining in "${budgetName}".`,
    type: 'warning',
    category: 'budgets',
    priority: 'medium',
    actionUrl: '/budgets',
    actionLabel: 'View Details',
    metadata: { budgetName, remaining },
    userEmail
  });
};

/**
 * Transaction Notifications
 */

/**
 * @param {string} userEmail
 * @param {number} count
 */
export const notifyTransactionsNeedReview = (userEmail, count) => {
  return createNotification({
    title: 'Review Required',
    message: `${count} transaction${count !== 1 ? 's' : ''} need${count === 1 ? 's' : ''} your review for accurate categorization.`,
    type: 'action',
    category: 'transactions',
    priority: 'medium',
    actionUrl: '/BankSync',
    actionLabel: 'Review Now',
    metadata: { count },
    userEmail
  });
};

/**
 * @param {string} userEmail
 * @param {number} count
 */
export const notifyDuplicateDetected = (userEmail, count) => {
  return createNotification({
    title: 'Possible Duplicates',
    message: `We detected ${count} potential duplicate transaction${count !== 1 ? 's' : ''}.`,
    type: 'warning',
    category: 'transactions',
    priority: 'high',
    actionUrl: '/transactions/history',
    actionLabel: 'Review Duplicates',
    metadata: { count },
    userEmail
  });
};

/**
 * System Notifications
 */

/**
 * @param {string} userEmail
 * @param {string} setupType
 */
export const notifySystemSetupRequired = (userEmail, setupType) => {
  return createNotification({
    title: 'Setup Required',
    message: `Complete your ${setupType} setup to unlock full app functionality.`,
    type: 'info',
    category: 'system',
    priority: 'high',
    actionUrl: '/manage/preferences',
    actionLabel: 'Complete Setup',
    metadata: { setupType },
    userEmail
  });
};

/**
 * @param {string} userEmail
 * @param {string} filename
 */
export const notifyDataExportReady = (userEmail, filename) => {
  return createNotification({
    title: 'Export Complete',
    message: `Your data export "${filename}" is ready for download.`,
    type: 'success',
    category: 'system',
    priority: 'low',
    metadata: { filename },
    userEmail
  });
};

/**
 * Goal Notifications
 */

/**
 * @param {string} userEmail
 * @param {string} goalType
 * @param {number} percentage
 */
export const notifyGoalAchieved = (userEmail, goalType, percentage) => {
  return createNotification({
    title: 'Goal Achieved! 🎉',
    message: `You've reached ${percentage}% of your ${goalType} savings goal this month.`,
    type: 'success',
    category: 'goals',
    priority: 'low',
    actionUrl: '/reports',
    actionLabel: 'View Report',
    metadata: { goalType, percentage },
    userEmail
  });
};

/**
 * @param {string} userEmail
 * @param {string} goalType
 * @param {string|number} shortfall
 */
export const notifyGoalAtRisk = (userEmail, goalType, shortfall) => {
  return createNotification({
    title: 'Savings Goal at Risk',
    message: `You're ${shortfall} short of your ${goalType} goal. Adjust spending to stay on track.`,
    type: 'warning',
    category: 'goals',
    priority: 'medium',
    actionUrl: '/reports',
    actionLabel: 'Review Goals',
    metadata: { goalType, shortfall },
    userEmail
  });
};

/**
 * Report/Story Notifications
 */

/**
 * @param {string} userEmail
 * @param {number} monthIndex - 0-11
 * @param {number} year
 */
export const notifyMonthlyRewindReady = (userEmail, monthIndex, year) => {
  // Get full month name for the message
  const monthName = getMonthName(monthIndex);

  return createNotification({
    title: `${monthName} Rewind Ready 🎬`,
    message: `Your financial story for ${monthName} is ready. See your highlights!`,
    type: 'story',
    category: 'reports',
    priority: 'low',
    actionUrl: `/?story=true&month=${monthIndex}&year=${year}`, // Deep link to Dashboard
    actionLabel: 'Watch Story',
    metadata: { monthIndex, year },
    userEmail
  });
};

/**
 * Batch notification cleanup
 * @param {string} userEmail
 * @returns {Promise<number>} Number of dismissed notifications
 */
export const dismissExpiredNotifications = async (userEmail) => {
  try {
    const expired = await base44.entities.Notification.filter({
      user_email: userEmail,
      expiresAt: { $lte: new Date().toISOString() },
      isDismissed: false
    });

    if (expired.length > 0) {
      await Promise.all(expired.map(n =>
        base44.entities.Notification.update(n.id, { isDismissed: true })
      ));
    }

    return expired.length;
  } catch (error) {
    console.error('Failed to dismiss expired notifications:', error);
    return 0;
  }
};

/**
 * @param {string} userEmail
 * @param {string[]} categoryNames
 * @param {string} monthYear
 * @returns {Promise<object|null>}
 */
export const notifyCategorySpendingAlert = (userEmail, categoryNames, monthYear) => {
  // Format the list gracefully depending on how many categories triggered the alert
  let categoryString = categoryNames[0];
  if (categoryNames.length === 2) {
    categoryString = `${categoryNames[0]} and ${categoryNames[1]}`;
  } else if (categoryNames.length > 2) {
    categoryString = `${categoryNames[0]}, ${categoryNames[1]}, and ${categoryNames.length - 2} other${categoryNames.length > 3 ? 's' : ''}`;
  }

  return createNotification({
    title: 'Spending Alert',
    message: `Your spending in ${categoryString} is higher than your 6-month average. Check your breakdown for details.`,
    type: 'warning',
    category: 'budgets',
    priority: 'high',
    actionUrl: '/reports',
    actionLabel: 'View Breakdown',
    metadata: { categoryNames, monthYear, alertType: 'critical_spend' },
    userEmail
  });
};
