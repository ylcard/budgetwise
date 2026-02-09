/**
 * Applies renaming rules stored in CategoryRule objects.
 * It looks for rules where 'renamedTitle' is present.
 * * @param {string} rawTitle - The original messy string
 * @param {Array} rules - The array of CategoryRule objects
 * @returns {string} - The cleaned title, or null if no rule matched
 */
export const applyCleanupRules = (rawTitle, rules = []) => {
    if (!rawTitle) return null;
    const normalizedRaw = rawTitle.trim();

    // Find a rule where the 'keyword' matches the raw input AND has a rename instruction
    const match = rules.find(r =>
        r.keyword &&
        r.renamedTitle &&
        r.keyword.trim() === normalizedRaw
    );

    if (match) {
        return match.renamedTitle;
    }

    return null; // No change
};

/**
 * Compares original LLM output vs Final User Edits to generate new CategoryRules.
 * * @param {Array} finalTransactions - The processed transactions ready for import
 * @param {string} userEmail - Needed for the entity schema
 * @returns {Array} - Array of new CategoryRule objects to create
 */
export const detectRenamingPatterns = (finalTransactions, userEmail) => {
    const rulesMap = new Map();

    finalTransactions.forEach(tx => {
        // Only learn if:
        // 1. The user hasn't opted out (shouldLearn)
        // 2. We have the original raw data
        // 3. The title was actually changed
        // 4. A category was assigned
        const original = tx.originalData?.reason?.trim();
        const final = tx.title?.trim();
        const isChanged = original && final && original !== final;

        if (tx.shouldLearn && isChanged && tx.categoryId) {
            // If we haven't already created a rule for this specific messy keyword in this batch
            if (!rulesMap.has(original)) {
                rulesMap.set(original, {
                    keyword: original,       // Match this dirty text
                    renamedTitle: final,     // Change it to this clean text
                    categoryId: tx.categoryId, // Also learn the category
                    user_email: userEmail,
                    priority: 10             // High priority so it overrides defaults
                });
            }
        }
    });

    return Array.from(rulesMap.values());
};