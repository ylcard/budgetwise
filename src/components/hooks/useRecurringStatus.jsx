import { useMemo } from 'react';
import { differenceInDays, parseISO } from 'date-fns';

/**
 * Calculates the status of recurring templates by matching them against
 * actual transactions from the current month.
 */
export function useRecurringStatus(recurringTransactions, currentMonthTransactions) {
    return useMemo(() => {
        if (!recurringTransactions || !currentMonthTransactions) return [];

        // 1. Create a map of transactions that are already explicitly linked via ID
        const linkedMap = new Map();
        const unlinkedTransactions = [];

        currentMonthTransactions.forEach(tx => {
            if (tx.recurring_transaction_id) {
                linkedMap.set(tx.recurring_transaction_id, tx);
            } else {
                unlinkedTransactions.push(tx);
            }
        });

        // 2. Process each recurring template
        return recurringTransactions.map(template => {
            // A. Check for Explicit Link (The "Golden" Link)
            if (linkedMap.has(template.id)) {
                return {
                    ...template,
                    status: 'paid',
                    linkedTransaction: linkedMap.get(template.id),
                    matchConfidence: 1.0,
                    matchReason: 'explicit_link'
                };
            }

            // B. Find a "Smart Match" among unlinked transactions
            let bestMatch = null;
            let highestScore = 0;

            const targetDate = parseISO(template.nextOccurrence);
            
            // FILTER: Only look at transactions with the same category
            const candidates = unlinkedTransactions.filter(
                tx => tx.category_id === template.category_id
            );

            candidates.forEach(tx => {
                // --- SCORE 1: AMOUNT (Weight: 70%) ---
                // Calculate percentage difference
                const diff = Math.abs(tx.amount - template.amount);
                const percentDiff = diff / (template.amount || 1); 
                
                // Hard Fail: If difference is > 20%, score is 0.
                const amountScore = percentDiff > 0.2 ? 0 : (1 - (percentDiff * 5)); 
                // (Multiplier * 5 makes 20% diff = 0 score, 0% diff = 1 score)

                // --- SCORE 2: TEXT (Weight: 20%) ---
                // Simple token match
                const txTitle = (tx.title || "").toLowerCase();
                const tempTitle = (template.title || "").toLowerCase();
                // Split into words (tokens)
                const templateTokens = tempTitle.split(/[\s,.-]+/).filter(t => t.length > 3);
                
                let textScore = 0;
                if (templateTokens.length > 0) {
                     // If any significant word matches, give full points
                    const hasMatch = templateTokens.some(token => txTitle.includes(token));
                    textScore = hasMatch ? 1 : 0;
                } else {
                    // Fallback for short titles: exact inclusion
                    textScore = txTitle.includes(tempTitle) ? 1 : 0;
                }

                // --- SCORE 3: DAY (Weight: 10%) ---
                // Just a sanity check to prefer dates closer to the target
                const daysDiff = Math.abs(differenceInDays(parseISO(tx.date), targetDate));
                // Decay over 30 days
                const dayScore = Math.max(0, 1 - (daysDiff / 30));

                // --- WEIGHTED TOTAL ---
                const totalScore = (amountScore * 0.7) + (textScore * 0.2) + (dayScore * 0.1);

                if (totalScore > highestScore) {
                    highestScore = totalScore;
                    bestMatch = tx;
                }
            });

            // C. Threshold Check (> 80% confidence required)
            if (bestMatch && highestScore > 0.80) {
                return {
                    ...template,
                    status: 'paid', 
                    linkedTransaction: bestMatch,
                    matchConfidence: highestScore,
                    matchReason: 'smart_match'
                };
            }

            // D. No Match Found
            return {
                ...template,
                status: 'due',
                linkedTransaction: null
            };
        });

    }, [recurringTransactions, currentMonthTransactions]);
}
