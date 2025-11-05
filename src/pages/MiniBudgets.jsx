import React, { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useSettings } from "../components/utils/SettingsContext";
import {
  useMiniBudgetsData,
  useMiniBudgetsPeriod,
  useMiniBudgetActions,
  useTransactionsData,
} from "../components/hooks/useFinancialData";
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

import MiniBudgetForm from "../components/minibudgets/MiniBudgetForm";
import MiniBudgetCard from "../components/minibudgets/MiniBudgetCard";
import MonthNavigator from "../components/ui/MonthNavigator";

export default function MiniBudgets() {
  const { user, settings } = useSettings();
  const [budgetToDelete, setBudgetToDelete] = useState(null);

  // Period management
  const { selectedMonth, setSelectedMonth, selectedYear, setSelectedYear, displayDate } = useMiniBudgetsPeriod();

  // Data fetching
  const { transactions } = useTransactionsData();
  const { miniBudgets, isLoading } = useMiniBudgetsData(user, selectedMonth, selectedYear);

  // Actions (CRUD operations)
  const {
    showForm,
    setShowForm,
    editingBudget,
    setEditingBudget,
    handleSubmit,
    handleEdit,
    handleDelete,
    handleStatusChange,
    isSubmitting,
  } = useMiniBudgetActions(user, transactions);

  // Confirm and execute delete
  const confirmDelete = () => {
    if (budgetToDelete) {
      handleDelete(budgetToDelete);
      setBudgetToDelete(null);
    }
  };

  // Group custom budgets by status - excluding archived
  const groupedCustomBudgets = useMemo(() => {
    return miniBudgets.reduce((acc, budget) => {
      const status = budget.status || 'active';
      // Skip archived budgets
      if (status === 'archived') return acc;
      if (!acc[status]) acc[status] = [];
      acc[status].push(budget);
      return acc;
    }, {});
  }, [miniBudgets]);

  const statusConfig = {
    active: { label: "Active", color: "text-green-600", bg: "bg-green-50" },
    completed: { label: "Completed", color: "text-blue-600", bg: "bg-blue-50" }
  };

  return (
    <div className="min-h-screen p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-3xl md:text-4xl font-bold text-gray-900">Mini Budgets</h1>
            <p className="text-gray-500 mt-1">
              Manage your event budgets for {displayDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
            </p>
          </div>
          <Button
            onClick={() => {
              setEditingBudget(null);
              setShowForm(!showForm);
            }}
            className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 shadow-lg"
          >
            <Plus className="w-4 h-4 mr-2" />
            Create Custom Budget
          </Button>
        </div>

        <MonthNavigator
          currentMonth={selectedMonth}
          currentYear={selectedYear}
          onMonthChange={(month, year) => {
            setSelectedMonth(month);
            setSelectedYear(year);
          }}
        />

        {showForm && (
          <MiniBudgetForm
            budget={editingBudget}
            onSubmit={handleSubmit}
            onCancel={() => {
              setShowForm(false);
              setEditingBudget(null);
            }}
            isSubmitting={isSubmitting}
            selectedMonth={selectedMonth}
            selectedYear={selectedYear}
          />
        )}

        {/* Custom Budgets Section */}
        {miniBudgets.length === 0 && !isLoading ? (
          <Card className="border-none shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <span className="px-3 py-1 rounded-lg text-sm bg-purple-50 text-purple-600">
                  Custom Budgets
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-40 flex items-center justify-center text-gray-400">
                <p>No custom budgets yet. Create your first one!</p>
              </div>
            </CardContent>
          </Card>
        ) : (
          Object.entries(statusConfig).map(([status, config]) => {
            const statusBudgets = groupedCustomBudgets[status] || [];
            if (statusBudgets.length === 0) return null;

            return (
              <Card key={status} className="border-none shadow-lg">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <span className={`px-3 py-1 rounded-lg text-sm ${config.bg} ${config.color}`}>
                      Custom Budgets - {config.label}
                    </span>
                    <span className="text-gray-400">({statusBudgets.length})</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {statusBudgets.map((budget) => (
                      <MiniBudgetCard
                        key={budget.id}
                        budget={budget}
                        transactions={transactions}
                        settings={settings}
                        onEdit={handleEdit}
                        onDelete={(id) => setBudgetToDelete(id)}
                        onStatusChange={handleStatusChange}
                      />
                    ))}
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}

        {/* Delete Confirmation Dialog */}
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