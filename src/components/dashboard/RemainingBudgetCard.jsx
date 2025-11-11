import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { TrendingUp, TrendingDown, Wallet } from "lucide-react";
import { formatCurrency } from "../utils/formatCurrency";

export default function RemainingBudgetCard({ 
  remainingBudget, 
  currentMonthIncome, 
  currentMonthExpenses, 
  settings,
  addIncomeButton = null
}) {
  const percentageUsed = currentMonthIncome > 0 ? (currentMonthExpenses / currentMonthIncome) * 100 : 0;

  return (
    <Card className="border-none shadow-xl bg-gradient-to-br from-blue-600 to-purple-700 text-white overflow-hidden relative">
      <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -mr-32 -mt-32" />
      <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/10 rounded-full -ml-24 -mb-24" />
      
      <CardContent className="p-8 relative z-10">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-3">
            <Wallet className="w-6 h-6" />
            <h2 className="text-lg font-medium opacity-90">Remaining Budget This Month</h2>
          </div>
          {addIncomeButton && (
            <div className="ml-auto">
              {addIncomeButton}
            </div>
          )}
        </div>
        
        <div className="mt-6">
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

// ISSUE FIX (2025-01-11): Added addIncomeButton prop to allow passing Add Income button
// Button is positioned in the top-right corner of the card header for better visual grouping