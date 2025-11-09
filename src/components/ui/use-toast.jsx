// Simple toast hook implementation
import { useState } from "react";

let toastHandler = null;

export function useToast() {
  const [toasts, setToasts] = useState([]);

  const toast = ({ title, description, variant = "default" }) => {
    const id = Date.now();
    const newToast = { id, title, description, variant };
    
    setToasts((prev) => [...prev, newToast]);
    
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3000);
  };

  toastHandler = toast;

  return { toast, toasts };
}

export function showToast(options) {
  if (toastHandler) {
    toastHandler(options);
  }
}