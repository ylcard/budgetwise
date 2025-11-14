import React, { useState } from "react";
// COMMENTED OUT 16-Jan-2025: Replaced with CustomButton for consistency
// import { Button } from "@/components/ui/button";
import { CustomButton } from "@/components/ui/CustomButton";
import { Plus } from "lucide-react";
import { useTransactions, useCategories, useCashWallet } from "../components/hooks/useBase44Entities";
import { useTransactionFiltering } from "../components/hooks/useDerivedData";
import { useTransactionActions } from "../components/hooks/useActions";
import { useSettings } from "../components/utils/SettingsContext";

import TransactionForm from "../components/transactions/TransactionForm";
import TransactionList from "../components/transactions/TransactionList";
import TransactionFilters from "../components/transactions/TransactionFilters";

export default function Transactions() {
  const { user } = useSettings();
  const [showForm, setShowForm] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState(null);

  // Data fetching
  const { transactions, isLoading } = useTransactions();
  const { categories } = useCategories();
  const { cashWallet } = useCashWallet(user);

  // Filtering logic
  const { filters, setFilters, filteredTransactions } = useTransactionFiltering(transactions);

  // Actions (mutations and handlers)
  // UPDATED 15-Jan-2025: Simplified - removed ConfirmDialog state, now uses global provider
  const { handleSubmit, handleEdit, handleDelete, isSubmitting } = useTransactionActions(
    setShowForm,
    setEditingTransaction,
    cashWallet
  );

  return (
    <div className="min-h-screen p-4 md:p-8">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-3xl md:text-4xl font-bold text-gray-900">Transactions</h1>
            <p className="text-gray-500 mt-1">Track your income and expenses</p>
          </div>
          <TransactionForm
            transaction={null}
            categories={categories}
            onSubmit={(data) => handleSubmit(data, null)}
            onCancel={() => setShowForm(false)}
            isSubmitting={isSubmitting}
            transactions={transactions}
            trigger={
              <CustomButton variant="primary" className="shadow-lg">
                <Plus className="w-4 h-4 mr-2" />
                Add Transaction
              </CustomButton>
            }
          />
        </div>

        <TransactionFilters
          filters={filters}
          setFilters={setFilters}
          categories={categories}
        />

        <TransactionList
          transactions={filteredTransactions}
          categories={categories}
          onEdit={handleEdit}
          onDelete={handleDelete}
          isLoading={isLoading}
          onSubmit={handleSubmit}
          isSubmitting={isSubmitting}
        />
      </div>
    </div>
  );
}

// DEPRECATED 15-Jan-2025: The old showForm state and TransactionForm wrapper has been removed
// Now using TransactionForm component with popover trigger directly
// The form now handles its own state and visibility through the Popover component

// FIXED 15-Jan-2025: Critical bug fix for edit functionality
// - Changed onEdit prop from inline arrow function to handleEdit from useTransactionActions
// - The old implementation: onEdit={(transaction, data) => handleSubmit(data, transaction)}
//   was incorrect because onEdit should open the edit form, not submit it
// - handleEdit properly sets editingTransaction state and opens the form
// - handleSubmit is called internally by TransactionForm after user submits
// - Added onSubmit and isSubmitting props to TransactionList for proper form handling

// UPDATED 15-Jan-2025: Removed local ConfirmDialog component and state
// Now uses global ConfirmDialogProvider via useConfirm hook in useTransactionActions
// All confirmation logic centralized in useActions hook using confirmAction from provider

// UPDATED 16-Jan-2025: Replaced Button with CustomButton for "Add Transaction" trigger
// - Uses variant="primary" (gradient blue-purple) for primary action
// - Removed manual gradient styling as variant provides it