import { Link } from "react-router-dom";
import { format } from "date-fns";
import { ArrowRight, Banknote, ExternalLink } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { createPageUrl } from "@/utils";
import { createEntityMap } from "../utils/generalUtils";
import { formatCurrency } from "../utils/currencyUtils";
import { getCategoryIcon } from "../utils/iconMapConfig";
import { useSettings } from "../utils/SettingsContext";
import { usePeriod } from "../hooks/usePeriod";
// Import cross-period detection for Settlement View indicators
import { detectCrossPeriodSettlement } from "../utils/calculationEngine";

export default function RecentTransactions({ transactions, categories, customBudgets }) {
    const { settings } = useSettings();
    const { currentYear, monthStart, monthEnd } = usePeriod();

    const categoryMap = createEntityMap(categories);
    const customBudgetMap = createEntityMap(customBudgets || []);

    // Note: isCollapsed and onToggleCollapse props removed as they were not being used
    // If collapse functionality is needed in the future, these props can be re-added

    if (transactions.length === 0) {
        return (
            <Card className="border-none shadow-lg">
                <CardHeader>
                    <CardTitle>Recent Transactions</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="h-40 flex items-center justify-center text-gray-400">
                        <p>No paid transactions yet. Add your first one!</p>
                    </div>
                </CardContent>
            </Card>
        );
    }

    return (
        <Card className="border-none shadow-lg">
            <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Recent Transactions</CardTitle>
                <Link to={createPageUrl("Transactions")} className="text-sm text-blue-600 hover:text-blue-700 flex items-center gap-1">
                    View All
                    <ArrowRight className="w-4 h-4" />
                </Link>
            </CardHeader>
            <CardContent>
                <div className="space-y-2">
                    {transactions.map((transaction) => {
                        const category = categoryMap[transaction.category_id];
                        const customBudget = transaction.customBudgetId ? customBudgetMap[transaction.customBudgetId] : null;
                        const isIncome = transaction.type === 'income';
                        const IconComponent = getCategoryIcon(category?.icon);

                        const paidYear = transaction.paidDate ? new Date(transaction.paidDate).getFullYear() : null;
                        const showYear = paidYear && paidYear !== currentYear;

                        // ADDED 20-Jan-2025: Detect cross-period settlements for visual indicators
                        const crossPeriodInfo = detectCrossPeriodSettlement(
                            transaction,
                            monthStart,
                            monthEnd,
                            customBudgets || []
                        );

                        return (
                            <div
                                key={transaction.id}
                                className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 transition-colors group"
                            >
                                <div className="flex items-center gap-3 flex-1">
                                    {isIncome ? (
                                        <div
                                            className="w-10 h-10 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform"
                                            style={{ backgroundColor: '#10B98120' }}
                                        >
                                            <Banknote className="w-5 h-5" style={{ color: '#10B981' }} />
                                        </div>
                                    ) : category && (
                                        <div
                                            className="w-10 h-10 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform"
                                            style={{ backgroundColor: `${category.color}20` }}
                                        >
                                            <IconComponent className="w-5 h-5" style={{ color: category.color }} />
                                        </div>
                                    )}
                                    <div className="flex-1">
                                        <div className="flex items-center gap-2">
                                            <p className="font-medium text-gray-900">{transaction.title}</p>
                                        </div>
                                        <div className="flex items-center gap-2 mt-1 flex-wrap">
                                            <p className="text-sm text-gray-500">
                                                {format(new Date(transaction.date), "MMM d, yyyy")}
                                            </p>
                                            {!isIncome && transaction.paidDate && (
                                                <>
                                                    <span className="text-gray-300">•</span>
                                                    <p className="text-xs text-green-600">
                                                        Paid {format(new Date(transaction.paidDate), showYear ? "MMM d, yyyy" : "MMM d")}
                                                    </p>
                                                </>
                                            )}
                                            {/* Standard Budget Badge: Gray Theme (Exact same structure as Orange) */}
                                            {customBudget && !crossPeriodInfo.isCrossPeriod && (
                                                <>
                                                    <span className="text-gray-300">•</span>
                                                    {/* Standard Badge: Gray Theme (Exact same structure as Orange) */}
                                                    <Badge variant="outline" className="text-xs bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-200 hover:border-gray-300 hover:text-gray-900 transition-all cursor-pointer px-2 py-0.5 font-medium">
                                                        <Link to={`/BudgetDetail?id=${customBudget.id}`} className="flex items-center gap-1">
                                                            {customBudget.name}
                                                            <ExternalLink className="w-2.5 h-2.5 opacity-60" />
                                                        </Link>
                                                    </Badge>
                                                </>
                                            )}
                                            {crossPeriodInfo.isCrossPeriod && (
                                                <>
                                                    <span className="text-gray-300">•</span>
                                                    {/* Cross-Period Badge: Orange Theme */}
                                                    <Badge variant="outline" className="text-xs bg-orange-50 text-orange-700 border-orange-200 hover:bg-orange-200 hover:border-orange-300 hover:text-orange-900 transition-all cursor-pointer px-2 py-0.5 font-medium">
                                                        {crossPeriodInfo.bucketId ? (
                                                            <Link to={`/BudgetDetail?id=${crossPeriodInfo.bucketId}`} className="flex items-center gap-1">
                                                                {crossPeriodInfo.bucketName}
                                                                <ExternalLink className="w-2.5 h-2.5 opacity-60" />
                                                            </Link>
                                                        ) : (
                                                            <span>{crossPeriodInfo.bucketName}</span>
                                                        )}
                                                    </Badge>
                                                </>
                                            )}
                                        </div>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <p className={`font-bold ${transaction.type === 'income' ? 'text-green-600' : 'text-red-600'}`}>
                                        {transaction.type === 'income' ? '+' : '-'}{formatCurrency(transaction.amount, settings)}
                                    </p>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </CardContent>
        </Card>
    );
}