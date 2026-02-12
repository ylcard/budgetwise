import React, { memo } from "react";
import { formatCurrency } from "../utils/currencyUtils";
import { formatDate } from "../utils/dateUtils";
import { getCategoryIcon } from "../utils/iconMapConfig";
import { Badge } from "@/components/ui/badge"; // Removing Badge
import { Card, CardContent } from "@/components/ui/card"; // Removing Card
import { motion } from "framer-motion"; // Adding Animation
import { Checkbox } from "@/components/ui/checkbox";
import { ArrowDown, ArrowUp, ChevronRight } from "lucide-react";
import { useSettings } from "../utils/SettingsContext";

const FREQUENCY_LABELS = {
    daily: "Daily",
    weekly: "Weekly",
    biweekly: "Every 2 Weeks",
    monthly: "Monthly",
    quarterly: "Quarterly",
    yearly: "Yearly",
};

const RecurringTransactionCard = memo(function RecurringTransactionCard({
    recurring,
    category,
    isSelectionMode,
    isSelected,
    onToggleSelection,
    onClick,
}) {
    const { settings } = useSettings();
    const IconComponent = category ? getCategoryIcon(category.icon) : null;
    const isIncome = recurring.type === 'income';
    const isActive = recurring.isActive;

    // Handle tap based on mode
    const handleTap = (e) => {
        e.stopPropagation();
        // If clicking checkbox directly, let it bubble
        if (e.target.role === 'checkbox') return;

        if (isSelectionMode) {
            onToggleSelection(recurring.id);
        } else {
            onClick(recurring);
        }
    };

    return (
        <motion.div
            layout
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95 }}
            onClick={handleTap}
            className={`
                group relative flex items-center gap-3 p-3 md:p-4 rounded-xl border bg-card transition-all cursor-pointer
                ${isSelected ? 'border-primary bg-primary/5' : 'border-border hover:bg-accent/50'}
                ${!isActive ? 'opacity-60' : ''}
            `}
        >
            {/* Selection Checkbox (Animated Reveal) */}
            <div className={`flex items-center transition-all duration-300 ease-spring ${isSelectionMode ? 'w-8 opacity-100 mr-1' : 'w-0 opacity-0 overflow-hidden'}`}>
                <Checkbox
                    checked={isSelected}
                    onCheckedChange={() => onToggleSelection(recurring.id)}
                    className="data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                />
            </div>

            {/* Icon */}
            <div
                className="relative shrink-0 w-10 h-10 md:w-11 md:h-11 rounded-full flex items-center justify-center transition-colors"
                style={{ backgroundColor: isIncome ? '#10B98120' : (category?.color || '#6B7280') + '20' }}
            >
                {isIncome ? (
                    <ArrowDown className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                ) : IconComponent ? (
                    <IconComponent className="w-5 h-5" style={{ color: category?.color || '#6B7280' }} />
                ) : (
                    <ArrowUp className="w-5 h-5" style={{ color: category?.color || '#6B7280' }} />
                )}

                {/* Small indicator if paused (optional, but opacity handles most of it) */}
                {!isActive && (
                    <div className="absolute -bottom-1 -right-1 bg-gray-200 dark:bg-gray-700 rounded-full p-0.5 border-2 border-card">
                        <div className="w-2 h-2 rounded-full bg-gray-400" />
                    </div>
                )}
            </div>

            {/* Main Info */}
            <div className="flex-1 min-w-0 flex flex-col justify-center">
                <h3 className={`font-medium text-sm md:text-base truncate ${!isActive ? 'text-muted-foreground decoration-slate-400' : 'text-foreground'}`}>
                    {recurring.title}
                </h3>

                <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-0.5">
                    <span className="capitalize">{FREQUENCY_LABELS[recurring.frequency] || recurring.frequency}</span>
                    {recurring.nextOccurrence && (
                        <>
                            <span className="w-0.5 h-0.5 rounded-full bg-current opacity-50" />
                            <span>Next: {formatDate(recurring.nextOccurrence, settings.dateFormat)}</span>
                        </>
                    )}
                </div>
            </div>

            {/* Amount */}
            <div className="text-right shrink-0">
                <span className={`
                    font-mono font-semibold text-sm md:text-base block
                    ${!isActive
                        ? 'text-muted-foreground line-through decoration-muted-foreground/50'
                        : isIncome ? 'text-emerald-600 dark:text-emerald-400' : 'text-foreground'}
                `}>
                    {isIncome ? '+' : '-'}{formatCurrency(recurring.amount, settings)}
                </span>
            </div>

            {/* Action Handle / Pill Indicator */}
            {/* Only show in normal mode (not selection mode) to reduce clutter */}
            {!isSelectionMode && (
                <div className="shrink-0 pl-2 text-muted-foreground/30">
                    <ChevronRight className="w-5 h-5" />
                </div>
            )}
        </motion.div>
    );
});

export default RecurringTransactionCard;