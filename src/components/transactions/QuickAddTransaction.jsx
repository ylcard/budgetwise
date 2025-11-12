import React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { useSettings } from "../utils/SettingsContext";
import { useCashWallet } from "../hooks/useBase44Entities";
import TransactionFormContent from "./TransactionFormContent";

export default function QuickAddTransaction({ 
  open, 
  onOpenChange, 
  categories, 
  customBudgets, 
  defaultCustomBudgetId = '', 
  onSubmit, 
  isSubmitting,
  transactions = [],
  renderTrigger = true, // NEW: Control whether to render the trigger button
  triggerVariant = "default", // NEW: Allow customization of trigger button style
  triggerSize = "default", // NEW: Allow customization of trigger button size
  triggerClassName = className="bg-gradient-to-r from-blue-600 to-purple-600" // NEW: Allow custom classes for trigger button
}) {
  const { user } = useSettings();
  const { cashWallet } = useCashWallet(user);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {renderTrigger && (
        <DialogTrigger asChild>
          <Button 
            variant={triggerVariant}
            size={triggerSize}
            className={triggerClassName}
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Expense
          </Button>
        </DialogTrigger>
      )}
      <DialogContent className="sm:max-w-[500px] fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
        <DialogHeader>
          <DialogTitle>Quick Add Expense</DialogTitle>
        </DialogHeader>
        <TransactionFormContent
          initialTransaction={defaultCustomBudgetId ? {
            customBudgetId: defaultCustomBudgetId,
            date: customBudgets.find(b => b.id === defaultCustomBudgetId)?.startDate
          } : null}
          categories={categories}
          allBudgets={customBudgets}
          onSubmit={onSubmit}
          onCancel={() => onOpenChange(false)}
          isSubmitting={isSubmitting}
          cashWallet={cashWallet}
          transactions={transactions}
        />
      </DialogContent>
    </Dialog>
  );
}

// ENHANCEMENT (13-Jan-2025): Added trigger button to QuickAddTransaction component
// - Now renders its own "Add Expense" button by default
// - Added renderTrigger prop to control button visibility (for backward compatibility)
// - Added triggerVariant, triggerSize, and triggerClassName props for button customization
// - Dialog is now properly centered using fixed positioning (top-1/2 left-1/2 transform)
// - This fixes the missing "Add Expense" button issue in BudgetDetail page
// PREVIOUS FIX (2025-01-11): Changed from Popover to Dialog to match QuickAddIncome design