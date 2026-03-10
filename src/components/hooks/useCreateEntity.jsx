import { useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";
import { fetchWithRetry } from "../utils/generalUtils";

/**
 * Generic hook for entity creation with centralized mutation logic.
 * 
 * Centralized entity creation logic to reduce boilerplate and ensure consistency across all entity types.
 * 
 * @param {Object} config - Configuration object
 * @param {string} config.entityName - Name of the entity (e.g., 'Transaction', 'Category', 'CustomBudget')
 * @param {Array<string|Array>} config.queryKeysToInvalidate - Array of React Query keys to invalidate on success
 * @param {string} config.successMessage - Custom success message (defaults to "{entityName} created successfully")
 * @param {boolean} config.showToasts - Whether to show automatic success/error toasts (defaults to true)
 * @param {Function} config.onBeforeCreate - Optional async function for preprocessing data before API call (receives data object)
 * @param {Function} config.onAfterSuccess - Optional callback function to run after successful creation (receives created entity data)
 * @param {Function} config.onMutate - Optional callback for optimistic updates
 * @param {Function} config.onError - Optional callback for error handling/rollback
 * @returns {Object} - { mutate, mutateAsync, isPending, isSuccess, isError, error }
 * 
 * @example
 * // Simple usage (Category)
 * const createCategoryMutation = useCreateEntity({
 *   entityName: 'Category',
 *   queryKeysToInvalidate: [QUERY_KEYS.CATEGORIES],
 * });
 * createCategoryMutation.mutate({ name: 'Food', icon: 'Apple', color: '#FF0000', priority: 'needs' });
 * 
 * @example
 * // With preprocessing (Transaction - add user email, normalize amount)
 * const createTransactionMutation = useCreateEntity({
 *   entityName: 'Transaction',
 *   queryKeysToInvalidate: [QUERY_KEYS.TRANSACTIONS, QUERY_KEYS.CASH_WALLET],
 *   onBeforeCreate: async (data) => {
 *     return {
 *       ...data,
 *       created_by: user.email,
 *       amount: parseFloat(data.amount)
 *     };
 *   },
 *   onAfterSuccess: (createdData) => {
 *     console.log('Transaction created:', createdData);
 *   }
 * });
 */
export const useCreateEntity = ({
  entityName,
  queryKeysToInvalidate = [],
  successMessage,
  showToasts = true,
  onBeforeCreate,
  onAfterSuccess,
  onMutate,
  onError: onErrorCallback,
}) => {
  const queryClient = useQueryClient();

  const createMutation = useMutation({
    onMutate: onMutate || undefined,
    mutationFn: async (data) => {
      // Execute preprocessing logic if provided
      let processedData = data;
      if (onBeforeCreate) {
        processedData = await onBeforeCreate(data);
      }

      // Perform the entity creation via the base44 API
      return await fetchWithRetry(() => base44.entities[entityName].create(processedData));
    },
    onSuccess: (createdData) => {
      // Invalidate all specified query keys to trigger refetches
      queryKeysToInvalidate.forEach(key => {
        queryClient.invalidateQueries({ queryKey: Array.isArray(key) ? key : [key] });
      });

      // Execute post-success callback if provided
      if (onAfterSuccess) {
        onAfterSuccess(createdData);
      }

      // Show success toast notification
      if (showToasts) {
        toast.success(successMessage || `${entityName} created successfully`);
      }
    },
    onError: (error, variables, context) => {
      if (onErrorCallback) {
        onErrorCallback(error, variables, context);
      }

      // Log error for debugging
      console.error(`Error creating ${entityName}:`, error);

      // Show error toast notification
      if (showToasts) {
        toast.error(error?.message || `Failed to create ${entityName}. Please try again.`);
      }
    },
  });

  return createMutation;
};