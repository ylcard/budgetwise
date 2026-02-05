/**
 * Budget Post-Mortem Analysis
 * CREATED: 16-Jan-2026
 * 
 * Analyzes completed (and active) budgets to provide insights on spending patterns,
 * accuracy of estimates, and recommendations for future similar budgets.
 */

import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
    TrendingUp, 
    TrendingDown, 
    Target,
    CheckCircle2,
    AlertTriangle,
    Lightbulb
} from "lucide-react";
import { formatCurrency } from "../utils/currencyUtils";
import { createEntityMap } from "../utils/generalUtils";

export default function BudgetPostMortem({ budget, transactions, categories, settings }) {
    const analysis = useMemo(() => {
        if (!budget || !transactions || !categories) return null;

        // ADDED: 16-Jan-2026 - Don't analyze future/planned budgets
        const now = new Date();
        const budgetStart = new Date(budget.startDate);
        const budgetEnd = new Date(budget.endDate);
        
        // Only analyze if budget has started
        if (budgetStart > now) return null;
        
        // Determine if budget is ongoing or completed
        const isOngoing = budgetEnd >= now;
        const isCompleted = budgetEnd < now || budget.status === 'completed';

        const categoryMap = createEntityMap(categories);
        
        // Filter transactions for this budget
        const budgetTransactions = transactions.filter(t => 
            t.budgetId === budget.id && t.type === 'expense'
        );

        if (budgetTransactions.length === 0) return null;

        const totalSpent = budgetTransactions.reduce((sum, t) => sum + t.amount, 0);
        const planned = budget.allocatedAmount;
        const variance = totalSpent - planned;
        const variancePercentage = planned > 0 ? (variance / planned) * 100 : 0;
        const accuracy = Math.max(0, 100 - Math.abs(variancePercentage));

        // Category breakdown with "anchor" identification
        const categoryBreakdown = {};
        let largestCategory = null;
        let largestAmount = 0;

        budgetTransactions.forEach(t => {
            const cat = categoryMap[t.category_id];
            if (cat) {
                const catName = cat.name;
                categoryBreakdown[catName] = (categoryBreakdown[catName] || 0) + t.amount;
                
                if (categoryBreakdown[catName] > largestAmount) {
                    largestAmount = categoryBreakdown[catName];
                    largestCategory = catName;
                }
            }
        });

        // Identify "anchor expense" (largest single transaction)
        const anchorTransaction = budgetTransactions.reduce((max, t) => 
            t.amount > max.amount ? t : max, budgetTransactions[0]
        );

        // Generate insights (date-aware)
        const insights = [];
        
        if (isCompleted) {
            // Final analysis for completed budgets
            if (variancePercentage > 20) {
                insights.push({
                    type: 'warning',
                    message: `Overspent by ${Math.abs(variancePercentage).toFixed(0)}%. Consider increasing budget for similar events.`
                });
            } else if (variancePercentage < -20) {
                insights.push({
                    type: 'success',
                    message: `Underspent by ${Math.abs(variancePercentage).toFixed(0)}%. You can reduce budget for similar events.`
                });
            } else {
                insights.push({
                    type: 'success',
                    message: 'Budget estimate was highly accurate!'
                });
            }
        } else if (isOngoing) {
            // In-progress analysis
            if (variancePercentage > 10) {
                insights.push({
                    type: 'warning',
                    message: `Currently ${Math.abs(variancePercentage).toFixed(0)}% over budget. Event still ongoing.`
                });
            } else if (totalSpent < planned * 0.5) {
                insights.push({
                    type: 'info',
                    message: `Spent ${((totalSpent / planned) * 100).toFixed(0)}% of budget so far.`
                });
            }
        }

        if (largestCategory) {
            const catPercentage = (largestAmount / totalSpent) * 100;
            if (catPercentage > 40) {
                insights.push({
                    type: 'info',
                    message: `${largestCategory} was the primary expense (${catPercentage.toFixed(0)}%). Plan around this category for similar budgets.`
                });
            }
        }

        if (anchorTransaction) {
            const anchorPercentage = (anchorTransaction.amount / totalSpent) * 100;
            if (anchorPercentage > 30) {
                insights.push({
                    type: 'info',
                    message: `"${anchorTransaction.title}" was the anchor expense (${anchorPercentage.toFixed(0)}% of total).`
                });
            }
        }

        return {
            totalSpent,
            planned,
            variance,
            variancePercentage,
            accuracy,
            categoryBreakdown,
            largestCategory,
            anchorTransaction,
            insights,
            transactionCount: budgetTransactions.length,
            isOngoing,
            isCompleted
        };
    }, [budget, transactions, categories]);

    if (!analysis) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2">
                        <Lightbulb className="w-4 h-4 text-blue-600" />
                        Budget Insights
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <p className="text-sm text-gray-500">
                        {budget && new Date(budget.startDate) > new Date()
                            ? 'Budget starts in the future. Insights will appear once expenses are added.'
                            : 'Add expenses to see insights and recommendations.'}
                    </p>
                </CardContent>
            </Card>
        );
    }

    const getVarianceIcon = () => {
        if (analysis.variancePercentage > 10) return TrendingUp;
        if (analysis.variancePercentage < -10) return TrendingDown;
        return Target;
    };

    const getVarianceColor = () => {
        if (Math.abs(analysis.variancePercentage) <= 10) return 'text-green-600';
        if (Math.abs(analysis.variancePercentage) <= 20) return 'text-yellow-600';
        return 'text-red-600';
    };

    const VarianceIcon = getVarianceIcon();

    return (
        <Card>
            <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                    <Lightbulb className="w-4 h-4 text-blue-600" />
                    Budget Insights
                    {analysis.isOngoing && (
                        <Badge variant="outline" className="ml-2 text-xs">
                            Ongoing
                        </Badge>
                    )}
                </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
                {/* Accuracy Score */}
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div>
                        <p className="text-xs text-gray-500 mb-1">
                            {analysis.isCompleted ? 'Final Accuracy' : 'Current Status'}
                        </p>
                        <div className="flex items-center gap-2">
                            <span className="text-2xl font-bold text-gray-900">
                                {analysis.accuracy.toFixed(0)}%
                            </span>
                            <VarianceIcon className={`w-5 h-5 ${getVarianceColor()}`} />
                        </div>
                    </div>
                    <div className="text-right">
                        <p className="text-xs text-gray-500">Variance</p>
                        <p className={`text-sm font-semibold ${getVarianceColor()}`}>
                            {analysis.variance >= 0 ? '+' : ''}
                            {formatCurrency(analysis.variance, settings)}
                        </p>
                    </div>
                </div>

                {/* Category Breakdown */}
                <div>
                    <h5 className="text-xs font-semibold text-gray-700 mb-2">Top Categories</h5>
                    <div className="space-y-2">
                        {Object.entries(analysis.categoryBreakdown)
                            .sort((a, b) => b[1] - a[1])
                            .slice(0, 3)
                            .map(([category, amount]) => {
                                const percentage = (amount / analysis.totalSpent) * 100;
                                return (
                                    <div key={category} className="flex items-center justify-between text-sm">
                                        <span className="text-gray-600">{category}</span>
                                        <div className="flex items-center gap-2">
                                            <span className="text-xs text-gray-400">
                                                {percentage.toFixed(0)}%
                                            </span>
                                            <span className="font-medium text-gray-900">
                                                {formatCurrency(amount, settings)}
                                            </span>
                                        </div>
                                    </div>
                                );
                            })}
                    </div>
                </div>

                {/* Insights */}
                {analysis.insights.length > 0 && (
                    <div className="space-y-2">
                        <h5 className="text-xs font-semibold text-gray-700">Recommendations</h5>
                        {analysis.insights.map((insight, idx) => {
                            const Icon = insight.type === 'success' ? CheckCircle2 :
                                       insight.type === 'warning' ? AlertTriangle :
                                       Lightbulb;
                            const colorClass = insight.type === 'success' ? 'text-green-600 bg-green-50' :
                                             insight.type === 'warning' ? 'text-orange-600 bg-orange-50' :
                                             'text-blue-600 bg-blue-50';
                            
                            return (
                                <div key={idx} className={`flex items-start gap-2 p-2 rounded-lg ${colorClass}`}>
                                    <Icon className="w-4 h-4 mt-0.5 flex-shrink-0" />
                                    <p className="text-xs leading-relaxed">
                                        {insight.message}
                                    </p>
                                </div>
                            );
                        })}
                    </div>
                )}
            </CardContent>
        </Card>
    );
}