import { useState, useCallback } from "react";

/**
 * Standardizes UI state for Action Hooks (Drawers/Forms)
 */
export const useStateUI = () => {
  const [showForm, setShowForm] = useState(false);
  const [editingItem, setEditingItem] = useState(null);

  const openForm = useCallback((item = null) => {
    setEditingItem(item);
    setShowForm(true);
  }, []);

  const closeForm = useCallback(() => {
    setShowForm(false);
    setEditingItem(null);
  }, []);

  return { showForm, setShowForm, editingItem, setEditingItem, openForm, closeForm };
};
