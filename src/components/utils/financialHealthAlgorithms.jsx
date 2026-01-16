/**
 * Financial Health Algorithm Suite
 * CREATED: 16-Jan-2026
 * 
 * This module calculates a comprehensive financial health score based on 5 core metrics:
 * 1. Pacing Score (Real-time): Current spend vs 3-month historical average
 * 2. Burn Ratio (Real-time): Spending sustainability against income
 * 3. Stability Score (Historical): Spending volatility (Coefficient of Variation)
 * 4. Financial Sharpe Ratio (Historical): Risk-adjusted savings consistency
 * 5. Lifestyle Creep Index (Historical): Expense growth vs income growth
 */

// HELPERS

/**
 * Calculate spend from Day 1 to Day X for a specific month/year
 */
const getSpendByDayX = (allTransactions, targetMonth, targetYear, dayLimit) => {
    return allTransactions.reduce((sum, t) => {
        const tDate = new Date(t.date || t.created_date);
        
        // Match Month/Year
        if (tDate.getMonth() !== targetMonth || tDate.getFullYear() !== targetYear) return sum;
        
        // Stop if transaction is after Day X
        if (tDate.getDate() > dayLimit) return sum;
        
        // Sum expenses only (exclude income)
        if (t.category?.name === 'Income' || t.type === 'income') return sum;
        return sum + (Number(t.amount) || 0);
    }, 0);
};

/**
 * Get total monthly expenses for a specific month/year
 */
const getMonthlyExpenses = (transactions, month, year) => {
    return transactions.reduce((sum, t) => {
        const tDate = new Date(t.date || t.created_date);
        if (tDate.getMonth() !== month || tDate.getFullYear() !== year) return sum;
        if (t.category?.name === 'Income' || t.type === 'income') return sum;
        return sum + (Number(t.amount) || 0);
    }, 0);
};

/**
 * Get total monthly income for a specific month/year
 */
const getMonthlyIncome = (transactions, month, year) => {
    return transactions.reduce((sum, t) => {
        const tDate = new Date(t.date || t.created_date);
        if (tDate.getMonth() !== month || tDate.getFullYear() !== year) return sum;
        if (t.type !== 'income') return sum;
        return sum + (Number(t.amount) || 0);
    }, 0);
};

/**
 * Calculate standard deviation
 */
const calculateStdDev = (values) => {
    if (values.length === 0) return 0;
    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    const squaredDiffs = values.map(v => Math.pow(v - mean, 2));
    const variance = squaredDiffs.reduce((a, b) => a + b, 0) / values.length;
    return Math.sqrt(variance);
};

// METRIC CALCULATORS

/**
 * METRIC 1: Pacing Score (0-100)
 * Real-time: Compare current spend vs 3-month average for same day range
 */
const calculatePacingScore = (transactions, fullHistory, startDate) => {
    const today = new Date();
    const start = new Date(startDate);
    
    // If viewing current month, compare "Day 1 to Today". If past month, compare full month.
    const isCurrentMonthView = today.getMonth() === start.getMonth() && today.getFullYear() === start.getFullYear();
    const dayCursor = isCurrentMonthView ? today.getDate() : new Date(start.getFullYear(), start.getMonth() + 1, 0).getDate();
    
    // Current spend (Day 1 to X)
    const currentSpend = getSpendByDayX(transactions, start.getMonth(), start.getFullYear(), dayCursor);
    
    // Historical context (Average of last 3 months by Day X)
    const m1 = new Date(start); m1.setMonth(start.getMonth() - 1);
    const m2 = new Date(start); m2.setMonth(start.getMonth() - 2);
    const m3 = new Date(start); m3.setMonth(start.getMonth() - 3);
    
    const spendM1 = getSpendByDayX(fullHistory, m1.getMonth(), m1.getFullYear(), dayCursor);
    const spendM2 = getSpendByDayX(fullHistory, m2.getMonth(), m2.getFullYear(), dayCursor);
    const spendM3 = getSpendByDayX(fullHistory, m3.getMonth(), m3.getFullYear(), dayCursor);
    
    // Calculate baseline (average of non-zero months)
    const historyPoints = [spendM1, spendM2, spendM3].filter(v => v > 0);
    const averageSpendAtPointX = historyPoints.length > 0
        ? historyPoints.reduce((a, b) => a + b, 0) / historyPoints.length
        : currentSpend; // Fallback to current if no history
    
    // Score calculation
    const diff = currentSpend - averageSpendAtPointX;
    if (diff <= 0) return 100; // Under average = Perfect
    
    // Penalize for being over average
    const deviation = averageSpendAtPointX > 0 ? diff / averageSpendAtPointX : 1;
    return Math.max(0, 100 - (deviation * 100));
};

/**
 * METRIC 2: Burn Ratio (0-100)
 * Real-time: Is spending rate sustainable for income?
 * Target: Spend < 80% of income by end of month
 */
const calculateBurnRatio = (transactions, monthlyIncome, startDate) => {
    const today = new Date();
    const start = new Date(startDate);
    const isCurrentMonthView = today.getMonth() === start.getMonth() && today.getFullYear() === start.getFullYear();
    const dayCursor = isCurrentMonthView ? today.getDate() : new Date(start.getFullYear(), start.getMonth() + 1, 0).getDate();
    
    const currentSpend = getSpendByDayX(transactions, start.getMonth(), start.getFullYear(), dayCursor);
    const targetMaxSpend = monthlyIncome * 0.8 * (dayCursor / 30);
    
    if (currentSpend <= targetMaxSpend) return 100;
    
    const overRatio = targetMaxSpend > 0 ? (currentSpend - targetMaxSpend) / targetMaxSpend : 1;
    return Math.max(0, 100 - (overRatio * 100));
};

/**
 * METRIC 3: Stability Score (0-100)
 * Historical: Coefficient of Variation of monthly expenses over last 6 months
 * Lower CV = Higher stability = Better score
 */
const calculateStabilityScore = (fullHistory, startDate) => {
    const start = new Date(startDate);
    const monthlyExpenses = [];
    
    // Collect last 6 months of expenses
    for (let i = 1; i <= 6; i++) {
        const targetDate = new Date(start);
        targetDate.setMonth(start.getMonth() - i);
        const expenses = getMonthlyExpenses(fullHistory, targetDate.getMonth(), targetDate.getFullYear());
        if (expenses > 0) monthlyExpenses.push(expenses);
    }
    
    if (monthlyExpenses.length < 2) return 50; // Not enough data, neutral score
    
    const mean = monthlyExpenses.reduce((a, b) => a + b, 0) / monthlyExpenses.length;
    const stdDev = calculateStdDev(monthlyExpenses);
    const cv = mean > 0 ? stdDev / mean : 0; // Coefficient of Variation
    
    // Score: CV of 0 = 100, CV of 0.5 or higher = 0
    // Linear scale: Score = 100 - (CV * 200)
    return Math.max(0, Math.min(100, 100 - (cv * 200)));
};

/**
 * METRIC 4: Financial Sharpe Ratio (0-100)
 * Historical: Risk-adjusted savings consistency
 * Formula: (Average Monthly Net Savings) / (Std Dev of Net Savings)
 */
const calculateSharpeRatio = (fullHistory, startDate) => {
    const start = new Date(startDate);
    const monthlySavings = [];
    
    // Collect last 6 months of net savings
    for (let i = 1; i <= 6; i++) {
        const targetDate = new Date(start);
        targetDate.setMonth(start.getMonth() - i);
        const income = getMonthlyIncome(fullHistory, targetDate.getMonth(), targetDate.getFullYear());
        const expenses = getMonthlyExpenses(fullHistory, targetDate.getMonth(), targetDate.getFullYear());
        const netSavings = income - expenses;
        if (income > 0) monthlySavings.push(netSavings); // Only include months with income
    }
    
    if (monthlySavings.length < 2) return 50; // Not enough data, neutral score
    
    const avgSavings = monthlySavings.reduce((a, b) => a + b, 0) / monthlySavings.length;
    const stdDev = calculateStdDev(monthlySavings);
    
    if (stdDev === 0) return avgSavings > 0 ? 100 : 0; // Perfect consistency
    
    const sharpe = avgSavings / stdDev;
    
    // Score: Sharpe of 1.0+ = 100, Sharpe of -1.0 or lower = 0
    // Linear scale between -1 and 1
    return Math.max(0, Math.min(100, ((sharpe + 1) / 2) * 100));
};

/**
 * METRIC 5: Lifestyle Creep Index (0-100)
 * Historical: Compare expense growth vs income growth over last 6 months
 * Penalize if expenses grow faster than income
 */
const calculateLifestyleCreepIndex = (fullHistory, startDate) => {
    const start = new Date(startDate);
    const dataPoints = [];
    
    // Collect last 6 months of income and expenses
    for (let i = 1; i <= 6; i++) {
        const targetDate = new Date(start);
        targetDate.setMonth(start.getMonth() - i);
        const income = getMonthlyIncome(fullHistory, targetDate.getMonth(), targetDate.getFullYear());
        const expenses = getMonthlyExpenses(fullHistory, targetDate.getMonth(), targetDate.getFullYear());
        if (income > 0) dataPoints.push({ income, expenses });
    }
    
    if (dataPoints.length < 3) return 50; // Not enough data, neutral score
    
    dataPoints.reverse(); // Oldest to newest
    
    // Calculate growth rates (simple linear regression slope approximation)
    const incomeGrowth = (dataPoints[dataPoints.length - 1].income - dataPoints[0].income) / dataPoints[0].income;
    const expenseGrowth = (dataPoints[dataPoints.length - 1].expenses - dataPoints[0].expenses) / dataPoints[0].expenses;
    
    // Score: If expense growth <= income growth, score 100
    // For every 1% that expenses outpace income, lose 5 points
    const creepDelta = expenseGrowth - incomeGrowth;
    
    if (creepDelta <= 0) return 100; // No lifestyle creep
    
    return Math.max(0, 100 - (creepDelta * 500)); // Penalize excess expense growth
};

// MASTER CALCULATION FUNCTION

/**
 * Calculate comprehensive financial health score
 * 
 * @param {Array} transactions - Current period's transactions
 * @param {Array} fullHistory - All historical transactions
 * @param {number} monthlyIncome - Current period income
 * @param {string} startDate - Start date of current viewing period (YYYY-MM-DD)
 * @returns {Object} { totalScore, breakdown, label }
 */
export const calculateFinancialHealth = (transactions, fullHistory, monthlyIncome, startDate) => {
    // Calculate all 5 metrics
    const pacing = calculatePacingScore(transactions, fullHistory, startDate);
    const ratio = calculateBurnRatio(transactions, monthlyIncome, startDate);
    const stability = calculateStabilityScore(fullHistory, startDate);
    const sharpe = calculateSharpeRatio(fullHistory, startDate);
    const creep = calculateLifestyleCreepIndex(fullHistory, startDate);
    
    // Weighted average (can adjust weights as needed)
    // Current weights: Pacing 25%, Ratio 25%, Stability 20%, Sharpe 15%, Creep 15%
    const totalScore = Math.round(
        (pacing * 0.25) + 
        (ratio * 0.25) + 
        (stability * 0.20) + 
        (sharpe * 0.15) + 
        (creep * 0.15)
    );
    
    // Determine label
    let label = 'Needs Work';
    if (totalScore >= 90) label = 'Excellent';
    else if (totalScore >= 75) label = 'Good';
    else if (totalScore >= 60) label = 'Fair';
    
    return {
        totalScore,
        breakdown: {
            pacing: Math.round(pacing),
            ratio: Math.round(ratio),
            stability: Math.round(stability),
            sharpe: Math.round(sharpe),
            creep: Math.round(creep)
        },
        label
    };
};