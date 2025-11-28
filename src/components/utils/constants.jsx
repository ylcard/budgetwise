
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

// UI Options for the Settings Select Menu
export const CURRENCY_OPTIONS = [
    { symbol: '$', name: 'US Dollar', code: 'USD' },
    { symbol: '€', name: 'Euro', code: 'EUR' },
    { symbol: '£', name: 'British Pound', code: 'GBP' },
    { symbol: '¥', name: 'Japanese Yen', code: 'JPY' },
    { symbol: 'CHF', name: 'Swiss Franc', code: 'CHF' },
    { symbol: 'kr', name: 'Swedish Krona', code: 'SEK' },
];

// Comprehensive map for symbol lookup
export const CURRENCY_SYMBOLS_MAP = {
    'USD': '$', 'EUR': '€', 'GBP': '£', 'JPY': '¥',
    'CAD': 'CA$', 'AUD': 'A$', 'CHF': 'CHF', 'CNY': '¥',
    'INR': '₹', 'MXN': 'MX$', 'BRL': 'R$', 'ZAR': 'R',
    'KRW': '₩', 'SGD': 'S$', 'NZD': 'NZ$', 'HKD': 'HK$',
    'SEK': 'kr', 'NOK': 'kr', 'DKK': 'kr', 'PLN': 'zł',
    'THB': '฿', 'MYR': 'RM', 'IDR': 'Rp', 'PHP': '₱',
    'CZK': 'Kč', 'ILS': '₪', 'CLP': 'CLP$', 'AED': 'د.إ',
    'SAR': '﷼', 'TWD': 'NT$', 'TRY': '₺'
};

export const SUPPORTED_CURRENCIES = [
    { code: 'USD', name: 'US Dollar', symbol: '$' },
    { code: 'EUR', name: 'Euro', symbol: '€' },
    { code: 'GBP', name: 'British Pound', symbol: '£' },
    { code: 'JPY', name: 'Japanese Yen', symbol: '¥' },
    { code: 'CAD', name: 'Canadian Dollar', symbol: 'CA$' },
    { code: 'AUD', name: 'Australian Dollar', symbol: 'A$' },
    { code: 'CHF', name: 'Swiss Franc', symbol: 'CHF' },
    { code: 'CNY', name: 'Chinese Yuan', symbol: '¥' },
    { code: 'INR', name: 'Indian Rupee', symbol: '₹' },
    { code: 'MXN', name: 'Mexican Peso', symbol: 'MX$' },
    { code: 'BRL', name: 'Brazilian Real', symbol: 'R$' },
    { code: 'ZAR', name: 'South African Rand', symbol: 'R' },
    { code: 'KRW', name: 'South Korean Won', symbol: '₩' },
    { code: 'SGD', name: 'Singapore Dollar', symbol: 'S$' },
    { code: 'NZD', name: 'New Zealand Dollar', symbol: 'NZ$' },
    { code: 'HKD', name: 'Hong Kong Dollar', symbol: 'HK$' },
    { code: 'SEK', name: 'Swedish Krona', symbol: 'kr' },
    { code: 'NOK', name: 'Norwegian Krone', symbol: 'kr' },
    { code: 'DKK', name: 'Danish Krone', symbol: 'kr' },
    { code: 'PLN', name: 'Polish Zloty', symbol: 'zł' },
    { code: 'THB', name: 'Thai Baht', symbol: '฿' },
    { code: 'MYR', name: 'Malaysian Ringgit', symbol: 'RM' },
    { code: 'IDR', name: 'Indonesian Rupiah', symbol: 'Rp' },
    { code: 'PHP', name: 'Philippine Peso', symbol: '₱' },
    { code: 'CZK', name: 'Czech Koruna', symbol: 'Kč' },
    { code: 'ILS', name: 'Israeli Shekel', symbol: '₪' },
    { code: 'CLP', name: 'Chilean Peso', symbol: 'CLP$' },
    { code: 'AED', name: 'UAE Dirham', symbol: 'د.إ' },
    { code: 'SAR', name: 'Saudi Riyal', symbol: '﷼' },
    { code: 'TWD', name: 'Taiwan Dollar', symbol: 'NT$' },
    { code: 'TRY', name: 'Turkish Lira', symbol: '₺' },
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