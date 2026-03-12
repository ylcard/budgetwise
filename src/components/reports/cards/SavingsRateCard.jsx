import { memo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { TrendingUp, ArrowUpRight, ArrowDownRight } from "lucide-react";
import { motion } from "framer-motion";
import InfoTooltip from "../../ui/InfoTooltip";

export const SavingsRateCard = memo(function SavingsRateCard({
  monthlyIncome = 0,
  totalPaidExpenses = 0,
  prevMonthlyIncome = 0,
  prevPaidExpenses = 0,
}) {
  const savingsRate = monthlyIncome > 0
    ? ((monthlyIncome - totalPaidExpenses) / monthlyIncome) * 100
    : 0;

  const prevSavingsRate = prevMonthlyIncome > 0
    ? ((prevMonthlyIncome - prevPaidExpenses) / prevMonthlyIncome) * 100
    : 0;

  const savingsRateDiff = savingsRate - prevSavingsRate;

  const getArrow = (diff) => diff >= 0
    ? <ArrowUpRight className="w-3 h-3" />
    : <ArrowDownRight className="w-3 h-3" />;

  return (
    <Card className="border-none shadow-lg h-full">
      <CardContent className="p-4 md:p-6 text-center h-full flex flex-col justify-between">
        <div className="flex flex-col items-center">
          <p className="text-sm font-medium text-gray-500 flex items-center justify-center gap-1">
            Savings Rate
            <InfoTooltip title="Savings Rate" description="The percentage of your income that you save after expenses." />
          </p>
          <motion.h3
            initial={{ y: 5, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ duration: 0.5 }}
            className={`text-2xl font-bold mt-1 ${savingsRate >= 20 ? 'text-emerald-600' : savingsRate > 0 ? 'text-blue-600' : 'text-rose-600'}`}
          >
            {savingsRate.toFixed(1)}%
          </motion.h3>
          <div className={`flex items-center gap-1 mt-2 text-xs font-medium ${savingsRateDiff >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
            {getArrow(savingsRateDiff)}
            <span>{Math.abs(savingsRateDiff).toFixed(1)}% vs last month</span>
          </div>
        </div>
        <div className="mt-4 flex justify-center">
          <div className={`p-3 rounded-full ${savingsRate >= 0 ? 'bg-emerald-100 text-emerald-600' : 'bg-rose-100 text-rose-600'}`}>
            <TrendingUp className="w-5 h-5" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
});
