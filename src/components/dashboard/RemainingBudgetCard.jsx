import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { TrendingUp, TrendingDown } from "lucide-react";
// UPDATED 11-Nov-2025: Changed import from formatCurrency.js to currencyUtils.js
import { formatCurrency } from "../utils/currencyUtils";

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
        <div className="flex items-start justify-between mb-6">
          <div className="flex-1">
            {monthNavigator}
          </div>
          <div className="flex flex-col gap-2 ml-4">
            {addIncomeButton}
            {addExpenseButton}
          </div>
        </div>

        <div className="text-center mb-6">
          <p className="text-white/90 text-sm mb-2">Remaining Budget</p>
          <h2 className="text-4xl md:text-5xl font-bold text-white">
            {formatCurrency(remainingBudget, settings)}
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4 max-w-3xl mx-auto w-full">
          <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4">
            <div className="flex items-center gap-2 mb-2 justify-center">
              <TrendingUp className="w-4 h-4 text-green-300" />
              <p className="text-white/80 text-xs">Income</p>
            </div>
            <p className="text-xl font-bold text-white text-center">
              {formatCurrency(currentMonthIncome, settings)}
            </p>
          </div>

          <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4">
            <div className="flex items-center gap-2 mb-2 justify-center">
              <TrendingDown className="w-4 h-4 text-red-300" />
              <p className="text-white/80 text-xs">Expenses</p>
            </div>
            <p className="text-xl font-bold text-white text-center">
              {formatCurrency(currentMonthExpenses, settings)}
            </p>
          </div>

          <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4">
            <div className="flex items-center justify-center mb-2">
              <p className="text-white/80 text-xs">Budget Used</p>
            </div>
            <div className="text-center">
              <span className="text-xl font-bold text-white">{Math.round(percentageUsed)}%</span>
            </div>
          </div>
        </div>

      </CardContent>
    </Card>
  );
}

// UPDATED 11-Nov-2025: Changed import to use currencyUtils.js instead of deprecated formatCurrency.js