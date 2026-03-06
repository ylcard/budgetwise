/**
 * CREATED 14-Feb-2026: Utility functions for exporting data in multiple formats
 * Centralized helpers for CSV conversion and browser-based file downloads.
 */

import { formatDate } from "./dateUtils";

/**
 * Convert an array of objects into a CSV string based on provided headers.
 * Automatically handles date formatting for keys containing "date" or "occurrence".
 * @param {Array} data - Array of objects to export
 * @param {Array<{key: string, label: string}>} headers - Configuration for CSV columns
 * @returns {string} Formatted CSV string
 */
export const convertToCSV = (data, headers) => {
  if (!data || data.length === 0) return '';

  const headerRow = headers.map(h => `"${h.label}"`).join(',');

  const dataRows = data.map(row => {
    return headers.map(h => {
      let value = row[h.key] ?? '';

      // Refactor: Use centralized date formatting for date-related columns
      const keyLower = h.key.toLowerCase();
      if (value && (keyLower.includes('date') || keyLower.includes('occurrence'))) {
        value = formatDate(value, "yyyy-MM-dd");
      }

      return `"${String(value).replace(/"/g, '""')}"`;
    }).join(',');
  });

  return [headerRow, ...dataRows].join('\n');
};

/**
 * Triggers a browser download for a given content string.
 * @param {string} content - File content
 * @param {string} filename - File name
 * @param {string} mimeType - The MIME type (e.g., 'text/csv')
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
 * Predefined header configurations for different BudgetWise entities.
 * Used to map internal object keys to user-friendly CSV column labels.
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