import { memo } from "react";
import { CustomButton } from "@/components/ui/CustomButton";
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
    if (!hasActiveConnections) return <Building2 />;
    if (syncState === 'syncing') return <Loader2 className="animate-spin" />;
    if (syncState === 'success') return <Check />;
    if (syncState === 'error') return <X />;
    return <RefreshCw />;
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
      <div className="grid grid-cols-2 justify-center gap-2">
        {/* Add Income */}
        {isEmptyMonth ? (
          <motion.div
            animate={{ scale: [1, 1.03, 1] }}
            transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
            className="relative"
          >
            <div className="absolute -inset-0.5 bg-[hsl(var(--stat-income-text))]/30 rounded-lg blur-md animate-pulse" />
            <CustomButton
              variant="create"
              onClick={onAddIncome}
              className="relative w-full h-auto py-2 px-3 rounded-lg text-xs bg-[hsl(var(--stat-income-bg))] text-[hsl(var(--stat-income-text))] border-[hsl(var(--stat-income-text))]/20 hover:bg-[hsl(var(--stat-income-bg))] hover:text-[hsl(var(--stat-income-text))] hover:brightness-95 dark:hover:brightness-110"
            >
              <PlusCircle />
              Add Income
            </CustomButton>
          </motion.div>
        ) : (
          <CustomButton
            variant="create"
            onClick={onAddIncome}
            className="w-full h-auto py-2 px-3 rounded-lg text-xs bg-[hsl(var(--stat-income-bg))] text-[hsl(var(--stat-income-text))] border-[hsl(var(--stat-income-text))]/20 hover:bg-[hsl(var(--stat-income-bg))] hover:text-[hsl(var(--stat-income-text))] hover:brightness-95 dark:hover:brightness-110"
          >
            <PlusCircle />
            Add Income
          </CustomButton>
        )}

        {/* Add Expense */}
        <CustomButton
          variant="create"
          onClick={onAddExpense}
          className="w-full h-auto py-2 px-3 rounded-lg text-xs bg-[hsl(var(--stat-expense-bg))] text-[hsl(var(--stat-expense-text))] border-[hsl(var(--stat-expense-text))]/20 hover:bg-[hsl(var(--stat-expense-bg))] hover:text-[hsl(var(--stat-expense-text))] hover:brightness-95 dark:hover:brightness-110"
        >
          <MinusCircle />
          Add Expense
        </CustomButton>

        {/* Import */}
        <CustomButton
          variant="primary"
          onClick={onImport}
          className="w-full h-auto py-2 px-3 rounded-lg text-xs bg-[hsl(var(--stat-balance-pos-bg))] text-[hsl(var(--stat-balance-pos-text))] border-[hsl(var(--stat-balance-pos-text))]/20 hover:bg-[hsl(var(--stat-balance-pos-bg))] hover:text-[hsl(var(--stat-balance-pos-text))] hover:brightness-95 dark:hover:brightness-110"
        >
          <FileUp />
          Import Data
        </CustomButton>

        {/* Sync */}
        <CustomButton
          variant="primary"
          onClick={handleSyncClick}
          disabled={syncState === 'syncing'}
          className="w-full h-auto py-2 px-3 rounded-lg text-xs bg-muted text-muted-foreground border-border hover:bg-accent hover:text-accent-foreground disabled:opacity-60"
        >
          {renderSyncIcon()}
          {getSyncLabel()}
        </CustomButton>
      </div>
    </div>
  );
});

export default QuickActions;