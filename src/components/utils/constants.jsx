
// Priority order for sorting (lower number = higher priority in display)
export const PRIORITY_ORDER = {
  needs: 0,
  wants: 1,
  savings: 2
};

// Complete priority configuration with labels, colors, and order
export const PRIORITY_CONFIG = {
  needs: { 
    label: "Needs", 
    color: "#EF4444", 
    bg: "bg-red-50",
    order: 0 
  },
  wants: { 
    label: "Wants", 
    color: "#F59E0B", 
    bg: "bg-orange-50",
    order: 1 
  },
  savings: { 
    label: "Savings", 
    color: "#10B981", 
    bg: "bg-green-50",
    order: 2 
  }
};

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
  { code: 'CAD', name: 'Canadian Dollar', symbol: 'C$' },
  { code: 'AUD', name: 'Australian Dollar', symbol: 'A$' },
  { code: 'CHF', name: 'Swiss Franc', symbol: 'CHF' },
  { code: 'CNY', name: 'Chinese Yuan', symbol: '¥' },
  { code: 'INR', name: 'Indian Rupee', symbol: '₹' },
  { code: 'MXN', name: 'Mexican Peso', symbol: '$' },
];