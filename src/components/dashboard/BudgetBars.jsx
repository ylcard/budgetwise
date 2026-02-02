import { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CustomButton } from "@/components/ui/CustomButton";
import { Plus, ChevronLeft, ChevronRight, LayoutGrid, List } from "lucide-react";
import { useBudgetBarsData } from "../hooks/useDerivedData";
import BudgetBar from "../custombudgets/BudgetBar";
import BudgetCard from "../budgets/BudgetCard";
// import { Label } from "@/components/ui/label";
// import { Switch } from "@/components/ui/switch";

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
    // REMOVED 15-Jan-2026: Eliminated preCalculated props - BudgetBars now calculates its own stats
    // preCalculatedSystemData,
    // preCalculatedCustomData,
    // preCalculatedSavings,
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

    // UPDATED 15-Jan-2026: BudgetBars now always calculates its own stats using the latest getCustomBudgetStats
    const { systemBudgetsData, customBudgetsData, totalActualSavings, savingsTarget, savingsShortfall } =
        useBudgetBarsData(systemBudgets, customBudgets, allCustomBudgets, transactions, categories, goals, monthlyIncome, baseCurrency, settings);

    const visibleCustomBudgets = customBudgetsData.slice(customStartIndex, customStartIndex + barsPerPage);
    const canScrollLeft = customStartIndex > 0;
    const canScrollRight = customStartIndex + barsPerPage < customBudgetsData.length;

    // 3. Local-only toggle handler
    // This allows the user to temporarily switch views without affecting their saved preference
    // const handleViewModeChange = (checked) => {
    //     const newMode = checked ? 'cards' : 'bars';
    //     setViewMode(newMode);
    // };
    // View Options Configuration
    const viewOptions = [
        { id: 'bars', icon: List, label: 'List' },
        { id: 'cards', icon: LayoutGrid, label: 'Cards' },
    ];

    return (
        <div className="space-y-6">
            {/* GLOBAL VIEW CONTROLS */}
            <div className="flex items-center justify-end">
                <div className="bg-gray-100/80 p-1 rounded-lg flex gap-1 border border-gray-200">
                    {viewOptions.map((option) => {
                        const Icon = option.icon;
                        const isActive = viewMode === option.id;
                        return (
                            <button
                                key={option.id}
                                onClick={() => setViewMode(option.id)}
                                className={`
                                    relative flex items-center justify-center px-3 py-1.5 rounded-md text-sm font-medium transition-all duration-200 ease-in-out
                                    ${isActive 
                                        ? 'bg-white text-gray-900 shadow-sm ring-1 ring-black/5' 
                                        : 'text-gray-500 hover:text-gray-700 hover:bg-gray-200/50'
                                    }
                                `}
                                title={`${option.label} View`}
                            >
                                <Icon className="w-4 h-4" />
                            </button>
                        );
                    })}
                </div>
            </div>

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
                        <div className={`flex ${viewMode === 'cards' ? 'w-full gap-4' : 'flex-wrap justify-center gap-4'}`}>
                            {visibleCustomBudgets.map((budget) => (
                                viewMode === 'bars' ? (
                                    <BudgetBar
                                        key={budget.id}
                                        budget={budget}
                                        stats={budget.stats}
                                        isCustom={true}
                                        settings={settings}
                                        hideActions={true}
                                    />
                                ) : (
                                    <div key={budget.id} className="flex-1 min-w-0">
                                        <BudgetCard
                                            key={budget.id}
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
            {customBudgetsData.length === 0 && (
                <Card className="border-2 border-dashed border-gray-200 bg-gray-50/50 shadow-sm hover:border-purple-200 hover:bg-purple-50/30 transition-all duration-300">
                    <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                        <div className="w-12 h-12 rounded-full bg-purple-100 flex items-center justify-center mb-4">
                            <Plus className="w-6 h-6 text-purple-600" />
                        </div>
                        <h3 className="text-lg font-semibold text-gray-900 mb-2">No Custom Budgets</h3>
                        <p className="text-sm text-gray-500 max-w-sm mb-6">
                            You haven't set up any custom budgets for this month yet.
                            Create one to track specific spending categories.
                        </p>
                        <CustomButton variant="create" onClick={onCreateBudget} className="min-w-[200px] shadow-md hover:shadow-lg transition-shadow">
                            <Plus className="w-4 h-4 mr-2" />
                            Create First Budget
                        </CustomButton>
                    </CardContent>
                </Card>
            )}
        </div>
    );
}