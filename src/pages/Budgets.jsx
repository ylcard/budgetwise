import { useState, useMemo } from "react";
import { CustomButton } from "@/components/ui/CustomButton";
import { Plus } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useSettings } from "../components/utils/SettingsContext";
import { usePeriod } from "../components/hooks/usePeriod";
import {
    useTransactions,
    useCategories,
    useCustomBudgetsAll,
    useSystemBudgetsForPeriod,
    useCashWallet,
} from "../components/hooks/useBase44Entities";
import { useBudgetsAggregates } from "../components/hooks/useDerivedData";
import { useCustomBudgetActions } from "../components/hooks/useActions";
import { parseDate } from "../components/utils/dateUtils";
import BudgetCard from "../components/budgets/BudgetCard";
import MonthNavigator from "../components/ui/MonthNavigator";
import QuickAddBudget from "../components/dashboard/QuickAddBudget";

/**
 * Calculates statistics for a custom budget, filtering expenses based on the selected month.
 */
const getCustomBudgetStats = (customBudget, transactions, monthStart, monthEnd) => {
    const budgetTransactions = transactions.filter(t => t.customBudgetId === customBudget.id);

    // Parse month boundaries for filtering paid expenses
    const monthStartDate = parseDate(monthStart);
    const monthEndDate = parseDate(monthEnd);

    // Separate digital and cash transactions
    const digitalTransactions = budgetTransactions.filter(
        t => !t.isCashTransaction || t.cashTransactionType !== 'expense_from_wallet'
    );
    const cashTransactions = budgetTransactions.filter(
        t => t.isCashTransaction && t.cashTransactionType === 'expense_from_wallet'
    );

    // Calculate digital stats - ONLY include paid expenses that were paid within the selected month
    const digitalAllocated = customBudget.allocatedAmount || 0;
    const digitalSpent = digitalTransactions
        .filter(t => {
            if (t.type !== 'expense') return false;
            if (!t.isPaid || !t.paidDate) return false;

            // Filter by paidDate within selected month
            const paidDate = parseDate(t.paidDate);
            return paidDate >= monthStartDate && paidDate <= monthEndDate;
        })
        .reduce((sum, t) => sum + (t.originalAmount || t.amount), 0);

    const digitalUnpaid = digitalTransactions
        .filter(t => t.type === 'expense' && !t.isPaid)
        .reduce((sum, t) => sum + (t.originalAmount || t.amount), 0);

    // Calculate cash stats by currency - ONLY include paid expenses that were paid within the selected month
    const cashByCurrency = {};
    const cashAllocations = customBudget.cashAllocations || [];

    cashAllocations.forEach(allocation => {
        const currencyCode = allocation.currencyCode;
        const allocated = allocation.amount || 0;

        const spent = cashTransactions
            .filter(t => {
                if (t.type !== 'expense') return false;
                if (t.cashCurrency !== currencyCode) return false;
                if (!t.isPaid || !t.paidDate) return false;

                // Filter by paidDate within selected month
                const paidDate = parseDate(t.paidDate);
                return paidDate >= monthStartDate && paidDate <= monthEndDate;
            })
            .reduce((sum, t) => sum + (t.cashAmount || 0), 0);

        cashByCurrency[currencyCode] = {
            allocated,
            spent,
            remaining: allocated - spent
        };
    });

    // Calculate unit-based totals
    const totalAllocatedUnits = digitalAllocated + cashAllocations.reduce((sum, alloc) => sum + alloc.amount, 0);
    const totalSpentUnits = digitalSpent + Object.values(cashByCurrency).reduce((sum, cashData) => sum + cashData.spent, 0);
    const totalUnpaidUnits = digitalUnpaid;

    return {
        digital: {
            allocated: digitalAllocated,
            spent: digitalSpent,
            unpaid: digitalUnpaid,
            remaining: digitalAllocated - digitalSpent
        },
        cashByCurrency,
        totalAllocatedUnits,
        totalSpentUnits,
        totalUnpaidUnits,
        totalTransactionCount: budgetTransactions.length
    };
};

export default function Budgets() {
    const { user, settings } = useSettings();
    const [showQuickAddBudget, setShowQuickAddBudget] = useState(false);
    const { selectedMonth, setSelectedMonth, selectedYear, setSelectedYear, displayDate, monthStart, monthEnd } = usePeriod();
    const { transactions } = useTransactions();
    const { categories } = useCategories();
    const { allCustomBudgets } = useCustomBudgetsAll(user);
    const { systemBudgets } = useSystemBudgetsForPeriod(user, monthStart, monthEnd);
    const { cashWallet } = useCashWallet(user);
    const { customBudgets, systemBudgetsWithStats } = useBudgetsAggregates(
        transactions,
        categories,
        allCustomBudgets,
        systemBudgets,
        selectedMonth,
        selectedYear
    );
    const customBudgetActions = useCustomBudgetActions(user, transactions, cashWallet);
    const handleActivateBudget = (budgetId) => {
        customBudgetActions.handleStatusChange(budgetId, 'active');
    };
    const sortedCustomBudgets = useMemo(() => {
        const now = new Date();
        return [...customBudgets].sort((a, b) => {
            const statusPriority = { active: 1, planned: 2, completed: 3 };
            const aPriority = statusPriority[a.status] || 999;
            const bPriority = statusPriority[b.status] || 999;

            if (aPriority !== bPriority) {
                return aPriority - bPriority;
            }

            const aStart = new Date(a.startDate);
            const bStart = new Date(b.startDate);
            const aDistance = Math.abs(aStart - now);
            const bDistance = Math.abs(bStart - now);

            return aDistance - bDistance;
        });
    }, [customBudgets]);

    return (
        <div className="min-h-screen p-4 md:p-8">
            <div className="max-w-7xl mx-auto space-y-6">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div>
                        <h1 className="text-3xl md:text-4xl font-bold text-gray-900">Budgets</h1>
                        <p className="text-gray-500 mt-1">Manage your budgets for {displayDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</p>
                    </div>
                </div>

                <MonthNavigator
                    currentMonth={selectedMonth}
                    currentYear={selectedYear}
                    onMonthChange={(month, year) => {
                        setSelectedMonth(month);
                        setSelectedYear(year);
                    }}
                />

                {/* System Budgets Section */}
                {systemBudgetsWithStats.length > 0 && (
                    <Card className="border-none shadow-lg">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <span className="px-3 py-1 rounded-lg text-sm bg-blue-50 text-blue-600">
                                    System Budgets
                                </span>
                                <span className="text-gray-400">({systemBudgetsWithStats.length})</span>
                            </CardTitle>
                            <p className="text-sm text-gray-500 mt-2">
                                Automatically managed based on your budget goals. These update based on your monthly income.
                            </p>
                        </CardHeader>
                        <CardContent>
                            <div className="grid md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                                {systemBudgetsWithStats.map((budget) => {
                                    const adaptedBudget = {
                                        ...budget,
                                        allocatedAmount: budget.budgetAmount,
                                        status: 'active',
                                        isSystemBudget: true
                                    };

                                    return (
                                        <BudgetCard
                                            key={budget.id}
                                            budget={adaptedBudget}
                                            stats={budget.preCalculatedStats}
                                            settings={settings}
                                        />
                                    );
                                })}
                            </div>
                        </CardContent>
                    </Card>
                )}

                {/* Custom Budgets Section */}
                {sortedCustomBudgets.length === 0 ? (
                    <Card className="border-none shadow-lg">
                        <CardHeader className="flex flex-row items-center justify-between">
                            <div className="flex items-center gap-2">
                                <span className="px-3 py-1 rounded-lg text-sm bg-purple-50 text-purple-600">
                                    Custom Budgets
                                </span>
                            </div>
                            <CustomButton variant="create" onClick={() => setShowQuickAddBudget(true)}>
                                <Plus className="w-4 h-4 mr-2" />
                                Create Custom Budget
                            </CustomButton>
                        </CardHeader>
                        <CardContent>
                            <div className="h-40 flex items-center justify-center text-gray-400">
                                <p>No custom budgets yet. Create your first one!</p>
                            </div>
                        </CardContent>
                    </Card>
                ) : (
                    <Card className="border-none shadow-lg">
                        <CardHeader className="flex flex-row items-center justify-between">
                            <div>
                                <div className="flex items-center gap-2 mb-2">
                                    <span className="px-3 py-1 rounded-lg text-sm bg-purple-50 text-purple-600">
                                        Custom Budgets
                                    </span>
                                    <span className="text-gray-400">({sortedCustomBudgets.length})</span>
                                </div>
                                <p className="text-sm text-gray-500">
                                    Custom budgets containing wants expenses, sorted by status and date
                                </p>
                            </div>
                            <CustomButton variant="create" onClick={() => setShowQuickAddBudget(true)}>
                                <Plus className="w-4 h-4 mr-2" />
                                Create Custom Budget
                            </CustomButton>
                        </CardHeader>
                        <CardContent>
                            <div className="grid md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                                {sortedCustomBudgets.map((budget) => {
                                    const stats = getCustomBudgetStats(budget, transactions, monthStart, monthEnd);

                                    return (
                                        <BudgetCard
                                            key={budget.id}
                                            budget={budget}
                                            stats={stats}
                                            settings={settings}
                                            onActivateBudget={handleActivateBudget}
                                        />
                                    );
                                })}
                            </div>
                        </CardContent>
                    </Card>
                )}

                <QuickAddBudget
                    open={showQuickAddBudget}
                    onOpenChange={setShowQuickAddBudget}
                    onSubmit={customBudgetActions.handleSubmit}
                    onCancel={() => setShowQuickAddBudget(false)}
                    isSubmitting={customBudgetActions.isSubmitting}
                    cashWallet={cashWallet}
                    baseCurrency={settings.baseCurrency}
                    transactions={transactions}
                    allBudgets={allCustomBudgets}
                />

            </div>
        </div>
    );
}
