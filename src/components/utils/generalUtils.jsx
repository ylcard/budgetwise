/**
 * General utility functions
 * Non-domain-specific helpers for common operations
 * Created: 11-Nov-2025 - Extracted from budgetCalculations.js
 */

/**
 * Create a map from an array of entities
 * Can optionally extract a specific field value instead of the whole entity
 * @param {Array} entities - Array of entity objects
 * @param {string} keyField - Field to use as map key (default: 'id')
 * @param {Function} valueExtractor - Optional function to extract/transform the value
 * @returns {Object} Map of key to entity/value
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
 * Normalize amount input by removing non-numeric characters except decimal separators
 * Converts comma to period for standardization
 * @param {string|number} amount - Amount to normalize
 * @returns {string} Normalized amount string
 */
export const normalizeAmount = (amount) => {
    if (!amount) return '';
    return amount.toString().replace(/[^\d.,]/g, '').replace(',', '.');
};