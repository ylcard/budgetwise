import { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { CustomButton } from "@/components/ui/CustomButton";
import { Plus, BarChart2, LayoutGrid, CircleDot, StretchHorizontal } from "lucide-react";
import SegmentedControl from "@/components/ui/SegmentedControl";
import VerticalBar from "../custombudgets/VerticalBar";
import BudgetCard from "../budgets/BudgetCard";
import BudgetHealthCircular from "../custombudgets/BudgetHealthCircular";
import BudgetHealthCompact from "../custombudgets/BudgetHealthCompact";
import { useSettings } from "../utils/SettingsContext";
import { usePeriod } from "../hooks/usePeriod";
import { useCustomBudgetsForPeriod, useTransactionsForCustomBudgets } from "../hooks/useBase44Entities";
import {
    Carousel,
    CarouselContent,
    CarouselItem,
    CarouselDots
} from "@/components/ui/carousel";
import { cn } from "@/lib/utils"
import { motion, AnimatePresence } from "framer-motion";

/**
 * CREATED: 03-Feb-2026
 * Renamed from BudgetBars to CustomBudgetsDisplay
 * UPDATED: 03-Feb-2026 - Now receives raw budgets + transactions, each view calculates its own stats
 * UPDATED: 03-Feb-2026 - Now self-fetches custom budgets for period and their transactions
 * Displays ONLY custom budgets (no system budgets) in various view modes
 * UPDATED: 09-Feb-2026 - Replaced manual height hook with Framer Motion for smooth height transitions
 * and cross-fading view modes.
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

    // Helper to determine card size based on screen width
    const [isMobile, setIsMobile] = useState(false);
    useEffect(() => {
        const checkMobile = () => setIsMobile(window.innerWidth < 768);
        checkMobile();
        window.addEventListener('resize', checkMobile);
        return () => window.removeEventListener('resize', checkMobile);
    }, []);

    const cardSize = isMobile ? 'sm' : 'md';

    return (
        <div className="space-y-6">
            {budgets.length > 0 && (
                <Card className="border-none shadow-lg">
                    <CardHeader className="relative flex flex-row items-center justify-between pb-2 pr-6 min-h-[70px]">
                        <div className="flex items-center gap-3">
                            <span className="px-3 py-1 rounded-lg text-sm bg-purple-50 text-purple-600">
                                Custom Budgets
                            </span>
                            <CustomButton
                                variant="ghost"
                                size="icon-sm"
                                className="rounded-full bg-purple-50 text-purple-600 hover:bg-purple-100 hidden md:flex"
                                onClick={onCreateBudget}
                            >
                                <Plus className="w-4 h-4" />
                            </CustomButton>
                        </div>
                        <SegmentedControl
                            options={VIEW_OPTIONS}
                            value={viewMode}
                            onChange={setViewMode}
                        />
                    </CardHeader>
                    <CardContent className="pt-4 overflow-hidden">
                        <motion.div
                            layout
                            transition={{ duration: 0.4, ease: [0.4, 0, 0.2, 1] }}
                        >
                            <AnimatePresence mode="wait">
                                <motion.div
                                    key={viewMode}
                                    initial={{ opacity: 0, scale: 0.98 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    exit={{ opacity: 0, scale: 0.98 }}
                                    transition={{ duration: 0.2 }}
                                >
                                    <Carousel opts={{ align: "start", loop: false }} className="w-full">
                                        <CarouselContent
                                            className={cn(
                                                viewMode === 'bars' ? 'items-end' : 'items-stretch',
                                                budgets.length < 2 && "sm:justify-center",
                                                budgets.length < 3 && "md:justify-center",
                                                budgets.length < 4 && "lg:justify-center"
                                            )}
                                        >
                                            {budgets.map((budget) => (
                                                <CarouselItem
                                                    key={budget.id}
                                                    className={`
                                            basis-full 
                                            sm:basis-1/2 
                                            md:basis-1/3 
                                            lg:basis-1/4
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
                                                            size={cardSize}
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
                                                </CarouselItem>
                                            ))}
                                        </CarouselContent>
                                        <CarouselDots />
                                    </Carousel>
                                </motion.div>
                            </AnimatePresence>
                        </motion.div>
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
