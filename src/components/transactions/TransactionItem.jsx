import React from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Pencil, Trash2, Circle, Check, Clock } from "lucide-react";
import { format } from "date-fns";
import { motion } from "framer-motion";
import { useSettings } from "../utils/SettingsContext";
// UPDATED 12-Jan-2025: Changed import from formatCurrency.jsx to currencyUtils.js
import { formatCurrency } from "../utils/currencyUtils";
import { iconMap, IncomeIcon } from "../utils/iconMapConfig";
import TransactionForm from "./TransactionForm";

// UPDATED 15-Jan-2025: Added onSubmit and isSubmitting props for edit form handling
export default function TransactionItem({ 
  transaction, 
  category, 
  onEdit, 
  onDelete,
  onSubmit,
  isSubmitting
}) {
  const { settings } = useSettings();
  
  const isIncome = transaction.type === 'income';
  const isPaid = transaction.isPaid;
  
  const IconComponent = category?.icon && iconMap[category.icon] ? iconMap[category.icon] : Circle;
  
  const currentYear = new Date().getFullYear();
  const paidYear = transaction.paidDate ? new Date(transaction.paidDate).getFullYear() : null;
  const showYear = paidYear && paidYear !== currentYear;

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      className={`flex items-center justify-between p-4 rounded-lg hover:bg-gray-50 transition-all border border-gray-100 group ${
        !isIncome && !isPaid ? 'opacity-60' : ''
      }`}
    >
      <div className="flex items-center gap-4 flex-1">
        {isIncome ? (
          <div
            className="w-12 h-12 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform"
            style={{ backgroundColor: '#10B98120' }}
          >
            <IncomeIcon className="w-6 h-6" style={{ color: '#10B981' }} />
          </div>
        ) : category ? (
          <div
            className={`w-12 h-12 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform ${
              !isPaid ? 'grayscale' : ''
            }`}
            style={{ backgroundColor: `${category.color}20` }}
          >
            <IconComponent className="w-6 h-6" style={{ color: category.color }} />
          </div>
        ) : null}
        
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <p className="font-semibold text-gray-900">{transaction.title}</p>
            {!isIncome && (isPaid ? (
              <Check className="w-4 h-4 text-green-600" />
            ) : (
              <Clock className="w-4 h-4 text-orange-500" />
            ))}
          </div>
          
          <div className="flex items-center gap-3 mt-1">
            <p className="text-sm text-gray-500">
              {format(new Date(transaction.date), "MMM d, yyyy")}
            </p>
            {!isIncome && isPaid && transaction.paidDate && (
              <>
                <span className="text-gray-300">•</span>
                <p className="text-xs text-green-600">
                  Paid {format(new Date(transaction.paidDate), showYear ? "MMM d, yyyy" : "MMM d")}
                </p>
              </>
            )}
            {category && (
              <>
                <span className="text-gray-300">•</span>
                <p className="text-sm text-gray-500">{category.name}</p>
              </>
            )}
          </div>
          
          {transaction.notes && (
            <p className="text-sm text-gray-400 mt-1 line-clamp-1">{transaction.notes}</p>
          )}
        </div>
      </div>

      <div className="flex items-center gap-4">
        <div className="text-right">
          <p className={`text-xl font-bold ${transaction.type === 'income' ? 'text-green-600' : 'text-red-600'}`}>
            {transaction.type === 'income' ? '+' : '-'}{formatCurrency(transaction.amount, settings)}
          </p>
        </div>

        <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
          {/* UPDATED 15-Jan-2025: Wrapped edit button in TransactionForm for proper form handling */}
          <TransactionForm
            transaction={transaction}
            categories={[]} // Categories fetched internally by TransactionForm
            onSubmit={(data) => onSubmit(data, transaction)}
            onCancel={() => {}}
            isSubmitting={isSubmitting}
            transactions={[]} // Transactions fetched internally
            trigger={
              <Button
                variant="ghost"
                size="icon"
                className="hover:bg-blue-50 hover:text-blue-600"
              >
                <Pencil className="w-4 h-4" />
              </Button>
            }
          />
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onDelete(transaction)}
            className="hover:bg-red-50 hover:text-red-600"
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </motion.div>
  );
}

// UPDATED 12-Jan-2025: Changed import from formatCurrency.jsx to currencyUtils.js

// CRITICAL FIX 15-Jan-2025: Resolved edit button not working on Transactions page
// Root Cause: The edit button was calling onEdit(transaction), which was mapped to handleEdit from useTransactionActions
// However, handleEdit only sets state (editingTransaction, showForm) but doesn't actually open a form in this context
// because the TransactionItem component didn't have an edit form integrated into it
// Solution: Wrapped the edit button in TransactionForm component (same pattern as Budget Detail page)
// Now the edit button properly opens the TransactionForm popover with the transaction data pre-filled
// The form submission is handled via onSubmit callback which calls handleSubmit from useTransactionActions