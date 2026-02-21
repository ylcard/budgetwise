import { base44 } from '@/api/base44Client';

/**
 * CREATED 14-Feb-2026: Centralized notification creation helpers
 * Any feature can use these to create standardized notifications
 */

/**
 * Create a generic notification
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

export const notifyCategorySpendingAlert = (userEmail, categoryName, diffFormatted, percentageOver, monthYear) => {
	return createNotification({
		title: 'Critical Spending Alert',
		message: `Your spending in ${categoryName} is ${percentageOver.toFixed(0)}% (${diffFormatted}) over your 6-month average.`,
		type: 'warning',
		category: 'budgets',
		priority: 'high',
		actionUrl: '/reports',
		actionLabel: 'View Breakdown',
		metadata: { categoryName, monthYear, alertType: 'critical_spend' },
		userEmail
	});
};

/**
 * Budget Notifications
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
 * Recurring Transaction Notifications
 */
export const notifyRecurringDue = (userEmail, transactionTitle, dueDate) => {
	return createNotification({
		title: 'Bill Due Soon',
		message: `"${transactionTitle}" is due on ${dueDate}.`,
		type: 'info',
		category: 'recurring',
		priority: 'medium',
		actionUrl: '/transactions/recurring',
		actionLabel: 'Mark as Paid',
		metadata: { transactionTitle, dueDate },
		userEmail
	});
};

export const notifyRecurringOverdue = (userEmail, transactionTitle) => {
	return createNotification({
		title: 'Overdue Bill',
		message: `"${transactionTitle}" is overdue. Mark as paid or update the schedule.`,
		type: 'error',
		category: 'recurring',
		priority: 'urgent',
		actionUrl: '/transactions/recurring',
		actionLabel: 'Take Action',
		metadata: { transactionTitle },
		userEmail
	});
};

/**
 * System Notifications
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
export const notifyMonthlyRewindReady = (userEmail, monthIndex, year) => {
	// Get full month name for the message
	const monthName = new Date(year, monthIndex).toLocaleString('default', { month: 'long' });

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