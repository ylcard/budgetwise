import { useState } from 'react';
import { format, parseISO } from 'date-fns';
import { useAutoAnimate } from '@formkit/auto-animate/react';
import * as Tabs from '@radix-ui/react-tabs';
import { CheckCircle2, Clock, AlertCircle, CalendarDays } from 'lucide-react';
import { CustomButton } from '../ui/CustomButton';
import clsx from 'clsx';

export default function UpcomingTransactions({
  recurringWithStatus = { currentMonthItems: [], timelineItems: [] },
  onMarkPaid,
  isLoading,
  categories
}) {
  const [viewMode, setViewMode] = useState('current'); // 'current' | 'timeline'
  const [listRef] = useAutoAnimate();

  const { currentMonthItems, timelineItems } = recurringWithStatus;

  // Show unique items in timeline by dropping duplicates if they fall on the exact same projected day
  // Optional, but helps deduplicate if the projection math overlapped today
  const displayItems = viewMode === 'current' ? currentMonthItems : timelineItems;

  if (isLoading) {
    return <div className="animate-pulse h-64 bg-muted rounded-xl"></div>;
  }

  return (
    <div className="bg-card rounded-xl border border-border shadow-sm flex flex-col w-full overflow-hidden h-full max-h-[500px] lg:max-h-[650px]">
      {/* Header Area - Stays fixed at the top */}
      <div className="p-4 border-b border-border flex flex-col sm:flex-row sm:items-center justify-between gap-4 flex-shrink-0">
        <div>
          <h2 className="text-lg font-bold text-foreground">Upcoming Bills</h2>
          <p className="text-sm text-muted-foreground">Manage your recurring transactions</p>
        </div>

        <Tabs.Root value={viewMode} onValueChange={setViewMode} className="flex-shrink-0">
          <Tabs.List className="flex p-1 bg-muted rounded-lg w-full sm:w-auto">
            <Tabs.Trigger
              value="current"
              className={clsx(
                "flex-1 sm:flex-none px-4 py-1.5 text-sm font-medium rounded-md transition-all",
                viewMode === 'current' ? "bg-background text-foreground shadow-sm" : "text-muted-foreground"
              )}
            >
              This Month
            </Tabs.Trigger>
            <Tabs.Trigger
              value="timeline"
              className={clsx(
                "flex-1 sm:flex-none px-4 py-1.5 text-sm font-medium rounded-md transition-all",
                viewMode === 'timeline' ? "bg-background text-foreground shadow-sm" : "text-muted-foreground"
              )}
            >
              Timeline
            </Tabs.Trigger>
          </Tabs.List>
        </Tabs.Root>
      </div>

      {/* Scrollable List Area */}
      <div className="p-2 sm:p-4 flex-1 overflow-y-auto overscroll-contain">
        {displayItems.length === 0 ? (
          <div className="py-8 text-center text-muted-foreground flex flex-col items-center gap-2">
            <CalendarDays className="h-8 w-8 opacity-50" />
            <p>No upcoming transactions found.</p>
          </div>
        ) : (
          <ul ref={listRef} className="space-y-3">
            {displayItems.map((item, index) => {
              // Using index fallback for timeline projections to avoid identical key clashes
              const uniqueKey = viewMode === 'current' ? item.id : `${item.id}-${item.calculatedNextDate}-${index}`;
              const displayDate = parseISO(viewMode === 'current' ? item.calculatedNextDate : item.projectedDate);
              const isExpense = item.type === 'expense';

              return (
                <li
                  key={uniqueKey}
                  className="flex flex-col sm:flex-row sm:items-center justify-between p-3 rounded-lg border border-border/50 bg-bg-subtle gap-3 transition-colors hover:bg-muted/50"
                >
                  <div className="flex items-start gap-3">
                    {/* Status Indicator Icon */}
                    <div className="mt-0.5 flex-shrink-0">
                      {item.isPaid && viewMode === 'current' ? (
                        <CheckCircle2 className="h-5 w-5 text-[hsl(var(--stat-income-text))]" />
                      ) : item.status === 'overdue' && viewMode === 'current' ? (
                        <AlertCircle className="h-5 w-5 text-[hsl(var(--stat-expense-text))]" />
                      ) : (
                        <Clock className="h-5 w-5 text-muted-foreground" />
                      )}
                    </div>

                    <div className="min-w-0">
                      <p className="font-medium text-sm text-foreground truncate">
                        {item.title}
                      </p>
                      <p className="text-xs text-muted-foreground flex items-center gap-1.5 mt-0.5">
                        {format(displayDate, 'MMM do, yyyy')}

                        {/* Contextual Status Badges for Current View */}
                        {viewMode === 'current' && !item.isPaid && (
                          <>
                            <span className="w-1 h-1 rounded-full bg-border inline-block"></span>
                            <span className={clsx(
                              item.status === 'overdue' && "text-[hsl(var(--stat-expense-text))] font-medium",
                              item.status === 'due_soon' && "text-[hsl(var(--warning))] font-medium",
                            )}>
                              {item.status === 'overdue' ? `${Math.abs(item.daysUntilDue)} days overdue` :
                                item.status === 'due_soon' ? `Due in ${item.daysUntilDue} days` :
                                  `In ${item.daysUntilDue} days`}
                            </span>
                          </>
                        )}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between sm:justify-end gap-4 ml-8 sm:ml-0">
                    <span className={clsx(
                      "font-semibold text-sm",
                      isExpense ? "text-foreground" : "text-[hsl(var(--stat-income-text))]"
                    )}>
                      {isExpense ? '-' : '+'}{item.amount.toLocaleString()}
                    </span>

                    {viewMode === 'current' && (
                      <div className="flex-shrink-0">
                        {item.isPaid ? (
                          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-[hsl(var(--status-paid-bg))] text-[hsl(var(--status-paid-text))]">
                            Paid
                          </span>
                        ) : (
                          <CustomButton
                            variant={item.status === 'overdue' ? 'delete' : 'outline'}
                            size="sm"
                            onClick={() => onMarkPaid(item)}
                            className={clsx(
                              "h-8 text-xs min-w-[80px]",
                              // Adding mobile touch-target safety
                              "sm:min-h-0 min-h-[44px]"
                            )}
                          >
                            Mark Paid
                          </CustomButton>
                        )}
                      </div>
                    )}

                    {/* Timeline mode projection badge */}
                    {viewMode === 'timeline' && item.isProjection && (
                      <span className="text-xs text-muted-foreground italic px-2">Projected</span>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}