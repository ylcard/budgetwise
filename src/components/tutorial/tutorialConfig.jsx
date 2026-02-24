/**
 * @fileoverview Tutorial Configuration System
 * CREATED: 15-Feb-2026
 * 
 * Central configuration for all onboarding tutorials.
 * Each tutorial is a series of steps that guide users through features.
 * 
 * Tutorial Structure:
 * - id: Unique identifier for the tutorial
 * - title: Display name
 * - description: Brief overview
 * - steps: Array of step objects
 * 
 * Step Structure:
 * - target: CSS selector or ref to highlight
 * - title: Step title
 * - content: Step description/instructions
 * - placement: Tooltip position (top, bottom, left, right)
 * - action: Optional action type (click, input, etc.)
 */

export const TUTORIAL_IDS = {
  DASHBOARD_OVERVIEW: 'dashboard_overview',
  ADD_TRANSACTION: 'add_transaction',
  MANAGE_BUDGETS: 'manage_budgets',
  CUSTOM_BUDGETS: 'custom_budgets',
  BANK_SYNC: 'bank_sync',
  CATEGORIES: 'categories',
  RECURRING_TRANSACTIONS: 'recurring_transactions',
  REPORTS: 'reports',
};

export const TUTORIALS = {
  [TUTORIAL_IDS.DASHBOARD_OVERVIEW]: {
    id: TUTORIAL_IDS.DASHBOARD_OVERVIEW,
    title: 'Welcome to BudgetWise',
    description: 'Learn the basics of your financial dashboard',
    steps: [
      {
        target: '[data-tutorial="velocity-widget"]',
        title: 'Financial Velocity',
        content: 'Track your daily income and expenses. When viewing the current month, this chart also projects your final balance based on your habits.',
        placement: 'bottom',
      },
      {
        target: '[data-tutorial="quick-stats"]',
        title: 'Monthly Overview',
        content: 'Here you can see your monthly income, expenses, and remaining budget at a glance.',
        placement: 'bottom',
      },
      {
        target: '[data-tutorial="custom-budgets"]',
        title: 'Custom Budgets',
        content: 'Create dedicated budgets for special events, trips, or specific goals to keep your spending organized.',
        placement: 'bottom',
      },
      {
        target: '[data-tutorial="recent-transactions"]',
        title: 'Recent Activity',
        content: 'View your latest transactions here. Tap any transaction to edit or delete it.',
        placement: 'top',
      },
      {
        target: '[data-tutorial="desktop-actions"]',
        title: 'Quick Actions',
        content: 'Use these buttons to rapidly record new income, log expenses, or import data from your bank.',
        placement: 'bottom',
      },
      {
        target: '[data-tutorial="mobile-fab"]',
        title: 'Action Menu',
        content: 'Tap this floating button from anywhere in the app to open your quick actions menu for adding transactions.',
        placement: 'top',
      }
    ],
  },

  [TUTORIAL_IDS.ADD_TRANSACTION]: {
    id: TUTORIAL_IDS.ADD_TRANSACTION,
    title: 'Adding Transactions',
    description: 'Learn how to record your income and expenses',
    steps: [
      {
        target: '[data-tutorial="add-fab"]',
        title: 'Start Here',
        content: 'Tap this button to add a new transaction.',
        placement: 'left',
        action: 'click',
      },
      {
        target: '[data-tutorial="transaction-type"]',
        title: 'Select Type',
        content: 'Choose whether this is income or an expense.',
        placement: 'bottom',
      },
      {
        target: '[data-tutorial="transaction-amount"]',
        title: 'Enter Amount',
        content: 'Type the transaction amount. You can use different currencies if needed.',
        placement: 'bottom',
      },
      {
        target: '[data-tutorial="transaction-category"]',
        title: 'Choose Category',
        content: 'Select a category to organize your spending. Categories help track where your money goes.',
        placement: 'bottom',
      },
    ],
  },

  [TUTORIAL_IDS.MANAGE_BUDGETS]: {
    id: TUTORIAL_IDS.MANAGE_BUDGETS,
    title: 'Managing Your Budgets',
    description: 'Set up and track your spending limits',
    steps: [
      {
        target: '[data-tutorial="budgets-tab"]',
        title: 'Budgets Section',
        content: 'Navigate to Budgets to view and manage your spending limits.',
        placement: 'right',
      },
      {
        target: '[data-tutorial="budget-goals"]',
        title: 'Budget Goals',
        content: 'Set percentage targets for Needs, Wants, and Savings based on the 50/30/20 rule (or customize).',
        placement: 'bottom',
      },
      {
        target: '[data-tutorial="system-budgets"]',
        title: 'System Budgets',
        content: 'These budgets automatically adjust based on your monthly income and goal percentages.',
        placement: 'bottom',
      },
    ],
  },

  [TUTORIAL_IDS.CUSTOM_BUDGETS]: {
    id: TUTORIAL_IDS.CUSTOM_BUDGETS,
    title: 'Custom Budgets',
    description: 'Create budgets for specific events or goals',
    steps: [
      {
        target: '[data-tutorial="custom-budgets-tab"]',
        title: 'Custom Budgets',
        content: 'Create budgets for trips, projects, or any specific goal with a defined timeframe.',
        placement: 'right',
      },
      {
        target: '[data-tutorial="create-custom-budget"]',
        title: 'Create Budget',
        content: 'Set a name, amount, date range, and allocate funds to different categories.',
        placement: 'bottom',
      },
    ],
  },

  [TUTORIAL_IDS.BANK_SYNC]: {
    id: TUTORIAL_IDS.BANK_SYNC,
    title: 'Bank Synchronization',
    description: 'Connect your bank for automatic transaction imports',
    steps: [
      {
        target: '[data-tutorial="bank-sync-tab"]',
        title: 'Bank Sync',
        content: 'Connect your bank accounts to automatically import transactions.',
        placement: 'right',
      },
      {
        target: '[data-tutorial="connect-bank"]',
        title: 'Connect Account',
        content: 'Click here to securely connect your bank via TrueLayer.',
        placement: 'bottom',
      },
    ],
  },

  [TUTORIAL_IDS.CATEGORIES]: {
    id: TUTORIAL_IDS.CATEGORIES,
    title: 'Categories & Rules',
    description: 'Organize transactions and automate categorization',
    steps: [
      {
        target: '[data-tutorial="categories-tab"]',
        title: 'Categories',
        content: 'Create and manage custom categories to organize your spending.',
        placement: 'right',
      },
      {
        target: '[data-tutorial="automation-rules"]',
        title: 'Automation Rules',
        content: 'Set up rules to automatically categorize transactions based on keywords or patterns.',
        placement: 'bottom',
      },
    ],
  },

  [TUTORIAL_IDS.RECURRING_TRANSACTIONS]: {
    id: TUTORIAL_IDS.RECURRING_TRANSACTIONS,
    title: 'Recurring Transactions',
    description: 'Automate regular income and expenses',
    steps: [
      {
        target: '[data-tutorial="recurring-tab"]',
        title: 'Recurring Transactions',
        content: 'Set up transactions that repeat automatically (rent, salary, subscriptions).',
        placement: 'right',
      },
      {
        target: '[data-tutorial="create-recurring"]',
        title: 'Create Recurring',
        content: 'Define the amount, frequency, and category. The app will create transactions automatically.',
        placement: 'bottom',
      },
    ],
  },

  [TUTORIAL_IDS.REPORTS]: {
    id: TUTORIAL_IDS.REPORTS,
    title: 'Financial Reports',
    description: 'Analyze your spending patterns and trends',
    steps: [
      {
        target: '[data-tutorial="reports-tab"]',
        title: 'Reports',
        content: 'View detailed charts and insights about your financial health.',
        placement: 'right',
      },
      {
        target: '[data-tutorial="spending-chart"]',
        title: 'Spending Analysis',
        content: 'See where your money goes with visual breakdowns by category and priority.',
        placement: 'bottom',
      },
    ],
  },
};

// Helper to get ordered tutorial list for settings UI
export const getTutorialList = () => {
  return Object.values(TUTORIALS);
};

// Helper to get specific tutorial by ID
export const getTutorial = (tutorialId) => {
  return TUTORIALS[tutorialId];
};