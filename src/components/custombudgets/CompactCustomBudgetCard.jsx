import React, { useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { formatCurrency } from "../utils/formatCurrency";
import { getCurrencySymbol } from "../utils/currencyUtils";
import { motion } from "framer-motion";
import { CheckCircle, Clock } from "lucide-react";

export default function CompactCustomBudgetCard({ budget, stats, settings }) {
  const baseCurrency = settings?.baseCurrency || 'USD';
  const isSystemBudget = budget.isSystemBudget || false;

  // Calculate percentage and amounts based on budget type
  const { percentageUsed, paidAmounts, unpaidAmount } = useMemo(() => {
    if (isSystemBudget) {
      // System Budget Logic
      const totalBudget = budget.budgetAmount || 0;
      const paidTotal = stats?.paid?.totalBaseCurrencyAmount || 0;
      const unpaidTotal = stats?.unpaid?.totalBaseCurrencyAmount || 0;
      const totalSpent = paidTotal + unpaidTotal;
      
      const percentage = totalBudget > 0 ? (totalSpent / totalBudget) * 100 : 0;
      
      // Paid amounts - base currency + foreign currencies
      const paid = {};
      if (paidTotal > 0) {
        paid[baseCurrency] = paidTotal;
      }
      if (stats?.paid?.foreignCurrencyDetails) {
        stats.paid.foreignCurrencyDetails.forEach(detail => {
          if (detail.amount > 0) {
            paid[detail.currencyCode] = (paid[detail.currencyCode] || 0) + detail.amount;
          }
        });
      }
      
      return {
        percentageUsed: percentage,
        paidAmounts: paid,
        unpaidAmount: unpaidTotal
      };
    } else {
      // Custom Budget Logic
      const allocated = stats?.totalAllocatedUnits || 0;
      const spent = stats?.totalSpentUnits || 0;
      const percentage = allocated > 0 ? (spent / allocated) * 100 : 0;

      // Separate paid amounts by currency
      const paid = {};
      
      // Digital paid (in base currency) - subtract unpaid to get actual paid
      const digitalPaid = (stats?.digital?.spent || 0) - (stats?.digital?.unpaid || 0);
      if (digitalPaid > 0) {
        paid[baseCurrency] = (paid[baseCurrency] || 0) + digitalPaid;
      }
      
      // Cash paid by currency
      if (stats?.cashByCurrency) {
        Object.entries(stats.cashByCurrency).forEach(([currency, data]) => {
          if (data?.spent > 0) {
            paid[currency] = (paid[currency] || 0) + data.spent;
          }
        });
      }
      
      // Unpaid amount (digital only, in base currency)
      const unpaid = stats?.digital?.unpaid || 0;
      
      return {
        percentageUsed: percentage,
        paidAmounts: paid,
        unpaidAmount: unpaid
      };
    }
  }, [stats, baseCurrency, isSystemBudget, budget]);

  // Circular progress SVG
  const radius = 38;
  const circumference = 2 * Math.PI * radius;
  
  // Calculate paid and unpaid percentages for the circle
  const totalBudget = isSystemBudget ? (budget.budgetAmount || 0) : (stats?.totalAllocatedUnits || 0);
  const paidTotal = Object.values(paidAmounts).reduce((sum, val) => sum + val, 0);
  const paidPercentage = totalBudget > 0 ? (paidTotal / totalBudget) * 100 : 0;
  const unpaidPercentage = totalBudget > 0 ? (unpaidAmount / totalBudget) * 100 : 0;
  
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
      <Card className="border-none shadow-md hover:shadow-lg transition-all overflow-hidden min-h-[240px] flex flex-col">
        <div className="h-1 w-full" style={{ backgroundColor: color }} />
        <CardContent className="p-4 flex-1 flex flex-col">
          <Link to={createPageUrl(`BudgetDetail?id=${budget.id}`)}>
            <div className="flex items-center gap-2 mb-3">
              <h3 className="font-bold text-gray-900 text-sm hover:text-blue-600 transition-colors truncate flex-1">
                {budget.name}
              </h3>
              {/* ENHANCEMENT (2025-01-11): Hide icons for system budgets */}
              {!isSystemBudget && (
                <>
                  {budget.status === 'completed' && (
                    <CheckCircle className="w-3 h-3 text-green-500 flex-shrink-0" />
                  )}
                  {(budget.status === 'active' || budget.status === 'planned') && (
                    <Clock className="w-3 h-3 text-orange-500 flex-shrink-0" />
                  )}
                </>
              )}
            </div>
          </Link>

          {/* Circular Progress */}
          <div className="flex items-center justify-center mb-3 flex-1">
            <div className="relative w-24 h-24">
              <svg className="w-24 h-24 transform -rotate-90">
                {/* Background circle */}
                <circle
                  cx="48"
                  cy="48"
                  r={radius}
                  stroke="#E5E7EB"
                  strokeWidth="6"
                  fill="none"
                />
                {/* Paid progress */}
                {paidPercentage > 0 && (
                  <circle
                    cx="48"
                    cy="48"
                    r={radius}
                    stroke={color}
                    strokeWidth="6"
                    fill="none"
                    strokeDasharray={circumference}
                    strokeDashoffset={paidStrokeDashoffset}
                    strokeLinecap="round"
                    className="transition-all duration-500"
                  />
                )}
                {/* Unpaid progress */}
                {unpaidPercentage > 0 && (
                  <circle
                    cx="48"
                    cy="48"
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

          {/* ENHANCEMENT (2025-01-11): Dynamic layout based on what amounts exist */}
          {/* If both paid and unpaid exist: side by side grid */}
          {/* If only one exists: centered single column */}
          <div className={`text-xs min-h-[60px] ${hasPaid && hasUnpaid ? 'grid grid-cols-2 gap-3' : 'flex flex-col items-center justify-center'}`}>
            {/* Paid section */}
            {hasPaid && (
              <div className={hasUnpaid ? '' : 'text-center'}>
                <p className="text-gray-500 mb-1">Paid</p>
                {Object.entries(paidAmounts)
                  .filter(([_, amount]) => amount > 0)
                  .map(([currency, amount]) => {
                    const symbol = getCurrencySymbol(currency);
                    return (
                      <p key={currency} className="font-semibold text-gray-900 truncate">
                        {currency === baseCurrency 
                          ? formatCurrency(amount, settings)
                          : `${symbol}${amount.toFixed(2)}`
                        }
                      </p>
                    );
                  })}
              </div>
            )}

            {/* Unpaid section */}
            {hasUnpaid && (
              <div className={hasPaid ? '' : 'text-center'}>
                <p className="text-gray-500 mb-1">Unpaid</p>
                <p className="font-semibold text-orange-600 truncate">
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

// ENHANCEMENTS (2025-01-11):
// 1. Fixed system budget stats display by checking budget.isSystemBudget and using correct fields
// 2. Dynamic layout: centers single amounts, uses grid for side-by-side when both paid/unpaid exist
// 3. Removed icons (CheckCircle, Clock) for system budgets
// 4. Maintains consistent card height with min-h-[240px] and flex layout