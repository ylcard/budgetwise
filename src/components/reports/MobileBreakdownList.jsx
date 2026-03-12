/**
 * MobileBreakdownList — Compact ordered list of category spending for mobile.
 * CREATED 12-Mar-2026
 * UPDATED 12-Mar-2026: Added carousel-style pagination with dot indicators.
 * Replaces the 2-column card grid on mobile with a dense, scannable list.
 * Each row: rank • icon • name • amount • trend indicator
 * Border/background effects based on trend status.
 */
import React, { useState, useMemo, useCallback } from "react";
import { getCategoryIcon } from "../utils/iconMapConfig";
import { formatCurrency } from "../utils/currencyUtils";
import { AlertCircle, TrendingUp, TrendingDown, ArrowUpRight, Minus, ChevronLeft, ChevronRight } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";

/** Items per page */
const PAGE_SIZE = 6;

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

/** Single row */
const BreakdownRow = React.memo(({ item, rank, settings, onSelect }) => {
  const Icon = getCategoryIcon(item.icon);
  const rowStyle = ROW_STYLES[item.alertStatus] || ROW_STYLES.normal;

  return (
    <button
      onClick={() => onSelect(item)}
      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl border transition-all active:scale-[0.98] ${rowStyle}`}
    >
      {/* Rank */}
      <span className="text-[10px] font-bold text-muted-foreground w-4 text-right tabular-nums shrink-0">
        {rank}
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
});
BreakdownRow.displayName = "BreakdownRow";

/** Dot pagination indicators */
const PageDots = React.memo(({ total, current, onSelect }) => {
  if (total <= 1) return null;
  return (
    <div className="flex items-center justify-center gap-1.5 pt-3">
      {Array.from({ length: total }, (_, i) => (
        <button
          key={i}
          onClick={() => onSelect(i)}
          className={`rounded-full transition-all duration-300 ${
            i === current
              ? "w-5 h-2 bg-primary"
              : "w-2 h-2 bg-muted-foreground/25 hover:bg-muted-foreground/40"
          }`}
          aria-label={`Page ${i + 1}`}
        />
      ))}
    </div>
  );
});
PageDots.displayName = "PageDots";

/** Slide animation variants */
const slideVariants = {
  enter: (direction) => ({ x: direction > 0 ? 80 : -80, opacity: 0 }),
  center: { x: 0, opacity: 1 },
  exit: (direction) => ({ x: direction > 0 ? -80 : 80, opacity: 0 }),
};

const MobileBreakdownList = React.memo(({ items, settings, onSelect }) => {
  const [page, setPage] = useState(0);
  const [direction, setDirection] = useState(0);

  const totalPages = useMemo(() => Math.ceil((items?.length || 0) / PAGE_SIZE), [items?.length]);

  // Reset page when item count changes (e.g. month navigation)
  React.useEffect(() => {
    setPage(0);
  }, [items?.length]);

  const currentItems = useMemo(() => {
    if (!items) return [];
    const start = page * PAGE_SIZE;
    return items.slice(start, start + PAGE_SIZE);
  }, [items, page]);

  const goToPage = useCallback((newPage) => {
    setDirection(newPage > page ? 1 : -1);
    setPage(newPage);
  }, [page]);

  const handleSwipe = useCallback((e, info) => {
    const threshold = 50;
    if (info.offset.x < -threshold && page < totalPages - 1) {
      goToPage(page + 1);
    } else if (info.offset.x > threshold && page > 0) {
      goToPage(page - 1);
    }
  }, [page, totalPages, goToPage]);

  if (!items || items.length === 0) {
    return (
      <div className="flex items-center justify-center text-muted-foreground bg-muted/30 rounded-xl border border-dashed border-border min-h-[120px]">
        <p className="text-sm">No expenses to show yet</p>
      </div>
    );
  }

  return (
    <div>
      {/* Swipeable area */}
      <div className="overflow-hidden">
        <AnimatePresence mode="wait" custom={direction} initial={false}>
          <motion.div
            key={page}
            custom={direction}
            variants={slideVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ duration: 0.2, ease: "easeInOut" }}
            drag={totalPages > 1 ? "x" : false}
            dragConstraints={{ left: 0, right: 0 }}
            dragElastic={0.15}
            onDragEnd={handleSwipe}
            className="space-y-1"
          >
            {currentItems.map((item, index) => (
              <BreakdownRow
                key={item.id || item.name}
                item={item}
                rank={page * PAGE_SIZE + index + 1}
                settings={settings}
                onSelect={onSelect}
              />
            ))}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Dot indicators */}
      <PageDots total={totalPages} current={page} onSelect={goToPage} />
    </div>
  );
});

MobileBreakdownList.displayName = "MobileBreakdownList";

export default MobileBreakdownList;