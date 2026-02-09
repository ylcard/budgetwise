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
    const newRules = [];
    const processedSignatures = new Set(); // Prevent duplicates in the same batch

    finalTransactions.forEach(tx => {
        // Only learn if we have original data 
        if (!tx.originalData || !tx.originalData.reason) return;

        const original = tx.originalData.reason.trim();
        const final = tx.title.trim();

        // If title changed AND we have a valid category
        if (original !== final && tx.categoryId) {
            
            // Avoid creating duplicate rules for the same merchant in one batch
            if (processedSignatures.has(original)) return;
            processedSignatures.add(original);

            newRules.push({
                keyword: original,       // Match this dirty text
                renamedTitle: final,     // Change it to this clean text
                categoryId: tx.categoryId, // Also learn the category
                user_email: userEmail,
                priority: 10             // High priority so it overrides defaults
            });
        }
    });

    return newRules;
};