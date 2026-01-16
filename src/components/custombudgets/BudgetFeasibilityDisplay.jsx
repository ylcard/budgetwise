/**
 * Budget Feasibility Display
 * CREATED: 16-Jan-2026
 * 
 * Shows feasibility analysis and financial impact of proposed budgets
 */

import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
    CheckCircle2, 
    AlertTriangle, 
    XCircle, 
    TrendingDown,
    ArrowRight,
    DollarSign,
    Clock
} from "lucide-react";
import { formatCurrency } from "../utils/currencyUtils";

const GRADE_CONFIG = {
    'A': { 
        icon: CheckCircle2, 
        color: 'text-green-600', 
        bgColor: 'bg-green-50',
        badgeColor: 'bg-green-100 text-green-700',
        borderColor: 'border-green-200'
    },
    'B': { 
        icon: CheckCircle2, 
        color: 'text-blue-600', 
        bgColor: 'bg-blue-50',
        badgeColor: 'bg-blue-100 text-blue-700',
        borderColor: 'border-blue-200'
    },
    'C': { 
        icon: AlertTriangle, 
        color: 'text-yellow-600', 
        bgColor: 'bg-yellow-50',
        badgeColor: 'bg-yellow-100 text-yellow-700',
        borderColor: 'border-yellow-200'
    },
    'D': { 
        icon: AlertTriangle, 
        color: 'text-orange-600', 
        bgColor: 'bg-orange-50',
        badgeColor: 'bg-orange-100 text-orange-700',
        borderColor: 'border-orange-200'
    },
    'F': { 
        icon: XCircle, 
        color: 'text-red-600', 
        bgColor: 'bg-red-50',
        badgeColor: 'bg-red-100 text-red-700',
        borderColor: 'border-red-200'
    }
};

export default function BudgetFeasibilityDisplay({ feasibility, settings }) {
    if (!feasibility) return null;

    const config = GRADE_CONFIG[feasibility.feasibilityGrade] || GRADE_CONFIG['F'];
    const IconComponent = config.icon;
    const metrics = feasibility.metrics || {};

    return (
        <div className="space-y-4">
            {/* Grade Card */}
            <Card className={`border-2 ${config.borderColor}`}>
                <CardContent className="p-4">
                    <div className="flex items-center gap-3 mb-3">
                        <div className={`w-10 h-10 rounded-lg ${config.bgColor} flex items-center justify-center`}>
                            <IconComponent className={`w-5 h-5 ${config.color}`} />
                        </div>
                        <div className="flex-1">
                            <div className="flex items-center gap-2">
                                <h4 className="font-semibold text-gray-900">Feasibility Grade</h4>
                                <Badge className={config.badgeColor}>
                                    {feasibility.feasibilityGrade}
                                </Badge>
                            </div>
                            <p className="text-sm text-gray-600 mt-0.5">
                                {feasibility.message}
                            </p>
                        </div>
                    </div>

                    {/* Impact Metrics */}
                    <div className="grid grid-cols-2 gap-3 mt-4">
                        <div className="bg-gray-50 rounded-lg p-3">
                            <p className="text-xs text-gray-500 mb-1">Monthly Cost</p>
                            <p className="font-semibold text-gray-900">
                                {formatCurrency(metrics.monthlyBudgetCost, settings)}
                            </p>
                        </div>
                        <div className="bg-gray-50 rounded-lg p-3">
                            <p className="text-xs text-gray-500 mb-1">Avg Surplus</p>
                            <p className="font-semibold text-gray-900">
                                {formatCurrency(metrics.avgNetFlow, settings)}
                            </p>
                        </div>
                    </div>

                    {/* Savings Rate Impact */}
                    {metrics.savingsRateImpact !== undefined && (
                        <div className="mt-4 pt-4 border-t">
                            <div className="flex items-center justify-between text-sm">
                                <span className="text-gray-600 flex items-center gap-1">
                                    <TrendingDown className="w-4 h-4" />
                                    Savings Rate Impact
                                </span>
                                <div className="flex items-center gap-2">
                                    <span className="font-medium">
                                        {metrics.currentSavingsRate?.toFixed(1)}%
                                    </span>
                                    <ArrowRight className="w-3 h-3 text-gray-400" />
                                    <span className={`font-medium ${
                                        metrics.projectedSavingsRate < 10 ? 'text-red-600' :
                                        metrics.projectedSavingsRate < 20 ? 'text-yellow-600' :
                                        'text-green-600'
                                    }`}>
                                        {metrics.projectedSavingsRate?.toFixed(1)}%
                                    </span>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Recovery Time */}
                    {metrics.monthsToRecover > 0 && metrics.monthsToRecover < 999 && (
                        <div className="mt-3">
                            <div className="flex items-center justify-between text-sm">
                                <span className="text-gray-600 flex items-center gap-1">
                                    <Clock className="w-4 h-4" />
                                    Recovery Time
                                </span>
                                <span className="font-medium text-gray-900">
                                    {metrics.monthsToRecover} month{metrics.monthsToRecover !== 1 ? 's' : ''}
                                </span>
                            </div>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Warning for poor grades */}
            {!feasibility.isAffordable && (
                <Alert variant="destructive">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription>
                        This budget may strain your finances. Consider reducing the amount or extending the timeline.
                    </AlertDescription>
                </Alert>
            )}
        </div>
    );
}