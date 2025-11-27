import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CustomButton } from "@/components/ui/CustomButton";
import { Plus, ChevronLeft, ChevronRight, AlertTriangle } from "lucide-react";
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
    onCreateBudget,
    preCalculatedSystemData,
    preCalculatedCustomData,
    preCalculatedSavings,
    showSystem = true
}) {

    // 1. Initialize local state with global setting (Default to 'bars' if undefined)
    const [viewMode, setViewMode] = useState(settings.budgetViewMode || 'bars');

    // 2. Sync local state when global settings update (e.g. from Settings page or DB load)
    useEffect(() => {
        if (settings.budgetViewMode) {
            setViewMode(settings.budgetViewMode);
        }
    }, [settings.budgetViewMode]);

    const [customStartIndex, setCustomStartIndex] = useState(0);
    const barsPerPage = viewMode === 'cards' ? 4 : 7;

    const calculatedData = useBudgetBarsData(systemBudgets, customBudgets, allCustomBudgets, transactions, categories, goals, monthlyIncome, baseCurrency);

    const systemBudgetsData = preCalculatedSystemData || calculatedData.systemBudgetsData;
    const customBudgetsData = preCalculatedCustomData || calculatedData.customBudgetsData;
    const totalActualSavings = preCalculatedSavings?.totalActualSavings ?? calculatedData.totalActualSavings;
    const savingsTarget = preCalculatedSavings?.savingsTarget ?? calculatedData.savingsTarget;
    const savingsShortfall = preCalculatedSavings?.savingsShortfall ?? calculatedData.savingsShortfall;

    const visibleCustomBudgets = customBudgetsData.slice(customStartIndex, customStartIndex + barsPerPage);
    const canScrollLeft = customStartIndex > 0;
    const canScrollRight = customStartIndex + barsPerPage < customBudgetsData.length;

    // 3. Local-only toggle handler
    // This allows the user to temporarily switch views without affecting their saved preference
    const handleViewModeChange = (checked) => {
        const newMode = checked ? 'cards' : 'bars';
        setViewMode(newMode);
    };

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

            {showSystem && systemBudgetsData.length > 0 && (
                <Card className="border-none shadow-lg">
                    <CardHeader className="flex flex-row items-center justify-between">
                        <CardTitle className="flex items-center gap-2">
                            <span className="px-3 py-1 rounded-lg text-sm bg-blue-50 text-blue-600">
                                System Budgets
                            </span>
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="flex items-center justify-end gap-2 mb-4">
                            <Label htmlFor="view-mode-custom" className="text-sm text-gray-500 cursor-pointer min-w-[65px] text-right">
                                {viewMode === 'cards' ? 'Card View' : 'Bar View'}
                            </Label>
                            <Switch
                                id="view-mode-custom"
                                checked={viewMode === 'cards'}
                                onCheckedChange={handleViewModeChange}
                            />
                        </div>
                        <div className={`flex ${viewMode === 'cards' ? 'w-full gap-4' : 'flex-wrap justify-center gap-4'}`}>
                            {systemBudgetsData.map((budget) => (
                                viewMode === 'bars' ? (
                                    <BudgetBar
                                        key={budget.id}
                                        budget={budget}
                                        isCustom={false}
                                        isSavings={budget.systemBudgetType === 'savings'}
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
                        <div className="flex items-center justify-end gap-2 mb-4">
                            <Label htmlFor="view-mode-custom" className="text-sm text-gray-500 cursor-pointer min-w-[65px] text-right">
                                {viewMode === 'cards' ? 'Card View' : 'Bar View'}
                            </Label>
                            <Switch
                                id="view-mode-custom"
                                checked={viewMode === 'cards'}
                                onCheckedChange={handleViewModeChange}
                            />
                        </div>
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
