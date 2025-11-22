import { createContext, useContext, useState, useCallback } from "react";
import ConfirmDialog from "./ConfirmDialog";

const ConfirmDialogContext = createContext(null);

/**
 * Hook to access the confirmation dialog functionality
 * @returns {{
 *   confirmAction: (title: string, description: string, onConfirm: function, options?: object) => void
 * }}
 */
export const useConfirm = () => {
    const context = useContext(ConfirmDialogContext);
    if (!context) {
        throw new Error("useConfirm must be used within a ConfirmDialogProvider");
    }
    return context;
};

/**
 * Provider component that manages the global confirmation dialog state
 * Wraps the application to provide confirmation functionality to all child components
 * 
 * @example
 * // In any component:
 * const { confirmAction } = useConfirm();
 * 
 * const handleDelete = () => {
 *   confirmAction(
 *     "Delete Item",
 *     "Are you sure you want to delete this item?",
 *     () => {
 *       // Perform delete action
 *       deleteItem(id);
 *     },
 *     { destructive: true }
 *   );
 * };
 */
export const ConfirmDialogProvider = ({ children }) => {
    const [dialogState, setDialogState] = useState({
        open: false,
        title: "",
        description: "",
        onConfirm: null,
        destructive: false,
        confirmText: "Confirm",
        cancelText: "Cancel",
    });

    /**
     * Opens the confirmation dialog with specified parameters
     * @param {string} title - Dialog title
     * @param {string} description - Dialog description/message
     * @param {function} onConfirm - Callback function to execute on confirmation
     * @param {object} options - Optional configuration
     * @param {boolean} options.destructive - Whether this is a destructive action (default: false)
     * @param {string} options.confirmText - Custom confirm button text (default: "Confirm")
     * @param {string} options.cancelText - Custom cancel button text (default: "Cancel")
     */
    const confirmAction = useCallback((title, description, onConfirm, options = {}) => {
        setDialogState({
            open: true,
            title,
            description,
            onConfirm,
            destructive: options.destructive ?? false,
            confirmText: options.confirmText ?? "Confirm",
            cancelText: options.cancelText ?? "Cancel",
        });
    }, []);

    const handleConfirm = useCallback(() => {
        if (dialogState.onConfirm) {
            dialogState.onConfirm();
        }
        setDialogState((prev) => ({ ...prev, open: false }));
    }, [dialogState.onConfirm]);

    const handleCancel = useCallback(() => {
        setDialogState((prev) => ({ ...prev, open: false }));
    }, []);

    const value = {
        confirmAction,
    };

    return (
        <ConfirmDialogContext.Provider value={value}>
            {children}
            <ConfirmDialog
                open={dialogState.open}
                onOpenChange={(open) => {
                    if (!open) handleCancel();
                }}
                onConfirm={handleConfirm}
                title={dialogState.title}
                description={dialogState.description}
                destructive={dialogState.destructive}
                confirmText={dialogState.confirmText}
                cancelText={dialogState.cancelText}
            />
        </ConfirmDialogContext.Provider>
    );
};
