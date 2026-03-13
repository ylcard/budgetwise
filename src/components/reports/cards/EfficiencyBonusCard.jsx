import { memo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { PiggyBank } from "lucide-react";
import { formatCurrency } from "../../utils/currencyUtils";
import { motion } from "framer-motion";
import InfoTooltip from "../../ui/InfoTooltip";
import { parseDate } from "../../utils/dateUtils";

export const EfficiencyBonusCard = memo(function EfficiencyBonusCard({
  bonusSavingsPotential = 0,
  settings,
  startDate
}) {
  const isPositive = bonusSavingsPotential > 0;
  const displayValue = isPositive ? bonusSavingsPotential : 0;

  const today = new Date();
  const start = parseDate(startDate) || new Date();
  const isCurrentMonth = today.getMonth() === start.getMonth() && today.getFullYear() === start.getFullYear();

  return (
    <Card className="border-none shadow-lg h-full w-full min-w-0 overflow-hidden">
      <CardContent className="p-4 md:p-6 text-center h-full flex flex-col justify-between">
        <div className="flex flex-col items-center">
          <p className="text-sm font-medium text-gray-500 flex items-center justify-center gap-1">
            {isCurrentMonth && isPositive ? "Projected Bonus" : "Efficiency Bonus"}
            <InfoTooltip title="Efficiency Bonus" description="Money saved by spending less than your allocated Needs and Wants budgets." />
          </p>
          <motion.h3
            initial={{ y: 5, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.2, duration: 0.5 }}
            className={`text-2xl font-bold mt-1 w-full truncate px-2 ${isPositive ? 'text-emerald-600' : 'text-gray-400'}`}
          >
            {formatCurrency(displayValue, settings)}
          </motion.h3>
          <div className={`flex items-center justify-center flex-wrap text-center gap-1 mt-2 text-xs font-medium w-full ${isPositive ? 'text-emerald-600/80' : 'text-gray-400'}`}>
            <span>{isPositive ? 'Unspent Needs & Wants' : 'Budget Fully Utilized'}</span>
          </div>
        </div>
        <div className="mt-4 flex justify-center">
          <div className={`p-3 rounded-full ${isPositive ? 'bg-emerald-100 text-emerald-600' : 'bg-gray-100 text-gray-400'}`}>
            <PiggyBank className="w-5 h-5" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
});