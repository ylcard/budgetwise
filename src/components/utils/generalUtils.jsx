/**
 * @file General Utilities
 * @description General, domain-agnostic utility functions.
 * @created 2025-01-11
 * @updated 2025-11-13
 */

/**
 * Utility function to create a map from an array of entities.
 * Can optionally extract a specific field value instead of the whole entity.
 * @param {Array<object>} entities - Array of entity objects.
 * @param {string} keyField - Field to use as the map key (default: 'id').
 * @param {function} valueExtractor - Optional function to extract/transform the value (e.g., entity => entity.name).
 * @returns {object} Map of key -> entity (or extracted value).
 */
export const createEntityMap = (entities, keyField = 'id', valueExtractor = null) => {
    if (!Array.isArray(entities)) return {};
    return entities.reduce((acc, entity) => {
        if (entity && entity[keyField]) {
            acc[entity[keyField]] = valueExtractor ? valueExtractor(entity) : entity;
        }
        return acc;
    }, {});
};

/**
 * Normalize amount input by removing non-numeric characters except decimal separators.
 * Converts comma to period for standardization, handling common user input formats.
 * @param {string|number} amount - Amount value to normalize.
 * @returns {string} Normalized amount string (ready for parsing/calculation).
 */
export const normalizeAmount = (amount) => {
    if (!amount) return '';
    return amount.toString().replace(/[^\d.,]/g, '').replace(',', '.');
};

/**
 * Chunks an array into smaller arrays of a specified size.
 * @param {Array} array - The array to chunk.
 * @param {number} chunkSize - The size of each chunk.
 * @returns {Array<Array>} An array of chunks.
 */
export const chunkArray = (array, chunkSize) => {
    const chunks = [];
    for (let i = 0; i < array.length; i += chunkSize) {
        chunks.push(array.slice(i, i + chunkSize));
    }
    return chunks;
};