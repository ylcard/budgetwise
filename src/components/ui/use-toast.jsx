/**
 * @typedef {Object} ToastOptions
 * @property {string} title - The main title or heading of the toast.
 * @property {string} [description] - Optional detailed description content.
 * @property {'default' | 'success' | 'error' | 'warning'} [variant='default'] - The visual style/variant of the toast.
 * @property {number} [duration=3000] - The time (in milliseconds) the toast should remain visible.
 */

import { useState, useCallback, useEffect } from "react";

// let toastHandler = null;

/**
 * Module-level variable to hold the actual toast dispatcher function.
 * This is a common pattern for global UI notifications in React when not
 * using a Context Provider or Redux, as it avoids re-renders on every call.
 */
let dispatchToast = () => {
  console.error('Toast system not yet initialized. Ensure <ToastContainer> is rendered.');
};

/**
 * Hook for managing the state of currently active toasts.
 * This must be used by the central Toast Container component.
 * @returns {{toasts: Array<{id: number, title: string, description?: string, variant: string}>}} The list of active toast objects.
 */
export function useToast() {
  const [toasts, setToasts] = useState([]);

  const addToast = useCallback(({ title, description, variant = "default", duration = 3000 }) => {
    const id = Date.now();
    const newToast = { id, title, description, variant };
    
    setToasts((prev) => [...prev, newToast]);
    
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, duration);
  }, []); // Depend on nothing for stable reference

  // toastHandler = toast;
  // Register the handler on mount/update. Only the instance that renders
  // should have its handler registered.
  useEffect(() => {
    // Register the handler once on mount. Only the instance that renders
    // should have its handler registered.
    dispatchToast = addToast;
  }, []); // Register once on mount. addToast is stable via useCallback.

  // return { toast, toasts };
  return { toasts };
}

/**
 * Globally accessible function to display a new toast notification.
 * This function must be called only after a component utilizing `useToast`
 * (the Toast Container) has been rendered.
 * @param {ToastOptions} options - The configuration options for the new toast.
 */
export function showToast(options) {
  // if (toastHandler) {
  //   toastHandler(options);
  // }
  // Call the module-level function
  dispatchToast(options);
}