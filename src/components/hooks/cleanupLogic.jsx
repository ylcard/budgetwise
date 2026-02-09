/**
 * Applies learned renaming rules to raw transaction titles.
 * * @param {string} rawTitle - The original messy string from the bank/LLM
 * @param {Array} rules - Array of { originalString, replacementString }
 * @returns {string} - The cleaned title or the original if no match
 */
export const applyCleanupRules = (rawTitle, rules = []) => {
    if (!rawTitle) return "";
    
    // Normalize slightly to catch case differences
    const normalizedRaw = rawTitle.trim();

    // Find a rule where the 'originalString' matches the raw input
    // We use exact matching to be safe, but you could expand this to .includes() later
    const match = rules.find(r => r.originalString?.trim() === normalizedRaw);

    return match ? match.replacementString : rawTitle;
};

/**
 * Compares original LLM output vs User Final Edits to detect new patterns.
 * * @param {Array} finalTransactions - The data currently about to be imported
 * @returns {Array} - Array of new rule objects to be saved
 */
export const detectRenamingPatterns = (finalTransactions) => {
    const newRules = [];

    finalTransactions.forEach(tx => {
        // We only learn if we have the original raw data preserved
        if (!tx.originalData || !tx.originalData.reason) return;

        const original = tx.originalData.reason.trim();
        const final = tx.title.trim();

        // If the title changed, it's a candidate for a rule
        if (original !== final) {
            newRules.push({
                originalString: original,
                replacementString: final,
                // We add a simple timestamp or frequency counter if your DB supports it
                createdAt: new Date().toISOString()
            });
        }
    });

    return newRules;
};
