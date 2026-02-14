# Notification System Documentation

**Created:** 14-Feb-2026  
**Purpose:** Modular notification system for BudgetWise

## Overview

The notification system allows any feature in the app to create, manage, and display user notifications. It consists of:

1. **Entity**: `Notification` - Stores notification data in the database
2. **Hook**: `useNotifications` - Manages notification state and actions
3. **Helpers**: `notificationHelpers.jsx` - Pre-built notification creators
4. **UI Components**: NotificationBell, NotificationCenter, NotificationItem

---

## Quick Start

### 1. Create a Notification

```javascript
import { createNotification } from '@/components/utils/notificationHelpers';
import { useSettings } from '@/components/utils/SettingsContext';

const { user } = useSettings();

// Generic notification
await createNotification({
    title: 'Action Required',
    message: 'Please review your pending transactions.',
    type: 'action',
    category: 'transactions',
    priority: 'high',
    actionUrl: '/transactions/history',
    actionLabel: 'Review Now',
    userEmail: user.email
});
```

### 2. Use Pre-Built Helpers

```javascript
import { 
    notifyBankSyncSuccess, 
    notifyBudgetExceeded,
    notifyRecurringDue 
} from '@/components/utils/notificationHelpers';

// Bank sync completed
await notifyBankSyncSuccess(user.email, 15);

// Budget exceeded
await notifyBudgetExceeded(user.email, 'Groceries', 105);

// Bill due soon
await notifyRecurringDue(user.email, 'Netflix Subscription', 'Feb 20');
```

---

## Notification Types

| Type | Color | Use Case | Example |
|------|-------|----------|---------|
| `info` | Blue | General information | "Bank sync scheduled" |
| `success` | Green | Positive outcomes | "Data export complete" |
| `warning` | Amber | Alerts, non-critical issues | "Budget 80% spent" |
| `error` | Red | Failures, critical issues | "Bank sync failed" |
| `action` | Purple | User action required | "10 transactions need review" |

---

## Priority Levels

| Priority | Sorting | Badge | Use Case |
|----------|---------|-------|----------|
| `urgent` | 1st | Red pulse | Overdue bills, critical errors |
| `high` | 2nd | Red | Bank expiring, budget exceeded |
| `medium` | 3rd | Blue | Action required, warnings |
| `low` | 4th | Gray | Success messages, info |

---

## Categories

Organize notifications by feature area:

- `transactions` - Transaction-related notifications
- `budgets` - Budget alerts and warnings
- `recurring` - Recurring transaction reminders
- `bank_sync` - Bank connection and sync status
- `goals` - Savings goal progress
- `system` - App-wide system notifications

---

## Creating Custom Notification Types

Add new helper functions to `notificationHelpers.jsx`:

```javascript
export const notifyCustomFeature = (userEmail, customData) => {
    return createNotification({
        title: 'Custom Feature Alert',
        message: `Something happened with ${customData.name}`,
        type: 'info',
        category: 'custom_feature',
        priority: 'medium',
        actionUrl: '/custom-feature',
        actionLabel: 'View Details',
        metadata: { customData },
        userEmail
    });
};
```

---

## Advanced: Expiring Notifications

Set an expiration date for auto-dismissal:

```javascript
const tomorrow = new Date();
tomorrow.setDate(tomorrow.getDate() + 1);

await createNotification({
    title: 'Limited Time Offer',
    message: 'Special feature available today only!',
    type: 'info',
    category: 'system',
    priority: 'low',
    expiresAt: tomorrow.toISOString(),
    userEmail: user.email
});
```

Run cleanup periodically (e.g., on app load):

```javascript
import { dismissExpiredNotifications } from '@/components/utils/notificationHelpers';

// In your component
useEffect(() => {
    dismissExpiredNotifications(user.email);
}, []);
```

---

## Integration Examples

### Example 1: Bank Sync Feature

```javascript
// In trueLayerSync.ts or BankSync component
import { notifyBankSyncSuccess, notifyBankSyncError } from '@/components/utils/notificationHelpers';

try {
    const result = await syncBankTransactions();
    
    if (result.success) {
        await notifyBankSyncSuccess(user.email, result.newTransactions.length);
    }
} catch (error) {
    await notifyBankSyncError(user.email, error.message);
}
```

### Example 2: Budget Monitoring

```javascript
// In your budget calculation logic
import { notifyBudgetExceeded } from '@/components/utils/notificationHelpers';

const checkBudgets = async (budgets, transactions) => {
    for (const budget of budgets) {
        const spent = calculateSpent(budget, transactions);
        const percentage = (spent / budget.allocatedAmount) * 100;
        
        if (percentage >= 90 && !budget.notified) {
            await notifyBudgetExceeded(user.email, budget.name, percentage);
        }
    }
};
```

### Example 3: Recurring Transaction Reminders

```javascript
// In a scheduled automation or dashboard hook
import { notifyRecurringDue, notifyRecurringOverdue } from '@/components/utils/notificationHelpers';

const checkUpcomingBills = async (recurringTransactions) => {
    const today = new Date();
    
    for (const recurring of recurringTransactions) {
        const dueDate = new Date(recurring.nextOccurrence);
        const daysUntilDue = Math.ceil((dueDate - today) / (1000 * 60 * 60 * 24));
        
        if (daysUntilDue === 3) {
            // Notify 3 days before
            await notifyRecurringDue(user.email, recurring.title, format(dueDate, 'MMM d'));
        } else if (daysUntilDue < 0 && recurring.status !== 'paid') {
            // Overdue
            await notifyRecurringOverdue(user.email, recurring.title);
        }
    }
};
```

---

## UI Components

### NotificationBell
Displays unread count badge. Use as standalone or with NotificationCenter.

```javascript
import NotificationBell from '@/components/notifications/NotificationBell';

<NotificationBell onClick={() => setShowNotifications(true)} />
```

### NotificationCenter
Full notification management UI with tabs, filtering, and actions.

```javascript
import NotificationCenter from '@/components/notifications/NotificationCenter';

// Auto trigger
<NotificationCenter />

// Custom trigger
<NotificationCenter trigger={<CustomButton>Open Notifications</CustomButton>} />
```

---

## Hook API

```javascript
const {
    notifications,       // Active (non-dismissed) notifications
    allNotifications,    // All notifications including dismissed
    unreadCount,         // Number of unread notifications
    urgentNotifications, // Urgent unread notifications
    isLoading,           // Loading state
    markAsRead,          // (id) => void
    dismiss,             // (id) => void
    delete: deleteNotif, // (id) => void
    markAllAsRead,       // () => void
    clearDismissed,      // () => void
    isProcessing,        // Mutation in progress
} = useNotifications();
```

---

## Best Practices

1. **Avoid Spam**: Don't create duplicate notifications. Check if a similar one exists first.
2. **Use Categories**: Always set a category for better organization.
3. **Action URLs**: Include actionUrl and actionLabel when notifications are actionable.
4. **Metadata**: Store relevant IDs in metadata for traceability.
5. **Priority Wisely**: Reserve `urgent` for truly critical issues only.
6. **Expire Old Notifications**: Set expiresAt for time-sensitive notifications.
7. **Batch Operations**: When creating multiple notifications, use Promise.all.

---

## Future Enhancements

Potential additions (not yet implemented):

- [ ] Email notifications for urgent items
- [ ] Push notifications (PWA)
- [ ] Notification preferences (per category)
- [ ] Notification sounds/vibrations
- [ ] Scheduled notifications (automation)
- [ ] Notification templates
- [ ] Notification analytics