import { memo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { TrendingUp, ArrowUpRight, ArrowDownRight } from "lucide-react";
import { motion } from "framer-motion";
import InfoTooltip from "../../ui/InfoTooltip";
import { parseDate } from "../../utils/dateUtils";

export const SavingsRateCard = memo(function SavingsRateCard({
  monthlyIncome = 0,
  totalPaidExpenses = 0,
  prevMonthlyIncome = 0,
  prevPaidExpenses = 0,
  projectedIncome = 0,
  projectedExpenseTotal = 0,
  startDate
}) {
  const today = new Date();
  const start = parseDate(startDate) || new Date();
  const isCurrentMonth = today.getMonth() === start.getMonth() && today.getFullYear() === start.getFullYear();

  const effectiveIncome = isCurrentMonth && projectedIncome > 0 ? projectedIncome : monthlyIncome;
  const effectiveExpenses = isCurrentMonth && projectedExpenseTotal > 0 ? projectedExpenseTotal : totalPaidExpenses;

  const savingsRate = effectiveIncome > 0
    ? ((effectiveIncome - effectiveExpenses) / effectiveIncome) * 100
    : 0;

  const prevSavingsRate = prevMonthlyIncome > 0
    ? ((prevMonthlyIncome - prevPaidExpenses) / prevMonthlyIncome) * 100
    : 0;

  const actualMtdSavingsRate = monthlyIncome > 0
    ? ((monthlyIncome - totalPaidExpenses) / monthlyIncome) * 100
    : 0;

  const savingsRateDiff = savingsRate - prevSavingsRate;
  const getArrow = (diff) => diff >= 0
    ? <ArrowUpRight className="w-3 h-3" />
    : <ArrowDownRight className="w-3 h-3" />;

  return (
    <Card className="border-none shadow-lg h-full w-full min-w-0 overflow-hidden">
      <CardContent className="p-4 md:p-6 text-center h-full flex flex-col justify-between">
        <div className="flex flex-col items-center">
          <p className="text-sm font-medium text-gray-500 flex items-center justify-center gap-1">
            {isCurrentMonth ? "Projected Savings" : "Savings Rate"}
            <InfoTooltip title="Savings Rate" description={isCurrentMonth ? "Your projected end-of-month savings rate based on expected income and expenses." : "The percentage of your income that you saved after expenses."} />
          </p>
          <motion.h3
            initial={{ y: 5, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ duration: 0.5 }}
            className={`text-2xl font-bold mt-1 w-full truncate px-2 ${savingsRate >= 20 ? 'text-emerald-600' : savingsRate > 0 ? 'text-blue-600' : 'text-rose-600'}`}
          >
            {savingsRate.toFixed(1)}%
          </motion.h3>
          <div className={`flex items-center justify-center flex-wrap text-center gap-1 mt-2 text-xs font-medium w-full ${savingsRateDiff >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
            {getArrow(savingsRateDiff)}
            <span>{Math.abs(savingsRateDiff).toFixed(1)}% vs last month</span>
          </div>
          {isCurrentMonth && (
            <div className="flex items-center justify-center flex-wrap gap-1 mt-2 text-xs font-medium w-full truncate text-gray-500">
              <span>Actual so far: {actualMtdSavingsRate.toFixed(1)}%</span>
            </div>
          )}
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
