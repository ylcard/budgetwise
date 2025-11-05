import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import {
  useTransactionsData,
  useTransactionFiltering,
  useTransactionActions,
} from "../components/hooks/useFinancialData";

import TransactionForm from "../components/transactions/TransactionForm";
import TransactionList from "../components/transactions/TransactionList";
import TransactionFilters from "../components/transactions/TransactionFilters";

export default function Transactions() {
  // UI state
  const [showForm, setShowForm] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState(null);

  // Data fetching
  const { transactions, categories, isLoading } = useTransactionsData();

  // Filtering logic
  const { filters, setFilters, filteredTransactions } = useTransactionFiltering(transactions);

  // Actions (mutations and handlers)
  const { handleSubmit, handleEdit, handleDelete, isSubmitting } = useTransactionActions(
    setShowForm,
    setEditingTransaction
  );

  return (
    <div className="min-h-screen p-4 md:p-8">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-3xl md:text-4xl font-bold text-gray-900">Transactions</h1>
            <p className="text-gray-500 mt-1">Track your income and expenses</p>
          </div>
          <Button
            onClick={() => {
              setEditingTransaction(null);
              setShowForm(!showForm);
            }}
            className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 shadow-lg"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Transaction
          </Button>
        </div>

        {showForm && (
          <TransactionForm
            transaction={editingTransaction}
            categories={categories}
            onSubmit={(data) => handleSubmit(data, editingTransaction)}
            onCancel={() => {
              setShowForm(false);
              setEditingTransaction(null);
            }}
            isSubmitting={isSubmitting}
          />
        )}

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
        />
      </div>
    </div>
  );
}