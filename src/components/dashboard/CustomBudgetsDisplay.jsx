import { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CustomButton } from "@/components/ui/CustomButton";
import { Plus, ChevronLeft, ChevronRight, BarChart2, LayoutGrid, CircleDot, StretchHorizontal } from "lucide-react";
import SegmentedControl from "@/components/ui/SegmentedControl";
import VerticalBar from "../custombudgets/VerticalBar";
import BudgetCard from "../budgets/BudgetCard";
import BudgetHealthCircular from "../custombudgets/BudgetHealthCircular";
import BudgetHealthCompact from "../custombudgets/BudgetHealthCompact";
import { useSettings } from "../utils/SettingsContext";
import { usePeriod } from "../hooks/usePeriod";
import { useCustomBudgetsForPeriod, useTransactionsForCustomBudgets } from "../hooks/useBase44Entities";

/**
 * CREATED: 03-Feb-2026
 * Renamed from BudgetBars to CustomBudgetsDisplay
 * UPDATED: 03-Feb-2026 - Now receives raw budgets + transactions, each view calculates its own stats
 * UPDATED: 03-Feb-2026 - Now self-fetches custom budgets for period and their transactions
 * Displays ONLY custom budgets (no system budgets) in various view modes
 */

export default function CustomBudgetsDisplay({
    onCreateBudget,
}) {
    const { user, settings } = useSettings();
    const { monthStart, monthEnd } = usePeriod();

    // Fetch custom budgets for the selected period
    const { customBudgets: budgets = [] } = useCustomBudgetsForPeriod(user, monthStart, monthEnd);

    // Extract custom budget IDs and fetch all their transactions
    const customBudgetIds = useMemo(() => budgets.map(b => b.id), [budgets]);
    const { transactions = [] } = useTransactionsForCustomBudgets(customBudgetIds);
    const [viewMode, setViewMode] = useState(settings.budgetViewMode || 'bars');

    const VIEW_OPTIONS = [
        { value: 'bars', label: <BarChart2 className="w-4 h-4" />, desktopLabel: 'Bars' },
        { value: 'cards', label: <LayoutGrid className="w-4 h-4" />, desktopLabel: 'Cards' },
        { value: 'circular', label: <CircleDot className="w-4 h-4" />, desktopLabel: 'Circular' },
        { value: 'compact', label: <StretchHorizontal className="w-4 h-4" />, desktopLabel: 'Compact' },
    ];

    // Sync local state when global settings update
    useEffect(() => {
        if (settings.budgetViewMode) {
            setViewMode(settings.budgetViewMode);
        }
    }, [settings.budgetViewMode]);

    const [customStartIndex, setCustomStartIndex] = useState(0);
    const barsPerPage = ['cards', 'circular', 'compact'].includes(viewMode) ? 4 : 7;

    const visibleBudgets = budgets.slice(customStartIndex, customStartIndex + barsPerPage);
    const canScrollLeft = customStartIndex > 0;
    const canScrollRight = customStartIndex + barsPerPage < budgets.length;

    const handleViewModeChange = (newMode) => {
        setViewMode(newMode);
    };

    // On Desktop, we paginate. On Mobile, we show all so the user can swipe through the whole list.
    const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;
    const displayBudgets = isMobile ? budgets : visibleBudgets;

    return (
        <div className="space-y-6">
            {budgets.length > 0 && (
                <Card className="border-none shadow-lg">
                    <CardHeader className="flex flex-row items-center justify-between">
                        <div className="flex items-center gap-2">
                            <span className="px-3 py-1 rounded-lg text-sm bg-purple-50 text-purple-600">
                                Custom Budgets
                            </span>
                        </div>
                        <div className="hidden md:flex items-center gap-2">
                            {budgets.length > barsPerPage && (
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
                            <SegmentedControl
                                options={VIEW_OPTIONS.map(opt => ({
                                    ...opt,
                                    label: <span className="flex items-center gap-2">{opt.label} <span className="hidden md:inline">{opt.desktopLabel}</span></span>
                                }))}
                                value={viewMode}
                                onChange={handleViewModeChange}
                            />
                        </div>

                        {/* Carousel for Mobile, Grid for Desktop */}
                        <div className={`
                            flex overflow-x-auto pb-4 -mx-4 px-4 scrollbar-hide snap-x 
                            md:overflow-x-visible md:pb-0 md:mx-0 md:px-0 md:flex-wrap md:justify-center md:gap-4
                            ${viewMode === 'bars' ? 'items-end' : 'items-stretch'}
                        `}>
                            {displayBudgets.map((budget) => (
                                <div
                                    key={budget.id}
                                    className={`
                                        shrink-0 snap-center first:pl-0 last:pr-4 
                                        md:shrink md:snap-align-none md:last:pr-0
                                        ${viewMode === 'bars' ? 'w-auto' : 'w-[280px] md:flex-1 md:min-w-0'}
                                    `}
                                >
                                    {viewMode === 'bars' && (
                                        <VerticalBar
                                            budget={budget}
                                            transactions={transactions}
                                            settings={settings}
                                            isCustom={true}
                                        />
                                    )}
                                    {viewMode === 'cards' && (
                                        <BudgetCard
                                            // BudgetCard still expects an array, so we wrap it
                                            budgets={[budget]}
                                            transactions={transactions}
                                            settings={settings}
                                        />
                                    )}
                                    {viewMode === 'circular' && (
                                        <BudgetHealthCircular
                                            budget={budget} // Passing SINGLE budget
                                            transactions={transactions}
                                            settings={settings}
                                        />
                                    )}
                                    {viewMode === 'compact' && (
                                        <BudgetHealthCompact
                                            budget={budget} // Passing SINGLE budget
                                            transactions={transactions}
                                            settings={settings}
                                        />
                                    )}
                                </div>
                            ))}
                        </div>

                        {budgets.length > barsPerPage && (
                            <div className="flex justify-center gap-1 mt-4">
                                {Array.from({ length: Math.ceil(budgets.length / barsPerPage) }).map((_, idx) => (
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
            {budgets.length === 0 && (
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