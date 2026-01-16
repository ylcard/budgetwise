/**
 * Historical Transaction Analyzer
 * CREATED: 16-Jan-2026
 * 
 * Analyzes user transaction history to identify patterns, life events,
 * and spending behaviors. Used for AI-powered budget recommendations.
 */

import { parseISO, differenceInDays, startOfDay } from "date-fns";
import { createEntityMap } from "./generalUtils";

/**
 * Identifies "life events" (trips, concerts, etc.) by detecting
 * spending spikes over short time periods using temporal clustering.
 * 
 * @param {Array} transactions - Full transaction history
 * @param {Array} categories - Category definitions
 * @returns {Array} Detected event clusters with metadata
 */
export function analyzeEventPatterns(transactions, categories) {
    if (!transactions || transactions.length === 0) return [];

    const categoryMap = createEntityMap(categories);
    
    // Filter only expenses and sort by date
    const expenses = transactions
        .filter(t => t.type === 'expense' && t.isPaid)
        .sort((a, b) => new Date(a.paidDate || a.date) - new Date(b.paidDate || b.date));

    if (expenses.length < 3) return [];

    // Group transactions by day
    const dailyGroups = {};
    expenses.forEach(t => {
        const date = startOfDay(parseISO(t.paidDate || t.date)).toISOString();
        if (!dailyGroups[date]) {
            dailyGroups[date] = [];
        }
        dailyGroups[date].push(t);
    });

    // Calculate daily totals
    const dailyData = Object.entries(dailyGroups).map(([date, txns]) => ({
        date: parseISO(date),
        total: txns.reduce((sum, t) => sum + t.amount, 0),
        transactions: txns,
        categoryBreakdown: txns.reduce((acc, t) => {
            const cat = categoryMap[t.category_id];
            if (cat) {
                acc[cat.priority] = (acc[cat.priority] || 0) + t.amount;
            }
            return acc;
        }, {})
    }));

    // Calculate baseline (median daily spending)
    const sortedTotals = dailyData.map(d => d.total).sort((a, b) => a - b);
    const baseline = sortedTotals[Math.floor(sortedTotals.length / 2)] || 0;
    const threshold = baseline * 2; // Spike = 2x normal spending

    // Detect event clusters (3-7 day windows with elevated spending)
    const events = [];
    let i = 0;
    
    while (i < dailyData.length) {
        const current = dailyData[i];
        
        if (current.total > threshold) {
            // Found a spike - look ahead 7 days
            const cluster = [current];
            let j = i + 1;
            
            while (j < dailyData.length && 
                   differenceInDays(dailyData[j].date, current.date) <= 7) {
                if (dailyData[j].total > baseline * 1.2) {
                    cluster.push(dailyData[j]);
                }
                j++;
            }
            
            if (cluster.length >= 2) {
                // Valid event cluster
                const allTransactions = cluster.flatMap(d => d.transactions);
                const totalAmount = allTransactions.reduce((sum, t) => sum + t.amount, 0);
                
                // Calculate category DNA
                const categoryDNA = {};
                allTransactions.forEach(t => {
                    const cat = categoryMap[t.category_id];
                    if (cat) {
                        categoryDNA[cat.priority] = (categoryDNA[cat.priority] || 0) + t.amount;
                    }
                });
                
                // Determine event type based on dominant categories
                const eventType = inferEventType(allTransactions, categoryMap);
                
                events.push({
                    startDate: cluster[0].date,
                    endDate: cluster[cluster.length - 1].date,
                    duration: differenceInDays(cluster[cluster.length - 1].date, cluster[0].date) + 1,
                    totalAmount,
                    transactionCount: allTransactions.length,
                    categoryDNA,
                    eventType,
                    transactions: allTransactions
                });
            }
            
            i = j;
        } else {
            i++;
        }
    }

    return events;
}

/**
 * Infer event type from transaction patterns
 */
function inferEventType(transactions, categoryMap) {
    const categoryNames = transactions
        .map(t => categoryMap[t.category_id]?.name?.toLowerCase())
        .filter(Boolean);
    
    const hasTravel = categoryNames.some(n => 
        n.includes('transport') || n.includes('travel') || n.includes('flight')
    );
    const hasAccommodation = categoryNames.some(n => 
        n.includes('hotel') || n.includes('accommodation')
    );
    const hasDining = categoryNames.some(n => 
        n.includes('dining') || n.includes('restaurant') || n.includes('food')
    );
    const hasEntertainment = categoryNames.some(n => 
        n.includes('entertainment') || n.includes('ticket')
    );
    
    if (hasTravel && hasAccommodation) return 'Trip';
    if (hasTravel && hasDining && transactions.length <= 5) return 'Day Trip';
    if (hasEntertainment && transactions.length <= 3) return 'Event';
    if (hasDining && transactions.length >= 5) return 'Social Week';
    
    return 'Special Period';
}

/**
 * Analyze expense elasticity - which categories get cut during lean months
 * 
 * @param {Array} transactions - Full transaction history
 * @param {Array} categories - Category definitions
 * @param {Array} systemBudgets - Historical system budgets
 * @returns {Object} Elasticity analysis by category
 */
export function analyzeExpenseElasticity(transactions, categories, systemBudgets) {
    if (!transactions || !categories) return {};

    const categoryMap = createEntityMap(categories);
    
    // Group transactions by month
    const monthlyData = {};
    
    transactions.forEach(t => {
        if (t.type !== 'expense' || !t.isPaid) return;
        
        const date = parseISO(t.paidDate || t.date);
        const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        
        if (!monthlyData[monthKey]) {
            monthlyData[monthKey] = {
                totalIncome: 0,
                totalExpenses: 0,
                categorySpend: {}
            };
        }
        
        const cat = categoryMap[t.category_id];
        if (cat) {
            const catName = cat.name;
            monthlyData[monthKey].categorySpend[catName] = 
                (monthlyData[monthKey].categorySpend[catName] || 0) + t.amount;
        }
        
        monthlyData[monthKey].totalExpenses += t.amount;
    });
    
    // Add income data
    transactions.forEach(t => {
        if (t.type !== 'income') return;
        
        const date = parseISO(t.date);
        const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        
        if (monthlyData[monthKey]) {
            monthlyData[monthKey].totalIncome += t.amount;
        }
    });
    
    // Calculate efficiency for each month
    const monthsWithEfficiency = Object.entries(monthlyData).map(([month, data]) => ({
        month,
        efficiency: data.totalIncome - data.totalExpenses,
        categorySpend: data.categorySpend
    }));
    
    if (monthsWithEfficiency.length < 2) return {};
    
    // Sort by efficiency
    monthsWithEfficiency.sort((a, b) => a.efficiency - b.efficiency);
    
    // Compare bottom 25% (lean) vs top 25% (abundant)
    const leanMonths = monthsWithEfficiency.slice(0, Math.ceil(monthsWithEfficiency.length * 0.25));
    const abundantMonths = monthsWithEfficiency.slice(-Math.ceil(monthsWithEfficiency.length * 0.25));
    
    // Calculate average spending per category in each group
    const leanAvg = calculateCategoryAverages(leanMonths);
    const abundantAvg = calculateCategoryAverages(abundantMonths);
    
    // Calculate elasticity (% reduction in lean vs abundant)
    const elasticity = {};
    Object.keys({ ...leanAvg, ...abundantAvg }).forEach(category => {
        const lean = leanAvg[category] || 0;
        const abundant = abundantAvg[category] || 0;
        
        if (abundant > 0) {
            const reduction = ((abundant - lean) / abundant) * 100;
            elasticity[category] = {
                reduction: Math.max(0, reduction),
                leanAvg: lean,
                abundantAvg: abundant,
                flexible: reduction > 20 // Categories reduced by >20% are "flexible"
            };
        }
    });
    
    return elasticity;
}

function calculateCategoryAverages(months) {
    const totals = {};
    const counts = {};
    
    months.forEach(m => {
        Object.entries(m.categorySpend).forEach(([cat, amount]) => {
            totals[cat] = (totals[cat] || 0) + amount;
            counts[cat] = (counts[cat] || 0) + 1;
        });
    });
    
    const averages = {};
    Object.keys(totals).forEach(cat => {
        averages[cat] = totals[cat] / counts[cat];
    });
    
    return averages;
}

/**
 * Generate budget archetypes based on historical events
 * 
 * @param {Array} events - Detected life events from analyzeEventPatterns
 * @returns {Array} Budget archetypes with recommendations
 */
export function generateBudgetArchetypes(events) {
    if (!events || events.length === 0) return [];
    
    // Group events by type
    const eventsByType = events.reduce((acc, event) => {
        if (!acc[event.eventType]) acc[event.eventType] = [];
        acc[event.eventType].push(event);
        return acc;
    }, {});
    
    // Generate archetypes
    const archetypes = Object.entries(eventsByType).map(([type, typeEvents]) => {
        const avgAmount = typeEvents.reduce((sum, e) => sum + e.totalAmount, 0) / typeEvents.length;
        const avgDuration = typeEvents.reduce((sum, e) => sum + e.duration, 0) / typeEvents.length;
        
        // Calculate category breakdown percentages
        const totalSpend = typeEvents.reduce((sum, e) => sum + e.totalAmount, 0);
        const categoryBreakdown = {};
        
        typeEvents.forEach(event => {
            Object.entries(event.categoryDNA).forEach(([priority, amount]) => {
                categoryBreakdown[priority] = (categoryBreakdown[priority] || 0) + amount;
            });
        });
        
        Object.keys(categoryBreakdown).forEach(priority => {
            categoryBreakdown[priority] = (categoryBreakdown[priority] / totalSpend) * 100;
        });
        
        return {
            type,
            name: formatArchetypeName(type),
            recommendedAmount: Math.round(avgAmount),
            typicalDuration: Math.round(avgDuration),
            occurrences: typeEvents.length,
            categoryBreakdown,
            confidence: calculateConfidence(typeEvents),
            lastOccurrence: typeEvents[typeEvents.length - 1].startDate
        };
    });
    
    return archetypes.sort((a, b) => b.confidence - a.confidence);
}

function formatArchetypeName(type) {
    const names = {
        'Trip': 'Weekend Trip',
        'Day Trip': 'Day Trip',
        'Event': 'Concert/Event',
        'Social Week': 'Social Week',
        'Special Period': 'Special Occasion'
    };
    return names[type] || type;
}

function calculateConfidence(events) {
    // Confidence based on:
    // 1. Number of occurrences (more = better)
    // 2. Consistency in amount (less variance = better)
    
    if (events.length < 2) return 50;
    
    const amounts = events.map(e => e.totalAmount);
    const avg = amounts.reduce((sum, a) => sum + a, 0) / amounts.length;
    const variance = amounts.reduce((sum, a) => sum + Math.pow(a - avg, 2), 0) / amounts.length;
    const stdDev = Math.sqrt(variance);
    const cv = stdDev / avg; // Coefficient of variation
    
    const occurrenceScore = Math.min(events.length * 15, 50); // Max 50 points
    const consistencyScore = Math.max(0, 50 - (cv * 100)); // Max 50 points
    
    return Math.round(occurrenceScore + consistencyScore);
}