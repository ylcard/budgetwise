import { Link } from "react-router-dom";
import { format } from "date-fns";
import { ArrowRight, Banknote, ExternalLink, Pencil, Trash2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CustomButton } from "@/components/ui/CustomButton";
import { createPageUrl } from "@/utils";
import { createEntityMap } from "../utils/generalUtils";
import { formatCurrency } from "../utils/currencyUtils";
import { getCategoryIcon } from "../utils/iconMapConfig";
import { useSettings } from "../utils/SettingsContext";
import { getCurrentPeriodBoundaries } from "../utils/dateUtils";
import { useTransactions } from "../hooks/useBase44Entities";
import { usePaidTransactions } from "../hooks/useDerivedData";
import { detectCrossPeriodSettlement } from "../utils/calculationEngine";
import { useState } from "react";
import QuickAddTransaction from "../transactions/QuickAddTransaction";
import QuickAddIncome from "../transactions/QuickAddIncome";

export default function RecentTransactions({ categories, customBudgets, onEdit, onDelete }) {
    const { settings } = useSettings();
    
    // 1. Determine "Now" (Real-time boundaries)
    const { currentYear, monthStart, monthEnd } = getCurrentPeriodBoundaries();

    // 2. Fetch transactions specifically for the real-time current month
    const { transactions: rawTransactions } = useTransactions(monthStart, monthEnd);

    // 3. Process them (filter for paid, sort by date, limit to 10)
    const transactions = usePaidTransactions(rawTransactions, 10);

    const [editingTransaction, setEditingTransaction] = useState(null);
    const [showEditDialog, setShowEditDialog] = useState(false);

    const categoryMap = createEntityMap(categories);
    const customBudgetMap = createEntityMap(customBudgets || []);

    const handleEdit = (transaction) => {
        setEditingTransaction(transaction);
        setShowEditDialog(true);
    };

    const handleEditSubmit = (data) => {
        if (editingTransaction && onEdit) {
            onEdit(data, editingTransaction);
        }
        setShowEditDialog(false);
        setEditingTransaction(null);
    };

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
        <>
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

                            const crossPeriodInfo = detectCrossPeriodSettlement(
                                transaction,
                                monthStart,
                                monthEnd,
                                customBudgets || []
                            );

                            return (
                                <div
                                    key={transaction.id}
                                    className="relative flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 transition-colors group"
                                >
                                    <div className="flex items-center gap-3 flex-1 min-w-0">
                                        {isIncome ? (
                                            <div
                                                className="w-10 h-10 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform shrink-0"
                                                style={{ backgroundColor: '#10B98120' }}
                                            >
                                                <Banknote className="w-5 h-5" style={{ color: '#10B981' }} />
                                            </div>
                                        ) : category && (
                                            <div
                                                className="w-10 h-10 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform shrink-0"
                                                style={{ backgroundColor: `${category.color}20` }}
                                            >
                                                <IconComponent className="w-5 h-5" style={{ color: category.color }} />
                                            </div>
                                        )}
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2">
                                                <p className="font-medium text-gray-900 truncate">{transaction.title}</p>
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
                                                {/* UPDATED 13-Jan-2026: Always show CB badge if assigned */}
                                                {customBudget && (
                                                    <>
                                                        <span className="text-gray-300">•</span>
                                                        <Badge 
                                                            variant="outline" 
                                                            className={`text-xs px-2 py-0.5 font-medium ${
                                                                crossPeriodInfo.isCrossPeriod 
                                                                    ? 'bg-orange-50 text-orange-700 border-orange-200 hover:bg-orange-200 hover:border-orange-300 hover:text-orange-900' 
                                                                    : 'bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-200 hover:border-gray-300 hover:text-gray-900'
                                                            } transition-all cursor-pointer`}
                                                        >
                                                            <Link to={`/BudgetDetail?id=${customBudget.id}`} className="flex items-center gap-1">
                                                                {customBudget.name}
                                                                <ExternalLink className="w-2.5 h-2.5 opacity-60" />
                                                            </Link>
                                                        </Badge>
                                                    </>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex items-center shrink-0">
                                        <div className="text-right">
                                            <p className={`font-bold ${transaction.type === 'income' ? 'text-green-600' : 'text-red-600'}`}>
                                                {transaction.type === 'income' ? '+' : '-'}{formatCurrency(transaction.amount, settings)}
                                            </p>
                                        </div>
                                        
                                        {/* ADDED 13-Jan-2026: Edit/Delete action buttons */}
                                        <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all scale-95 group-hover:scale-100 bg-white shadow-sm border border-gray-100 rounded-lg p-1 z-10">
                                            <CustomButton
                                                variant="ghost"
                                                size="icon-sm"
                                                onClick={() => handleEdit(transaction)}
                                                className="h-7 w-7 hover:bg-blue-50 hover:text-blue-600"
                                            >
                                                <Pencil className="w-3 h-3" />
                                            </CustomButton>
                                            <CustomButton
                                                variant="ghost"
                                                size="icon-sm"
                                                onClick={() => onDelete && onDelete(transaction)}
                                                className="h-7 w-7 hover:bg-red-50 hover:text-red-600"
                                            >
                                                <Trash2 className="w-3 h-3" />
                                            </CustomButton>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </CardContent>
            </Card>

            {/* Edit Transaction Dialog */}
            {editingTransaction && (
                editingTransaction.type === 'income' ? (
                    <QuickAddIncome
                        open={showEditDialog}
                        onOpenChange={setShowEditDialog}
                        transaction={editingTransaction}
                        onSubmit={handleEditSubmit}
                        renderTrigger={false}
                    />
                ) : (
                    <QuickAddTransaction
                        open={showEditDialog}
                        onOpenChange={setShowEditDialog}
                        transaction={editingTransaction}
                        categories={categories}
                        customBudgets={customBudgets}
                        onSubmit={handleEditSubmit}
                        renderTrigger={false}
                    />
                )
            )}
        </>
    );
}