import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
// COMMENTED OUT 13-Jan-2025: AnimatePresence no longer needed as form is now in Dialog
// import { motion, AnimatePresence } from "framer-motion";
// COMMENTED OUT 13-Jan-2025: AllocationForm replaced with AllocationFormDialog
// import AllocationForm from "./AllocationForm";
import AllocationFormDialog from "./AllocationFormDialog";
import AllocationCard from "./AllocationCard";
import { useSettings } from "../utils/SettingsContext";
import { useCashWallet } from "../hooks/useBase44Entities";
// UPDATED 12-Jan-2025: Changed import from formatCurrency.jsx to currencyUtils.js
import { formatCurrency, getCurrencySymbol } from "../utils/currencyUtils";

export default function AllocationManager({
  customBudget,
  allocations,
  categories,
  allocationStats,
  monthStart,
  monthEnd,
  onCreateAllocation,
  onUpdateAllocation,
  onDeleteAllocation,
  isSubmitting
}) {
  const { settings, user } = useSettings();
  const { cashWallet } = useCashWallet(user);
  const [showForm, setShowForm] = useState(false);
  const [editingAllocation, setEditingAllocation] = useState(null);

  const handleSubmit = (data) => {
    if (editingAllocation) {
      onUpdateAllocation({ id: editingAllocation.id, data });
    } else {
      onCreateAllocation({
        ...data,
        customBudgetId: customBudget.id
      });
    }
    setShowForm(false);
    setEditingAllocation(null);
  };

  const handleEdit = (allocation) => {
    setEditingAllocation(allocation);
    setShowForm(true);
  };

  const handleDelete = (id) => {
    if (confirm('Are you sure you want to delete this allocation?')) {
      onDeleteAllocation(id);
    }
  };

  const handleCancel = () => {
    setShowForm(false);
    setEditingAllocation(null);
  };

  // REFACTORED 13-Jan-2025: Calculate remaining funds purely based on allocations (no expenses)
  // Card remaining = customBudget.allocatedAmount - sum of digital allocations
  const digitalAllocations = allocations.filter(a => a.allocationType === 'digital');
  const totalDigitalAllocated = digitalAllocations.reduce((sum, a) => sum + a.allocatedAmount, 0);
  const remainingCard = customBudget.allocatedAmount - totalDigitalAllocated;
  
  // Cash remaining per currency = cashAllocations[currency] - sum of cash allocations for that currency
  const remainingCashByCurrency = {};
  if (customBudget?.cashAllocations) {
    customBudget.cashAllocations.forEach(cashAlloc => {
      const cashAllocationsForCurrency = allocations.filter(
        a => a.allocationType === 'cash' && a.currency === cashAlloc.currencyCode
      );
      const totalAllocatedForCurrency = cashAllocationsForCurrency.reduce((sum, a) => sum + a.allocatedAmount, 0);
      
      remainingCashByCurrency[cashAlloc.currencyCode] = cashAlloc.amount - totalAllocatedForCurrency;
    });
  }

  return (
    <Card className="border-none shadow-lg">
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>Budget Allocations</CardTitle>
          <p className="text-sm text-gray-500 mt-1">
            Allocate portions of your budget to specific categories
          </p>
        </div>
        <Button
          onClick={() => setShowForm(true)}
          size="sm"
          className="bg-gradient-to-r from-blue-600 to-purple-600"
        >
          <Plus className="w-4 h-4 mr-2" />
          Allocate Funds
        </Button>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* REDESIGNED 13-Jan-2025: Remaining Funds Card with horizontal layout and corrected calculations */}
        <div className="max-w-xs p-6 bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl border-2 border-dashed border-gray-300">
          <p className="text-sm text-center font-medium text-gray-600 mb-4">Remaining Funds</p>
          
          <div className="grid grid-cols-2 gap-6">
            {/* Card Remaining */}
            <div className="flex flex-col items-center">
              <p className="text-sm text-gray-500 mb-2">Card</p>
              <p className="text-3xl font-bold text-gray-900">
                {formatCurrency(remainingCard, settings)}
              </p>
            </div>

            {/* Cash Remaining by Currency */}
            {Object.keys(remainingCashByCurrency).length > 0 && (
              <div className="flex flex-col items-center">
                <p className="text-sm text-gray-500 mb-2">Cash</p>
                <div className="space-y-2">
                  {Object.entries(remainingCashByCurrency).map(([currency, amount]) => (
                    <div key={currency}>
                      <p className="text-3xl font-bold text-gray-900">
                        {formatCurrency(amount, { ...settings, currencySymbol: getCurrencySymbol(currency) })}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            {/* Show placeholder if no cash allocations */}
            {Object.keys(remainingCashByCurrency).length === 0 && (
              <div className="flex flex-col">
                <p className="text-sm text-gray-500 mb-2">Cash</p>
                <p className="text-sm text-gray-400 italic">No cash allocated</p>
              </div>
            )}
          </div>
        </div>

        {/* UPDATED 13-Jan-2025: Replaced inline AllocationForm with AllocationFormDialog */}
        <AllocationFormDialog
          open={showForm}
          onOpenChange={setShowForm}
          allocation={editingAllocation}
          customBudget={customBudget}
          categories={categories}
          onSubmit={handleSubmit}
          isSubmitting={isSubmitting}
          settings={settings}
          cashWallet={cashWallet}
        />

        {/* Allocations List */}
        {allocations.length === 0 ? (
          <div className="h-40 flex items-center justify-center text-gray-400 border-2 border-dashed border-gray-200 rounded-xl">
            <p>No allocations yet. Add your first one!</p>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {allocations.map((allocation) => {
              const category = categories.find(c => c.id === allocation.categoryId);
              const stats = allocationStats?.categorySpending?.[allocation.categoryId];
              
              return (
                <AllocationCard
                  key={allocation.id}
                  allocation={allocation}
                  category={category}
                  stats={stats}
                  onEdit={() => handleEdit(allocation)}
                  onDelete={() => handleDelete(allocation.id)}
                  settings={settings}
                />
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// REFACTORED 13-Jan-2025: Major redesign and refactoring
// 1. Redesigned "Remaining Funds" card with horizontal split (Card | Cash) using grid layout
// 2. Added max-w-2xl to constrain card width
// 3. Fixed Card remaining calculation: only deducts digital allocations, not expenses
// 4. Fixed Cash remaining calculation: only deducts cash allocations per currency, not expenses
// 5. Removed currency code display next to Cash (e.g., "(EUR)") - symbol is sufficient
// 6. Renamed "Digital" to "Card" throughout
// 7. Replaced inline AllocationForm with AllocationFormDialog for better UX
// 8. Updated allocation cards grid to be more responsive (xl:grid-cols-4 instead of 2)
// 9. Removed AnimatePresence wrapper (Dialog handles animations)
// ENHANCEMENT (2025-01-11):
// 1. Updated remaining funds display to separate digital and cash amounts
// 2. Shows cash remaining by currency in a grid layout
// 3. Passes cashWallet to AllocationForm for available balance display
// 4. Calculates remaining cash per currency based on allocations
// UPDATED 12-Jan-2025: Changed import from formatCurrency.jsx to currencyUtils.js