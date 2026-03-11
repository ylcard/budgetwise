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
              variant="income"
              onClick={onAddIncome}
              className="relative w-full h-auto py-2 px-3 rounded-lg text-xs"
            >
              <PlusCircle />
              Add Income
            </CustomButton>
          </motion.div>
        ) : (
          <CustomButton
            variant="income"
            onClick={onAddIncome}
            className="w-full h-auto py-2 px-3 rounded-lg text-xs"
          >
            <PlusCircle />
            Add Income
          </CustomButton>
        )}

        {/* Add Expense */}
        <CustomButton
          variant="expense"
          onClick={onAddExpense}
          className="w-full h-auto py-2 px-3 rounded-lg text-xs"
        >
          <MinusCircle />
          Add Expense
        </CustomButton>

        {/* Import */}
        <CustomButton
          variant="budget"
          onClick={onImport}
          className="w-full h-auto py-2 px-3 rounded-lg text-xs"
        >
          <FileUp />
          Import Data
        </CustomButton>

        {/* Sync */}
        <CustomButton
          variant="sync"
          onClick={handleSyncClick}
          disabled={syncState === 'syncing'}
          className="w-full h-auto py-2 px-3 rounded-lg text-xs disabled:opacity-60"
        >
          {renderSyncIcon()}
          {getSyncLabel()}
        </CustomButton>
      </div>
    </div>
  );
});

export default QuickActions;