import React, { useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Pencil, Trash2, Calendar, Receipt, CheckCircle, Archive } from "lucide-react";
import { format } from "date-fns";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
// COMMENTED OUT 12-Jan-2025: getCustomBudgetStats is now calculated inline where needed
// import { getCustomBudgetStats } from "../utils/budgetCalculations";
// UPDATED 12-Jan-2025: Changed import from formatCurrency.jsx to currencyUtils.js
import { formatCurrency, getCurrencySymbol } from "../utils/currencyUtils";
import { motion } from "framer-motion";
import { getProgressBarColor } from "../utils/progressBarColor";

export default function CustomBudgetCard({ 
  budget, 
  transactions, 
  settings, 
  onEdit, 
  onDelete, 
  onStatusChange,
  hideActions = false
}) {
  // Use pre-calculated stats if available (for system budgets), otherwise calculate inline
  const stats = useMemo(() => {
    if (budget.preCalculatedStats) {
      return budget.preCalculatedStats;
    }
    
    // Calculate stats inline (same logic as getCustomBudgetStats)
    const budgetTransactions = transactions.filter(t => t.customBudgetId === budget.id);

    const digitalTransactions = budgetTransactions.filter(
      t => !t.isCashTransaction || t.cashTransactionType !== 'expense_from_wallet'
    );
    const cashTransactions = budgetTransactions.filter(
      t => t.isCashTransaction && t.cashTransactionType === 'expense_from_wallet'
    );

    const digitalAllocated = budget.allocatedAmount || 0;
    const digitalSpent = digitalTransactions
      .filter(t => t.type === 'expense')
      .reduce((sum, t) => sum + (t.originalAmount || t.amount), 0);
    const digitalUnpaid = digitalTransactions
      .filter(t => t.type === 'expense' && !t.isPaid)
      .reduce((sum, t) => sum + (t.originalAmount || t.amount), 0);
    const digitalRemaining = digitalAllocated - digitalSpent;

    const cashByCurrency = {};
    const cashAllocations = budget.cashAllocations || [];
    
    cashAllocations.forEach(allocation => {
      const currencyCode = allocation.currencyCode;
      const allocated = allocation.amount || 0;
      
      const spent = cashTransactions
        .filter(t => t.type === 'expense' && t.cashCurrency === currencyCode)
        .reduce((sum, t) => sum + (t.cashAmount || 0), 0);
      
      const remaining = allocated - spent;
      
      cashByCurrency[currencyCode] = {
        allocated,
        spent,
        remaining
      };
    });

    const totalAllocatedUnits = digitalAllocated + cashAllocations.reduce((sum, alloc) => sum + alloc.amount, 0);
    const totalSpentUnits = digitalSpent + Object.values(cashByCurrency).reduce((sum, cashData) => sum + cashData.spent, 0);
    const totalUnpaidUnits = digitalUnpaid;

    return {
      digital: {
        allocated: digitalAllocated,
        spent: digitalSpent,
        unpaid: digitalUnpaid,
        remaining: digitalRemaining
      },
      cashByCurrency,
      totalAllocatedUnits,
      totalSpentUnits,
      totalUnpaidUnits,
      totalTransactionCount: budgetTransactions.length
    };
  }, [budget, transactions]);

  const canDelete = !budget.isSystemBudget && !hideActions;
  const canEdit = !budget.isSystemBudget && !hideActions;
  const canChangeStatus = !budget.isSystemBudget && !hideActions;
  
  const isCompleted = budget.status === 'completed';

  // Calculate totals from separated digital and cash with safety checks
  let totalBudget = stats?.digital?.allocated || 0;
  let totalSpent = stats?.digital?.spent || 0;
  
  if (stats?.cashByCurrency) {
    Object.values(stats.cashByCurrency).forEach(cashData => {
      totalBudget += cashData?.allocated || 0;
      totalSpent += cashData?.spent || 0;
    });
  }
  
  const percentageUsed = totalBudget > 0 ? (totalSpent / totalBudget) * 100 : 0;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      whileHover={{ scale: 1.02 }}
    >
      <Card className="border-none shadow-lg hover:shadow-xl transition-all overflow-hidden group">
        <div
          className="h-2 w-full"
          style={{ backgroundColor: budget.color || '#3B82F6' }}
        />
        <CardContent className="p-6">
          <div className="flex items-start justify-between mb-4">
            <div className="flex-1">
              <Link to={createPageUrl(`BudgetDetail?id=${budget.id}`)}>
                <div className="flex items-center gap-2">
                  <h3 className="font-bold text-gray-900 text-lg mb-1 hover:text-blue-600 transition-colors">
                    {budget.name}
                  </h3>
                  {budget.isSystemBudget && (
                    <Badge variant="outline" className="text-xs">System</Badge>
                  )}
                </div>
              </Link>
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <Calendar className="w-4 h-4" />
                <span>
                  {format(new Date(budget.startDate), "MMM d")} - {format(new Date(budget.endDate), "MMM d, yyyy")}
                </span>
              </div>
            </div>
            {(canEdit || canDelete) && (
              <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                {canEdit && onEdit && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => onEdit(budget)}
                    className="hover:bg-blue-50 hover:text-blue-600 h-8 w-8"
                  >
                    <Pencil className="w-4 h-4" />
                  </Button>
                )}
                {canDelete && onDelete && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => onDelete(budget.id)}
                    className="hover:bg-red-50 hover:text-red-600 h-8 w-8"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                )}
              </div>
            )}
          </div>

          <div className="space-y-4">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-gray-600">Budget Used</span>
                <Badge variant={percentageUsed > 100 ? "destructive" : "default"}>
                  {percentageUsed.toFixed(0)}%
                </Badge>
              </div>
              <Progress
                value={Math.min(percentageUsed, 100)}
                className="h-2"
                style={{ '--progress-background': getProgressBarColor(percentageUsed) }}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              {isCompleted ? (
                <>
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Spent (Digital)</p>
                    <p className="font-bold text-gray-900">
                      {formatCurrency(stats?.digital?.spent || 0, settings)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Original Budget</p>
                    <p className="font-bold text-gray-900">
                      {formatCurrency(budget.originalAllocatedAmount || totalBudget, settings)}
                    </p>
                  </div>
                </>
              ) : (
                <>
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Remaining (Digital)</p>
                    <p className="font-bold text-gray-900">
                      {formatCurrency(stats?.digital?.remaining || 0, settings)}
                    </p>
                    {stats?.cashByCurrency && Object.keys(stats.cashByCurrency).length > 0 && (
                      <div className="mt-1 space-y-0.5">
                        {Object.entries(stats.cashByCurrency).map(([currency, data]) => (
                          <p key={currency} className="text-xs text-gray-600">
                            Cash ({currency}): {formatCurrency(data?.remaining || 0, { ...settings, currencySymbol: getCurrencySymbol(currency) })}
                          </p>
                        ))}
                      </div>
                    )}
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Total Budget</p>
                    <p className="font-bold text-gray-900">
                      {formatCurrency(totalBudget, settings)}
                    </p>
                  </div>
                </>
              )}
            </div>

            <div className="flex items-center justify-between pt-2 border-t">
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Receipt className="w-4 h-4" />
                <span>{stats?.totalTransactionCount || 0} expenses</span>
              </div>
              {!isCompleted && (stats?.digital?.unpaid || 0) > 0 && (
                <Badge variant="outline" className="text-orange-600 border-orange-600">
                  {formatCurrency(stats.digital.unpaid, settings)} unpaid
                </Badge>
              )}
            </div>

            {canChangeStatus && budget.status === 'active' && onStatusChange && (
              <div className="flex gap-2 pt-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onStatusChange(budget.id, 'completed')}
                  className="flex-1 text-green-600 border-green-600 hover:bg-green-50"
                >
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Complete
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

// UPDATED 12-Jan-2025: Changed import from formatCurrency.jsx to currencyUtils.js
// UPDATED 12-Jan-2025: Removed dependency on budgetCalculations.js, now calculating stats inline