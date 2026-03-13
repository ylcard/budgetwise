import { memo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Wallet, ArrowUpRight, ArrowDownRight, Target } from "lucide-react";
import { formatCurrency } from "../../utils/currencyUtils";
import { motion } from "framer-motion";
import InfoTooltip from "../../ui/InfoTooltip";
import { parseDate } from "../../utils/dateUtils";

export const NetFlowCard = memo(function NetFlowCard({
  transactions = [],
  monthlyIncome = 0,
  totalPaidExpenses = 0,
  prevMonthlyIncome = 0,
  prevPaidExpenses = 0,
  safeBaseline = 0,
  projectedExpenseTotal = 0,
  projectedIncome = 0,
  startDate,
  settings
}) {

  const today = new Date();
  const start = parseDate(startDate);
  const isCurrentMonth = start && today.getMonth() === start.getMonth() && today.getFullYear() === start.getFullYear();

  const prevNetFlow = prevMonthlyIncome - prevPaidExpenses;
  const actualNetFlow = monthlyIncome - totalPaidExpenses;

  const effectiveIncome = isCurrentMonth && projectedIncome > 0 ? projectedIncome : monthlyIncome;
  const effectiveExpenses = isCurrentMonth && projectedExpenseTotal > 0 ? projectedExpenseTotal : totalPaidExpenses;
  const effectiveNetFlow = effectiveIncome - effectiveExpenses;

  const netFlowDiff = effectiveNetFlow - prevNetFlow;

  const getArrow = (diff) => diff >= 0
    ? <ArrowUpRight className="w-3 h-3" />
    : <ArrowDownRight className="w-3 h-3" />;

  return (
    <Card className="border-none shadow-lg h-full w-full min-w-0 overflow-hidden">
      <CardContent className="p-4 md:p-6 text-center h-full flex flex-col justify-between">
        <div className="flex flex-col items-center">
          <p className="text-sm font-medium text-gray-500 flex items-center justify-center gap-1">
            {isCurrentMonth ? "Projected Net Flow" : "Net Flow"}
            <InfoTooltip title="Net Flow" description={isCurrentMonth ? "Your projected total income minus projected total expenses for the month." : "Your total income minus total expenses."} />
          </p>
          <motion.h3
            initial={{ y: 5, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.1, duration: 0.5 }}
            className={`text-2xl font-bold mt-1 w-full truncate px-2 ${effectiveNetFlow >= 0 ? 'text-gray-900' : 'text-rose-600'}`}
          >
            {formatCurrency(effectiveNetFlow, settings)}
          </motion.h3>
          <div className={`flex items-center justify-center flex-wrap text-center gap-1 mt-2 text-xs font-medium w-full ${netFlowDiff >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
            {getArrow(netFlowDiff)}
            <span>{formatCurrency(Math.abs(netFlowDiff), settings)} vs last month</span>
          </div>
          {isCurrentMonth && (
            <div className="flex items-center justify-center flex-wrap gap-1 mt-2 text-xs font-medium w-full truncate text-gray-500">
              <span className="text-center">Actual so far: {formatCurrency(actualNetFlow, settings)}</span>
            </div>
          )}
        </div>
        <div className="mt-4 flex justify-center">
          <div className="p-3 rounded-full bg-blue-100 text-blue-600">
            <Wallet className="w-5 h-5" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
});