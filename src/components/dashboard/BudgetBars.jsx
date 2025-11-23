import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CustomButton } from "@/components/ui/CustomButton";
import { Plus, ChevronLeft, ChevronRight, AlertTriangle, LayoutGrid, AlignJustify } from "lucide-react";
import { formatCurrency } from "../utils/currencyUtils";
import { useBudgetBarsData } from "../hooks/useDerivedData";
import BudgetBar from "../custombudgets/BudgetBar";
import BudgetCard from "../budgets/BudgetCard";

export default function BudgetBars({
    systemBudgets,
    customBudgets = [],
    allCustomBudgets = [],
    transactions,
    categories,
    settings,
    goals,
    monthlyIncome,
    baseCurrency,
    onCreateBudget
}) {
    const [customStartIndex, setCustomStartIndex] = useState(0);
    const [viewMode, setViewMode] = useState('card'); // 'card' | 'bar'

    // Cards take more space, so we show fewer per page in card mode
    const barsPerPage = viewMode === 'card' ? 4 : 6;

    // Use the extracted hook for all calculations
    const { systemBudgetsData, customBudgetsData, totalActualSavings, savingsTarget, savingsShortfall } =
        useBudgetBarsData(systemBudgets, customBudgets, allCustomBudgets, transactions, categories, goals, monthlyIncome, baseCurrency); // Pass baseCurrency to hook

    const visibleCustomBudgets = customBudgetsData.slice(customStartIndex, customStartIndex + barsPerPage);
    const canScrollLeft = customStartIndex > 0;
    const canScrollRight = customStartIndex + barsPerPage < customBudgetsData.length;


    // Adapter to transform flat list data into the shape BudgetCard expects.
    // We calculate 'spent' as total usage, and ensure 'paid' is derived if missing.
    const getCardStats = (item) => {
        const allocated = item.amount ?? item.budgetAmount ?? item.allocated ?? 0;
        const unpaid = item.unpaid ?? 0;
        // Try to get explicit 'paid', otherwise assume 'spent' is total used and subtract unpaid
        const paid = item.paid ?? (item.spent ? item.spent - unpaid : 0);

        return {
            totalAllocatedUnits: allocated,
            totalSpentUnits: paid + unpaid,
            totalUnpaidUnits: unpaid,
            paid: { totalBaseCurrencyAmount: paid },
            unpaid: { totalBaseCurrencyAmount: unpaid }
        };
    };

    // Reusable Toggle Component
    const ViewToggle = () => (
        <div className="flex items-center bg-gray-100 p-1 rounded-lg ml-4">
            <button
                onClick={() => setViewMode('card')}
                className={`p-1.5 rounded-md transition-all ${viewMode === 'card' ? 'bg-white shadow text-purple-600' : 'text-gray-400 hover:text-gray-600'}`}
                title="Card View"
            >
                <LayoutGrid size={16} />
            </button>
            <button
                onClick={() => setViewMode('bar')}
                className={`p-1.5 rounded-md transition-all ${viewMode === 'bar' ? 'bg-white shadow text-purple-600' : 'text-gray-400 hover:text-gray-600'}`}
                title="List View"
            >
                <AlignJustify size={16} />
            </button>
        </div>
    );

    // Responsive Grid Layout
    const containerClass = viewMode === 'card'
        ? "flex flex-wrap justify-center gap-4"
        : "grid grid-cols-1 md:grid-cols-2 gap-3";


    return (
        <div className="space-y-6">
            {savingsShortfall > 0 && (
                <Card className="border-none shadow-lg bg-orange-50 border-orange-200">
                    <CardContent className="p-4">
                        <div className="flex items-center gap-3">
                            <AlertTriangle className="w-5 h-5 text-orange-600" />
                            <div>
                                <p className="font-semibold text-orange-900">
                                    Savings Target Not Met
                                </p>
                                <p className="text-sm text-orange-700">
                                    You're short {formatCurrency(savingsShortfall, settings)} of your savings goal.
                                    Target: {formatCurrency(savingsTarget, settings)}, Actual: {formatCurrency(totalActualSavings, settings)}
                                </p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            )}

            {systemBudgetsData.length > 0 && (
                <Card className="border-none shadow-lg">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <span className="px-3 py-1 rounded-lg text-sm bg-blue-50 text-blue-600">
                                System Budgets
                            </span>
                            <ViewToggle />
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className={containerClass}>
                            {systemBudgetsData.map((budget) => (
                                viewMode === 'card' ? (
                                    <div key={budget.id} className="h-full w-full md:w-[250px]">
                                        <BudgetCard budget={{ ...budget, budgetAmount: budget.allocated || budget.budgetAmount }} stats={getCardStats(budget)} settings={settings} size="md" />
                                    </div>
                                ) : (
                                    <div key={budget.id} className="h-full">
                                        <BudgetBar
                                            key={budget.id}
                                            budget={budget}
                                            isCustom={false}
                                            isSystemSavings={budget.systemBudgetType === 'savings'}
                                            settings={settings}
                                            hideActions={true}
                                        />
                                    </div>
                                )
                            ))}
                        </div>
                    </CardContent>
                </Card>
            )}

            {customBudgetsData.length > 0 && (
                <Card className="border-none shadow-lg">
                    <CardHeader className="flex flex-row items-center justify-between">
                        <div className="flex items-center gap-2">
                            <span className="px-3 py-1 rounded-lg text-sm bg-purple-50 text-purple-600">
                                Custom Budgets
                            </span>
                            {/* <span className="text-gray-400">({customBudgetsData.length})</span> */}
                        </div>
                        <div className="flex items-center gap-2">
                            {customBudgetsData.length > barsPerPage && (
                                <>
                                    <CustomButton
                                        variant="outline"
                                        size="icon"
                                        onClick={() => setCustomStartIndex(Math.max(0, customStartIndex - 1))}
                                        disabled={!canScrollLeft}
                                    >
                                        <ChevronLeft className="w-4 h-4" />
                                    </CustomButton>
                                    <CustomButton
                                        variant="outline"
                                        size="icon"
                                        onClick={() => setCustomStartIndex(customStartIndex + 1)}
                                        disabled={!canScrollRight}
                                    >
                                        <ChevronRight className="w-4 h-4" />
                                    </CustomButton>
                                </>
                            )}
                            <CustomButton
                                variant="create"
                                size="sm"
                                onClick={onCreateBudget}
                            >
                                <Plus className="w-4 h-4 mr-2" />
                                New Budget
                            </CustomButton>
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className={containerClass}>
                            {visibleCustomBudgets.map((budget) => (
                                viewMode === 'card' ? (
                                    <div key={budget.id} className="h-full w-full md:w-[250px]">
                                        <BudgetCard budget={budget} stats={getCardStats(budget)} settings={settings} size="md" />
                                    </div>
                                ) : (
                                    <div key={budget.id} className="h-full">
                                        <BudgetBar
                                            key={budget.id}
                                            budget={budget}
                                            isCustom={true}
                                            settings={settings}
                                            hideActions={true}
                                        />
                                    </div>
                                )
                            ))}
                        </div>

                        {customBudgetsData.length > barsPerPage && (
                            <div className="flex justify-center gap-1 mt-4">
                                {Array.from({ length: Math.ceil(customBudgetsData.length / barsPerPage) }).map((_, idx) => (
                                    <div
                                        key={idx}
                                        className={`h-2 rounded-full transition-all ${Math.floor(customStartIndex / barsPerPage) === idx
                                            ? 'w-8 bg-purple-600'
                                            : 'w-2 bg-gray-300'
                                            }`}
                                    />
                                ))}
                            </div>
                        )}
                    </CardContent>
                </Card>
            )}
        </div>
    );
}
