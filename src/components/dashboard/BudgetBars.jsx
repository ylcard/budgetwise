import { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CustomButton } from "@/components/ui/CustomButton";
import { Plus, ChevronLeft, ChevronRight, AlertTriangle, LayoutGrid, List, Smartphone, PieChart, SquareActivity, CreditCard } from "lucide-react";
import { useBudgetBarsData } from "../hooks/useDerivedData";
import BudgetBar from "../custombudgets/BudgetBar";
import BudgetCard from "../budgets/BudgetCard";
import BudgetHealthCards from "./variations/BudgetHealthCards";
import BudgetHealthCircular from "./variations/BudgetHealthCircular";
import BudgetHealthCompact from "./variations/BudgetHealthCompact";
import BudgetHealthGrid from "./variations/BudgetHealthGrid";
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

    // 1. Initialize local state (Default to 'health-cards' for modern view)
    const [viewMode, setViewMode] = useState(settings.budgetViewMode || 'health-cards');

    // 2. Sync local state when global settings update (e.g. from Settings page or DB load)
    useEffect(() => {
        if (settings.budgetViewMode) {
            setViewMode(settings.budgetViewMode);
        }
    }, [settings.budgetViewMode]);

    // const [customStartIndex, setCustomStartIndex] = useState(0);
    // const barsPerPage = viewMode === 'cards' ? 4 : 7;

    // UPDATED 15-Jan-2026: BudgetBars now always calculates its own stats using the latest getCustomBudgetStats
    const { systemBudgetsData, customBudgetsData, totalActualSavings, savingsTarget, savingsShortfall } =
        useBudgetBarsData(systemBudgets, customBudgets, allCustomBudgets, transactions, categories, goals, monthlyIncome, baseCurrency, settings);

    // const visibleCustomBudgets = customBudgetsData.slice(customStartIndex, customStartIndex + barsPerPage);
    // const canScrollLeft = customStartIndex > 0;
    // const canScrollRight = customStartIndex + barsPerPage < customBudgetsData.length;
    // 2. Data Adapter: Transform Custom Budgets for the new unified components
    const normalizedCustomBudgets = useMemo(() => {
        return customBudgetsData.map(b => {
            // Calculate Spent (Paid + Unpaid)
            const paid = b.stats?.paid?.totalBaseCurrencyAmount || b.stats?.paidAmount || 0;
            const unpaid = b.stats?.unpaid?.totalBaseCurrencyAmount || b.stats?.unpaid || 0;
            return {
                ...b,
                id: b.id,
                name: b.name,
                systemBudgetType: 'custom', // Force fallback styling
                spent: paid + unpaid,
                allocatedAmount: b.stats?.totalAllocatedUnits || b.budgetAmount || 0,
                budgetAmount: b.stats?.totalAllocatedUnits || b.budgetAmount || 0
            };
        });
    }, [customBudgetsData]);

    // 3. Local-only toggle handler
    // This allows the user to temporarily switch views without affecting their saved preference
    // const handleViewModeChange = (checked) => {
    //     const newMode = checked ? 'cards' : 'bars';
    //     setViewMode(newMode);
    // };

    // Calculate totals for HealthCards view
    const customTotals = useMemo(() => {
        return normalizedCustomBudgets.reduce((acc, curr) => ({
            spent: acc.spent + curr.spent,
            budget: acc.budget + curr.allocatedAmount
        }), { spent: 0, budget: 0 });
    }, [normalizedCustomBudgets]);

    // View Options Configuration
    const viewOptions = [
        { id: 'bars', icon: List, label: 'List' },
        { id: 'health-cards', icon: CreditCard, label: 'Dashboard' },
        { id: 'circular', icon: PieChart, label: 'Gauges' },
        { id: 'compact', icon: Smartphone, label: 'Compact' },
        { id: 'grid', icon: SquareActivity, label: 'Grid' },
    ];

    return (
        <div className="space-y-6">
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
                        {/* System Budgets always render as List (Bars) per requirement */}
                        <div className="flex flex-col gap-4">
                            {systemBudgetsData.map((budget) => (
                                <BudgetBar
                                    key={budget.id}
                                    budget={budget}
                                    isCustom={false}
                                    isSavings={budget.systemBudgetType === 'savings'}
                                    settings={settings}
                                    hideActions={true}
                                />
                            ))}
                        </div>
                    </CardContent>
                </Card>
            )}

            {customBudgetsData.length > 0 && (
                <div className="space-y-4">
                    {/* Custom Budgets Header & Switcher */}
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div className="flex items-center gap-2">
                            <span className="px-3 py-1 rounded-lg text-sm font-bold bg-purple-50 text-purple-600 border border-purple-100">
                                Custom Budgets
                            </span>
                        </div>
                        <div className="flex items-center gap-3">
                            {/* View Switcher */}
                            <div className="bg-white p-1 rounded-lg flex gap-1 border border-gray-200 shadow-sm">
                                {viewOptions.map((option) => {
                                    const Icon = option.icon;
                                    const isActive = viewMode === option.id;
                                    return (
                                        <button
                                            key={option.id}
                                            onClick={() => setViewMode(option.id)}
                                            className={`
                                                relative flex items-center justify-center p-2 rounded-md transition-all duration-200
                                                ${isActive
                                                    ? 'bg-gray-900 text-white shadow-md'
                                                    : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100'
                                                }
                                            `}
                                            title={option.label}
                                        >
                                            <Icon className="w-4 h-4" />
                                        </button>
                                    );
                                })}
                            </div>
                            <CustomButton
                                variant="create"
                                size="sm"
                                onClick={onCreateBudget}
                            >
                                <Plus className="w-4 h-4 mr-2" />
                                New Budget
                            </CustomButton>
                        </div>
                    </div>
                    {/* Render Selected View Variation */}
                    <div className="animate-in fade-in duration-300">

                        {viewMode === 'health-cards' && (
                            <BudgetHealthCards
                                budgets={normalizedCustomBudgets}
                                totalSpent={customTotals.spent}
                                totalBudget={customTotals.budget}
                            />
                        )}

                        {viewMode === 'circular' && (
                            <div className="flex justify-center w-full">
                                <BudgetHealthCircular budgets={normalizedCustomBudgets} />
                            </div>
                        )}
                        {viewMode === 'compact' && (
                            <div className="flex justify-center w-full">
                                <BudgetHealthCompact budgets={normalizedCustomBudgets} />
                            </div>
                        )}

                        {viewMode === 'grid' && (
                            <div className="flex justify-center w-full">
                                <BudgetHealthGrid budgets={normalizedCustomBudgets} />
                            </div>
                        )}

                        {/* Fallback / Legacy List View */}
                        {viewMode === 'bars' && (
                            <Card className="border-none shadow-lg">
                                <CardContent className="pt-6">
                                    <div className="flex flex-col gap-4">
                                        {customBudgetsData.map((budget) => (
                                            <BudgetBar
                                                key={budget.id}
                                                budget={budget}
                                                stats={budget.stats}
                                                isCustom={true}
                                                settings={settings}
                                                hideActions={true}
                                            />
                                        ))}
                                    </div>
                                </CardContent>
                            </Card>
                        )}
                    </div>
                </div>
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