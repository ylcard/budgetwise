import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis } from "recharts";
import { clsx } from "clsx";

// Mock Data for the simulation
const MOCK_DATA = Array.from({ length: 30 }).map((_, i) => ({
  day: i,
  amount: 2000 + Math.random() * 1000 - (i * 50), // Sims spending down
  label: i === 29 ? "Today" : `Day ${i + 1}`,
  predicted: i > 25 // Last 5 days are "predicted"
}));

export const VelocityWidget = () => {
  const [activeIndex, setActiveIndex] = useState(MOCK_DATA.length - 1);
  const activeData = MOCK_DATA[activeIndex];

  // Haptic feedback function (browser support varies, but good for mobile)
  const triggerHaptic = () => {
    if (navigator.vibrate) navigator.vibrate(5);
  };

  const handleMouseMove = (e) => {
    if (!e.activeTooltipIndex) return;
    if (e.activeTooltipIndex !== activeIndex) {
      setActiveIndex(e.activeTooltipIndex);
      triggerHaptic();
    }
  };

  return (
    <div className="w-full bg-slate-900 rounded-3xl p-6 text-white shadow-2xl overflow-hidden relative isolate">
      {/* Background Glow */}
      <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/20 blur-[80px] rounded-full -z-10" />

      {/* Header Info */}
      <div className="flex justify-between items-end mb-8">
        <div>
          <motion.p 
            key={activeData.predicted ? "pred" : "act"}
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 0.7, y: 0 }}
            className="text-sm font-medium uppercase tracking-wider text-slate-400"
          >
            {activeData.predicted ? "Projected Balance" : "Balance on"}
          </motion.p>
          <h2 className="text-4xl font-bold mt-1 tabular-nums">
            ${activeData.amount.toFixed(2)}
          </h2>
        </div>
        <div className="text-right">
          <p className="text-sm font-bold text-indigo-400">{activeData.label}</p>
        </div>
      </div>

      {/* Interactive Chart */}
      <div className="h-40 -mx-6">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart
            data={MOCK_DATA}
            onMouseMove={handleMouseMove}
            onTouchMove={handleMouseMove} // Mobile support
            margin={{ top: 0, right: 0, left: 0, bottom: 0 }}
          >
            <defs>
              <linearGradient id="colorAmount" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#818cf8" stopOpacity={0.3}/>
                <stop offset="95%" stopColor="#818cf8" stopOpacity={0}/>
              </linearGradient>
            </defs>
            <Tooltip 
              cursor={{ stroke: "#fff", strokeWidth: 1, strokeDasharray: "4 4" }} 
              content={<></>} // Hide default tooltip, we use the header
            />
            <Area 
              type="monotone" 
              dataKey="amount" 
              stroke="#818cf8" 
              strokeWidth={3}
              fillOpacity={1} 
              fill="url(#colorAmount)" 
              animationDuration={500}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Contextual Hints */}
      <div className="mt-4 flex gap-2 overflow-x-auto pb-2">
         {activeData.predicted && (
            <motion.div 
               initial={{ opacity: 0, scale: 0.9 }}
               animate={{ opacity: 1, scale: 1 }}
               className="bg-indigo-500/20 text-indigo-300 px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap"
            >
               🔮 Forecast Mode
            </motion.div>
         )}
         {activeIndex === MOCK_DATA.length - 1 && (
            <div className="bg-emerald-500/20 text-emerald-300 px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap">
               Live
            </div>
         )}
      </div>
    </div>
  );
};
