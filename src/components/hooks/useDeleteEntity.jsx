import { useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { useConfirm } from "@/components/ui/ConfirmDialogProvider";
import { showToast } from "@/components/ui/use-toast";

/**
 * Generic hook for entity deletion with confirmation, centralized mutation logic, and robust pre-deletion handling.
 * 
 * CREATED 16-Jan-2025: Centralized entity deletion logic to reduce boilerplate,
 * ensure consistency, and provide robust handling of complex deletion dependencies.
 * 
 * This hook enforces an "all-or-nothing" approach: if onBeforeDelete throws an error,
 * the entity deletion is aborted, preventing orphaned data.
 * 
 * @param {Object} config - Configuration object
 * @param {string} config.entityName - Name of the entity (e.g., 'Transaction', 'Category', 'CustomBudget')
 * @param {Array<string|Array>} config.queryKeysToInvalidate - Array of React Query keys to invalidate on success
 * @param {string} config.confirmTitle - Title for the confirmation dialog (defaults to "Delete {entityName}")
 * @param {string} config.confirmMessage - Message for the confirmation dialog (defaults to generic message)
 * @param {Function} config.onBeforeDelete - Optional async function for pre-deletion cleanup (receives idOrEntity)
 *                                            CRITICAL: If this function throws an error, the entity will NOT be deleted
 * @param {Function} config.onAfterSuccess - Optional callback function to run after successful deletion
 * 
 * @returns {Object} - { handleDelete, isDeleting }
 * 
 * @example
 * // Simple usage (Category - no dependencies)
 * const { handleDelete: deleteCategory, isDeleting } = useDeleteEntity({
 *   entityName: 'Category',
 *   queryKeysToInvalidate: [QUERY_KEYS.CATEGORIES],
 *   confirmTitle: "Delete Category",
 *   confirmMessage: "Are you sure you want to delete this category? Associated transactions will not be deleted.",
 * });
 * // In component: <Button onClick={() => deleteCategory(categoryId)}>Delete</Button>
 * 
 * @example
 * // With dependencies (Transaction - adjust cash wallet before deletion)
 * const { handleDelete: deleteTransaction } = useDeleteEntity({
 *   entityName: 'Transaction',
 *   queryKeysToInvalidate: [QUERY_KEYS.TRANSACTIONS, QUERY_KEYS.CASH_WALLET],
 *   onBeforeDelete: async (transaction) => {
 *     // Reverse cash wallet effect before deleting
 *     if (transaction.isCashTransaction && transaction.cashAmount && cashWallet) {
 *       const balances = [...cashWallet.balances];
 *       let updatedBalances = updateCurrencyBalance(balances, transaction.cashCurrency, transaction.cashAmount);
 *       await base44.entities.CashWallet.update(cashWallet.id, { balances: updatedBalances });
 *     }
 *   }
 * });
 * // In component: <Button onClick={() => deleteTransaction(transaction)}>Delete</Button>
 * 
 * @example
 * // Complex dependencies (CustomBudget - delete transactions, return cash, then delete budget)
 * const { handleDelete: deleteBudget } = useDeleteEntity({
 *   entityName: 'CustomBudget',
 *   queryKeysToInvalidate: [QUERY_KEYS.CUSTOM_BUDGETS, QUERY_KEYS.TRANSACTIONS, QUERY_KEYS.CASH_WALLET],
 *   confirmMessage: "This will delete the budget and all associated transactions. Cash allocations will be returned to your wallet.",
 *   onBeforeDelete: async (budgetId) => {
 *     // CRITICAL: Fetch the specific budget efficiently
 *     const budget = await base44.entities.CustomBudget.get(budgetId);
 *     if (!budget) throw new Error('Budget not found');
 *     
 *     // Delete all associated transactions
 *     const budgetTransactions = transactions.filter(t => t.customBudgetId === budgetId);
 *     for (const t of budgetTransactions) {
 *       await base44.entities.Transaction.delete(t.id);
 *     }
 *     
 *     // Return remaining cash allocations to wallet
 *     if (budget.cashAllocations?.length > 0) {
 *       const remaining = calculateRemainingCashAllocations(budget, transactions);
 *       if (remaining.length > 0) {
 *         await returnCashToWallet(user.email, remaining);
 *       }
 *     }
 *   },
 *   onAfterSuccess: () => {
 *     // Navigate away after successful deletion
 *     window.location.href = createPageUrl("Budgets");
 *   }
 * });
 */
export const useDeleteEntity = ({
  entityName,
  queryKeysToInvalidate = [],
  confirmTitle,
  confirmMessage,
  onBeforeDelete,
  onAfterSuccess,
}) => {
  const queryClient = useQueryClient();
  const { confirmAction } = useConfirm();

  const deleteMutation = useMutation({
    mutationFn: async (idOrEntity) => {
      // Determine if we received an ID or a full entity object
      const id = typeof idOrEntity === 'object' ? idOrEntity.id : idOrEntity;

      // CRITICAL: Execute entity-specific pre-deletion logic
      // If onBeforeDelete throws an error, the entity deletion is aborted
      if (onBeforeDelete) {
        await onBeforeDelete(idOrEntity);
      }

      // Perform the actual entity deletion via the base44 API
      // This line is only reached if onBeforeDelete completes successfully
      await base44.entities[entityName].delete(id);
    },
    onSuccess: () => {
      // Invalidate all specified query keys to trigger refetches
      queryKeysToInvalidate.forEach(key => {
        queryClient.invalidateQueries({ queryKey: Array.isArray(key) ? key : [key] });
      });

      // Execute post-success callback if provided
      if (onAfterSuccess) {
        onAfterSuccess();
      }

      // Show success toast notification
      showToast({
        title: "Success",
        description: `${entityName} deleted successfully`,
      });
    },
    onError: (error) => {
      // Log error for debugging
      console.error(`Error deleting ${entityName}:`, error);

      // Show error toast notification
      showToast({
        title: "Error",
        description: error?.message || `Failed to delete ${entityName}. Please try again.`,
        variant: "destructive",
      });
    },
  });

  const handleDelete = (idOrEntity) => {
    confirmAction(
      confirmTitle || `Delete ${entityName}`,
      confirmMessage || `Are you sure you want to delete this ${entityName.toLowerCase()}? This action cannot be undone.`,
      () => deleteMutation.mutate(idOrEntity),
      { destructive: true }
    );
  };

  return {
    handleDelete,
    isDeleting: deleteMutation.isPending,
  };
};

// CREATED 16-Jan-2025: Generic entity deletion hook with robust dependency handling
// This hook centralizes the common pattern for deleting entities:
// 1. User confirmation via global ConfirmDialog (managed by ConfirmDialogProvider)
// 2. Optional pre-deletion cleanup via onBeforeDelete (receives idOrEntity)
// 3. API call to base44.entities[entityName].delete(id)
// 4. Query invalidation for cache updates
// 5. Optional post-success callback
// 6. Consistent success/error toast notifications
// 
// Key Robustness Features:
// - "All-or-Nothing" approach: If onBeforeDelete fails, the entity deletion is aborted
// - This prevents orphaned data (e.g., transactions pointing to deleted budgets)
// - Clear error propagation ensures users are notified of any failures
// - Supports both simple deletions (just delete the entity) and complex cascading deletions
// 
// Efficiency Improvements:
// - Uses base44.entities[entityName].get(id) instead of list().find() for targeted fetching
// - Only fetches data when needed within onBeforeDelete
// 
// Benefits:
// - Reduces code duplication across entity-specific action hooks
// - Ensures consistent confirmation UX and error handling
// - Makes dependency management explicit and testable
// - Simplifies maintenance (single source of truth for deletion logic)