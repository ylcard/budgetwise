import React, { useState } from "react";
// UPDATED 15-Jan-2025: Changed Button import to CustomButton
import { CustomButton } from "@/components/ui/CustomButton";
import { Plus } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
// COMMENTED OUT 16-Jan-2025: Removed Popover imports as we now use Dialog-based QuickAddBudget
// import {
//   Popover,
//   PopoverContent,
//   PopoverTrigger,
// } from "@/components/ui/popover";
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
import { parseDate } from "../components/utils/dateUtils";

// COMMENTED OUT 16-Jan-2025: No longer directly embedding CustomBudgetForm in Popover
// import CustomBudgetForm from "../components/custombudgets/CustomBudgetForm";
import BudgetCard from "../components/budgets/BudgetCard";
import MonthNavigator from "../components/ui/MonthNavigator";
// ADDED 16-Jan-2025: Import QuickAddBudget for standardized Dialog-based budget creation
import QuickAddBudget from "../components/dashboard/QuickAddBudget";

// UPDATED 13-Jan-2025: Added monthStart and monthEnd parameters to filter paid expenses by selected month
const getCustomBudgetStats = (customBudget, transactions, monthStart, monthEnd) => {
  const budgetTransactions = transactions.filter(t => t.customBudgetId === customBudget.id);

  // Parse month boundaries for filtering paid expenses
  const monthStartDate = parseDate(monthStart);
  const monthEndDate = parseDate(monthEnd);

  // Separate digital and cash transactions
  const digitalTransactions = budgetTransactions.filter(
    t => !t.isCashTransaction || t.cashTransactionType !== 'expense_from_wallet'
  );
  const cashTransactions = budgetTransactions.filter(
    t => t.isCashTransaction && t.cashTransactionType === 'expense_from_wallet'
  );

  // Calculate digital stats - ONLY include paid expenses that were paid within the selected month
  const digitalAllocated = customBudget.allocatedAmount || 0;
  const digitalSpent = digitalTransactions
    .filter(t => {
      if (t.type !== 'expense') return false;
      if (!t.isPaid || !t.paidDate) return false;
      
      // Filter by paidDate within selected month
      const paidDate = parseDate(t.paidDate);
      return paidDate >= monthStartDate && paidDate <= monthEndDate;
    })
    .reduce((sum, t) => sum + (t.originalAmount || t.amount), 0);
  
  const digitalUnpaid = digitalTransactions
    .filter(t => t.type === 'expense' && !t.isPaid)
    .reduce((sum, t) => sum + (t.originalAmount || t.amount), 0);

  // Calculate cash stats by currency - ONLY include paid expenses that were paid within the selected month
  const cashByCurrency = {};
  const cashAllocations = customBudget.cashAllocations || [];
  
  cashAllocations.forEach(allocation => {
    const currencyCode = allocation.currencyCode;
    const allocated = allocation.amount || 0;
    
    const spent = cashTransactions
      .filter(t => {
        if (t.type !== 'expense') return false;
        if (t.cashCurrency !== currencyCode) return false;
        if (!t.isPaid || !t.paidDate) return false;
        
        // Filter by paidDate within selected month
        const paidDate = parseDate(t.paidDate);
        return paidDate >= monthStartDate && paidDate <= monthEndDate;
      })
      .reduce((sum, t) => sum + (t.cashAmount || 0), 0);
    
    cashByCurrency[currencyCode] = {
      allocated,
      spent,
      remaining: allocated - spent
    };
  });

  // Calculate unit-based totals
  const totalAllocatedUnits = digitalAllocated + cashAllocations.reduce((sum, alloc) => sum + alloc.amount, 0);
  const totalSpentUnits = digitalSpent + Object.values(cashByCurrency).reduce((sum, cashData) => sum + cashData.spent, 0);
  const totalUnpaidUnits = digitalUnpaid;

  return {
    digital: {
      allocated: digitalAllocated,
      spent: digitalSpent,
      unpaid: digitalUnpaid,
      remaining: digitalAllocated - digitalSpent
    },
    cashByCurrency,
    totalAllocatedUnits,
    totalSpentUnits,
    totalUnpaidUnits,
    totalTransactionCount: budgetTransactions.length
  };
};

export default function Budgets() {
  const { user, settings } = useSettings();
  const [budgetToDelete, setBudgetToDelete] = useState(null);
  // ADDED 16-Jan-2025: State for controlling QuickAddBudget dialog visibility
  const [showQuickAddBudget, setShowQuickAddBudget] = useState(false);

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

        {/* Custom Budgets Section */}
        {sortedCustomBudgets.length === 0 ? (
          <Card className="border-none shadow-lg">
            <CardHeader className="flex flex-row items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="px-3 py-1 rounded-lg text-sm bg-purple-50 text-purple-600">
                  Custom Budgets
                </span>
              </div>
              {/* UPDATED 16-Jan-2025: Replaced Popover with CustomButton triggering QuickAddBudget dialog */}
              <CustomButton variant="create" onClick={() => setShowQuickAddBudget(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Create Custom Budget
              </CustomButton>
              {/* COMMENTED OUT 16-Jan-2025: Removed Popover-based budget creation in favor of Dialog-based QuickAddBudget
              <Popover open={customBudgetActions.showForm} onOpenChange={customBudgetActions.setShowForm}>
                <PopoverTrigger asChild>
                  <CustomButton variant="create">
                    <Plus className="w-4 h-4 mr-2" />
                    Create Custom Budget
                  </CustomButton>
                </PopoverTrigger>
                <PopoverContent 
                  className="w-[600px] fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 max-h-[90vh] overflow-y-auto z-50" 
                  align="center"
                  side="top"
                  sideOffset={0}
                >
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
              */}
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
              {/* UPDATED 16-Jan-2025: Replaced Popover with CustomButton triggering QuickAddBudget dialog */}
              <CustomButton variant="create" onClick={() => setShowQuickAddBudget(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Create Custom Budget
              </CustomButton>
              {/* COMMENTED OUT 16-Jan-2025: Removed Popover-based budget creation in favor of Dialog-based QuickAddBudget
              <Popover open={customBudgetActions.showForm} onOpenChange={customBudgetActions.setShowForm}>
                <PopoverTrigger asChild>
                  <CustomButton variant="create">
                    <Plus className="w-4 h-4 mr-2" />
                    Create Custom Budget
                  </CustomButton>
                </PopoverTrigger>
                <PopoverContent 
                  className="w-[600px] fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 max-h-[90vh] overflow-y-auto z-50" 
                  align="center"
                  side="top"
                  sideOffset={0}
                >
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
              */}
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                {/* UPDATED 13-Jan-2025: Pass monthStart and monthEnd to getCustomBudgetStats */}
                {sortedCustomBudgets.map((budget) => {
                  const stats = getCustomBudgetStats(budget, transactions, monthStart, monthEnd);
                  
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

        {/* ADDED 16-Jan-2025: QuickAddBudget Dialog for standardized budget creation UI */}
        <QuickAddBudget
          open={showQuickAddBudget}
          onOpenChange={setShowQuickAddBudget}
          onSubmit={customBudgetActions.handleSubmit}
          onCancel={() => setShowQuickAddBudget(false)}
          isSubmitting={customBudgetActions.isSubmitting}
          cashWallet={cashWallet}
          baseCurrency={settings.baseCurrency}
          transactions={transactions}
          allBudgets={allCustomBudgets}
        />

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

// REFACTORED 13-Jan-2025: Updated getCustomBudgetStats to filter paid expenses by selected month's paidDate
// - Added monthStart and monthEnd parameters to getCustomBudgetStats
// - Paid expenses now filtered by paidDate within selected month boundaries
// - This excludes "prepaid" expenses from budget calculations for display purposes
// UPDATED 15-Jan-2025: Replaced Button with CustomButton, using create variant for "Create Custom Budget" buttons
// REFACTORED 16-Jan-2025: Standardized budget creation UI to use Dialog-based QuickAddBudget component
// - Removed Popover-based budget creation form (lines 235-265 and 287-317)
// - Added showQuickAddBudget state to control QuickAddBudget dialog visibility
// - Replaced both Popover instances with simple CustomButton triggers
// - Now uses the same QuickAddBudget component as Dashboard for consistency
// - Adheres to UI modality guidelines (Dialog for major forms, not Popover)
// - Eliminates code duplication and improves maintainability