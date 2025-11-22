import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { getCategoryIcon } from "../utils/iconMapConfig";
import { formatCurrency } from "../utils/currencyUtils";
import { useSettings } from "../utils/SettingsContext";

export default function BudgetOverview({ transactions, categories, isLoading }) {
    const { settings } = useSettings();

    const chartData = useMemo(() => {
        const categoryMap = categories.reduce((acc, cat) => {
            acc[cat.id] = cat;
            return acc;
        }, {});

        const expensesByCategory = transactions
            .filter(t => t.type === 'expense')
            .reduce((acc, t) => {
                const categoryId = t.category_id || 'uncategorized';
                // Ensure amount is number to prevent string concatenation
                const amount = Number(t.amount) || 0;
                acc[categoryId] = (acc[categoryId] || 0) + amount;
                return acc;
            }, {});

        return Object.entries(expensesByCategory)
            .map(([categoryId, amount]) => {
                const category = categoryMap[categoryId];
                return {
                    id: categoryId,
                    name: category?.name || 'Uncategorized',
                    value: amount,
                    color: category?.color || '#94A3B8',
                    iconKey: category?.icon
                };
            })
            .sort((a, b) => b.value - a.value);
    }, [transactions, categories]);

    return (
        <Card className="border-none shadow-lg">
            <CardHeader>
                <CardTitle>Spending by Category</CardTitle>
            </CardHeader>
            <CardContent>
                {isLoading ? (
                    <Skeleton className="h-64 w-full" />
                ) : chartData.length === 0 ? (
                    <div className="h-64 flex items-center justify-center text-gray-400">
                        <p>No expenses yet. Start tracking your spending!</p>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {chartData.slice(0, 6).map((item) => {
                            const IconComponent = getCategoryIcon(item.iconKey);
                            return (
                                <div key={item.id} className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 transition-colors">
                                    <div className="flex items-center gap-3">
                                        <div
                                            className="w-10 h-10 rounded-lg flex items-center justify-center"
                                            style={{ backgroundColor: `${item.color}20` }}
                                        >
                                            <IconComponent className="w-5 h-5" style={{ color: item.color }} />
                                        </div>
                                        <span className="font-medium text-gray-900">{item.name}</span>
                                    </div>
                                    <span className="font-bold text-gray-900">{formatCurrency(item.value, settings)}</span>
                                </div>
                            );
                        })}
                    </div>
                )}
            </CardContent>
        </Card>
    );
}