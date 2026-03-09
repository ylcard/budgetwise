import { useEffect } from "react";
import { useFAB } from "../hooks/FABContext";
import { CustomButton } from "./CustomButton";
import * as LucideIcons from "lucide-react";

export function FABAction({
    id,
    label,
    icon,
    onClick,
    variant,
    highlighted,
    disabled,
    order = 0,
    className,
    children
}) {
    const { registerButton, unregisterButton } = useFAB();

    // Register with the FAB Context
    useEffect(() => {
        registerButton(id, { id, label, icon, onClick, variant, highlighted, disabled, order });
        return () => unregisterButton(id);
    }, [id, label, icon, onClick, variant, highlighted, disabled, order, registerButton, unregisterButton]);

    // If children are provided, render them (Wrapper Mode)
    if (children) {
        return children;
    }

    // Otherwise, render the default Desktop Button (Default Mode)
    const Icon = LucideIcons[icon];

    return (
        <CustomButton
            variant={variant}
            size="sm"
            onClick={onClick}
            disabled={disabled}
            className={`hidden md:flex gap-2 h-8 text-xs ${className || ''}`}
        >
            {Icon && <Icon className="h-3.5 w-3.5" />}
            <span>{label}</span>
        </CustomButton>
    );
}