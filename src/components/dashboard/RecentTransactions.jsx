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
import ExpenseFormDialog from "../transactions/dialogs/ExpenseFormDialog";
import IncomeFormDialog from "../transactions/dialogs/IncomeFormDialog";

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
                    <div className="h-40 flex items-center justify-center text-muted-foreground">
                        <p>No paid transactions yet. Add your first one!</p>
                    </div>
                </CardContent>
            </Card>
        );
    }

    return (
        <>
            <Card className="border-none shadow-lg">
                <CardHeader className="flex flex-row items-center justify-between p-4 sm:p-6">
                    <CardTitle>Recent Transactions</CardTitle>
                    <Link to={createPageUrl("Transactions")} className="text-sm text-blue-600 hover:text-blue-700 flex items-center gap-1">
                        View All
                        <ArrowRight className="w-4 h-4" />
                    </Link>
                </CardHeader>
                <CardContent className="p-4 pt-0 sm:p-6 sm:pt-0">
                    <div className="space-y-1">
                        {transactions.map((transaction) => {
                            const category = categoryMap[transaction.category_id];
                            const customBudget = transaction.budgetId ? customBudgetMap[transaction.budgetId] : null;
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
                                    className="relative flex items-center justify-between p-2 sm:p-3 rounded-lg hover:bg-accent/50 transition-colors group overflow-hidden"
                                >
                                    <div className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0">
                                        {isIncome ? (
                                            <div
                                                className="w-9 h-9 sm:w-10 sm:h-10 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform shrink-0"
                                                style={{ backgroundColor: '#10B98120' }}
                                            >
                                                <Banknote className="w-5 h-5" style={{ color: '#10B981' }} />
                                            </div>
                                        ) : category && (
                                            <div
                                                className="w-9 h-9 sm:w-10 sm:h-10 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform shrink-0"
                                                style={{ backgroundColor: `${category.color}20` }}
                                            >
                                                <IconComponent className="w-5 h-5" style={{ color: category.color }} />
                                            </div>
                                        )}
                                        <div className="flex-1 min-w-0">
                                            <p className="font-medium text-foreground truncate text-sm sm:text-base">{transaction.title}</p>
                                            <div className="flex items-center gap-x-1 gap-y-0.5 mt-0.5 flex-wrap">
                                                <p className="text-[11px] sm:text-sm text-muted-foreground whitespace-nowrap">
                                                    {format(new Date(transaction.date), "MMM d, yyyy")}
                                                </p>
                                                {!isIncome && transaction.paidDate && (
                                                    <>
                                                        <span className="text-gray-300 hidden sm:inline">•</span>
                                                        <span className="text-muted-foreground/30 hidden sm:inline">•</span>
                                                        <p className="text-[10px] sm:text-xs text-green-600 whitespace-nowrap">
                                                            Paid {format(new Date(transaction.paidDate), showYear ? "MMM d, yyyy" : "MMM d")}
                                                        </p>
                                                    </>
                                                )}
                                                {/* UPDATED 13-Jan-2026: Always show CB badge if assigned */}
                                                {customBudget && (
                                                    <>
                                                        <span className="text-muted-foreground/30 hidden sm:inline">•</span>
                                                        <Badge
                                                            variant="outline"
                                                            className={`text-[10px] px-1.5 py-0 font-medium max-w-[120px] truncate ${crossPeriodInfo.isCrossPeriod
                                                                ? 'bg-orange-50 text-orange-700 border-orange-200 hover:bg-orange-200 hover:border-orange-300 hover:text-orange-900'
                                                                : 'bg-muted text-muted-foreground border-border hover:bg-accent hover:text-foreground'
                                                                } transition-all cursor-pointer inline-flex items-center gap-1`}
                                                        >
                                                            <Link to={`/BudgetDetail?id=${customBudget.id}`} className="truncate">
                                                                {customBudget.name}
                                                            </Link>
                                                            <ExternalLink className="w-2 h-2 opacity-60 shrink-0" />
                                                        </Badge>
                                                    </>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                    {/* UPDATED: Sliding Swap Animation */}
                                    <div className="relative flex items-center justify-end shrink-0 min-w-[80px] sm:min-w-[100px] ml-2">
                                        <p className={`text-sm sm:text-base font-bold transition-all duration-300 ease-in-out group-hover:translate-x-full group-hover:opacity-0 ${transaction.type === 'income' ? 'text-green-600' : 'text-red-600'}`}>
                                            {transaction.type === 'income' ? '+' : '-'}{formatCurrency(transaction.amount, settings)}
                                        </p>

                                        <div className="absolute right-0 flex items-center gap-1 transition-all duration-300 ease-in-out translate-x-full opacity-0 group-hover:translate-x-0 group-hover:opacity-100">
                                            <CustomButton
                                                variant="ghost"
                                                size="icon-sm"
                                                onClick={() => handleEdit(transaction)}
                                                className="h-8 w-8 hover:bg-blue-50 hover:text-blue-600"
                                            >
                                                <Pencil className="w-3 h-3" />
                                            </CustomButton>
                                            <CustomButton
                                                variant="ghost"
                                                size="icon-sm"
                                                onClick={() => onDelete && onDelete(transaction)}
                                                className="h-8 w-8 hover:bg-red-50 hover:text-red-600"
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
                    <IncomeFormDialog
                        open={showEditDialog}
                        onOpenChange={setShowEditDialog}
                        transaction={editingTransaction}
                        onSubmit={handleEditSubmit}
                        renderTrigger={false}
                    />
                ) : (
                    <ExpenseFormDialog
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