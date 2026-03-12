/**
 * CategoryDetailDrawer — Vaul drawer (mobile) / Dialog (desktop) showing
 * full category spending details + transaction count + deep-link to Transactions page.
 * CREATED 12-Mar-2026
 */
import React, { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { getCategoryIcon } from "../utils/iconMapConfig";
import { formatCurrency } from "../utils/currencyUtils";
import { useSettings } from "../utils/SettingsContext";
import { useIsMobile } from "@/hooks/use-mobile";
import { getMonthBoundaries, formatDateString } from "../utils/dateUtils";
import { ExternalLink } from "lucide-react";
import { CustomButton } from "@/components/ui/CustomButton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerDescription } from "@/components/ui/drawer";

/** Helpers — kept local and small */
const getAlertCardStyles = (status) => {
  if (status === "critical") return "bg-red-50/30 border-red-200 dark:bg-red-950/20 dark:border-red-800";
  if (status === "warning") return "bg-amber-50/30 border-amber-200 dark:bg-amber-950/20 dark:border-amber-800";
  if (status === "saving") return "bg-emerald-50/30 border-emerald-200 dark:bg-emerald-950/20 dark:border-emerald-800";
  return "bg-muted/30 border-border";
};

const StatusIndicator = React.memo(({ status, diff }) => {
  if (!status || status === "normal") return null;
  const labels = {
    critical: `${diff?.toFixed(0)}% above average!`,
    warning: `${diff?.toFixed(0)}% above average`,
    saving: "Below average spending",
  };
  const colors = { critical: "text-red-500", warning: "text-amber-500", saving: "text-emerald-500" };
  return <span className={`text-xs font-semibold ${colors[status] || ""}`}>{labels[status] || ""}</span>;
});
StatusIndicator.displayName = "StatusIndicator";

/**
 * Core detail content — shared between Dialog and Drawer shells.
 */
const DetailContent = React.memo(({ category, transactionCount, selectedMonth, selectedYear }) => {
  const { settings } = useSettings();
  const navigate = useNavigate();

  if (!category) return null;

  const IconComponent = getCategoryIcon(category.icon);
  const diffAbs = Math.abs(category.amount - category.averageSpend);
  const isAlert = category.alertStatus && category.alertStatus !== "normal";

  /** Build a deep-link URL to the Transactions page with pre-applied filters */
  const viewTransactionsUrl = useMemo(() => {
    const { monthStart, monthEnd } = getMonthBoundaries(
      selectedMonth ?? new Date().getMonth(),
      selectedYear ?? new Date().getFullYear()
    );
    const params = new URLSearchParams({
      category: category.id,
      type: "expense",
      startDate: monthStart,
      endDate: monthEnd,
    });
    return `/transactions?${params.toString()}`;
  }, [category.id, selectedMonth, selectedYear]);

  return (
    <div className="space-y-5 pt-2">
      {/* Header row */}
      <div className="flex items-center gap-4">
        <div className="p-3.5 rounded-2xl" style={{ backgroundColor: `${category.color}20` }}>
          <IconComponent size={28} style={{ color: category.color }} />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-lg font-bold text-foreground">{category.name}</h3>
          <p className="text-2xl font-bold" style={{ color: category.color }}>
            {formatCurrency(category.amount, settings)}
          </p>
        </div>
      </div>

      {/* Transaction count pill */}
      <div className="bg-muted/50 border border-border rounded-xl px-4 py-2.5 flex items-center justify-between">
        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Transactions</span>
        <span className="text-base font-bold text-foreground">{transactionCount}</span>
      </div>

      {/* Alert banner (contextual) */}
      {isAlert && category.averageSpend > 0 && (
        <div className={`p-3.5 rounded-xl border ${getAlertCardStyles(category.alertStatus)}`}>
          <StatusIndicator status={category.alertStatus} diff={category.diffPercentage} />
          <p className="text-sm mt-1 text-muted-foreground leading-snug">
            You spent <strong>{formatCurrency(diffAbs, settings)}</strong>{" "}
            {category.alertStatus === "saving" ? "less" : "more"} than your 6-month average of{" "}
            <strong>{formatCurrency(category.averageSpend, settings)}</strong>.
          </p>
        </div>
      )}

      {!isAlert && category.averageSpend > 0 && (
        <div className="bg-muted/30 border border-border rounded-xl px-4 py-2.5 flex items-center justify-between">
          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">6-Month Avg</span>
          <span className="text-sm font-bold text-foreground">{formatCurrency(category.averageSpend, settings)}</span>
        </div>
      )}

      {category.averageSpend === 0 && (
        <div className="bg-blue-50/30 dark:bg-blue-950/20 p-3 rounded-xl border border-blue-100 dark:border-blue-900/40 text-center">
          <span className="text-xs text-blue-600 dark:text-blue-400 font-medium">First expense in this category in 6 months.</span>
        </div>
      )}

      {/* Stat cards */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-muted/30 border border-border p-3.5 rounded-xl flex flex-col items-center justify-center text-center">
          <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider mb-1">Share of Expenses</p>
          <p className="text-lg font-bold text-foreground">{category.expensePercentage.toFixed(1)}%</p>
        </div>
        <div className="bg-muted/30 border border-border p-3.5 rounded-xl flex flex-col items-center justify-center text-center">
          <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider mb-1">Share of Income</p>
          <p className="text-lg font-bold text-foreground">{category.percentage.toFixed(1)}%</p>
        </div>
      </div>

      {/* View transactions CTA */}
      <CustomButton
        variant="outline"
        className="w-full gap-2"
        onClick={() => navigate(viewTransactionsUrl)}
      >
        <ExternalLink className="w-4 h-4" />
        View Transactions
      </CustomButton>
    </div>
  );
});
DetailContent.displayName = "DetailContent";

/**
 * Main export — shells the content in a Dialog (desktop) or Drawer (mobile).
 */
const CategoryDetailDrawer = React.memo(({ category, onClose, transactionCount, selectedMonth, selectedYear }) => {
  const isMobile = useIsMobile();
  const open = !!category;

  if (isMobile) {
    return (
      <Drawer open={open} onOpenChange={(o) => !o && onClose()} shouldScaleBackground={false}>
        <DrawerContent>
          <DrawerHeader className="text-left hidden">
            <DrawerTitle className="sr-only">Category Details</DrawerTitle>
            <DrawerDescription className="sr-only">Detailed breakdown for {category?.name}</DrawerDescription>
          </DrawerHeader>
          <div className="px-5 pb-8">
            <DetailContent
              category={category}
              transactionCount={transactionCount}
              selectedMonth={selectedMonth}
              selectedYear={selectedYear}
            />
          </div>
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-[420px]">
        <DialogHeader>
          <DialogTitle className="sr-only">Category Details</DialogTitle>
          <DialogDescription className="sr-only">Detailed breakdown for {category?.name}</DialogDescription>
        </DialogHeader>
        <DetailContent
          category={category}
          transactionCount={transactionCount}
          selectedMonth={selectedMonth}
          selectedYear={selectedYear}
        />
      </DialogContent>
    </Dialog>
  );
});

CategoryDetailDrawer.displayName = "CategoryDetailDrawer";

export default CategoryDetailDrawer;