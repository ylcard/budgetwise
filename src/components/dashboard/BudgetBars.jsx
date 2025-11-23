import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CustomButton } from "@/components/ui/CustomButton";
import { Plus, ChevronLeft, ChevronRight, AlertTriangle, LayoutGrid, StretchHorizontal } from "lucide-react";
import { formatCurrency } from "../utils/currencyUtils";
import { useBudgetBarsData } from "../hooks/useDerivedData";
import BudgetBar from "../custombudgets/BudgetBar";
import BudgetCard from "../budgets/BudgetCard";

export default function BudgetBars({
    systemBudgets,
    customBudgets,
    allCustomBudgets = [],
    transactions,
    categories,
    settings,
    goals,
    monthlyIncome,
    baseCurrency,
    onCreateBudget
}) {
    const [viewMode, setViewMode] = useState('bars'); // 'bars' | 'cards'
    const [customStartIndex, setCustomStartIndex] = useState(0);
    // const barsPerPage = 7;
    const barsPerPage = viewMode === 'cards' ? 4 : 7;

    // Use the extracted hook for all calculations
    const { systemBudgetsData, customBudgetsData, totalActualSavings, savingsTarget, savingsShortfall } =
        useBudgetBarsData(systemBudgets, customBudgets, allCustomBudgets, transactions, categories, goals, monthlyIncome, baseCurrency); // Pass baseCurrency to hook

    const visibleCustomBudgets = customBudgetsData.slice(customStartIndex, customStartIndex + barsPerPage);
    const canScrollLeft = customStartIndex > 0;
    const canScrollRight = customStartIndex + barsPerPage < customBudgetsData.length;

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
                        </CardTitle>
                        <div className="flex bg-gray-100 p-1 rounded-lg gap-1">
                            <button
                                onClick={() => setViewMode('bars')}
                                className={`p-1.5 rounded-md transition-all ${viewMode === 'bars' ? 'bg-white shadow-sm text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
                                title="Bar View"
                            >
                                <StretchHorizontal className="w-4 h-4" />
                            </button>
                            <button
                                onClick={() => setViewMode('cards')}
                                className={`p-1.5 rounded-md transition-all ${viewMode === 'cards' ? 'bg-white shadow-sm text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
                                title="Card View"
                            >
                                <LayoutGrid className="w-4 h-4" />
                            </button>
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className={`flex ${viewMode === 'cards' ? 'w-full gap-4' : 'flex-wrap justify-center gap-4'}`}>
                            {systemBudgetsData.map((budget) => (
                                viewMode === 'bars' ? (
                                    <BudgetBar
                                        key={budget.id}
                                        budget={budget}
                                        isCustom={false}
                                        isSystemSavings={budget.systemBudgetType === 'savings'}
                                        settings={settings}
                                        hideActions={true}
                                    />
                                ) : (
                                    <div key={budget.id} className="flex-1 min-w-0">
                                        <BudgetCard
                                            budget={{ ...budget, isSystemBudget: true }}
                                            stats={budget.stats}
                                            settings={settings}
                                            size="sm"
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
                        <div className={`flex ${viewMode === 'cards' ? 'w-full gap-4' : 'flex-wrap justify-center gap-4'}`}>
                            {visibleCustomBudgets.map((budget) => (
                                viewMode === 'bars' ? (
                                    <BudgetBar
                                        key={budget.id}
                                        budget={budget}
                                        isCustom={true}
                                        settings={settings}
                                        hideActions={true}
                                    />
                                ) : (
                                    <div key={budget.id} className="flex-1 min-w-0">
                                        <BudgetCard
                                            budget={budget}
                                            stats={budget.stats}
                                            settings={settings}
                                            size="sm"
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
