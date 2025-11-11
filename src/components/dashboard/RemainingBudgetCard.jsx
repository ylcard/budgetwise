import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { TrendingUp, TrendingDown, DollarSign } from "lucide-react";
import { formatCurrency } from "../utils/formatCurrency";

export default function RemainingBudgetCard({ 
  remainingBudget, 
  currentMonthIncome, 
  currentMonthExpenses, 
  settings,
  monthNavigator,
  addIncomeButton,
  addExpenseButton
}) {
  const percentageUsed = currentMonthIncome > 0 
    ? (currentMonthExpenses / currentMonthIncome) * 100 
    : 0;

  return (
    <Card className="relative overflow-hidden border-none shadow-lg h-full">
      <div className="absolute inset-0 bg-gradient-to-br from-blue-600 via-purple-600 to-pink-600 opacity-90" />
      
      <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -mr-32 -mt-32" />
      <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/10 rounded-full -ml-24 -mb-24" />
      
      <CardContent className="relative z-10 p-6 flex flex-col h-full">
        <div className="flex items-center justify-between mb-4">
          <div className="flex-1">
            {monthNavigator}
          </div>
        </div>

        <div className="flex-1 flex flex-col justify-center mb-6">
          <p className="text-white/90 text-sm mb-2">Remaining Budget</p>
          <div className="flex items-baseline gap-3">
            <h2 className="text-4xl md:text-5xl font-bold text-white">
              {formatCurrency(remainingBudget, settings)}
            </h2>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="w-4 h-4 text-green-300" />
              <p className="text-white/80 text-xs">Income</p>
            </div>
            <p className="text-xl font-bold text-white">
              {formatCurrency(currentMonthIncome, settings)}
            </p>
          </div>

          <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <TrendingDown className="w-4 h-4 text-red-300" />
              <p className="text-white/80 text-xs">Expenses</p>
            </div>
            <p className="text-xl font-bold text-white">
              {formatCurrency(currentMonthExpenses, settings)}
            </p>
          </div>
        </div>

        <div className="bg-white/10 backdrop-blur-sm rounded-xl p-3 mb-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-white/80 text-sm">Budget Used</span>
            <span className="text-white font-semibold">{Math.round(percentageUsed)}%</span>
          </div>
          <div className="w-full bg-white/20 rounded-full h-2">
            <div 
              className="bg-white rounded-full h-2 transition-all duration-500"
              style={{ width: `${Math.min(percentageUsed, 100)}%` }}
            />
          </div>
        </div>

        {/* ENHANCEMENT (2025-01-12): Stacked buttons vertically */}
        <div className="flex flex-col gap-2">
          {addIncomeButton}
          {addExpenseButton}
        </div>
      </CardContent>
    </Card>
  );
}

// ENHANCEMENT (2025-01-12): Changed button container to flex-col for vertical stacking