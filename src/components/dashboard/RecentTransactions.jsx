import { Link } from "react-router-dom";
import { ArrowRight, Banknote, ExternalLink, Pencil, Trash2, ChevronDown } from "lucide-react";
// COMMENTED OUT 12-Mar-2026: ArrowRight unused in embedded mode but kept for standalone header
// ExternalLink now also used for embedded subtitle link
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CustomButton } from "@/components/ui/CustomButton";
import { createPageUrl } from "@/utils";
import { createEntityMap } from "../utils/generalUtils";
import { formatCurrency } from "../utils/currencyUtils";
import { getCategoryIcon } from "../utils/iconMapConfig";
import { useSettings } from "../utils/SettingsContext";
import { getCurrentPeriodBoundaries, formatDate, parseDate, getFirstDayOfMonth, getLastDayOfMonth } from "../utils/dateUtils";
import { useTransactions } from "../hooks/useBase44Entities";
import { usePaidTransactions } from "../hooks/useDerivedData";
import { detectCrossPeriodSettlement } from "../utils/calculationEngine";
import { useState, useMemo } from "react";
import ExpenseFormDialog from "../transactions/dialogs/ExpenseFormDialog";
import IncomeFormDialog from "../transactions/dialogs/IncomeFormDialog";
import { subMonths } from "date-fns";
import clsx from "clsx";

/**
 * Helper component to fetch and render a specific month's transactions
 * This enables the "Infinite Load" logic without complex query cursor management
 */
function TransactionMonthGroup({ date, categories, customBudgets, onEdit, onDelete, settings, isFirst }) {
  // Get boundaries for THIS specific month chunk
  const monthStart = getFirstDayOfMonth(date.getMonth(), date.getFullYear());
  const monthEnd = getLastDayOfMonth(date.getMonth(), date.getFullYear());
  const { currentYear } = getCurrentPeriodBoundaries();

  // Fetch data for this specific month
  const { transactions: rawTransactions, isLoading } = useTransactions(monthStart, monthEnd);

  // Filter for PAID transactions, sorted by date desc
  const transactions = usePaidTransactions(rawTransactions, 999); // No limit, show all history for this month

  const categoryMap = useMemo(() => createEntityMap(categories), [categories]);
  const customBudgetMap = useMemo(() => createEntityMap(customBudgets || []), [customBudgets]);

  if (isLoading) return <div className="p-4 text-center text-xs text-muted-foreground animate-pulse">Loading {formatDate(date, 'MMMM')}...</div>;
  if (transactions.length === 0) return null;

  return (
    {/* UPDATED 12-Mar-2026: Removed mb-2 gap; sticky header now uses border-t instead of border-b to avoid visual gap */}
    <div>
      <div className="sticky top-0 z-10 bg-card/95 backdrop-blur-sm px-4 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider border-b border-border/50">
        {formatDate(date, 'MMMM yyyy')}
      </div>
      <div className="space-y-1 p-2 relative z-0">
        {transactions.map((transaction) => {
          const category = categoryMap[transaction.category_id];
          const customBudget = transaction.budgetId ? customBudgetMap[transaction.budgetId] : null;
          const isIncome = transaction.type === 'income';
          const IconComponent = getCategoryIcon(category?.icon);

          const paidYear = transaction.paidDate ? parseDate(transaction.paidDate)?.getFullYear() : null;
          const showYear = paidYear && paidYear !== currentYear;

          const crossPeriodInfo = detectCrossPeriodSettlement(
            transaction,
            monthStart,
            monthEnd,
            customBudgets || []
          );

          return (
            <div
              key={transaction.id}
              className="relative flex items-center justify-between p-2 sm:p-3 rounded-lg hover:bg-accent/50 transition-colors group overflow-hidden"
            >
              <div className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0">
                {isIncome ? (
                  <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform shrink-0 bg-[hsl(var(--status-paid-bg))]">
                    <Banknote className="w-5 h-5 text-[hsl(var(--status-paid-text))]" />
                  </div>
                ) : category && (
                  <div
                    className="w-9 h-9 sm:w-10 sm:h-10 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform shrink-0 border border-border/50"
                    style={{ backgroundColor: `${category.color}20` }}
                  >
                    <IconComponent className="w-5 h-5" style={{ color: category.color }} />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-foreground truncate text-sm sm:text-base">{transaction.title}</p>
                  <div className="flex items-center gap-x-1 gap-y-0.5 mt-0.5 flex-wrap">
                    <p className="text-[11px] sm:text-sm text-muted-foreground whitespace-nowrap">
                      {formatDate(transaction.date, "MMM d")}
                    </p>
                    {customBudget && (
                      <Badge
                        variant="outline"
                        className={`text-[10px] px-1.5 py-0 font-medium max-w-[120px] truncate ${crossPeriodInfo.isCrossPeriod
                          ? 'bg-[hsl(var(--status-unpaid-bg))] text-[hsl(var(--status-unpaid-text))] border-[hsl(var(--status-unpaid-text))/0.2]'
                          : 'bg-muted text-muted-foreground border-border'
                          } transition-all inline-flex items-center gap-1`}
                      >
                        {customBudget.name}
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
              <div className="relative flex items-center justify-end shrink-0 min-w-[80px] sm:min-w-[100px] ml-2">
                <p className={`text-sm sm:text-base font-bold transition-all duration-300 ease-in-out group-hover:translate-x-full group-hover:opacity-0 ${transaction.type === 'income' ? 'text-[hsl(var(--stat-income-text))]' : 'text-foreground'}`}>
                  {transaction.type === 'income' ? '+' : '-'}{formatCurrency(transaction.amount, settings)}
                </p>

                <div className="absolute right-0 flex items-center gap-1 transition-all duration-300 ease-in-out translate-x-full opacity-0 group-hover:translate-x-0 group-hover:opacity-100">
                  <CustomButton variant="ghost" size="icon-sm" onClick={() => onEdit(transaction)} className="h-8 w-8 hover:bg-primary/10 hover:text-primary">
                    <Pencil className="w-3 h-3" />
                  </CustomButton>
                  <CustomButton variant="ghost" size="icon-sm" onClick={() => onDelete && onDelete(transaction)} className="h-8 w-8 hover:bg-destructive/10 hover:text-destructive">
                    <Trash2 className="w-3 h-3" />
                  </CustomButton>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/**
 * RecentTransactions Component
 * Displays an infinitely scrollable list of recent transactions (Month by Month).
 * @param {Object} props
 * @param {Array} props.categories - List of category entities
 * @param {Array} props.customBudgets - List of budget entities
 * @param {Function} props.onEdit - Callback for transaction updates
 * @param {Function} props.onDelete - Callback for transaction removal
 */
export default function RecentTransactions({ categories, customBudgets, onEdit, onDelete, embedded = false }) {
  const { settings } = useSettings();

  // State to track how many months back we have loaded
  // [0] = Current Month, [0, 1] = Current + Previous, etc.
  const [loadedOffsets, setLoadedOffsets] = useState([0]);

  const [editingTransaction, setEditingTransaction] = useState(null);
  const [showEditDialog, setShowEditDialog] = useState(false);

  const handleEdit = (transaction) => {
    setEditingTransaction(transaction);
    setShowEditDialog(true);
  };

  // Load the next month in history
  const handleShowMore = () => {
    setLoadedOffsets(prev => [...prev, prev.length]);
  };

  const handleEditSubmit = (data) => {
    if (editingTransaction && onEdit) {
      onEdit(data, editingTransaction);
    }
    setShowEditDialog(false);
    setEditingTransaction(null);
  };

  return (
    <>
      <div className={clsx("flex flex-col h-full w-full max-w-full", !embedded && "bg-card border-none shadow-lg rounded-xl")}>
        {!embedded && (
          <CardHeader className="flex flex-row items-center justify-between p-4 sm:p-6 shrink-0">
            <CardTitle>Recent Transactions</CardTitle>
            <Link to={createPageUrl("Transactions")} className="text-sm text-primary hover:text-primary/80 flex items-center gap-1 transition-colors">
              View All
              <ArrowRight className="w-4 h-4" />
            </Link>
          </CardHeader>
        )}

        {/* ADDED 12-Mar-2026: Subtitle link when embedded in ActivityHub */}
        {embedded && (
          <div className="px-3 pt-2 pb-1 flex-shrink-0">
            <Link
              to="/transactions?tab=history"
              className="text-xs text-muted-foreground hover:text-primary flex items-center gap-1 transition-colors"
            >
              Manage all transactions
              <ExternalLink className="w-3 h-3" />
            </Link>
          </div>
        )}

        <div className={clsx("flex-1 overflow-y-auto", !embedded && "p-4")}>
          <div className="space-y-4 pb-4">
            {loadedOffsets.map((offset, index) => {
              // Calculate the month for this chunk (Now minus offset)
              const chunkDate = subMonths(new Date(), offset);
              return (
                <TransactionMonthGroup
                  key={offset}
                  isFirst={index === 0}
                  date={chunkDate}
                  categories={categories}
                  customBudgets={customBudgets}
                  onEdit={handleEdit}
                  onDelete={onDelete}
                  settings={settings}
                />
              );
            })}

            <div className="pt-2 flex justify-center pb-4">
              <CustomButton
                variant="outline"
                size="sm"
                onClick={handleShowMore}
                className="gap-2 text-xs"
              >
                Show More History
                <ChevronDown className="w-3 h-3" />
              </CustomButton>
            </div>
          </div>
        </div>
      </div>

      {/* Edit Transaction Dialog */}
      {editingTransaction && (
        editingTransaction.type === 'income' ? (
          <IncomeFormDialog
            open={showEditDialog}
            onOpenChange={setShowEditDialog}
            transaction={editingTransaction}
            onSubmit={handleEditSubmit}
            renderTrigger={false}
          />
        ) : (
          <ExpenseFormDialog
            open={showEditDialog}
            onOpenChange={setShowEditDialog}
            transaction={editingTransaction}
            categories={categories}
            customBudgets={customBudgets}
            onSubmit={handleEditSubmit}
            renderTrigger={false}
          />
        )
      )}
    </>
  );
}