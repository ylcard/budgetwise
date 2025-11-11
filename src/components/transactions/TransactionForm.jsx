import React from "react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Pencil } from "lucide-react";
import { useSettings } from "../utils/SettingsContext";
import { useCashWallet, useAllBudgets } from "../hooks/useBase44Entities";
import TransactionFormContent from "./TransactionFormContent";

export default function TransactionForm({ 
  transaction, 
  categories, 
  onSubmit, 
  onCancel, 
  isSubmitting,
  transactions = [],
  trigger = null
}) {
  const { user } = useSettings();
  const { cashWallet } = useCashWallet(user);
  const { allBudgets } = useAllBudgets(user);

  return (
    <Popover>
      <PopoverTrigger asChild>
        {trigger || (
          <Button variant="ghost" size="icon" className="hover:bg-blue-50 hover:text-blue-600">
            <Pencil className="w-4 h-4" />
          </Button>
        )}
      </PopoverTrigger>
      <PopoverContent className="w-[400px] max-h-[600px] overflow-y-auto" align="end">
        <div className="space-y-4">
          <h3 className="font-semibold text-lg">
            {transaction ? 'Edit Transaction' : 'Add Transaction'}
          </h3>
          <TransactionFormContent
            initialTransaction={transaction}
            categories={categories}
            allBudgets={allBudgets}
            onSubmit={onSubmit}
            onCancel={onCancel}
            isSubmitting={isSubmitting}
            cashWallet={cashWallet}
            transactions={transactions}
          />
        </div>
      </PopoverContent>
    </Popover>
  );
}

// DEPRECATED: This file has been refactored to use a Popover and the unified TransactionFormContent component.
// The old Card-based modal implementation with inline form logic has been replaced.
// Previous implementation used motion.div with Card and had all form logic inline - now uses Popover wrapper with TransactionFormContent.