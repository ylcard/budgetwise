import React, { useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Pencil, Trash2, Calendar, Receipt, CheckCircle, Archive } from "lucide-react";
import { format } from "date-fns";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { getCustomBudgetStats } from "../utils/budgetCalculations";
import { formatCurrency } from "../utils/formatCurrency";
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
  // Use pre-calculated stats if available (for system budgets), otherwise calculate
  const stats = useMemo(() => {
    if (budget.preCalculatedStats) {
      return budget.preCalculatedStats;
    }
    return getCustomBudgetStats(budget, transactions);
  }, [budget, transactions]);

  const canDelete = !budget.isSystemBudget && !hideActions;
  const canEdit = !budget.isSystemBudget && !hideActions;
  const canChangeStatus = !budget.isSystemBudget && !hideActions;
  
  const isCompleted = budget.status === 'completed';

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
                <Badge variant={stats.percentageUsed > 100 ? "destructive" : "default"}>
                  {stats.percentageUsed.toFixed(0)}%
                </Badge>
              </div>
              <Progress
                value={Math.min(stats.percentageUsed, 100)}
                className="h-2"
                style={{ '--progress-background': getProgressBarColor(stats.percentageUsed) }}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              {isCompleted ? (
                <>
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Spent</p>
                    <p className="font-bold text-gray-900">
                      {formatCurrency(stats.totalSpent, settings)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Original Budget</p>
                    <p className="font-bold text-gray-900">
                      {formatCurrency(budget.originalAllocatedAmount || budget.allocatedAmount, settings)}
                    </p>
                  </div>
                </>
              ) : (
                <>
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Remaining</p>
                    <p className="font-bold text-gray-900">
                      {formatCurrency(stats.remaining, settings)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Total Budget</p>
                    <p className="font-bold text-gray-900">
                      {formatCurrency(budget.allocatedAmount, settings)}
                    </p>
                  </div>
                </>
              )}
            </div>

            <div className="flex items-center justify-between pt-2 border-t">
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Receipt className="w-4 h-4" />
                <span>{stats.transactionCount} expenses</span>
              </div>
              {!isCompleted && stats.unpaidAmount > 0 && (
                <Badge variant="outline" className="text-orange-600 border-orange-600">
                  {formatCurrency(stats.unpaidAmount, settings)} unpaid
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