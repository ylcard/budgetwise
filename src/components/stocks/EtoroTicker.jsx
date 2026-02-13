import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useEtoroData } from '../../components/hooks/useEtoroData';
import { Loader2, TrendingUp } from 'lucide-react';
import { cn } from '../../components/utils/cn'; // Assuming utility exists based on tech stack

export default function EtoroTicker() {
  const { positions, status, totalValue } = useEtoroData();
  const [isExpanded, setIsExpanded] = useState(false);

  // Formatting: 10300 -> 10.3k
  const formatCompact = (val) => {
    return new Intl.NumberFormat('en-US', {
      notation: 'compact',
      maximumFractionDigits: 1,
    }).format(val);
  };

  const tickerContent = useMemo(() => (
    <div className="flex items-center gap-6 pr-8">
      {positions.map((pos) => (
        <div key={pos.instrumentId} className="flex items-center gap-1.5 shrink-0">
          <span className="text-[10px] font-bold text-slate-400 uppercase">
            {pos.symbol || pos.name.substring(0, 4)}
          </span>
          <span className="text-xs font-mono font-medium text-white">
            €{formatCompact(pos.value)}
          </span>
        </div>
      ))}
      <div className="flex items-center gap-1.5 shrink-0 border-l border-slate-700 pl-4">
        <span className="text-[10px] font-bold text-emerald-400 uppercase">Total</span>
        <span className="text-xs font-mono font-bold text-emerald-400">
          €{formatCompact(totalValue)}
        </span>
      </div>
    </div>
  ), [positions, totalValue]);

  if (status === "Error") return null;

  return (
    <div className="fixed bottom-6 left-6 z-50 pointer-events-none">
      <motion.div
        layout
        initial={false}
        onClick={() => setIsExpanded(!isExpanded)}
        className={cn(
          "pointer-events-auto flex items-center bg-slate-900 border border-slate-800 shadow-2xl overflow-hidden cursor-pointer",
          isExpanded ? "rounded-full py-2 px-4 max-w-[85vw] md:max-w-md" : "rounded-2xl p-3"
        )}
      >
        {/* Left Icon/Status */}
        <div className="flex items-center gap-2 shrink-0">
          <div className="relative">
            <TrendingUp className={cn("h-5 w-5", status === 'Live' ? 'text-emerald-500' : 'text-amber-500')} />
            {status === 'Live' && (
              <span className="absolute -top-1 -right-1 h-2 w-2 bg-emerald-500 rounded-full animate-pulse" />
            )}
          </div>
          {!isExpanded && (
            <span className="text-xs font-bold text-white pr-1">
              €{formatCompact(totalValue)}
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
                  <motion.div
                    animate={{ x: ["0%", "-50%"] }}
                    transition={{
                      duration: positions.length * 3,
                      ease: "linear",
                      repeat: Infinity
                    }}
                    className="flex shrink-0"
                  >
                    {tickerContent}
                    {tickerContent}
                  </motion.div>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* Tooltip hint for desktop */}
      {!isExpanded && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 0.5, y: 0 }}
          className="hidden md:block absolute -top-8 left-0 text-[10px] text-slate-500 font-medium tracking-tight"
        >
          TAP TO VIEW
        </motion.div>
      )}
    </div>
  );
}