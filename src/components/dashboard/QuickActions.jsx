import { memo } from "react";
// REMOVED 10-Mar-2026: Using native themed buttons instead of CustomButton
// import { CustomButton } from "@/components/ui/CustomButton";
import { FileUp, MinusCircle, PlusCircle, Building2, RefreshCw, Loader2, Check, X } from "lucide-react";
import { motion } from "framer-motion";

/**
 * QuickActions Component
 * Desktop-only quick action bar that sits above the ActivityHub in the right column.
 * Provides themed buttons for core actions: Add Income, Add Expense, Import, Sync.
 */
const QuickActions = memo(function QuickActions({
  onAddIncome,
  onAddExpense,
  onImport,
  onSync,
  hasActiveConnections,
  syncState,
  isEmptyMonth,
  onNavigateBank
}) {
  const handleSyncClick = hasActiveConnections ? onSync : onNavigateBank;

  const renderSyncIcon = () => {
    if (!hasActiveConnections) return <Building2 className="h-4 w-4" />;
    if (syncState === 'syncing') return <Loader2 className="h-4 w-4 animate-spin" />;
    if (syncState === 'success') return <Check className="h-4 w-4" />;
    if (syncState === 'error') return <X className="h-4 w-4" />;
    return <RefreshCw className="h-4 w-4" />;
  };

  const getSyncLabel = () => {
    if (!hasActiveConnections) return "Connect Bank";
    if (syncState === 'syncing') return "Syncing…";
    if (syncState === 'success') return "Synced!";
    if (syncState === 'error') return "Failed";
    return "Smart Sync";
  };

  return (
    <div className="rounded-xl border border-border bg-card p-3 shadow-sm">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-2.5 px-0.5">
        Quick Actions
      </p>
      <div className="grid grid-cols-2 gap-2">
        {/* Add Income */}
        {isEmptyMonth ? (
          <motion.div
            animate={{ scale: [1, 1.03, 1] }}
            transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
            className="relative"
          >
            <div className="absolute -inset-0.5 bg-[hsl(var(--stat-income-text))]/30 rounded-lg blur-md animate-pulse" />
            <button
              onClick={onAddIncome}
              className="relative w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium transition-colors
                bg-[hsl(var(--stat-income-bg))] text-[hsl(var(--stat-income-text))] hover:brightness-95 dark:hover:brightness-110 border border-[hsl(var(--stat-income-text))]/20"
            >
              <PlusCircle className="h-4 w-4" />
              Add Income
            </button>
          </motion.div>
        ) : (
          <button
            onClick={onAddIncome}
            className="w-full flex items-center text-center gap-2 px-3 py-2 rounded-lg text-xs font-medium transition-colors
              bg-[hsl(var(--stat-income-bg))] text-[hsl(var(--stat-income-text))] hover:brightness-95 dark:hover:brightness-110 border border-[hsl(var(--stat-income-text))]/20"
          >
            <PlusCircle className="h-4 w-4" />
            Add Income
          </button>
        )}

        {/* Add Expense */}
        <button
          onClick={onAddExpense}
          className="w-full flex items-center text-center gap-2 px-3 py-2 rounded-lg text-xs font-medium transition-colors
            bg-[hsl(var(--stat-expense-bg))] text-[hsl(var(--stat-expense-text))] hover:brightness-95 dark:hover:brightness-110 border border-[hsl(var(--stat-expense-text))]/20"
        >
          <MinusCircle className="h-4 w-4" />
          Add Expense
        </button>

        {/* Import */}
        <button
          onClick={onImport}
          className="w-full flex items-center text-center gap-2 px-3 py-2 rounded-lg text-xs font-medium transition-colors
            bg-[hsl(var(--stat-balance-pos-bg))] text-[hsl(var(--stat-balance-pos-text))] hover:brightness-95 dark:hover:brightness-110 border border-[hsl(var(--stat-balance-pos-text))]/20"
        >
          <FileUp className="h-4 w-4" />
          Import Data
        </button>

        {/* Sync */}
        <button
          onClick={handleSyncClick}
          disabled={syncState === 'syncing'}
          className="w-full flex items-center text-center gap-2 px-3 py-2 rounded-lg text-xs font-medium transition-colors disabled:opacity-60
            bg-muted text-muted-foreground hover:bg-accent hover:text-accent-foreground border border-border"
        >
          {renderSyncIcon()}
          {getSyncLabel()}
        </button>
      </div>
    </div>
  );
});

export default QuickActions;