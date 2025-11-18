
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { showToast } from "@/components/ui/use-toast";

/**
 * Generic hook for entity updates with centralized mutation logic.
 * 
 * CREATED 16-Jan-2025: Centralized entity update logic to reduce boilerplate
 * and ensure consistency across all entity types.
 * 
 * @param {Object} config - Configuration object
 * @param {string} config.entityName - Name of the entity (e.g., 'Transaction', 'Category', 'CustomBudget')
 * @param {Array<string|Array>} config.queryKeysToInvalidate - Array of React Query keys to invalidate on success
 * @param {string} config.successMessage - Custom success message (defaults to "{entityName} updated successfully")
 * @param {Function} config.onBeforeUpdate - Optional async function for preprocessing before API call (receives { id, data, oldEntity })
 * @param {Function} config.onAfterSuccess - Optional callback function to run after successful update (receives updated entity data)
 * 
 * @returns {Object} - { mutate, mutateAsync, isPending, isSuccess, isError, error }
 * 
 * @example
 * // Simple usage (Category)
 * const updateCategoryMutation = useUpdateEntity({
 *   entityName: 'Category',
 *   queryKeysToInvalidate: [QUERY_KEYS.CATEGORIES],
 * });
 * updateCategoryMutation.mutate({ id: 'cat123', data: { name: 'New Name' } });
 * 
 * @example
 * // With preprocessing (Transaction - handle cash wallet adjustments)
 * const updateTransactionMutation = useUpdateEntity({
 *   entityName: 'Transaction',
 *   queryKeysToInvalidate: [QUERY_KEYS.TRANSACTIONS, QUERY_KEYS.CASH_WALLET],
 *   onBeforeUpdate: async ({ id, data, oldEntity }) => {
 *     // Handle complex cash wallet balance adjustments
 *     if (cashWallet && oldEntity) {
 *       // ... cash wallet adjustment logic ...
 *       await base44.entities.CashWallet.update(cashWallet.id, { balances: updatedBalances });
 *     }
 *     return data; // Return processed data
 *   },
 *   onAfterSuccess: (updatedData) => {
 *     console.log('Transaction updated:', updatedData);
 *   }
 * });
 * updateTransactionMutation.mutate({ id: 'tx123', data: { amount: 100 }, oldEntity: oldTransaction });
 * 
 * @example
 * // With status change (CustomBudget - handle cash return on completion)
 * const updateBudgetMutation = useUpdateEntity({
 *   entityName: 'CustomBudget',
 *   queryKeysToInvalidate: [QUERY_KEYS.CUSTOM_BUDGETS, QUERY_KEYS.CASH_WALLET],
 *   onBeforeUpdate: async ({ id, data, oldEntity }) => {
 *     if (data.status === 'completed' && oldEntity.cashAllocations?.length > 0) {
 *       const remaining = calculateRemainingCashAllocations(oldEntity, transactions);
 *       if (remaining.length > 0) {
 *         await returnCashToWallet(user.email, remaining);
 *       }
 *       return { ...data, cashAllocations: [] }; // Clear cash on completion
 *     }
 *     return data;
 *   }
 * });
 */
export const useUpdateEntity = ({
    entityName,
    queryKeysToInvalidate = [],
    successMessage,
    onBeforeUpdate,
    onAfterSuccess,
}) => {
    const queryClient = useQueryClient();

    const updateMutation = useMutation({
        mutationFn: async ({ id, data, oldEntity }) => {
            // Execute preprocessing logic if provided
            let processedData = data;
            if (onBeforeUpdate) {
                processedData = await onBeforeUpdate({ id, data, oldEntity });
            }

            // Perform the entity update via the base44 API
            const result = await base44.entities[entityName].update(id, processedData);
            return result;
        },
        onSuccess: (updatedData) => {
            // Invalidate all specified query keys to trigger refetches
            queryKeysToInvalidate.forEach(key => {
                queryClient.invalidateQueries({ queryKey: Array.isArray(key) ? key : [key] });
            });

            // Execute post-success callback if provided
            if (onAfterSuccess) {
                onAfterSuccess(updatedData);
            }

            // Show success toast notification
            showToast({
                title: "Success",
                description: successMessage || `${entityName} updated successfully`,
            });
        },
        onError: (error) => {
            // Log error for debugging
            console.error(`Error updating ${entityName}:`, error);

            // Show error toast notification
            showToast({
                title: "Error",
                description: error?.message || `Failed to update ${entityName}. Please try again.`,
                variant: "destructive",
            });
        },
    });

    return updateMutation;
};