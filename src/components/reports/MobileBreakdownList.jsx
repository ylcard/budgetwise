/**
 * MobileBreakdownList — Compact ordered list of category spending for mobile.
 * CREATED 12-Mar-2026
 * Replaces the 2-column card grid on mobile with a dense, scannable list.
 * Each row: rank • icon • name • amount • trend indicator
 * Border/background effects based on trend status.
 */
import React from "react";
import { getCategoryIcon } from "../utils/iconMapConfig";
import { formatCurrency } from "../utils/currencyUtils";
import { AlertCircle, TrendingUp, TrendingDown, ArrowUpRight, Minus } from "lucide-react";

/** Trend icon resolved from alertStatus */
const TrendIcon = React.memo(({ status }) => {
  if (status === "critical") return <AlertCircle className="w-3.5 h-3.5 text-red-500 animate-pulse" />;
  if (status === "warning") return <TrendingUp className="w-3.5 h-3.5 text-amber-500" />;
  if (status === "elevated") return <ArrowUpRight className="w-3.5 h-3.5 text-blue-400" />;
  if (status === "saving") return <TrendingDown className="w-3.5 h-3.5 text-emerald-500" />;
  return <Minus className="w-3.5 h-3.5 text-muted-foreground/40" />;
});
TrendIcon.displayName = "TrendIcon";

/** Row-level border + bg classes keyed by alertStatus */
const ROW_STYLES = {
  critical: "bg-red-50/60 border-red-200 dark:bg-red-950/20 dark:border-red-900/40",
  warning: "bg-amber-50/50 border-amber-200 dark:bg-amber-950/20 dark:border-amber-900/40",
  saving: "bg-emerald-50/50 border-emerald-200 dark:bg-emerald-950/20 dark:border-emerald-900/40",
  normal: "bg-card border-border",
  elevated: "bg-card border-border",
};

const MobileBreakdownList = React.memo(({ items, settings, onSelect }) => {
  if (!items || items.length === 0) {
    return (
      <div className="flex items-center justify-center text-muted-foreground bg-muted/30 rounded-xl border border-dashed border-border min-h-[120px]">
        <p className="text-sm">No expenses to show yet</p>
      </div>
    );
  }

  return (
    <div className="space-y-1">
      {items.map((item, index) => {
        const Icon = getCategoryIcon(item.icon);
        const rowStyle = ROW_STYLES[item.alertStatus] || ROW_STYLES.normal;

        return (
          <button
            key={item.id || item.name}
            onClick={() => onSelect(item)}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl border transition-all active:scale-[0.98] ${rowStyle}`}
          >
            {/* Rank */}
            <span className="text-[10px] font-bold text-muted-foreground w-4 text-right tabular-nums shrink-0">
              {index + 1}
            </span>

            {/* Category Icon */}
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
              style={{ backgroundColor: `${item.color}18` }}
            >
              <Icon className="w-4 h-4" style={{ color: item.color }} />
            </div>

            {/* Name */}
            <span className="flex-1 text-sm font-medium text-foreground truncate text-left">
              {item.name}
            </span>

            {/* Amount */}
            <span className="text-sm font-bold text-foreground tabular-nums shrink-0">
              {formatCurrency(item.amount, settings)}
            </span>

            {/* Trend */}
            <div className="w-5 flex items-center justify-center shrink-0">
              <TrendIcon status={item.alertStatus} />
            </div>
          </button>
        );
      })}
    </div>
  );
});

MobileBreakdownList.displayName = "MobileBreakdownList";

export default MobileBreakdownList;