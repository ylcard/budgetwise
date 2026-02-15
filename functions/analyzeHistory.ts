/**
 * Analyze History & Generate Budget Archetypes
 * CREATED: 16-Jan-2026
 * * TRIGGER: Called when a user marks a budget as "Completed".
 * ACTION: Analyzes last 2 years of transactions, identifies event clusters,
 * and saves 'Budget Archetypes' to the user's profile/metadata.
 */

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.18';
import { parseISO, differenceInDays, startOfDay, subMonths } from 'npm:date-fns@3.3.1';

// --- CORE ANALYZER LOGIC (Ported from Frontend) ---

function createEntityMap(entities) {
    return entities.reduce((acc, entity) => {
        acc[entity.id] = entity;
        return acc;
    }, {});
}

function identifyAnchorExpense(transactions, categoryMap) {
    // Priority keywords to identify the "Reason" for the trip
    const anchorKeywords = ['ticket', 'concert', 'festival', 'gig', 'show', 'flight', 'hotel'];
    
    for (const t of transactions) {
        const title = (t.title || '').toLowerCase();
        const category = categoryMap[t.category_id]?.name?.toLowerCase() || '';
        
        if (anchorKeywords.some(kw => title.includes(kw) || category.includes(kw))) {
            return {
                title: t.title,
                amount: t.amount,
                category: categoryMap[t.category_id]?.name
            };
        }
    }
    
    // Fallback: Largest expense
    const largest = transactions.reduce((max, t) => 
        t.amount > max.amount ? t : max, transactions[0]
    );
    
    return {
        title: largest.title,
        amount: largest.amount,
        category: categoryMap[largest.category_id]?.name
    };
}

function inferEventType(transactions, categoryMap, durationDays) {
    const categoryNames = transactions
        .map(t => categoryMap[t.category_id]?.name?.toLowerCase())
        .filter(Boolean);
    
    const titles = transactions.map(t => t.title?.toLowerCase()).filter(Boolean);
    
    // Anchor detection
    const hasTicket = categoryNames.some(n => n.includes('ticket')) || 
                      titles.some(t => t.includes('ticket') || t.includes('concert') || t.includes('festival') || t.includes('gig'));

    const hasFlight = categoryNames.some(n => n.includes('flight') || n.includes('airline')) ||
                      titles.some(t => t.includes('flight') || t.includes('airport'));

    const hasAccommodation = categoryNames.some(n => n.includes('hotel') || n.includes('accommodation') || n.includes('airbnb')) ||
                             titles.some(t => t.includes('hotel') || t.includes('airbnb'));

    const hasTransport = categoryNames.some(n => n.includes('transport') || n.includes('travel') || n.includes('train')) ||
                         titles.some(t => t.includes('transport') || t.includes('train'));

    const hasDining = categoryNames.some(n => n.includes('dining') || n.includes('restaurant') || n.includes('food'));

    // 1. Crown Jewel Rule (Concerts/Events)
    if (hasTicket) {
        if (durationDays > 4) return 'Event Holiday'; // e.g. Tuska 8 days
        return 'Concert Trip'; // e.g. 2 days
    }

    // 2. Logistics Rule
    if (hasFlight || (hasAccommodation && hasTransport)) return 'Trip';
    if (hasAccommodation && !hasFlight && transactions.length <= 7) return 'Weekend Trip';
    if (hasTransport && hasDining && transactions.length <= 5) return 'Day Trip';
    if (hasDining && transactions.length >= 5) return 'Social Week';
    
    return 'Special Period';
}

function calculateConfidence(events) {
    if (events.length < 2) return 50;
    
    const amounts = events.map(e => e.totalAmount);
    const avg = amounts.reduce((sum, a) => sum + a, 0) / amounts.length;
    const variance = amounts.reduce((sum, a) => sum + Math.pow(a - avg, 2), 0) / amounts.length;
    const stdDev = Math.sqrt(variance);
    const cv = stdDev / avg; // Coefficient of variation
    
    const occurrenceScore = Math.min(events.length * 15, 50);
    const consistencyScore = Math.max(0, 50 - (cv * 100));
    
    return Math.round(occurrenceScore + consistencyScore);
}

function formatArchetypeName(type) {
    const names = {
        'Trip': 'Weekend Trip',
        'Day Trip': 'Day Trip',
        'Concert Trip': 'Concert Trip',
        'Event Holiday': 'Festival Holiday',
        'Social Week': 'Social Week',
        'Special Period': 'Special Occasion'
    };
    return names[type] || type;
}

// --- MAIN SERVER ENTRYPOINT ---

Deno.serve(async (req) => {
    // CORS Header for browser access
    const corsHeaders = {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    };

    if (req.method === "OPTIONS") {
        return new Response("ok", { headers: corsHeaders });
    }

    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();

        if (!user) {
            return Response.json({ error: "Unauthorized" }, { status: 401, headers: corsHeaders });
        }

        // 1. Fetch Data (Transactions & Categories)
        // Fetch last 24 months of history for relevant analysis
        const startDate = subMonths(new Date(), 24).toISOString();
        
        const [transactions, categories] = await Promise.all([
            base44.entities.Transaction.list({
                filter: { 
                    date: { $gte: startDate },
                    type: { $eq: 'expense' } 
                },
                pageSize: 2000 // Ensure we get enough history
            }),
            base44.entities.Category.list()
        ]);

        if (!transactions.items || transactions.items.length === 0) {
            return Response.json({ message: "Not enough data" }, { headers: corsHeaders });
        }

        const categoryMap = createEntityMap(categories.items);
        const expenses = transactions.items
            .filter(t => t.isPaid) // Only paid expenses
            .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

        // 2. Group by Day & Calculate Baseline
        const dailyGroups = {};
        expenses.forEach(t => {
            const date = startOfDay(parseISO(t.date)).toISOString();
            if (!dailyGroups[date]) dailyGroups[date] = [];
            dailyGroups[date].push(t);
        });

        const dailyData = Object.entries(dailyGroups).map(([date, txns]) => ({
            date: parseISO(date),
            total: txns.reduce((sum, t) => sum + t.amount, 0),
            transactions: txns
        }));

        // Filter noise (days with < 5 currency units) to get real baseline
        const sortedTotals = dailyData.map(d => d.total).filter(t => t > 5).sort((a, b) => a - b);
        const baseline = sortedTotals[Math.floor(sortedTotals.length / 2)] || 0;
        const threshold = Math.max(baseline * 2, 20);

        // 3. Cluster Events (The "Gap Check" Logic)
        const detectedEvents = [];
        let i = 0;

        while (i < dailyData.length) {
            const current = dailyData[i];

            if (current.total > threshold) {
                const cluster = [current];
                let j = i + 1;

                while (j < dailyData.length && 
                       differenceInDays(dailyData[j].date, current.date) <= 7) {
                    
                    const lastClusterDay = cluster[cluster.length - 1];
                    const daysSinceLastActive = differenceInDays(dailyData[j].date, lastClusterDay.date);

                    // CRITICAL FIX: Break cluster if gap > 2 days (Separate weekends)
                    if (daysSinceLastActive > 2) break;

                    if (dailyData[j].total > baseline * 1.2) {
                        cluster.push(dailyData[j]);
                    }
                    j++;
                }

                if (cluster.length >= 2) {
                    // Valid Cluster found
                    const clusterTxns = cluster.flatMap(d => d.transactions);
                    const totalAmount = clusterTxns.reduce((sum, t) => sum + t.amount, 0);
                    const duration = differenceInDays(cluster[cluster.length - 1].date, cluster[0].date) + 1;
                    
                    // Identify DNA
                    const categoryDNA = {};
                    clusterTxns.forEach(t => {
                        const cat = categoryMap[t.category_id];
                        if (cat) categoryDNA[cat.priority] = (categoryDNA[cat.priority] || 0) + t.amount;
                    });

                    detectedEvents.push({
                        eventType: inferEventType(clusterTxns, categoryMap, duration),
                        totalAmount,
                        duration,
                        startDate: cluster[0].date,
                        categoryDNA
                    });
                }
                i = j;
            } else {
                i++;
            }
        }

        // 4. Generate Archetypes
        const eventsByType = detectedEvents.reduce((acc, event) => {
            if (!acc[event.eventType]) acc[event.eventType] = [];
            acc[event.eventType].push(event);
            return acc;
        }, {});

        const archetypes = Object.entries(eventsByType).map(([type, typeEvents]) => {
            // @ts-ignore
            const avgAmount = typeEvents.reduce((sum, e) => sum + e.totalAmount, 0) / typeEvents.length;
            // @ts-ignore
            const avgDuration = typeEvents.reduce((sum, e) => sum + e.duration, 0) / typeEvents.length;
            
            // @ts-ignore
            const lastOccurrence = typeEvents[typeEvents.length - 1].startDate;
            
            // Calculate category breakdown %
            // @ts-ignore
            const totalSpend = typeEvents.reduce((sum, e) => sum + e.totalAmount, 0);
            const categoryBreakdown = {};
            // @ts-ignore
            typeEvents.forEach(event => {
                Object.entries(event.categoryDNA).forEach(([priority, amount]) => {
                    // @ts-ignore
                    categoryBreakdown[priority] = (categoryBreakdown[priority] || 0) + amount;
                });
            });
            Object.keys(categoryBreakdown).forEach(p => {
                categoryBreakdown[p] = (categoryBreakdown[p] / totalSpend) * 100;
            });

            return {
                type,
                name: formatArchetypeName(type),
                recommendedAmount: Math.round(avgAmount),
                typicalDuration: Math.round(avgDuration),
                // @ts-ignore
                occurrences: typeEvents.length,
                categoryBreakdown,
                // @ts-ignore
                confidence: calculateConfidence(typeEvents),
                lastOccurrence
            };
        }).sort((a, b) => b.confidence - a.confidence);

        // 5. Save to User Metadata (Persistence)
        // This allows the frontend to simply READ this data next time, instead of calculating it.
        await base44.entities.User.update(user.id, {
            privateMetadata: {
                ...user.privateMetadata,
                budgetArchetypes: archetypes,
                lastAnalysisDate: new Date().toISOString()
            }
        });

        return Response.json({ success: true, count: archetypes.length, archetypes }, { headers: corsHeaders });

    } catch (error) {
        console.error('Analysis Error:', error);
        return Response.json({ error: error.message }, { status: 500, headers: corsHeaders });
    }
});
