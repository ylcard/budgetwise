/**
 * Utility for categorizing transactions based on user rules, keywords, and patterns.
 */

const HARDCODED_KEYWORDS = {
    'AMAZON': 'Shopping',
    'UBER': 'Transport',
    'LYFT': 'Transport',
    'NETFLIX': 'Subscriptions',
    'SPOTIFY': 'Subscriptions',
    'APPLE': 'Subscriptions',
    'STARBUCKS': 'Dining Out',
    'MCDONALD': 'Dining Out',
    'BURGER KING': 'Dining Out',
    'WALMART': 'Groceries',
    'TARGET': 'Shopping',
    'KROGER': 'Groceries',
    'WHOLE FOODS': 'Groceries',
    'SHELL': 'Transport',
    'BP': 'Transport',
    'EXXON': 'Transport',
    'CHEVRON': 'Transport',
    'AIRBNB': 'Travel',
    'HOTEL': 'Travel',
    'AIRLINES': 'Travel'
};

const FALLBACK_REGEX = [
    { pattern: /(POWER|WATER|GAS|ELECTRIC|UTILITY)/i, category: 'Utilities' },
    { pattern: /(INSURANCE|GEICO|PROGRESSIVE|STATE FARM)/i, category: 'Insurance' },
    { pattern: /(INTERNET|WIFI|CABLE|COMCAST|AT&T|VERIZON|T-MOBILE)/i, category: 'Connectivity' },
    { pattern: /(HOSPITAL|DOCTOR|CLINIC|DENTIST|PHARMACY|CVS|WALGREENS)/i, category: 'Health' }
];

/**
 * Categorizes a single transaction based on priority rules.
 * 
 * @param {Object} transaction - The transaction object (must have 'title' or 'description')
 * @param {Array} userRules - Array of CategoryRule objects, sorted by priority
 * @param {Array} categories - Array of available Category objects
 * @returns {Object} The categorization result { categoryId, categoryName }
 */
export const categorizeTransaction = (transaction, userRules = [], categories = []) => {
    const description = (transaction.title || transaction.description || '').toUpperCase();

    let categoryId = null;
    let categoryName = 'Uncategorized';
    let priority = 'wants';

    // Helper to find category by ID or Name
    const resolveCategory = (idOrName, isId = false) => {
        const cat = categories.find(c =>
            isId ? c.id === idOrName : c.name.toUpperCase() === idOrName.toUpperCase()
        );
        return cat ? { categoryId: cat.id, categoryName: cat.name,priority: cat.priority || 'wants' } : null;
    };

    // 1. User Rules Check (Highest Priority)
    // userRules should already be sorted by priority
    for (const rule of userRules) {
        let matched = false;
        if (rule.regexPattern) {
            try {
                const regex = new RegExp(rule.regexPattern, 'i');
                if (regex.test(description)) matched = true;
            } catch (e) {
                console.warn('Invalid regex in rule:', rule);
            }
        } else if (rule.keyword) {
            if (description.includes(rule.keyword.toUpperCase())) matched = true;
        }

        if (matched && rule.categoryId) {
            const resolved = resolveCategory(rule.categoryId, true);
            if (resolved) return resolved;
        }
    }

    // 2. Hardcoded Keywords
    for (const [keyword, catName] of Object.entries(HARDCODED_KEYWORDS)) {
        if (description.includes(keyword)) {
            const resolved = resolveCategory(catName, false);
            if (resolved) return resolved;
        }
    }

    // 3. Regular Expressions (Fallback)
    for (const { pattern, category } of FALLBACK_REGEX) {
        if (pattern.test(description)) {
            const resolved = resolveCategory(category, false);
            if (resolved) return resolved;
        }
    }

    // 4. Existing Basic Matching (from original ImportWizard logic, preserved as fallback)
    // This tries to find the category name directly in the description
    for (const cat of categories) {
        if (description.includes(cat.name.toUpperCase())) {
            return { categoryId: cat.id, categoryName: cat.name, priority: cat.priority || 'wants' };
        }
    }

    return { categoryId, categoryName };
};