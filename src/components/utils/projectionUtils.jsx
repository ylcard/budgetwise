/**
 * Calculates outliers and projected expenses based on historical transaction data.
 * Uses Mean and Standard Deviation (Z-Score approach) to identify and exclude outliers
 * for more accurate forecasting.
 */

/**
 * Helper to get a list of month keys (YYYY-MM) for the last N months.
 */
const getMonthKeys = (monthsBack) => {
    const keys = [];
    const now = new Date();
    for (let i = 1; i <= monthsBack; i++) { // Start from last month to avoid partial current month data
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        keys.push(`${year}-${month}`);
    }
    return keys;
};

/**
 * Filters out outliers from a dataset using the Mean +/- 2 * StdDev method.
 * Returns the average of the non-outlier values.
 */
const calculateAdjustedAverage = (values) => {
    if (!values || values.length === 0) return 0;
    if (values.length === 1) return values[0];

    // 1. Calculate Mean
    const sum = values.reduce((a, b) => a + b, 0);
    const mean = sum / values.length;

    // 2. Calculate Standard Deviation
    const squareDiffs = values.map(value => Math.pow(value - mean, 2));
    const avgSquareDiff = squareDiffs.reduce((a, b) => a + b, 0) / values.length;
    const stdDev = Math.sqrt(avgSquareDiff);

    // 3. Filter Outliers (Z-Score > 2)
    // If stdDev is 0 (all values same), keep all.
    if (stdDev === 0) return mean;

    const filteredValues = values.filter(value => {
        const zScore = Math.abs((value - mean) / stdDev);
        return zScore <= 2; // Keep values within 2 standard deviations
    });

    if (filteredValues.length === 0) return mean; // Fallback if everything is an outlier (unlikely)

    // 4. Calculate Average of Filtered Values
    const filteredSum = filteredValues.reduce((a, b) => a + b, 0);
    return filteredSum / filteredValues.length;
};

/**
 * Generates a projection for future expenses by category.
 * 
 * @param {Array} transactions - All transaction history
 * @param {Array} categories - List of categories
 * @param {number} historicalMonths - Number of past months to analyze (default 6)
 * @returns {Object} Projection data including total projected expense and breakdown
 */
export const calculateProjection = (transactions, categories, historicalMonths = 6) => {
    // 1. Group transactions by Category and Month
    // Structure: { categoryId: { 'YYYY-MM': totalAmount, ... } }
    const categoryHistory = {};

    // Initialize categories
    categories.forEach(cat => {
        categoryHistory[cat.id] = {};
    });
    categoryHistory['uncategorized'] = {};

    const monthKeys = getMonthKeys(historicalMonths);
    const minDate = new Date(monthKeys[monthKeys.length - 1] + "-01"); // Oldest month
    const maxDate = new Date(new Date().getFullYear(), new Date().getMonth(), 0); // Last day of last month

    // Filter transactions to the analysis window
    const relevantTransactions = transactions.filter(t => {
        if (t.type !== 'expense') return false;
        // Use paidDate for expenses if paid, otherwise date (but mostly paid for history)
        const dateStr = t.isPaid && t.paidDate ? t.paidDate : t.date;
        const d = new Date(dateStr);
        return d >= minDate && d <= maxDate;
    });

    relevantTransactions.forEach(t => {
        const catId = t.category_id || 'uncategorized';
        if (!categoryHistory[catId]) categoryHistory[catId] = {};

        const dateStr = t.isPaid && t.paidDate ? t.paidDate : t.date;
        const d = new Date(dateStr);
        const monthKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;

        if (monthKeys.includes(monthKey)) {
            categoryHistory[catId][monthKey] = (categoryHistory[catId][monthKey] || 0) + (Number(t.amount) || 0);
        }
    });

    // 2. Calculate Adjusted Average per Category
    let totalProjectedMonthly = 0;
    const categoryProjections = [];

    Object.keys(categoryHistory).forEach(catId => {
        const monthData = categoryHistory[catId];
        // Create array of values for the analyzed months (filling 0 for empty months)
        const values = monthKeys.map(key => monthData[key] || 0);

        // Skip if no spend at all in history
        if (values.every(v => v === 0)) return;

        const adjustedAvg = calculateAdjustedAverage(values);

        totalProjectedMonthly += adjustedAvg;

        const category = categories.find(c => c.id === catId);
        categoryProjections.push({
            categoryId: catId,
            name: category ? category.name : 'Uncategorized',
            color: category ? category.color : '#9ca3af',
            averageSpend: adjustedAvg,
            history: values
        });
    });

    return {
        totalProjectedMonthly,
        categoryProjections: categoryProjections.sort((a, b) => b.averageSpend - a.averageSpend)
    };
};

/**
 * Estimates the remaining spend for the current month based on the Safe Baseline.
 */
export const estimateCurrentMonth = (currentMonthTransactions, safeMonthlyBaseline) => {
    const today = new Date();
    const daysInMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
    const daysPassed = Math.max(1, today.getDate());
    const daysRemaining = daysInMonth - daysPassed;

    const actualSpent = currentMonthTransactions
        .filter(t => t.type === 'expense')
        .reduce((sum, t) => sum + Number(t.amount), 0);

    // We predict the remaining days using the "Safe Average" daily rate, not the current volatile rate
    const dailyRate = safeMonthlyBaseline / daysInMonth;
    const projectedRemaining = dailyRate * daysRemaining;

    return {
        actual: actualSpent,
        remaining: projectedRemaining,
        total: actualSpent + projectedRemaining
    };
};