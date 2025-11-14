import React from "react";
// UPDATED 15-Jan-2025: Changed Button import to CustomButton
import { CustomButton } from "@/components/ui/CustomButton";
import { CheckCircle, Trash2 } from "lucide-react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
// UPDATED 12-Jan-2025: Changed import from formatCurrency.jsx to currencyUtils.js
import { formatCurrency } from "../utils/currencyUtils";

export default function BudgetBar({ 
  budget, 
  isCustom = false, 
  isSystemSavings = false,
  settings,
  onDelete,
  onComplete,
  hideActions = false
}) {
  const { 
    stats, 
    targetAmount, 
    targetPercentage, 
    expectedAmount = 0,
    expectedSeparateCash = [], // DEPRECATED 2025-01-12: No longer used as we removed "ghost amounts"
    maxHeight, 
    isOverBudget, 
    overBudgetAmount,
    actualSavings,
    savingsTarget
  } = budget;
  
  const isCompleted = budget.status === 'completed';
  
  // Get the color for the vertical bar
  const barColor = budget.color || '#3B82F6';
  
  // Calculate budget amount for display
  let budgetAmount = 0;
  if (isCustom && stats) {
    budgetAmount = stats.totalBudget || 0;
  } else {
    budgetAmount = targetAmount || budget.budgetAmount || budget.allocatedAmount || 0;
  }
  
  // Calculate paid amount
  const paidAmount = stats?.paidAmount || 0;
  
  // Calculate heights as percentages of maxHeight
  const paidHeightPct = maxHeight > 0 ? (paidAmount / maxHeight) * 100 : 0;
  const expectedHeightPct = maxHeight > 0 ? (expectedAmount / maxHeight) * 100 : 0;
  const targetLinePosition = maxHeight > 0 && budgetAmount ? (budgetAmount / maxHeight) * 100 : 100;
  
  // Calculate remaining for display
  let remaining = 0;
  if (isSystemSavings) {
    remaining = savingsTarget - actualSavings;
  } else if (isCustom && stats) {
    // For custom budgets, sum digital and cash remaining
    remaining = stats?.digital?.remaining || 0;
    if (stats?.cashByCurrency) {
      Object.values(stats.cashByCurrency).forEach(cashData => {
        remaining += cashData?.remaining || 0;
      });
    }
  } else {
    // For system budgets
    remaining = targetAmount - expectedAmount - paidAmount;
  }
  
  return (
    <Link
      to={createPageUrl(`BudgetDetail?id=${budget.id}`)}
      className="flex-shrink-0 w-40"
    >
      <div className="flex flex-col items-center gap-3 group cursor-pointer">
        <div className={`relative w-full bg-gray-100 rounded-xl h-64 overflow-hidden hover:shadow-lg transition-all ${
          isOverBudget && !isSystemSavings ? 'border-2 border-red-500' : ''
        }`}>
          {isSystemSavings ? (
            /* Savings bar - show actual savings vs target */
            <>
              <div
                className="absolute bottom-0 w-full rounded-b-xl transition-all duration-300"
                style={{
                  height: `${savingsTarget > 0 ? Math.min((actualSavings / savingsTarget) * 100, 100) : 0}%`,
                  backgroundColor: barColor
                }}
              />
              
              {/* Target line */}
              <div
                className="absolute w-full border-t-2 border-dashed border-gray-800 z-10"
                style={{ bottom: '100%' }}
              />
            </>
          ) : (
            /* Regular budget bars (both system and custom) */
            <>
              {/* Paid amount - solid color */}
              <div
                className="absolute bottom-0 w-full rounded-b-xl transition-all duration-300"
                style={{
                  height: `${paidHeightPct}%`,
                  backgroundColor: barColor
                }}
              />
              
              {/* UPDATED 2025-01-12: Changed "Expected" to "Unpaid" - now only shows actual unpaid expenses */}
              {/* Unpaid amount (on top of paid) - semi-transparent */}
              {expectedAmount > 0 && (
                <div
                  className="absolute w-full transition-all duration-300"
                  style={{
                    bottom: `${paidHeightPct}%`,
                    height: `${expectedHeightPct}%`,
                    backgroundColor: `${barColor}40`
                  }}
                />
              )}
              
              {/* Target line (budget limit) - dashed line showing allocated budget */}
              {budgetAmount > 0 && (
                <div
                  className="absolute w-full border-t-2 border-dashed border-gray-800 z-10"
                  style={{ bottom: `${targetLinePosition}%` }}
                />
              )}
            </>
          )}
          
          {/* Completed badge - centered */}
          {isCompleted && (
            <div className="absolute inset-0 flex items-center justify-center z-10">
              <div className="bg-green-500 text-white text-xs font-bold px-2 py-1 rounded flex items-center gap-1">
                <CheckCircle className="w-3 h-3" />
                Done
              </div>
            </div>
          )}
          
          {/* Action buttons for custom budgets only */}
          {!hideActions && isCustom && !isCompleted && onDelete && onComplete && (
            <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity z-10">
              {/* UPDATED 15-Jan-2025: Changed to CustomButton with success variant */}
              <CustomButton
                variant="success"
                size="icon-sm"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  onComplete(budget.id);
                }}
              >
                <CheckCircle className="w-4 h-4" />
              </CustomButton>
              {/* UPDATED 15-Jan-2025: Changed to CustomButton with delete variant */}
              <CustomButton
                variant="delete"
                size="icon-sm"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  if (confirm('Are you sure you want to delete this budget? All associated transactions will also be deleted.')) {
                    onDelete(budget.id);
                  }
                }}
              >
                <Trash2 className="w-4 h-4" />
              </CustomButton>
            </div>
          )}
        </div>
        
        {/* ENHANCEMENT (2025-01-11): Conditionally hide "Paid: 0" labels */}
        <div className="text-center w-full px-2">
          <p className="font-bold text-gray-900 text-sm truncate mb-1">{budget.name}</p>
          {isSystemSavings ? (
            <>
              <p className="text-xs text-gray-600">
                Target: {formatCurrency(savingsTarget, settings)}
              </p>
              <p className="text-xs text-gray-600">
                Actual: {formatCurrency(actualSavings, settings)}
              </p>
              {remaining > 0 ? (
                <p className="text-xs text-orange-600 font-bold mt-1">
                  Short by {formatCurrency(remaining, settings)}
                </p>
              ) : (
                <p className="text-xs text-green-600 font-bold mt-1">
                  Target met! 🎉
                </p>
              )}
            </>
          ) : !isCustom ? (
            /* System budget labels */
            <>
              <p className="text-xs text-gray-600">
                Budget: {formatCurrency(targetAmount, settings)}
              </p>
              {/* UPDATED 2025-01-12: Changed label from "Expected" to "Unpaid" */}
              {expectedAmount > 0 && (
                <div className="text-xs text-orange-600">
                  <span>Unpaid: {formatCurrency(expectedAmount, settings)}</span>
                  {/* COMMENTED OUT 2025-01-12: No longer showing separate cash as we removed "ghost amounts" */}
                  {/*
                  {expectedSeparateCash && expectedSeparateCash.length > 0 && (
                    <span className="ml-1">
                      ({expectedSeparateCash.map(cash => 
                        `${cash.symbol}${cash.amount.toFixed(2)}`
                      ).join(', ')})
                    </span>
                  )}
                  */}
                </div>
              )}
              {/* ENHANCEMENT (2025-01-11): Only show "Paid" if amount is greater than 0 */}
              {paidAmount > 0 && (
                <p className="text-xs text-gray-600">
                  Paid: {formatCurrency(paidAmount, settings)}
                </p>
              )}
              <p className={`text-sm font-medium mt-1 ${remaining < 0 ? 'text-red-600' : 'text-gray-900'}`}>
                {remaining < 0 ? `Over by ${formatCurrency(Math.abs(remaining), settings)}` : `Remaining: ${formatCurrency(remaining, settings)}`}
              </p>
            </>
          ) : isCompleted ? (
            /* Completed custom budget labels */
            <>
              <p className="text-xs text-gray-600">
                Spent: {formatCurrency(stats?.digital?.spent || 0, settings)}
              </p>
            </>
          ) : (
            /* Active custom budget labels */
            <>
              <p className="text-xs text-gray-600">
                Budget: {formatCurrency(budgetAmount, settings)}
              </p>
              {/* UPDATED 2025-01-12: Changed label from "Expected" to "Unpaid" */}
              {expectedAmount > 0 && (
                <p className="text-xs text-orange-600">
                  Unpaid: {formatCurrency(expectedAmount, settings)}
                </p>
              )}
              {/* ENHANCEMENT (2025-01-11): Only show "Paid" if amount is greater than 0 */}
              {paidAmount > 0 && (
                <p className="text-xs text-gray-600">
                  Paid: {formatCurrency(paidAmount, settings)}
                </p>
              )}
              <p className={`text-sm font-medium mt-1 ${remaining < 0 ? 'text-red-600' : 'text-gray-900'}`}>
                {remaining < 0 ? `Over by ${formatCurrency(Math.abs(remaining), settings)}` : `Remaining: ${formatCurrency(remaining, settings)}`}
              </p>
            </>
          )}
        </div>
      </div>
    </Link>
  );
}

// UPDATED 2025-01-12: Changed "Expected" labels to "Unpaid" throughout
// This better reflects that we're showing actual unpaid expenses, not theoretical allocations
// Removed display of separate cash amounts as we no longer include "ghost amounts" in calculations
// UPDATED 15-Jan-2025: Replaced Button with CustomButton
// - Complete button uses success variant (green)
// - Delete button uses delete variant (red)
// - Both use icon-sm size for compact display