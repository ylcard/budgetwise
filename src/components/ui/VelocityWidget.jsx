import { useState, useMemo, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Area, AreaChart, ResponsiveContainer, Tooltip } from "recharts";
import { formatCurrency } from "../utils/currencyUtils";
import { ChevronDown, ChevronUp } from "lucide-react";
import { cn } from "@/lib/utils";

export const VelocityWidget = ({ chartData = [], totals = {}, settings, monthStatus = 'current' }) => {
  // --- STATE: Expansion (Persisted) ---
  const [isExpanded, setIsExpanded] = useState(() => {
    const saved = localStorage.getItem("velocity_widget_expanded");
    return saved === "true"; // Defaults to false (collapsed) if null
  });

  useEffect(() => {
    localStorage.setItem("velocity_widget_expanded", isExpanded);
  }, [isExpanded]);

  const [activeIndex, setActiveIndex] = useState(null);
  const containerRef = useRef(null);

  // Determine what to show: Hovered Day OR Month Total
  const displayData = useMemo(() => {
    if (activeIndex !== null && chartData[activeIndex]) {
      const data = chartData[activeIndex];
      return {
        income: data.isFuture ? data.predictedIncome : data.income,
        expense: data.isFuture ? data.predictedExpense : data.expense,
        label: data.isPrediction ? `${data.label} (Est.)` : data.label,
        isTotal: false
      };
    }

    // --- LABEL LOGIC ---
    let labelStr = 'Total Flow';
    if (monthStatus === 'past') labelStr = 'Total Historical Flow';
    if (monthStatus === 'current') labelStr = 'Total Projected Flow';

    // For total, we sum Actual + Future Predictions
    return {
      income: totals?.finalProjectedIncome || 0,
      expense: totals?.finalProjectedExpense || 0,
      label: labelStr,
      isTotal: true
    };
  }, [activeIndex, chartData, totals, monthStatus]);

  // --- EMPTY STATE FOR FUTURE MONTHS ---
  if (monthStatus === 'future') {
    return (
      <div className="mx-4 md:mx-0 bg-card rounded-2xl shadow-sm border border-border p-6 flex flex-col items-center justify-center text-center space-y-2 h-[104px]">
        <p className="text-sm font-medium text-foreground">
          Future Projections Unavailable
        </p>
        <p className="text-xs text-muted-foreground">
          Cash flow projections are only active for the current month.
        </p>
      </div>
    );
  }

  // Haptic feedback function (browser support varies, but good for mobile)
  /*
  const triggerHaptic = () => {
      if (navigator.vibrate) navigator.vibrate(5);
  };
  */

  // --- OUTSIDE THE BOX: Manual Hit Detection ---
  // We calculate which "slot" the mouse is in based on raw pixel width.
  // This bypasses Recharts' internal hitbox logic entirely.
  const handleInteraction = (clientX) => {
    if (!containerRef.current || chartData.length === 0) return;

    const { left, width } = containerRef.current.getBoundingClientRect();
    const x = clientX - left;

    // Calculate percentage across the container (0.0 to 1.0)
    const percent = Math.max(0, Math.min(1, x / width));

    // Map to an index
    const newIndex = Math.floor(percent * chartData.length);

    // Only update if changed
    if (newIndex !== activeIndex) {
      setActiveIndex(newIndex);
      // triggerHaptic();
      if (navigator.vibrate) navigator.vibrate(5);
    }
  };

  /*
  const onMouseMove = (e) => handleInteraction(e.clientX);
  const onTouchMove = (e) => {
      // Prevent scroll while scrubbing
      // e.preventDefault(); // Optional: might block page scroll
      handleInteraction(e.touches[0].clientX);
  };
  */

  const handleReset = () => {
    setActiveIndex(null);
  };

  return (
    <motion.div
      layout
      initial={false}
      className={cn(
        // Layout
        "mx-4 md:mx-0 overflow-hidden relative isolate",
        // Appearance
        "bg-card",
        "rounded-2xl shadow-sm dark:shadow-md",
        "border border-border"
      )}
    >
      {/* Header / Trigger Area */}
      <div
        onClick={() => setIsExpanded(!isExpanded)}
        className="p-4 md:p-5 cursor-pointer flex flex-col relative z-10 group"
      >
        {/* Background Glows (Subtle) */}
        <div className="absolute top-0 right-0 w-32 h-32 bg-[hsl(var(--stat-income-bg))] dark:bg-[hsl(var(--stat-income-bg))] blur-[40px] rounded-full -z-10 transition-opacity duration-500" style={{ opacity: isExpanded ? 1 : 0.5 }} />
        <div className="absolute bottom-0 left-0 w-32 h-32 bg-[hsl(var(--stat-expense-bg))] dark:bg-[hsl(var(--stat-expense-bg))] blur-[40px] rounded-full -z-10 transition-opacity duration-500" style={{ opacity: isExpanded ? 1 : 0.5 }} />

        <div className="flex justify-between items-center w-full">
          {/* Left Side: Label & Data */}
          <div className="flex flex-col flex-1">
            <div className="flex items-center gap-2">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                {displayData.label}
              </p>
            </div>

            <div className="flex items-baseline gap-3 mt-1">
              <h2 className="text-lg md:text-xl font-bold tabular-nums text-[hsl(var(--stat-income-text))]">
                +{formatCurrency(displayData.income || 0, settings)}
              </h2>
              <h2 className="text-lg md:text-xl font-bold tabular-nums text-[hsl(var(--stat-expense-text))] opacity-90">
                -{formatCurrency(displayData.expense || 0, settings)}
              </h2>
            </div>
          </div>

          {/* Right Side: Chevron */}
          <div className="text-muted-foreground group-hover:text-foreground transition-colors">
            {isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
          </div>
        </div>
      </div>

      {/* Expandable Chart Area */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: "easeInOut" }}
            className="overflow-hidden bg-accent/30 border-t border-border"
          >
            <div
              className="h-40 relative cursor-crosshair touch-none pt-4 pb-0"
              ref={containerRef}
              onMouseMove={(e) => handleInteraction(e.clientX)}
              onMouseLeave={handleReset}
              onTouchMove={(e) => handleInteraction(e.touches[0].clientX)}
              onTouchEnd={handleReset}
            >
              <ResponsiveContainer width="99%" height="100%" debounce={50}>
                <AreaChart
                  data={chartData}
                  margin={{ top: 5, right: 0, left: 0, bottom: 0 }}
                >
                  <defs>
                    <linearGradient id="colorIncome" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="colorExpense" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#f43f5e" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <Tooltip cursor={{ stroke: "#94a3b8", strokeWidth: 1, strokeDasharray: "4 4" }} content={<></>} />

                  <Area
                    type="monotone"
                    dataKey="income"
                    stroke="#10b981"
                    strokeWidth={3}
                    fill="url(#colorIncome)"
                    connectNulls={true}
                    animationDuration={500}
                  />
                  <Area
                    type="monotone"
                    dataKey="predictedIncome"
                    stroke="#10b981"
                    strokeWidth={2}
                    strokeDasharray="5 5"
                    fill="url(#colorIncome)"
                    fillOpacity={0.1}
                    connectNulls={true}
                    animationDuration={0}
                  />
                  <Area
                    type="monotone"
                    dataKey="expense"
                    stroke="#f43f5e"
                    strokeWidth={3}
                    fill="url(#colorExpense)"
                    connectNulls={true}
                    animationDuration={500}
                  />
                  <Area
                    type="monotone"
                    dataKey="predictedExpense"
                    stroke="#f43f5e"
                    strokeWidth={2}
                    strokeDasharray="5 5"
                    fill="url(#colorExpense)"
                    fillOpacity={0.1}
                    connectNulls={true}
                    animationDuration={0}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            {/* Legend / Helper Text */}
            <div className="flex justify-center gap-4 pb-4 text-[10px] text-muted-foreground uppercase tracking-widest font-semibold">
              <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-[hsl(var(--stat-income-text))]"></div> Income</span>
              <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-[hsl(var(--stat-expense-text))]"></div> Expense</span>
              <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-full border border-muted-foreground border-dashed"></div> Projected</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};
