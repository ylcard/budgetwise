import React, { useMemo, useState } from "react";
import { useAutoAnimate } from "@formkit/auto-animate/react";
import { format, parseISO, isPast, isToday, isSameMonth } from "date-fns";
import { Check, Clock, CreditCard, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { getCategoryIcon } from "../utils/iconMapConfig";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import RecurringTransactionForm from "../recurring/RecurringTransactionForm";
import { useRecurringTransactionActions } from "../hooks/useRecurringTransactions";
import { useSettings } from "../utils/SettingsContext";

export default function UpcomingTransactions({ recurringWithStatus, onMarkPaid, isLoading, categories = [] }) {
  const [showAddForm, setShowAddForm] = useState(false);
  const { user } = useSettings();
  const { handleCreate, isSubmitting } = useRecurringTransactionActions(user);
  const [listRef] = useAutoAnimate();

  // Filter: Only Current Month & Active (Includes Paid)
  const currentBills = useMemo(() => {
    const now = new Date();
    return (recurringWithStatus || []).filter(bill => {
      if (!bill.isActive) return false;

      // 1. Always show if marked 'paid' (implies it was matched to a current month transaction)
      if (bill.status === 'paid') return true;

      // 2. Otherwise, check if the calculated next occurrence is in the current month
      // Or if it is strictly in the past (an overdue bill from a previous month)
      const billDate = parseISO(bill.nextOccurrence);
      return isSameMonth(billDate, now) || isPast(billDate);
    });
  }, [recurringWithStatus]);

  // Sort: Due/Overdue first, then by date
  const sortedBills = useMemo(() => {
    return [...currentBills].sort((a, b) => {
      if (a.status === 'due' && b.status === 'paid') return -1;
      if (a.status === 'paid' && b.status === 'due') return 1;
      return new Date(a.nextOccurrence) - new Date(b.nextOccurrence);
    });
  }, [currentBills]);

  const handleCreateSubmit = async (data) => {
    await handleCreate(data);
    setShowAddForm(false);
  };

  const getCategoryStyles = (bill) => {
    const cat = categories.find(c => c.id === bill.category_id);

    let IconComponent;
    if (bill.type === 'income') {
      IconComponent = getCategoryIcon('DollarSign');
    } else {
      IconComponent = cat?.icon ? getCategoryIcon(cat.icon) : CreditCard;
    }
    // Use category color or default gray
    const color = cat?.color || 'hsl(var(--muted-foreground))';

    return { IconComponent, color };
  };

  if (isLoading) {
    return (
      <Card className="h-full border shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg font-medium">Upcoming Transactions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-12 bg-muted rounded animate-pulse" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      {/* Removed h-full, added max-height constraint */}
      <Card className="flex flex-col border shadow-sm h-auto">
        <CardHeader className="pb-3 border-b bg-muted/40 px-4 py-3 flex-none">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-semibold flex items-center gap-2 text-foreground">
              <Clock className="w-4 h-4 text-primary" />
              Upcoming
            </CardTitle>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold px-2 py-0.5 bg-background border rounded-full text-muted-foreground uppercase tracking-wide">
                {format(new Date(), 'MMMM')}
              </span>
              <Button
                size="icon"
                variant="create"
                className="h-6 w-6 text-muted-foreground hover:text-primary hover:bg-primary/10"
                onClick={() => setShowAddForm(true)}
              >
                <Plus className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
        {/* Added standard scrollbar hiding classes */}
        <CardContent className="p-0 flex-1 min-h-0">
          {sortedBills.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full py-8 text-muted-foreground">
              <Check className="w-8 h-8 text-muted-foreground/30 mb-2" />
              <p className="text-sm">No transactions this month</p>
            </div>
          ) : (
            <div
              ref={listRef}
              className="divide-y overflow-y-auto max-h-[320px] lg:max-h-[500px] [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]"
            >
              {sortedBills.map((bill) => {
                const isPaid = bill.status === 'paid';
                const dueDate = parseISO(bill.nextOccurrence);
                const isOverdue = !isPaid && isPast(dueDate) && !isToday(dueDate);
                const { IconComponent, color } = getCategoryStyles(bill);

                return (
                  <div
                    key={bill.id}
                    className={cn(
                      "flex items-center justify-between p-4 transition-colors hover:bg-accent/50",
                      isPaid ? "bg-accent/30" : "",
                      isOverdue && "border-destructive/20 bg-destructive/10"
                    )}
                  >
                    <div className="flex items-center gap-3 overflow-hidden">
                      <div
                        className={cn(
                          "w-8 h-8 rounded-full flex items-center justify-center shrink-0 border",
                          isPaid ? "bg-[hsl(var(--status-paid-bg))] border-[hsl(var(--status-paid-text))/0.2] text-[hsl(var(--status-paid-text))]" : "bg-background border-border"
                        )}
                        style={!isPaid ? { color: color } : {}}
                      >
                        {isPaid ? <Check className="w-4 h-4" /> : <IconComponent className="w-4 h-4" />}
                      </div>
                      <div className="min-w-0">
                        <p className={cn("font-medium text-sm truncate text-foreground", isPaid && "text-muted-foreground line-through")}>
                          {bill.title}
                        </p>
                        <p className={cn("text-[11px]", isOverdue ? "text-destructive font-medium" : "text-muted-foreground")}>
                          {isPaid ? 'Paid' : (isOverdue ? 'Overdue • ' : 'Due ') + format(dueDate, 'MMM d')}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 pl-2">
                      <span className={cn("font-semibold text-sm whitespace-nowrap text-foreground", isPaid && "text-muted-foreground")}>
                        {bill.amount?.toLocaleString('en-US', {
                          style: 'currency',
                          currency: user?.baseCurrency || 'EUR'
                        })}
                      </span>
                      {!isPaid && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-9 px-3 text-xs border-primary/20 text-primary hover:bg-primary/10 hover:text-primary"
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
      <Dialog open={showAddForm} onOpenChange={setShowAddForm}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>New Recurring Transaction</DialogTitle>
          </DialogHeader>
          <RecurringTransactionForm
            categories={categories}
            onSubmit={handleCreateSubmit}
            onCancel={() => setShowAddForm(false)}
            isSubmitting={isSubmitting}
          />
        </DialogContent>
      </Dialog>
    </>
  );
}
