/**
 * Budget Archetype Selector
 * CREATED: 16-Jan-2026
 * 
 * AI-powered archetype selection screen that shows pre-filled budget
 * templates based on user's historical spending patterns.
 */

import { Card, CardContent } from "@/components/ui/card";
import { CustomButton } from "@/components/ui/CustomButton";
import { Badge } from "@/components/ui/badge";
import {
    Plane,
    Music,
    Ticket,
    Tent,
    ShoppingBag,
    Users,
    Calendar,
    Sparkles,
    TrendingUp,
    Clock
} from "lucide-react";
import { formatCurrency } from "../utils/currencyUtils";
import { format } from "date-fns";

const ARCHETYPE_ICONS = {
    'Trip': Plane,
    'Weekend Trip': Plane,
    'Day Trip': Plane,
    'Concert Trip': Ticket,
    'Event Holiday': Tent,
    'Event': Music,
    'Concert/Event': Music,
    'Social Week': Users,
    'Special Period': Calendar,
    'Special Occasion': Calendar
};

export default function BudgetArchetypeSelector({
    archetypes,
    onSelectArchetype,
    onSkip,
    settings
}) {
    if (!archetypes || archetypes.length === 0) {
        return (
            <div className="text-center py-8">
                <Sparkles className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                <p className="text-gray-500 mb-4">
                    Not enough historical data yet to generate smart templates.
                </p>
                <CustomButton variant="outline" onClick={onSkip}>
                    Create Custom Budget
                </CustomButton>
            </div>
        );
    }

    return (
        <div className="flex flex-col flex-1 min-h-0 overflow-hidden">
            <div className="flex-1 overflow-y-auto px-4 pb-4 md:px-0 md:pb-0 space-y-4">
                <div className="flex items-center gap-2 mb-4">
                    <Sparkles className="w-5 h-5 text-blue-600" />
                    <div>
                        <h3 className="font-semibold text-gray-900">Smart Templates</h3>
                        <p className="text-xs text-gray-500">
                            Based on your spending history
                        </p>
                    </div>
                </div>

                <div className="grid gap-3">
                    {archetypes.slice(0, 5).map((archetype, idx) => {
                        const IconComponent = ARCHETYPE_ICONS[archetype.type] || Calendar;
                        const confidenceColor =
                            archetype.confidence >= 70 ? 'bg-green-100 text-green-700' :
                                archetype.confidence >= 50 ? 'bg-yellow-100 text-yellow-700' :
                                    'bg-gray-100 text-gray-600';

                        return (
                            <Card
                                key={idx}
                                className="hover:shadow-md transition-shadow cursor-pointer border-2 hover:border-blue-300"
                                onClick={() => onSelectArchetype(archetype)}
                            >
                                <CardContent className="p-4">
                                    <div className="flex items-start gap-3">
                                        <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center flex-shrink-0">
                                            <IconComponent className="w-5 h-5 text-blue-600" />
                                        </div>

                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2 mb-1">
                                                <h4 className="font-semibold text-gray-900">
                                                    {archetype.name}
                                                </h4>
                                                <Badge variant="secondary" className={`text-[10px] px-1.5 py-0 ${confidenceColor}`}>
                                                    {archetype.confidence}% match
                                                </Badge>
                                            </div>

                                            <div className="flex items-center gap-4 text-xs text-gray-600 mb-2">
                                                <span className="flex items-center gap-1">
                                                    <TrendingUp className="w-3 h-3" />
                                                    {formatCurrency(archetype.recommendedAmount, settings)}
                                                </span>
                                                <span className="flex items-center gap-1">
                                                    <Clock className="w-3 h-3" />
                                                    ~{archetype.typicalDuration} days
                                                </span>
                                                <span className="text-gray-400">
                                                    {archetype.occurrences} times before
                                                </span>
                                            </div>

                                            {archetype.lastOccurrence && (
                                                <p className="text-xs text-gray-400">
                                                    Last: {format(new Date(archetype.lastOccurrence), 'MMM yyyy')}
                                                </p>
                                            )}
                                        </div>

                                        <CustomButton
                                            variant="primary"
                                            size="sm"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                onSelectArchetype(archetype);
                                            }}
                                        >
                                            Use Template
                                        </CustomButton>
                                    </div>
                                </CardContent>
                            </Card>
                        );
                    })}
                </div>
            </div>

            <div className="shrink-0 bg-background border-t p-4 pb-[max(1rem,env(safe-area-inset-bottom))] md:border-none md:p-0 md:pt-4 z-10">
                <CustomButton
                    variant="ghost"
                    onClick={onSkip}
                    className="w-full"
                >
                    Start from Scratch
                </CustomButton>
            </div>
        </div>
    );
}