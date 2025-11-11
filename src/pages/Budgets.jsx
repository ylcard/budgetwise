import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useSettings } from "../components/utils/SettingsContext";
import { usePeriod } from "../components/hooks/usePeriod";
import {
  useTransactions,
  useCategories,
  useCustomBudgetsAll,
  useSystemBudgetsForPeriod,
  useCashWallet,
} from "../components/hooks/useBase44Entities";
import { useBudgetsAggregates } from "../components/hooks/useDerivedData";
import { useCustomBudgetActions } from "../components/hooks/useActions";
import { getCustomBudgetStats } from "../components/utils/budgetCalculations";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

import CustomBudgetForm from "../components/custombudgets/CustomBudgetForm";
import BudgetCard from "../components/budgets/BudgetCard";
import MonthNavigator from "../components/ui/MonthNavigator";

export default function Budgets() {
  const { user, settings } = useSettings();
  const [budgetToDelete, setBudgetToDelete] = useState(null);

  const { selectedMonth, setSelectedMonth, selectedYear, setSelectedYear, displayDate, monthStart, monthEnd } = usePeriod();

  const { transactions } = useTransactions();
  const { categories } = useCategories();
  const { allCustomBudgets } = useCustomBudgetsAll(user);
  const { systemBudgets, isLoading: loadingSystemBudgets } = useSystemBudgetsForPeriod(user, monthStart, monthEnd);
  const { cashWallet } = useCashWallet(user);

  const { customBudgets, systemBudgetsWithStats, groupedCustomBudgets } = useBudgetsAggregates(
    transactions,
    categories,
    allCustomBudgets,
    systemBudgets,
    selectedMonth,
    selectedYear
  );

  const customBudgetActions = useCustomBudgetActions(user, transactions, cashWallet);

  const confirmDelete = () => {
    if (budgetToDelete) {
      customBudgetActions.handleDelete(budgetToDelete);
      setBudgetToDelete(null);
    }
  };

  const sortedCustomBudgets = (() => {
    const now = new Date();
    
    return [...customBudgets].sort((a, b) => {
      const statusPriority = { active: 1, planned: 2, completed: 3 };
      const aPriority = statusPriority[a.status] || 999;
      const bPriority = statusPriority[b.status] || 999;
      
      if (aPriority !== bPriority) {
        return aPriority - bPriority;
      }
      
      const aStart = new Date(a.startDate);
      const bStart = new Date(b.startDate);
      const aDistance = Math.abs(aStart - now);
      const bDistance = Math.abs(bStart - now);
      
      return aDistance - bDistance;
    });
  })();

  return (
    <div className="min-h-screen p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-3xl md:text-4xl font-bold text-gray-900">Budgets</h1>
            <p className="text-gray-500 mt-1">Manage your budgets for {displayDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</p>
          </div>
        </div>

        <MonthNavigator
          currentMonth={selectedMonth}
          currentYear={selectedYear}
          onMonthChange={(month, year) => {
            setSelectedMonth(month);
            setSelectedYear(year);
          }}
        />

        {/* System Budgets Section */}
        {systemBudgetsWithStats.length > 0 && (
          <Card className="border-none shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <span className="px-3 py-1 rounded-lg text-sm bg-blue-50 text-blue-600">
                  System Budgets
                </span>
                <span className="text-gray-400">({systemBudgetsWithStats.length})</span>
              </CardTitle>
              <p className="text-sm text-gray-500 mt-2">
                Automatically managed based on your budget goals. These update based on your monthly income.
              </p>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                {systemBudgetsWithStats.map((budget) => {
                  const adaptedBudget = {
                    ...budget,
                    allocatedAmount: budget.budgetAmount,
                    status: 'active',
                    isSystemBudget: true
                  };
                  
                  return (
                    <BudgetCard
                      key={budget.id}
                      budget={adaptedBudget}
                      stats={budget.preCalculatedStats}
                      settings={settings}
                    />
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}

        {/* ENHANCEMENT (2025-01-12): Custom Budgets with Popover form */}
        {sortedCustomBudgets.length === 0 ? (
          <Card className="border-none shadow-lg">
            <CardHeader className="flex flex-row items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="px-3 py-1 rounded-lg text-sm bg-purple-50 text-purple-600">
                  Custom Budgets
                </span>
              </div>
              <Popover open={customBudgetActions.showForm} onOpenChange={customBudgetActions.setShowForm}>
                <PopoverTrigger asChild>
                  <Button
                    className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 shadow-lg"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Create Custom Budget
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[600px]" align="end">
                  <div className="space-y-2">
                    <h3 className="font-semibold text-lg">Create Custom Budget</h3>
                    <CustomBudgetForm
                      budget={customBudgetActions.editingBudget}
                      onSubmit={customBudgetActions.handleSubmit}
                      onCancel={() => {
                        customBudgetActions.setShowForm(false);
                        customBudgetActions.setEditingBudget(null);
                      }}
                      isSubmitting={customBudgetActions.isSubmitting}
                      cashWallet={cashWallet}
                      baseCurrency={settings.baseCurrency}
                      settings={settings}
                    />
                  </div>
                </PopoverContent>
              </Popover>
            </CardHeader>
            <CardContent>
              <div className="h-40 flex items-center justify-center text-gray-400">
                <p>No custom budgets yet. Create your first one!</p>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card className="border-none shadow-lg">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <span className="px-3 py-1 rounded-lg text-sm bg-purple-50 text-purple-600">
                    Custom Budgets
                  </span>
                  <span className="text-gray-400">({sortedCustomBudgets.length})</span>
                </div>
                <p className="text-sm text-gray-500">
                  Custom budgets containing wants expenses, sorted by status and date
                </p>
              </div>
              <Popover open={customBudgetActions.showForm} onOpenChange={customBudgetActions.setShowForm}>
                <PopoverTrigger asChild>
                  <Button
                    className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 shadow-lg"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Create Custom Budget
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[600px]" align="end">
                  <div className="space-y-2">
                    <h3 className="font-semibold text-lg">Create Custom Budget</h3>
                    <CustomBudgetForm
                      budget={customBudgetActions.editingBudget}
                      onSubmit={customBudgetActions.handleSubmit}
                      onCancel={() => {
                        customBudgetActions.setShowForm(false);
                        customBudgetActions.setEditingBudget(null);
                      }}
                      isSubmitting={customBudgetActions.isSubmitting}
                      cashWallet={cashWallet}
                      baseCurrency={settings.baseCurrency}
                      settings={settings}
                    />
                  </div>
                </PopoverContent>
              </Popover>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                {sortedCustomBudgets.map((budget) => {
                  const stats = getCustomBudgetStats(budget, transactions);
                  
                  return (
                    <BudgetCard
                      key={budget.id}
                      budget={budget}
                      stats={stats}
                      settings={settings}
                    />
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}

        <AlertDialog open={!!budgetToDelete} onOpenChange={(open) => !open && setBudgetToDelete(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Are you sure?</AlertDialogTitle>
              <AlertDialogDescription>
                This will delete the budget and all associated transactions. This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={confirmDelete} className="bg-red-600 hover:bg-red-700">
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
}

// ENHANCEMENT (2025-01-12): Converted form to Popover
// - Form now appears in popover instead of full-screen Card
// - Popover width set to 600px for optimal form layout
// - Aligned to "end" for right-side appearance
// - No scrolling required due to compact form design