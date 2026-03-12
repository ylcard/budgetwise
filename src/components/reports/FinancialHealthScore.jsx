import { memo, useEffect } from "react";
import { Activity } from "lucide-react";
import { motion, useTransform, animate, useMotionValue } from "framer-motion";
import InfoTooltip from "../ui/InfoTooltip";
import useEmblaCarousel from "embla-carousel-react";

/**
 * Determines styling configuration based on health score (0-100)
 */
const getScoreStyle = (score) => {
  if (score >= 90) return { color: 'text-emerald-600', bg: 'bg-emerald-50', bar: 'bg-emerald-500', label: 'Excellent' };
  if (score >= 75) return { color: 'text-blue-600', bg: 'bg-blue-50', bar: 'bg-blue-500', label: 'Good' };
  if (score >= 60) return { color: 'text-amber-600', bg: 'bg-amber-50', bar: 'bg-amber-500', label: 'Fair' };
  return { color: 'text-rose-600', bg: 'bg-rose-50', bar: 'bg-rose-500', label: 'At Risk' };
};

const getHeaderStyle = (score) => {
  if (score >= 90) return {
    bg: 'bg-emerald-50', border: 'border-emerald-100', text: 'text-emerald-900', subtext: 'text-emerald-600',
    iconBg: 'bg-emerald-200', iconColor: 'text-emerald-700', gradient: 'from-emerald-50 to-white', verdict: 'Excellent Health'
  };
  if (score >= 75) return {
    bg: 'bg-blue-50', border: 'border-blue-100', text: 'text-blue-900', subtext: 'text-blue-600',
    iconBg: 'bg-blue-200', iconColor: 'text-blue-700', gradient: 'from-blue-50 to-white', verdict: 'Good Health'
  };
  if (score >= 60) return {
    bg: 'bg-amber-50', border: 'border-amber-100', text: 'text-amber-900', subtext: 'text-amber-600',
    iconBg: 'bg-amber-200', iconColor: 'text-amber-700', gradient: 'from-amber-50 to-white', verdict: 'Fair Health'
  };
  return {
    bg: 'bg-rose-50', border: 'border-rose-100', text: 'text-rose-900', subtext: 'text-rose-600',
    iconBg: 'bg-rose-200', iconColor: 'text-rose-700', gradient: 'from-rose-50 to-white', verdict: 'Needs Attention'
  };
};

const RollingNumber = ({ value, duration = 1.5 }) => {
  const motionValue = useMotionValue(0);
  const rounded = useTransform(motionValue, (latest) => Math.round(latest));

  useEffect(() => {
    const controls = animate(motionValue, value, {
      duration: duration,
      ease: "circOut",
    });
    return controls.stop;
  }, [value, duration, motionValue]);

  return <motion.span className="tabular-nums tracking-tight">{rounded}</motion.span>;
};

const HealthCell = memo(({ label, score, description, wiki }) => {
  const style = getScoreStyle(score);

  return (
    <div className="flex flex-col h-full justify-between p-4 md:p-3 rounded-xl border border-gray-100 bg-white shadow-md">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">{label}</span>
        <InfoTooltip title={label} description={description} wikiUrl={wiki} />
      </div>
      <div className="flex items-end justify-between mb-3">
        <span className={`text-2xl font-bold ${style.color}`}>
          <RollingNumber value={score} />
        </span>
        <motion.span
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.5, duration: 0.5 }}
          className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${style.bg} ${style.color}`}
        >
          {style.label}
        </motion.span>
      </div>
      <div className="h-1.5 w-full bg-gray-100 rounded-full overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${score}%` }}
          transition={{ duration: 1, delay: 0.2 }}
          className={`h-full ${style.bar}`}
        />
      </div>
    </div>
  );
});

export default memo(function FinancialHealthScore({ healthData, className }) {
  const [emblaRef] = useEmblaCarousel({
    align: "center",
    breakpoints: { '(min-width: 768px)': { active: false } }
  });

  if (!healthData) {
    return (
      <div className="w-full overflow-hidden px-4 md:px-0" ref={emblaRef}>
        <div className="flex touch-pan-y gap-3 md:grid md:grid-cols-5 md:gap-4 animate-pulse">
          <div className="flex-[0_0_85%] sm:flex-[0_0_65%] md:flex-auto min-w-0 md:col-span-5">
            <div className="h-24 bg-gray-100 rounded-xl border border-gray-200 w-full" />
          </div>
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="flex-[0_0_60%] sm:flex-[0_0_40%] md:flex-auto min-w-0 md:col-span-1">
              <div className="h-32 bg-gray-50 rounded-lg border border-gray-100 w-full" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  const { totalScore, breakdown } = healthData;
  const { pacing: pacingScore, ratio: ratioScore, stability: stabilityScore, sharpe: sharpeScore, creep: creepScore } = breakdown;
  const headerStyle = getHeaderStyle(totalScore);

  return (
    <div className="w-full overflow-hidden py-1 px-4 md:px-0" ref={emblaRef}>
      <div className={`flex touch-pan-y gap-3 md:grid md:grid-cols-5 md:gap-4 md:auto-rows-max items-stretch ${className || ''}`}>

        {/* Main Header Card - Hero Slide on Mobile, Span 5 on Desktop */}
        <div className="flex-[0_0_85%] sm:flex-[0_0_65%] md:flex-auto min-w-0 md:col-span-5">
          <div className={`relative overflow-hidden flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 md:p-5 rounded-xl border shadow-md transition-colors duration-300 gap-4 h-full ${headerStyle.bg} ${headerStyle.border}`}>
            <div className={`absolute inset-0 bg-gradient-to-br ${headerStyle.gradient} opacity-60`} />
            <div className="relative z-10 flex items-center gap-3 md:gap-4 w-full sm:w-auto">
              <div className={`w-14 h-14 rounded-2xl flex items-center justify-center ${headerStyle.iconBg} shadow-sm`}>
                <Activity className={`w-7 h-7 ${headerStyle.iconColor}`} />
              </div>
              <div className="min-w-0">
                <h3 className={`font-bold text-base md:text-lg leading-tight ${headerStyle.text}`}>Financial Health Score</h3>
                <p className={`text-sm font-medium ${headerStyle.subtext}`}>Composite wellness analysis</p>
              </div>
            </div>
            <div className="relative z-10 flex flex-row sm:flex-col items-center sm:items-end justify-between w-full sm:w-auto mt-2 sm:mt-0">
              <div className="flex items-baseline gap-1">
                <span className={`text-4xl font-extrabold ${headerStyle.text}`}>
                  <RollingNumber value={totalScore} duration={2} />
                </span>
                <span className={`text-sm font-semibold ${headerStyle.subtext}`}>/100</span>
              </div>
              <motion.span
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 1 }}
                className={`text-xs font-bold uppercase tracking-wider px-2.5 py-1 rounded-full bg-white/60 backdrop-blur-sm ${headerStyle.iconColor} ml-auto sm:ml-0 sm:mt-1`}
              >
                {headerStyle.verdict}
              </motion.span>
            </div>
          </div>
        </div>

        {/* DNA Grid Factors - Individual slides on Mobile, Cols 1 on Desktop */}
        <div className="flex-[0_0_60%] sm:flex-[0_0_40%] md:flex-auto min-w-0 md:col-span-1">
          <HealthCell label="Pacing" score={pacingScore} description="Compares your current spending to your 3-month historical average for the same day of the month." />
        </div>
        <div className="flex-[0_0_60%] sm:flex-[0_0_40%] md:flex-auto min-w-0 md:col-span-1">
          <HealthCell label="Burn" score={ratioScore} description="Sustainability: Will you run out of money before the month ends?" wiki="https://en.wikipedia.org/wiki/Burn_rate" />
        </div>
        <div className="flex-[0_0_60%] sm:flex-[0_0_40%] md:flex-auto min-w-0 md:col-span-1">
          <HealthCell label="Stability" score={stabilityScore} description="Measures how predictable your monthly expenses are. High stability = fewer surprises." wiki="https://en.wikipedia.org/wiki/Coefficient_of_variation" />
        </div>
        <div className="flex-[0_0_60%] sm:flex-[0_0_40%] md:flex-auto min-w-0 md:col-span-1">
          <HealthCell label="Sharpe" score={sharpeScore} description="Risk-adjusted savings consistency. High score = you save consistently, not just occasionally." wiki="https://en.wikipedia.org/wiki/Sharpe_ratio" />
        </div>
        <div className="flex-[0_0_60%] sm:flex-[0_0_40%] md:flex-auto min-w-0 md:col-span-1">
          <HealthCell label="Creep" score={creepScore} description="Lifestyle Creep: Are your expenses growing faster than your income?" wiki="https://en.wikipedia.org/wiki/Lifestyle_inflation" />
        </div>

      </div>
    </div>
  );
});