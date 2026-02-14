/**
 * CREATED 14-Feb-2026: Utility functions for exporting data in multiple formats
 */

import { format } from "date-fns";
import { formatCurrency } from "./currencyUtils";

/**
 * Convert data to CSV format
 * @param {Array} data - Array of objects to export
 * @param {Array} headers - Array of {key, label} objects
 * @returns {string} CSV string
 */
export const convertToCSV = (data, headers) => {
    if (!data || data.length === 0) return '';

    // Generate header row
    const headerRow = headers.map(h => `"${h.label}"`).join(',');

    // Generate data rows
    const dataRows = data.map(row => {
        return headers.map(h => {
            const value = row[h.key] ?? '';
            // Escape quotes and wrap in quotes
            return `"${String(value).replace(/"/g, '""')}"`;
        }).join(',');
    });

    return [headerRow, ...dataRows].join('\n');
};

/**
 * Download a file with given content
 * @param {string} content - File content
 * @param {string} filename - File name
 * @param {string} mimeType - MIME type
 */
export const downloadFile = (content, filename, mimeType) => {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
};

/**
 * Generate CSV headers for different entity types
 */
export const CSV_HEADERS = {
    transactions: [
        { key: 'date', label: 'Date' },
        { key: 'title', label: 'Title' },
        { key: 'amount', label: 'Amount' },
        { key: 'type', label: 'Type' },
        { key: 'category', label: 'Category' },
        { key: 'financial_priority', label: 'Priority' },
        { key: 'isPaid', label: 'Paid' },
        { key: 'paidDate', label: 'Paid Date' },
        { key: 'notes', label: 'Notes' }
    ],
    categories: [
        { key: 'name', label: 'Name' },
        { key: 'priority', label: 'Priority' },
        { key: 'icon', label: 'Icon' },
        { key: 'color', label: 'Color' }
    ],
    budgetGoals: [
        { key: 'priority', label: 'Priority' },
        { key: 'target_percentage', label: 'Target Percentage' },
        { key: 'target_amount', label: 'Target Amount' }
    ],
    systemBudgets: [
        { key: 'name', label: 'Name' },
        { key: 'budgetAmount', label: 'Budget Amount' },
        { key: 'systemBudgetType', label: 'Type' },
        { key: 'startDate', label: 'Start Date' },
        { key: 'endDate', label: 'End Date' }
    ],
    customBudgets: [
        { key: 'name', label: 'Name' },
        { key: 'allocatedAmount', label: 'Allocated Amount' },
        { key: 'startDate', label: 'Start Date' },
        { key: 'endDate', label: 'End Date' },
        { key: 'status', label: 'Status' },
        { key: 'description', label: 'Description' }
    ],
    recurringTransactions: [
        { key: 'title', label: 'Title' },
        { key: 'amount', label: 'Amount' },
        { key: 'type', label: 'Type' },
        { key: 'frequency', label: 'Frequency' },
        { key: 'nextOccurrence', label: 'Next Occurrence' },
        { key: 'isActive', label: 'Active' }
    ],
    categoryRules: [
        { key: 'keyword', label: 'Keyword' },
        { key: 'regexPattern', label: 'Regex Pattern' },
        { key: 'categoryName', label: 'Category' },
        { key: 'financial_priority', label: 'Priority' },
        { key: 'renamedTitle', label: 'Renamed Title' }
    ]
};