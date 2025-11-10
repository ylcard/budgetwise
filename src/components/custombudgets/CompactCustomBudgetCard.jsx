import React, { useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { formatCurrency } from "../utils/formatCurrency";
import { motion } from "framer-motion";

// Helper to get currency symbol
const getCurrencySymbol = (currencyCode) => {
  const currencySymbols = {
    'USD': '$', 'EUR': '€', 'GBP': '£', 'JPY': '¥', 'CAD': 'CA$', 'AUD': 'A$',
    'CHF': 'CHF', 'CNY': '¥', 'INR': '₹', 'MXN': 'MX$', 'BRL': 'R$', 'ZAR': 'R',
    'KRW': '₩', 'SGD': 'S$', 'NZD': 'NZ$', 'HKD': 'HK$', 'SEK': 'kr', 'NOK': 'kr',
    'DKK': 'kr', 'PLN': 'zł', 'THB': '฿', 'MYR': 'RM', 'IDR': 'Rp', 'PHP': '₱',
    'CZK': 'Kč', 'ILS': '₪', 'CLP': 'CLP$', 'AED': 'د.إ', 'SAR': '﷼', 'TWD': 'NT$', 'TRY': '₺'
  };
  return currencySymbols[currencyCode] || currencyCode;
};

export default function CompactCustomBudgetCard({ budget, stats, settings }) {
  const baseCurrency = settings?.baseCurrency || 'USD';

  // Use unit-based totals for percentage calculation (no conversion)
  const percentageUsed = useMemo(() => {
    const allocated = stats?.totalAllocatedUnits || 0;
    const spent = stats?.totalSpentUnits || 0;
    return allocated > 0 ? (spent / allocated) * 100 : 0;
  }, [stats]);

  // Separate paid amounts by currency
  const paidAmounts = useMemo(() => {
    const amounts = {};
    
    // Digital paid (in base currency) - subtract unpaid to get actual paid
    const digitalPaid = (stats?.digital?.spent || 0) - (stats?.digital?.unpaid || 0);
    if (digitalPaid > 0) {
      amounts[baseCurrency] = (amounts[baseCurrency] || 0) + digitalPaid;
    }
    
    // Cash paid by currency
    if (stats?.cashByCurrency) {
      Object.entries(stats.cashByCurrency).forEach(([currency, data]) => {
        if (data?.spent > 0) {
          amounts[currency] = (amounts[currency] || 0) + data.spent;
        }
      });
    }
    
    return amounts;
  }, [stats, baseCurrency]);

  // Unpaid amount (digital only, in base currency)
  const unpaidAmount = stats?.digital?.unpaid || 0;

  // Circular progress SVG
  const radius = 38;
  const circumference = 2 * Math.PI * radius;
  const paidPercentage = (stats?.totalAllocatedUnits || 0) > 0 
    ? (((stats?.totalSpentUnits || 0) - (stats?.totalUnpaidUnits || 0)) / (stats?.totalAllocatedUnits || 0)) * 100 
    : 0;
  const unpaidPercentage = (stats?.totalAllocatedUnits || 0) > 0 
    ? ((stats?.totalUnpaidUnits || 0) / (stats?.totalAllocatedUnits || 0)) * 100 
    : 0;
  
  const paidStrokeDashoffset = circumference - (paidPercentage / 100) * circumference;
  const unpaidStrokeDashoffset = circumference - ((paidPercentage + unpaidPercentage) / 100) * circumference;

  const color = budget.color || '#3B82F6';
  const lightColor = `${color}80`; // 50% opacity for unpaid

  const hasPaid = Object.values(paidAmounts).some(amount => amount > 0);
  const hasUnpaid = unpaidAmount > 0;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      whileHover={{ scale: 1.02 }}
    >
      <Card className="border-none shadow-md hover:shadow-lg transition-all overflow-hidden">
        <div className="h-1 w-full" style={{ backgroundColor: color }} />
        <CardContent className="p-4">
          <Link to={createPageUrl(`BudgetDetail?id=${budget.id}`)}>
            <h3 className="font-bold text-gray-900 text-sm mb-3 hover:text-blue-600 transition-colors truncate">
              {budget.name}
            </h3>
          </Link>

          {/* Circular Progress */}
          <div className="flex items-center justify-center mb-3">
            <div className="relative w-20 h-20">
              <svg className="w-20 h-20 transform -rotate-90">
                {/* Background circle */}
                <circle
                  cx="40"
                  cy="40"
                  r={radius}
                  stroke="#E5E7EB"
                  strokeWidth="6"
                  fill="none"
                />
                {/* Paid progress */}
                <circle
                  cx="40"
                  cy="40"
                  r={radius}
                  stroke={color}
                  strokeWidth="6"
                  fill="none"
                  strokeDasharray={circumference}
                  strokeDashoffset={paidStrokeDashoffset}
                  strokeLinecap="round"
                  className="transition-all duration-500"
                />
                {/* Unpaid progress */}
                {unpaidAmount > 0 && (
                  <circle
                    cx="40"
                    cy="40"
                    r={radius}
                    stroke={lightColor}
                    strokeWidth="6"
                    fill="none"
                    strokeDasharray={circumference}
                    strokeDashoffset={unpaidStrokeDashoffset}
                    strokeLinecap="round"
                    className="transition-all duration-500"
                  />
                )}
              </svg>
              {/* Percentage text */}
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-base font-bold text-gray-900">
                  {Math.round(percentageUsed)}%
                </span>
              </div>
            </div>
          </div>

          {/* Paid and Unpaid Amounts - Side by Side */}
          <div className="grid grid-cols-2 gap-3 text-xs">
            {/* Paid column */}
            {hasPaid && (
              <div>
                <p className="text-gray-500 mb-1">Paid</p>
                {Object.entries(paidAmounts)
                  .filter(([_, amount]) => amount > 0)
                  .map(([currency, amount]) => {
                    const symbol = getCurrencySymbol(currency);
                    return (
                      <p key={currency} className="font-semibold text-gray-900">
                        {currency === baseCurrency 
                          ? formatCurrency(amount, settings)
                          : `${symbol}${amount.toFixed(2)}`
                        }
                      </p>
                    );
                  })}
              </div>
            )}

            {/* Unpaid column */}
            {hasUnpaid && (
              <div>
                <p className="text-gray-500 mb-1">Unpaid</p>
                <p className="font-semibold text-orange-600">
                  {formatCurrency(unpaidAmount, settings)}
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}