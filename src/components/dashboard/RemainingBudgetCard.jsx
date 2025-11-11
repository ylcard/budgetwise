import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { TrendingUp, TrendingDown } from "lucide-react";
import { formatCurrency } from "../utils/formatCurrency";

export default function RemainingBudgetCard({ 
  remainingBudget, 
  currentMonthIncome, 
  currentMonthExpenses, 
  settings,
  monthNavigator = null,
  addIncomeButton = null,
  addExpenseButton = null
}) {
  const percentageUsed = currentMonthIncome > 0 ? (currentMonthExpenses / currentMonthIncome) * 100 : 0;

  return (
    <Card className="border-none shadow-xl bg-gradient-to-br from-blue-600 to-purple-700 text-white overflow-hidden relative">
      <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -mr-32 -mt-32" />
      <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/10 rounded-full -ml-24 -mb-24" />
      
      <CardContent className="p-8 relative z-10">
        {/* ENHANCEMENT (2025-01-11): Month navigator and buttons at the top */}
        <div className="flex items-center justify-between mb-6">
          {/* Left: Month Navigator */}
          <div>
            {monthNavigator}
          </div>
          
          {/* Right: Action Buttons */}
          <div className="flex items-center gap-2">
            {addIncomeButton}
            {addExpenseButton}
          </div>
        </div>

        {/* ENHANCEMENT (2025-01-11): Centered title */}
        <h2 className="text-2xl font-semibold text-center mb-4">Remaining Budget</h2>
        
        <div>
          <p className="text-5xl md:text-6xl font-bold mb-6 text-center">
            {formatCurrency(remainingBudget, settings)}
          </p>
          
          <div className="grid md:grid-cols-3 gap-4">
            <div className="bg-white/10 rounded-lg p-4 backdrop-blur-sm">
              <div className="flex flex-col items-center text-center mb-2">
                <div className="flex items-center gap-2 mb-2">
                  <TrendingUp className="w-4 h-4" />
                  <span className="text-sm opacity-90">Income</span>
                </div>
                <p className="text-2xl font-bold">{formatCurrency(currentMonthIncome, settings)}</p>
              </div>
            </div>
            
            <div className="bg-white/10 rounded-lg p-4 backdrop-blur-sm">
              <div className="flex flex-col items-center text-center mb-2">
                <div className="flex items-center gap-2 mb-2">
                  <TrendingDown className="w-4 h-4" />
                  <span className="text-sm opacity-90">Expenses</span>
                </div>
                <p className="text-2xl font-bold">{formatCurrency(currentMonthExpenses, settings)}</p>
              </div>
            </div>
            
            <div className="bg-white/10 rounded-lg p-4 backdrop-blur-sm">
              <div className="flex flex-col items-center text-center mb-2">
                <span className="text-sm opacity-90 mb-2">Budget Used</span>
                <p className="text-2xl font-bold">{percentageUsed.toFixed(1)}%</p>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ENHANCEMENTS (2025-01-11):
// 1. Added monthNavigator prop for the month switch element (positioned top-left)
// 2. Added addExpenseButton prop alongside addIncomeButton (both positioned top-right)
// 3. Renamed title from "Remaining Budget This Month" to "Remaining Budget" and centered it
// 4. Removed Wallet icon from title to simplify the design