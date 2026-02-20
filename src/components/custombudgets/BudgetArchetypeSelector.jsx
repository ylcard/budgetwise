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
    Target
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
            <div className="flex flex-col flex-1 min-h-0 overflow-hidden">
                <div className="flex-1 overflow-y-auto px-4 pb-4 md:px-0 md:pb-0 flex flex-col items-center justify-center text-center py-8">
                    <Sparkles className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                    <p className="text-gray-500 mb-4">
                        Not enough historical data yet to generate smart templates.
                    </p>
                </div>
                <div className="shrink-0 bg-background border-t p-4 pb-[max(1rem,env(safe-area-inset-bottom))] md:border-none md:p-0 md:pt-4 z-10">
                    <CustomButton variant="outline" onClick={onSkip} className="w-full">
                        Create Custom Budget
                    </CustomButton>
                </div>
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
                                    <div className="flex items-center justify-between gap-3 w-full">
                                        <div className="flex items-center gap-3 flex-1 min-w-0 pr-2">
                                            <div className="w-10 h-10 rounded-lg bg-blue-100/50 flex items-center justify-center flex-shrink-0">
                                                <IconComponent className="w-5 h-5 text-blue-600" />
                                            </div>

                                            <div className="flex flex-col min-w-0">
                                                <h4 className="font-semibold text-gray-900 truncate">
                                                    {archetype.name}
                                                </h4>
                                                <div className="flex items-center gap-1.5 text-xs text-gray-600 mt-0.5">
                                                    <Target className="w-3.5 h-3.5 text-gray-400" />
                                                    <span className="font-medium">{formatCurrency(archetype.recommendedAmount, settings)}</span>
                                                </div>
                                            </div>
                                        </div>
                                        <Badge variant="secondary" className={`text-[10px] px-2 py-0.5 shrink-0 ${confidenceColor}`}>
                                            {archetype.confidence}% match
                                        </Badge>
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