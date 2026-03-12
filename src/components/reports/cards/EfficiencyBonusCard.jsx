import { memo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { PiggyBank } from "lucide-react";
import { formatCurrency } from "../../utils/currencyUtils";
import { motion } from "framer-motion";
import InfoTooltip from "../../ui/InfoTooltip";

export const EfficiencyBonusCard = memo(function EfficiencyBonusCard({
  bonusSavingsPotential = 0,
  settings
}) {
  return (
    <Card className="border-none shadow-lg h-full">
      <CardContent className="p-4 md:p-6 text-center h-full flex flex-col justify-between">
        <div className="flex flex-col items-center">
          <p className="text-sm font-medium text-gray-500 flex items-center justify-center gap-1">
            Efficiency Bonus
            <InfoTooltip title="Efficiency Bonus" description="The amount of money you saved by spending less than your allocated Needs and Wants budgets." />
          </p>
          <motion.h3
            initial={{ y: 5, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.2, duration: 0.5 }}
            className="text-2xl font-bold mt-1 text-emerald-600"
          >
            {formatCurrency(bonusSavingsPotential, settings)}
          </motion.h3>
          <div className="flex items-center gap-1 mt-2 text-xs font-medium text-emerald-600/80">
            <span>{bonusSavingsPotential >= 0 ? 'Unspent Needs & Wants' : 'Budget Overspend'}</span>
          </div>
        </div>
        <div className="mt-4 flex justify-center">
          <div className="p-3 rounded-full bg-emerald-100 text-emerald-600">
            <PiggyBank className="w-5 h-5" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
});