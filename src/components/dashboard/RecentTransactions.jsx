import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { ArrowRight, ChevronLeft, ChevronRight } from "lucide-react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { formatCurrency } from "../utils/formatCurrency";
import { iconMap, IncomeIcon } from "../utils/iconMapConfig";
import { useSettings } from "../utils/SettingsContext";
import { usePeriod } from "../hooks/usePeriod";
import { createEntityMap } from "../utils/budgetCalculations";

export default function RecentTransactions({ transactions, categories, customBudgets, isCollapsed, onToggleCollapse }) {
  const { settings } = useSettings();
  const { currentYear } = usePeriod();

  const categoryMap = createEntityMap(categories);
  const customBudgetMap = createEntityMap(customBudgets);

  if (transactions.length === 0) {
    return (
      <Card className={`border-none shadow-lg transition-all ${isCollapsed ? 'w-20' : ''}`}>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className={isCollapsed ? 'hidden' : ''}>Recent Transactions</CardTitle>
          <Button
            variant="ghost"
            size="icon"
            onClick={onToggleCollapse}
            className="ml-auto"
          >
            {isCollapsed ? <ChevronLeft className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
          </Button>
        </CardHeader>
        {!isCollapsed && (
          <CardContent>
            <div className="h-40 flex items-center justify-center text-gray-400">
              <p>No paid transactions yet. Add your first one!</p>
            </div>
          </CardContent>
        )}
      </Card>
    );
  }

  return (
    <Card className={`border-none shadow-lg transition-all ${isCollapsed ? 'w-20' : ''}`}>
      <CardHeader className="flex flex-row items-center justify-between">
        {!isCollapsed && (
          <>
            <CardTitle>Recent Transactions</CardTitle>
            <Link to={createPageUrl("Transactions")} className="text-sm text-blue-600 hover:text-blue-700 flex items-center gap-1">
              View All
              <ArrowRight className="w-4 h-4" />
            </Link>
          </>
        )}
        <Button
          variant="ghost"
          size="icon"
          onClick={onToggleCollapse}
          className={isCollapsed ? '' : 'ml-2'}
        >
          {isCollapsed ? <ChevronLeft className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
        </Button>
      </CardHeader>
      {!isCollapsed && (
        <CardContent>
          <div className="space-y-2">
            {transactions.map((transaction) => {
              const category = categoryMap[transaction.category_id];
              const customBudget = transaction.customBudgetId ? customBudgetMap[transaction.customBudgetId] : null;
              const isIncome = transaction.type === 'income';
              const IconComponent = category?.icon && iconMap[category.icon] ? iconMap[category.icon] : null;
              
              const paidYear = transaction.paidDate ? new Date(transaction.paidDate).getFullYear() : null;
              const showYear = paidYear && paidYear !== currentYear;
              
              return (
                <div 
                  key={transaction.id}
                  className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 transition-colors group"
                >
                  <div className="flex items-center gap-3 flex-1">
                    {isIncome ? (
                      <div 
                        className="w-10 h-10 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform"
                        style={{ backgroundColor: '#10B98120' }}
                      >
                        <IncomeIcon className="w-5 h-5" style={{ color: '#10B981' }} />
                      </div>
                    ) : category && IconComponent && (
                      <div 
                        className="w-10 h-10 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform"
                        style={{ backgroundColor: `${category.color}20` }}
                      >
                        <IconComponent className="w-5 h-5" style={{ color: category.color }} />
                      </div>
                    )}
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-gray-900">{transaction.title}</p>
                      </div>
                      <div className="flex items-center gap-2 mt-1 flex-wrap">
                        <p className="text-sm text-gray-500">
                          {format(new Date(transaction.date), "MMM d, yyyy")}
                        </p>
                        {!isIncome && transaction.paidDate && (
                          <>
                            <span className="text-gray-300">•</span>
                            <p className="text-xs text-green-600">
                              Paid {format(new Date(transaction.paidDate), showYear ? "MMM d, yyyy" : "MMM d")}
                            </p>
                          </>
                        )}
                        {customBudget && (
                          <>
                            <span className="text-gray-300">•</span>
                            <Badge variant="outline" className="text-xs">
                              {customBudget.name}
                            </Badge>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className={`font-bold ${transaction.type === 'income' ? 'text-green-600' : 'text-red-600'}`}>
                      {transaction.type === 'income' ? '+' : '-'}{formatCurrency(transaction.amount, settings)}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      )}
    </Card>
  );
}