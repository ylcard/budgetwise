import { useState, useEffect, useRef, useMemo } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useSettings } from "../utils/SettingsContext";
import { useMonthlyBreakdown } from "../hooks/useDerivedData";
import { formatCurrency } from "../utils/currencyUtils";
import { getCategoryIcon } from "../utils/iconMapConfig";
import { AlertCircle, TrendingUp, TrendingDown, ArrowUpRight } from "lucide-react";
// COMMENTED OUT 12-Mar-2026: Replaced by CategoryDetailDrawer
// import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
// import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerDescription } from "@/components/ui/drawer";
import { useNotifications } from "../hooks/useNotifications";
import { notifyCategorySpendingAlert } from "../utils/notificationHelpers";
// COMMENTED OUT 12-Mar-2026: No longer used directly; CategoryDetailDrawer handles mobile detection
// import { useIsMobile } from "@/hooks/use-mobile";
import MobileBreakdownList from "./MobileBreakdownList";
import CategoryDetailDrawer from "./CategoryDetailDrawer";
import { parseDate, getMonthBoundaries } from "../utils/dateUtils";

/**
 * Helper for Alert Icon based on spending status
 */
const StatusIndicator = ({ status, diff }) => {
  if (!status || status === 'normal') return null;
  if (status === 'critical') return <AlertCircle size={14} className="text-red-500 animate-pulse" title={`${diff?.toFixed(0)}% above average!`} />;
  if (status === 'warning') return <TrendingUp size={14} className="text-amber-500" title={`${diff?.toFixed(0)}% above average`} />;
  if (status === 'elevated') return <ArrowUpRight size={14} className="text-blue-400" title="Slightly above average" />;
  if (status === 'saving') return <TrendingDown size={14} className="text-emerald-500" title="Below average spending" />;
  return null;
};

/**
 * Returns Tailwind classes for card styling based on alert status
 */
const getAlertCardStyles = (status) => {
  if (status === 'critical') return "bg-red-50/30 border-red-200 hover:border-red-300 hover:shadow-red-100/50";
  if (status === 'warning') return "bg-amber-50/30 border-amber-200 hover:border-amber-300 hover:shadow-amber-100/50";
  if (status === 'saving') return "bg-emerald-50/30 border-emerald-200 hover:border-emerald-300 hover:shadow-emerald-100/50";
  return "bg-white border-gray-100 hover:border-gray-200"; // Normal
};

/**
 * Helper for header summary statistics
 */
const SummaryItem = ({ label, amount, settings, className }) => (
  <div className={`text-center px-2 md:px-3 ${className}`}>
    <p className="text-[10px] text-gray-500 uppercase font-bold tracking-wider mb-0.5">{label}</p>
    <p className="text-sm font-bold text-gray-900">{formatCurrency(amount, settings)}</p>
  </div>
);

const Divider = () => <div className="hidden md:block h-8 w-px bg-gray-200"></div>;

/**
 * MonthlyBreakdown Component
 * Visualizes spending by category for a selected month, highlighting anomalies and trends.
 * Includes a proactive notification engine for critical spending alerts.
 *
 * @param {Object} props
 * @param {Array} props.transactions - List of transaction objects
 * @param {Array} props.categories - List of category objects
 * @param {number} props.monthlyIncome - Total income for the month
 * @param {boolean} props.isLoading - Loading state
 * @param {Array} props.allCustomBudgets - List of custom budgets
 * @param {number} props.selectedMonth - 0-indexed month (0=Jan)
 * @param {number} props.selectedYear - Full year (e.g. 2024)
 */
export default function MonthlyBreakdown({
  transactions,
  categories,
  monthlyIncome,
  isLoading,
  allCustomBudgets,
  selectedMonth,
  selectedYear
}) {
  const { settings, user } = useSettings();
  const { notifications } = useNotifications();
  // COMMENTED OUT 12-Mar-2026: Desktop/mobile split now handled by CSS and CategoryDetailDrawer
  // const isMobile = useIsMobile();
  // const isDesktop = !isMobile;

  // State for Modal/Drawer
  const [selectedCategory, setSelectedCategory] = useState(null);
  const notifiedTracker = useRef(new Set()); // Instant memory lock for notifications

  // Use the extracted hook which now calculates needs/wants internally using financialCalculations
  const { categoryBreakdown, totalExpenses, needsTotal, wantsTotal } = useMonthlyBreakdown(
    transactions, categories, monthlyIncome, allCustomBudgets, selectedMonth, selectedYear
  );

  // ADDED 12-Mar-2026: Count transactions per category for the detail drawer
  const transactionCountMap = useMemo(() => {
    const safeMonth = selectedMonth ?? new Date().getMonth();
    const safeYear = selectedYear ?? new Date().getFullYear();
    const { monthStart, monthEnd } = getMonthBoundaries(safeMonth, safeYear);
    const startD = parseDate(monthStart);
    const endD = parseDate(monthEnd);

    const counts = {};
    (transactions || []).forEach((t) => {
      if (t.type !== "expense") return;
      const tDate = parseDate(t.paidDate || t.date);
      if (!tDate || tDate < startD || tDate > endD) return;
      const catId = t.category_id || "uncategorized";
      counts[catId] = (counts[catId] || 0) + 1;
    });
    return counts;
  }, [transactions, selectedMonth, selectedYear]);

  // --- NEW: Proactive Notification Engine ---
  useEffect(() => {
    // 1. Only trigger alerts for the CURRENT real-world month
    const now = new Date();
    const isCurrentMonth = selectedMonth === now.getMonth() && selectedYear === now.getFullYear();

    if (!isCurrentMonth || !notifications || categoryBreakdown.length === 0) return;

    const currentMonthYear = `${selectedYear}-${selectedMonth}`;
    const criticalItems = categoryBreakdown.filter(item => item.alertStatus === 'critical');

    if (criticalItems.length > 0) {
      // 2. Build a set of all categories we've ALREADY notified about this month
      const alreadyNotifiedSet = new Set(notifiedTracker.current); // Start with local memory lock

      notifications.forEach(n => {
        if (n.category === 'budgets' && n.metadata?.alertType === 'critical_spend' && n.metadata?.monthYear === currentMonthYear) {
          if (Array.isArray(n.metadata.categoryNames)) {
            n.metadata.categoryNames.forEach(name => alreadyNotifiedSet.add(`${currentMonthYear}-${name}`));
          }
        }
      });

      // 3. Filter down to ONLY the categories we haven't warned the user about yet
      const newCriticalItems = criticalItems.filter(item => !alreadyNotifiedSet.has(`${currentMonthYear}-${item.name}`));

      if (newCriticalItems.length > 0) {
        const newNames = newCriticalItems.map(item => item.name);

        // Lock them all instantly
        newNames.forEach(name => notifiedTracker.current.add(`${currentMonthYear}-${name}`));

        // 4. Fire ONE single, consolidated notification
        notifyCategorySpendingAlert(user.email, newNames, currentMonthYear);
      }
    }
  }, [categoryBreakdown, notifications, selectedMonth, selectedYear, user?.email, settings]);

  // SORTING: Ensure highest expenses are first (Top Left)
  const sortedBreakdown = [...categoryBreakdown].sort((a, b) => b.amount - a.amount);

  // COMMENTED OUT 12-Mar-2026: Moved to dedicated CategoryDetailDrawer component
  // const renderCategoryDetails = () => { ... };

  return (
    // UPDATED 12-Mar-2026: Removed h-full to prevent mobile overflow clipping
    <Card className="w-full border-none shadow-lg flex flex-col bg-white">
      {isLoading ? (
        <div className="p-6 space-y-6">
          <div className="flex justify-between">
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-12 w-32" />
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {[...Array(8)].map((_, i) => (
              <Skeleton key={i} className="h-28 rounded-2xl" />
            ))}
          </div>
        </div>
      ) : (
        <>
          {/* Integrated Header - Replaces the floating black pill */}
          <CardHeader className="pb-2 border-b border-gray-50">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <div>
                <CardTitle className="text-xl font-bold text-gray-900">Monthly Breakdown</CardTitle>
              </div>

              {/* The "Fancier" Summary Section - Grid on Mobile, Flex on Desktop */}
              <div className="w-full md:w-auto grid grid-cols-2 md:flex items-center bg-gray-50 px-1 py-2 rounded-xl border border-gray-100 gap-y-2 md:gap-y-0">
                <SummaryItem label="Income" amount={monthlyIncome} settings={settings} className="border-r border-gray-200 md:border-none" />
                {/* Mobile only spacer implies 2nd col is Expenses */}
                <Divider />
                <Divider />
                <SummaryItem label="Expenses" amount={totalExpenses} settings={settings} />

                {/* Extra columns for Essentials/Lifestyle */}
                <div className="col-span-2 border-t border-gray-200 md:border-none md:hidden w-full my-1" />

                <Divider />
                <SummaryItem label="Essentials" amount={needsTotal} settings={settings} className="border-r border-gray-200 md:border-none" />
                <Divider />
                <SummaryItem label="Lifestyle" amount={wantsTotal} settings={settings} />
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-6 flex-1">
            {/* MOBILE: Compact ordered list (ADDED 12-Mar-2026) */}
            <div className="md:hidden">
              <MobileBreakdownList
                items={sortedBreakdown}
                settings={settings}
                onSelect={setSelectedCategory}
              />
            </div>

            {/* DESKTOP: Card grid (unchanged) */}
            <div className="hidden md:block">
              {sortedBreakdown.length === 0 ? (
                <div className="h-full flex items-center justify-center text-muted-foreground bg-muted/30 rounded-2xl border border-dashed border-border min-h-[200px]">
                  <p>No expenses to show yet</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {sortedBreakdown.map((item) => {
                    const IconComponent = getCategoryIcon(item.icon);
                    const alertStyles = getAlertCardStyles(item.alertStatus);

                    return (
                      <div
                        key={item.id || item.name}
                        onClick={() => setSelectedCategory(item)}
                        className={`group relative p-3 rounded-2xl border hover:shadow-md transition-all duration-200 flex flex-col justify-between h-28 overflow-hidden cursor-pointer hover:scale-[1.03] active:scale-[0.98] ${alertStyles}`}
                      >
                        {/* Top Row: Icon & Amount */}
                        <div className="flex justify-between items-start mb-2">
                          <div
                            className="p-2 rounded-xl transition-colors"
                            style={{ backgroundColor: `${item.color}15` }}
                          >
                            <IconComponent size={18} strokeWidth={2.5} style={{ color: item.color }} />
                          </div>
                          <div className="flex items-center gap-1.5">
                            <StatusIndicator status={item?.alertStatus} diff={item?.diffPercentage} />
                            <span className="font-bold text-foreground text-sm">
                              {formatCurrency(item.amount, settings)}
                            </span>
                          </div>
                        </div>
                        {/* Bottom Row: Label & Stats */}
                        <div>
                          <h3 className="font-medium text-muted-foreground text-sm mb-1 truncate" title={item.name}>
                            {item.name}
                          </h3>

                          {/* Progress Bar Background */}
                          <div className="w-full bg-muted h-1.5 rounded-full overflow-hidden flex mb-1.5">
                            <div
                              className="h-full rounded-full transition-all duration-500"
                              style={{
                                width: `${item.expensePercentage}%`,
                                backgroundColor: item.color
                              }}
                            />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </CardContent>
        </>
      )}
      {/* UPDATED 12-Mar-2026: Unified detail overlay via CategoryDetailDrawer */}
      <CategoryDetailDrawer
        category={selectedCategory}
        onClose={() => setSelectedCategory(null)}
        transactionCount={selectedCategory ? (transactionCountMap[selectedCategory.id] || 0) : 0}
        selectedMonth={selectedMonth}
        selectedYear={selectedYear}
      />
    </Card>
  );
}