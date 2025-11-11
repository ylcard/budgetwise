import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import AllocationForm from "./AllocationForm";
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

  // Calculate remaining funds - split by digital and cash
  const remainingDigital = allocationStats?.unallocatedRemaining || 0;
  
  const remainingCashByCurrency = {};
  if (customBudget?.cashAllocations) {
    customBudget.cashAllocations.forEach(cashAlloc => {
      const allocated = allocations
        .filter(a => a.allocationType === 'cash' && a.currency === cashAlloc.currencyCode)
        .reduce((sum, a) => sum + a.allocatedAmount, 0);
      
      remainingCashByCurrency[cashAlloc.currencyCode] = cashAlloc.amount - allocated;
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
          className="bg-gradient-to-r from-blue-600 to-purple-600"
        >
          <Plus className="w-4 h-4 mr-2" />
          Allocate Funds
        </Button>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Remaining Funds Card */}
        <div className="p-6 bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl border-2 border-dashed border-gray-300">
          <p className="text-sm font-medium text-gray-600 mb-2">Remaining Funds</p>
          
          {/* Digital Remaining */}
          <div className="mb-3">
            <p className="text-xs text-gray-500 mb-1">Digital (Card/Bank)</p>
            <p className="text-3xl font-bold text-gray-900">
              {formatCurrency(remainingDigital, settings)}
            </p>
          </div>

          {/* Cash Remaining by Currency */}
          {Object.keys(remainingCashByCurrency).length > 0 && (
            <div className="pt-3 border-t border-gray-300">
              <p className="text-xs text-gray-500 mb-2">Cash</p>
              <div className="grid grid-cols-2 gap-2">
                {Object.entries(remainingCashByCurrency).map(([currency, amount]) => (
                  <div key={currency} className="bg-white/60 rounded-lg p-2">
                    <p className="text-xs text-gray-600">{currency}</p>
                    <p className="text-lg font-bold text-gray-900">
                      {formatCurrency(amount, { ...settings, currencySymbol: getCurrencySymbol(currency) })}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Allocation Form */}
        <AnimatePresence>
          {showForm && (
            <AllocationForm
              allocation={editingAllocation}
              customBudget={customBudget}
              categories={categories}
              onSubmit={handleSubmit}
              onCancel={handleCancel}
              isSubmitting={isSubmitting}
              settings={settings}
              cashWallet={cashWallet}
            />
          )}
        </AnimatePresence>

        {/* Allocations List */}
        {allocations.length === 0 ? (
          <div className="h-40 flex items-center justify-center text-gray-400 border-2 border-dashed border-gray-200 rounded-xl">
            <p>No allocations yet. Add your first one!</p>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 gap-4">
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

// ENHANCEMENT (2025-01-11):
// 1. Updated remaining funds display to separate digital and cash amounts
// 2. Shows cash remaining by currency in a grid layout
// 3. Passes cashWallet to AllocationForm for available balance display
// 4. Calculates remaining cash per currency based on allocations
// UPDATED 12-Jan-2025: Changed import from formatCurrency.jsx to currencyUtils.js