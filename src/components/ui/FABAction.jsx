import { useEffect } from "react";
import { useFAB } from "../hooks/FABContext";
import { CustomButton } from "./CustomButton";
import * as LucideIcons from "lucide-react";

export function FABAction({ id, label, icon, onClick, variant, highlighted, disabled, order = 0, className }) {
  const { registerButton, unregisterButton } = useFAB();
  const Icon = LucideIcons[icon];

  // Automatically register with the FAB on mount, unregister on unmount
  useEffect(() => {
    registerButton(id, { id, label, icon, onClick, variant, highlighted, disabled, order });
    return () => unregisterButton(id);
  }, [id, label, icon, onClick, variant, highlighted, disabled, order, registerButton, unregisterButton]);

  // Only render the physical button on Desktop
  return (
    <CustomButton
      variant={variant}
      size="sm"
      onClick={onClick}
      disabled={disabled}
      className={`hidden md:flex gap-2 h-8 text-xs ${className}`}
    >
      {Icon && <Icon className="h-3.5 w-3.5" />}
      <span>{label}</span>
    </CustomButton>
  );
}
