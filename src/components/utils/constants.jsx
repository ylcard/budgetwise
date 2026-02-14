
// Unified Source of Truth for Financial Priorities
export const FINANCIAL_PRIORITIES = {
    needs: {
        label: "Essentials",
        description: "Essential expenses",
        color: "#3B82F6",
        bg: "bg-blue-50",
        order: 0
    },
    wants: {
        label: "Lifestyle",
        description: "Lifestyle expenses",
        color: "#F59E0B",
        bg: "bg-orange-50",
        order: 1
    },
    savings: {
        label: "Savings",
        description: "Savings after expenses",
        color: "#10B981",
        bg: "bg-green-50",
        order: 2
    }
};

// Derived array for Dropdowns (Form) - Automatically sorted by 'order'
// This creates: [{ value: 'needs', label: 'Needs', ... }, ...]
export const PRIORITY_OPTIONS = Object.entries(FINANCIAL_PRIORITIES)
    .filter(([key]) => key !== 'savings')
    .map(([key, config]) => ({
        value: key, // The key (e.g. 'needs') becomes the database value
        ...config
    }))
    .sort((a, b) => a.order - b.order);

// Preset color palette for budgets and visual elements
export const PRESET_COLORS = [
    '#3B82F6', '#EF4444', '#10B981', '#F59E0B', '#8B5CF6',
    '#EC4899', '#14B8A6', '#F97316', '#06B6D4', '#6366F1'
];

// Fields monitored for changes in the Settings Page
export const SETTINGS_KEYS = [
    'baseCurrency',
    'currencyPosition',
    'budgetViewMode',
    'thousandSeparator',
    'decimalSeparator',
    'decimalPlaces',
    'hideTrailingZeros',
    'fixedLifestyleMode',
    'goalMode'
];

// Default "Factory" Settings
export const DEFAULT_SETTINGS = {
    baseCurrency: 'USD',
    currencyPosition: 'before',
    budgetViewMode: 'bars',
    thousandSeparator: ',',
    decimalSeparator: '.',
    decimalPlaces: 2,
    hideTrailingZeros: false,
    fixedLifestyleMode: false,
    goalMode: true // true = Percentage, false = Absolute
};

/*
export const DEFAULT_SYSTEM_CATEGORIES = [
    { name: 'Rent', icon: 'Home', color: '#6366F1', priority: 'needs', is_system: true },
    { name: 'Connectivity', icon: 'Home', color: '#6366F1', priority: 'needs', is_system: true },
    { name: 'Gas', icon: 'Home', color: '#6366F1', priority: 'needs', is_system: true },
    { name: 'Electricity', icon: 'Home', color: '#6366F1', priority: 'needs', is_system: true },
    { name: 'Water', icon: 'Home', color: '#6366F1', priority: 'needs', is_system: true },
	{ name: 'Taxes', icon: 'Home', color: '#6366F1', priority: 'needs', is_system: true },
	{ name: 'Administrative', icon: 'Home', color: '#6366F1', priority: 'needs', is_system: true },
	{ name: 'Clothes', icon: 'Home', color: '#6366F1', priority: 'needs', is_system: true },
	{ name: 'Pets', icon: 'Home', color: '#6366F1', priority: 'needs', is_system: true },
	{ name: 'Uncategorized', icon: 'Home', color: '#6366F1', priority: 'needs', is_system: true },
    { name: 'Groceries', icon: 'ShoppingCart', color: '#10B981', priority: 'needs', is_system: true },
    { name: 'Transport', icon: 'Car', color: '#F59E0B', priority: 'needs', is_system: true },
    { name: 'Utilities', icon: 'Zap', color: '#06B6D4', priority: 'needs', is_system: true },
    { name: 'Health', icon: 'HeartPulse', color: '#EF4444', priority: 'needs', is_system: true },
    { name: 'Dining Out', icon: 'Utensils', color: '#F97316', priority: 'wants', is_system: true },
    { name: 'Shopping', icon: 'ShoppingBag', color: '#8B5CF6', priority: 'wants', is_system: true },
    { name: 'Entertainment', icon: 'Film', color: '#EC4899', priority: 'wants', is_system: true },
    { name: 'Travel', icon: 'Plane', color: '#0EA5E9', priority: 'wants', is_system: true },
    { name: 'Subscriptions', icon: 'Repeat', color: '#8B5CF6', priority: 'wants', is_system: true }
];
*/

export const DEFAULT_SYSTEM_CATEGORIES = [
  // --- Essentials ---
  { name: 'Debt', priority: 'needs', icon: 'CreditCard', color: '#EF4444' }, // Red for urgency/debt
  { name: 'Education', priority: 'needs', icon: 'GraduationCap', color: '#6366F1' },
  { name: 'Groceries', priority: 'needs', icon: 'ShoppingCart', color: '#10B981' },
  { name: 'Health', priority: 'needs', icon: 'HeartPulse', color: '#F43F5E' },
  { name: 'Housing', priority: 'needs', icon: 'Home', color: '#6366F1' },
  { name: 'Insurance', priority: 'needs', icon: 'ShieldCheck', color: '#3B82F6' },
  { name: 'Transport', priority: 'needs', icon: 'Car', color: '#F59E0B' },
  { name: 'Utilities', priority: 'needs', icon: 'Zap', color: '#06B6D4' },
  { name: 'Home Maintenance', priority: 'needs', icon: 'Wrench', color: '#71717A' },

  // --- Lifestyle ---
  { name: 'Dining', priority: 'wants', icon: 'Utensils', color: '#F97316' },
  { name: 'Entertainment', priority: 'wants', icon: 'Film', color: '#EC4899' },
  { name: 'Gifts', priority: 'wants', icon: 'Gift', color: '#D946EF' },
  { name: 'Investments', priority: 'wants', icon: 'TrendingUp', color: '#8B5CF6' },
  { name: 'Shopping', priority: 'wants', icon: 'ShoppingBag', color: '#8B5CF6' },
  { name: 'Travel', priority: 'wants', icon: 'Plane', color: '#0EA5E9' },
  { name: 'Subscriptions', priority: 'wants', icon: 'Repeat', color: '#6366F1' },
  { name: 'Personal Care', priority: 'wants', icon: 'Sparkles', color: '#F472B6' },
  { name: 'Miscellaneous', priority: 'wants', icon: 'HelpCircle', color: '#94A3B8' }
];

export const DEFAULT_SYSTEM_GOALS = [
    { priority: 'needs', target_percentage: 50 },
    { priority: 'wants', target_percentage: 30 },
    { priority: 'savings', target_percentage: 20 }
];
