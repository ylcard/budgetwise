import React from "react";
import { format, parseISO, isPast, isToday } from "date-fns";
import { Check, Clock, CreditCard } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils"; // Assuming you have a clsx/tailwind-merge utility

export default function UpcomingBills({ recurringWithStatus, onMarkPaid, isLoading }) {
    // Sort: Due/Overdue first, then by date
    const sortedBills = [...(recurringWithStatus || [])].sort((a, b) => {
        if (a.status === 'due' && b.status === 'paid') return -1;
        if (a.status === 'paid' && b.status === 'due') return 1;
        return new Date(a.nextOccurrence) - new Date(b.nextOccurrence);
    });

    const activeBills = sortedBills.filter(r => r.isActive);

    if (isLoading) {
        return (
            <Card className="h-full">
                <CardHeader className="pb-2">
                    <CardTitle className="text-lg font-medium">Upcoming Bills</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="space-y-3">
                        {[1, 2, 3].map((i) => (
                            <div key={i} className="h-12 bg-gray-100 rounded animate-pulse" />
                        ))}
                    </div>
                </CardContent>
            </Card>
        );
    }

    return (
        <Card className="h-full flex flex-col">
            <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                    <CardTitle className="text-lg font-medium flex items-center gap-2">
                        <Clock className="w-4 h-4 text-muted-foreground" />
                        Upcoming Bills
                    </CardTitle>
                    <span className="text-xs text-muted-foreground">
                        {activeBills.filter(b => b.status === 'due').length} Due
                    </span>
                </div>
            </CardHeader>
            <CardContent className="flex-1 overflow-auto">
                {activeBills.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground text-sm">
                        No active recurring bills found.
                    </div>
                ) : (
                    <div className="space-y-3">
                        {activeBills.map((bill) => {
                            const isPaid = bill.status === 'paid';
                            const dueDate = parseISO(bill.nextOccurrence);
                            const isOverdue = !isPaid && isPast(dueDate) && !isToday(dueDate);

                            return (
                                <div 
                                    key={bill.id} 
                                    className={cn(
                                        "flex items-center justify-between p-3 rounded-lg border transition-colors",
                                        isPaid ? "bg-emerald-50/50 border-emerald-100" : "bg-card hover:bg-accent/50",
                                        isOverdue && "border-red-200 bg-red-50/30"
                                    )}
                                >
                                    <div className="flex items-center gap-3 overflow-hidden">
                                        <div className={cn(
                                            "w-10 h-10 rounded-full flex items-center justify-center shrink-0",
                                            isPaid ? "bg-emerald-100 text-emerald-600" : "bg-primary/10 text-primary"
                                        )}>
                                            {isPaid ? <Check className="w-5 h-5" /> : <CreditCard className="w-5 h-5" />}
                                        </div>
                                        <div className="min-w-0">
                                            <p className={cn("font-medium truncate", isPaid && "text-muted-foreground line-through")}>
                                                {bill.title}
                                            </p>
                                            <p className={cn("text-xs", isOverdue ? "text-red-500 font-medium" : "text-muted-foreground")}>
                                                {isPaid ? 'Paid' : (isOverdue ? 'Overdue ' : 'Due ') + format(dueDate, 'MMM d')}
                                            </p>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-3 pl-2">
                                        <span className={cn("font-semibold whitespace-nowrap", isPaid && "text-muted-foreground")}>
                                            {bill.originalAmount?.toLocaleString('en-US', { 
                                                style: 'currency', 
                                                currency: bill.originalCurrency || 'USD' 
                                            })}
                                        </span>
                                        {!isPaid && (
                                            <Button 
                                                size="sm" 
                                                variant="outline" 
                                                className="h-8 px-2 text-xs"
                                                onClick={() => onMarkPaid(bill)}
                                            >
                                                Pay
                                            </Button>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
