import { useState, useMemo, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useEtoroData } from '../../components/hooks/useEtoroData';
import { useSettings } from '../../components/utils/SettingsContext';
import { Loader2, TrendingUp } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function EtoroTicker() {
  const { positions, status, totalValue, dailyChange } = useEtoroData();
  const { settings } = useSettings();
  const [isExpanded, setIsExpanded] = useState(false);
  const [shouldScroll, setShouldScroll] = useState(false);
  const contentRef = useRef(null);

  // Default to 0 if undefined to prevent errors
  const isPositiveDay = (dailyChange || 0) >= 0;

  // Formatting: 10300 -> $10.9k (Respects Settings + Shortens)
  const formatValue = (val) => {
    const numberVal = Number(val);
    if (isNaN(numberVal)) return "0";

    // 1. Always use en-US to get "k", "M", "B" suffixes
    let num = new Intl.NumberFormat('en-US', {
      notation: 'compact',
      maximumFractionDigits: 1,
    }).format(numberVal);

    // 2. Manually swap dot to comma if that is the user's preference
    if (settings?.decimalSeparator === ',') {
      num = num.replace('.', ',');
    }

    const symbol = settings?.currencySymbol || '$';
    const position = settings?.currencyPosition || 'before';

    return position === 'after' ? `${num}${symbol}` : `${symbol}${num}`;
  };

  const tickerContent = useMemo(() => (
    <div ref={contentRef} className="flex items-center gap-6 whitespace-nowrap">
      {positions.map((pos) => (
        <div key={pos.instrumentId} className="flex items-center gap-1.5 shrink-0">
          <span className="text-[10px] font-bold text-slate-400 uppercase">
            {pos.symbol || (pos.name ? pos.name.substring(0, 4) : 'UNK')}
          </span>
          <span className="text-xs font-mono font-medium text-white">
            {formatValue(pos.value)}
          </span>
        </div>
      ))}
      <div className="flex items-center gap-1.5 shrink-0 border-l border-slate-700 pl-4">
        <span className="text-[10px] font-bold text-emerald-400 uppercase">Total</span>
        <span className="text-xs font-mono font-bold text-emerald-400">
          {formatValue(totalValue)}
        </span>
      </div>
    </div>
  ), [positions, totalValue, settings]);

  // Measure content width vs container width when expanded or data changes
  useEffect(() => {
    if (isExpanded && contentRef.current) {
      const contentWidth = contentRef.current.scrollWidth;
      // Approximate max width of the container (max-w-2xl is ~672px, minus padding)
      const containerWidth = Math.min(window.innerWidth * 0.9, 672) - 40;
      setShouldScroll(contentWidth > containerWidth);
    }
  }, [isExpanded, positions, totalValue]);

  if (status === "Error") return null;

  return createPortal(
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 pointer-events-none flex justify-center">
      <motion.div
        layout
        initial={false}
        onClick={() => setIsExpanded(!isExpanded)}
        className={cn(
          "pointer-events-auto flex items-center h-12 bg-slate-900 border shadow-2xl overflow-hidden cursor-pointer transition-colors duration-500",
          // Shape & Size
          isExpanded ? "rounded-full px-5 max-w-[90vw] md:max-w-2xl" : "rounded-full px-3 w-auto",
          // Dynamic Border & Glow based on performance
          isPositiveDay
            ? "border-emerald-500/30 shadow-[0_0_20px_-5px_rgba(16,185,129,0.3)] hover:border-emerald-500/50"
            : "border-rose-500/30 shadow-[0_0_20px_-5px_rgba(244,63,94,0.3)] hover:border-rose-500/50"
        )}
      >
        {/* Left Icon/Status */}
        <div className="flex items-center gap-2 shrink-0">
          <div className="relative">
            <TrendingUp className={cn("h-5 w-5", status === 'Live' ? (isPositiveDay ? 'text-emerald-500' : 'text-rose-500') : 'text-amber-500')} />
            {status === 'Live' && (
              <span className={cn("absolute -top-0.5 -right-0.5 h-2 w-2 rounded-full animate-pulse", isPositiveDay ? "bg-emerald-500" : "bg-rose-500")} />
            )}
          </div>
          {!isExpanded && (
            <span className="text-xs font-bold text-white pr-1">
              {formatValue(totalValue)}
            </span>
          )}
        </div>

        {/* Expanded Marquee */}
        <AnimatePresence>
          {isExpanded && (
            <motion.div
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: "auto", opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              className="overflow-hidden whitespace-nowrap ml-4"
            >
              {status === "Syncing..." ? (
                <div className="flex items-center gap-2 text-[10px] text-slate-400 uppercase tracking-widest">
                  <Loader2 className="h-3 w-3 animate-spin" /> Syncing...
                </div>
              ) : (
                <div className="flex overflow-hidden">
                  {shouldScroll ? (
                    <motion.div
                      animate={{ x: ["0%", "0%", "-50%", "-50%"] }}
                      transition={{
                        duration: Math.max(30, positions.length * 5),
                        ease: "linear",
                        repeat: Infinity,
                        times: [0, 0.15, 0.85, 1]
                      }}
                      className="flex shrink-0 gap-8"
                    >
                      <div className="flex">{tickerContent}</div>
                      {/* Only render duplicate if scrolling */}
                      {tickerContent}
                    </motion.div>
                  ) : (
                    /* Static Layout (Centered) */
                    <div className="flex justify-center w-full">{tickerContent}</div>
                  )}
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
    , document.body
  );
}