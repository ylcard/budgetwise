/**
 * Budget Feasibility Display
 * CREATED: 16-Jan-2026
 * MODIFIED: 18-Jan-2026 - Added AI insights button
 * 
 * Shows feasibility analysis and financial impact of proposed budgets
 */

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { CustomButton } from "@/components/ui/CustomButton";
import {
    CheckCircle2,
    AlertTriangle,
    XCircle,
    TrendingDown,
    ArrowRight,
    DollarSign,
    Clock,
    Activity,     // Pacing
    Flame,        // Burn
    ShieldCheck,  // Stability
    BarChart3,    // Sharpe
    Ghost,        // Creep
    HelpCircle,
    Sparkles,
    Loader2
} from "lucide-react";
import { Progress } from "@/components/ui/progress";
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip";
import { formatCurrency } from "../utils/currencyUtils";
import { base44 } from "@/api/base44Client";
import { useToast } from "@/components/ui/use-toast";

// ADD: Helper to determine color based on score (0-100)
const getScoreColor = (score) => {
    if (score >= 90) return 'text-green-600 bg-green-600';
    if (score >= 75) return 'text-blue-600 bg-blue-600';
    if (score >= 60) return 'text-yellow-600 bg-yellow-600';
    return 'text-red-600 bg-red-600';
};

const getScoreBg = (score) => {
    if (score >= 90) return 'bg-green-100';
    if (score >= 75) return 'bg-blue-100';
    if (score >= 60) return 'bg-yellow-100';
    return 'bg-red-100';
};

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

// ADD: Sub-component for individual metrics
const HealthMetric = ({ label, score, icon: Icon, description }) => {
    const colorClass = getScoreColor(score);
    const bgClass = getScoreBg(score);

    return (
        <div className="flex flex-col space-y-2 p-3 rounded-lg bg-white border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <div className={`p-1.5 rounded-md ${bgClass}`}>
                        <Icon className={`w-4 h-4 ${colorClass.split(' ')[0]}`} />
                    </div>
                    <span className="text-sm font-medium text-gray-700">{label}</span>
                </div>
                <TooltipProvider>
                    <Tooltip>
                        <TooltipTrigger>
                            <HelpCircle className="w-3 h-3 text-gray-400 cursor-help" />
                        </TooltipTrigger>
                        <TooltipContent>
                            <p className="max-w-[200px] text-xs">{description}</p>
                        </TooltipContent>
                    </Tooltip>
                </TooltipProvider>
            </div>

            <div className="space-y-1">
                <div className="flex justify-between text-xs">
                    <span className="font-bold text-gray-900">{Math.round(score)}/100</span>
                    <span className="text-gray-500">{score >= 90 ? 'Excellent' : score >= 60 ? 'Fair' : 'Risk'}</span>
                </div>
                <Progress value={score} className="h-2" indicatorClassName={colorClass.split(' ')[1]} />
            </div>
        </div>
    );
};

export default function BudgetFeasibilityDisplay({ feasibility, settings, budgetData }) {
    if (!feasibility) return null;

    const [aiInsights, setAiInsights] = useState(null);
    const [loadingInsights, setLoadingInsights] = useState(false);
    const { toast } = useToast();

    // ADDED: 16-Jan-2026 - Temporal context awareness
    const isFuture = feasibility.temporalContext === 'future';
    const isOngoing = feasibility.temporalContext === 'ongoing';

    const config = GRADE_CONFIG[feasibility.feasibilityGrade] || GRADE_CONFIG['F'];
    const IconComponent = config.icon;
    const metrics = feasibility.metrics || {};

    // ADDED: 18-Jan-2026 - AI insights generation
    const generateInsights = async () => {
        setLoadingInsights(true);
        try {
            const response = await base44.functions.invoke('generateBudgetInsights', {
                budgetData: {
                    ...budgetData,
                    feasibility: {
                        grade: feasibility.feasibilityGrade,
                        feasibilityScore: feasibility.feasibilityScore,
                        riskLevel: feasibility.riskLevel,
                        metrics
                    }
                }
            });

            if (response.data.insight) {
                setAiInsights(response.data.insight);
            } else {
                throw new Error('No insights generated');
            }
        } catch (error) {
            console.error('Error generating insights:', error);
            toast({
                title: "Failed to generate insights",
                description: error.message || "Please try again later",
                variant: "destructive"
            });
        } finally {
            setLoadingInsights(false);
        }
    };

    return (
        <div className="space-y-4">
            {/* Temporal Context Indicator */}
            {isFuture && (
                <div className="text-xs text-blue-600 bg-blue-50 px-3 py-2 rounded-lg border border-blue-200">
                    <strong>Future Budget:</strong> This analysis shows hypothetical impact based on your current spending patterns.
                </div>
            )}
            {isOngoing && (
                <div className="text-xs text-yellow-600 bg-yellow-50 px-3 py-2 rounded-lg border border-yellow-200">
                    <strong>Ongoing Budget:</strong> Analysis based on current financial state during the event.
                </div>
            )}

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
                                    <span className={`font-medium ${metrics.projectedSavingsRate < 10 ? 'text-red-600' :
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

                    {/* Financial Health DNA Section */}
                    {feasibility.health && (
                        <div className="mt-6 pt-5 border-t border-gray-100">
                            <h5 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
                                Financial Health DNA
                            </h5>
                            <div className="grid grid-cols-2 gap-3">
                                <HealthMetric
                                    label="Pacing"
                                    score={feasibility.health.pacing || 0}
                                    icon={Activity}
                                    description="Real-time spend vs. 3-month average. 100 is perfect (under budget)."
                                />
                                <HealthMetric
                                    label="Burn Rate"
                                    score={feasibility.health.ratio || 0}
                                    icon={Flame}
                                    description="Sustainability of spending against income. Higher is more sustainable."
                                />
                                <HealthMetric
                                    label="Stability"
                                    score={feasibility.health.stability || 0}
                                    icon={ShieldCheck}
                                    description="Consistency of expenses over time. Higher means fewer surprises."
                                />
                                <HealthMetric
                                    label="Sharpe"
                                    score={feasibility.health.sharpe || 0}
                                    icon={BarChart3}
                                    description="Risk-adjusted savings consistency. Higher is better."
                                />
                                <HealthMetric
                                    label="Creep"
                                    score={feasibility.health.creep || 0}
                                    icon={Ghost}
                                    description="Lifestyle Creep Index. 100 means expenses are NOT growing faster than income."
                                />
                            </div>
                        </div>
                    )}

                    {/* AI Insights Section - ADDED: 18-Jan-2026 */}
                    <div className="mt-6 pt-5 border-t border-gray-100">
                        <div className="flex items-center justify-between mb-3">
                            <h5 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                                AI-Powered Insights
                            </h5>
                            <CustomButton
                                variant="info"
                                size="sm"
                                onClick={generateInsights}
                                disabled={loadingInsights}
                            >
                                {loadingInsights ? (
                                    <>
                                        <Loader2 className="w-3 h-3 animate-spin" />
                                        Analyzing...
                                    </>
                                ) : (
                                    <>
                                        <Sparkles className="w-3 h-3" />
                                        Get AI Insights
                                    </>
                                )}
                            </CustomButton>
                        </div>

                        {aiInsights && (
                            <div className="bg-gradient-to-br from-blue-50 to-purple-50 rounded-lg p-4 border border-blue-200">
                                <div className="prose prose-sm max-w-none text-gray-700 whitespace-pre-wrap">
                                    {aiInsights}
                                </div>
                            </div>
                        )}
                    </div>
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