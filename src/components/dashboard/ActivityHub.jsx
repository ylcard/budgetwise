import { useState } from 'react';
import * as Tabs from '@radix-ui/react-tabs';
import { clsx } from 'clsx';
import UpcomingTransactions from './UpcomingTransactions';
import RecentTransactions from './RecentTransactions';
import { Card } from '@/components/ui/card';

export function ActivityHub({
  recurringWithStatus,
  onMarkPaid,
  isLoading,
  categories,
  customBudgets,
  transactionActions,
  settings,
  embedded = false
}) {
  // UPDATED 12-Mar-2026: Default to 'recent' tab first per user request
  const [activeTab, setActiveTab] = useState('recent');

  return (
    <Card className="h-full w-full max-w-full border-border shadow-md flex flex-col overflow-hidden bg-card">
      <Tabs.Root value={activeTab} onValueChange={setActiveTab} className="flex flex-col h-full">
        {/* Header / Segmented Control */}
        <div className="p-4 border-b border-border flex-shrink-0">
          {/* UPDATED 12-Mar-2026: Reordered tabs — Recent first, Upcoming second */}
          <Tabs.List className="grid grid-cols-2 gap-2 bg-muted p-1 rounded-lg">
            <Tabs.Trigger
              value="recent"
              className={clsx(
                "px-3 py-1.5 text-sm font-medium rounded-md transition-all",
                "data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm",
                "data-[state=inactive]:text-muted-foreground data-[state=inactive]:hover:text-foreground/80"
              )}
            >
              Recent
            </Tabs.Trigger>
            <Tabs.Trigger
              value="upcoming"
              className={clsx(
                "px-3 py-1.5 text-sm font-medium rounded-md transition-all",
                "data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm",
                "data-[state=inactive]:text-muted-foreground data-[state=inactive]:hover:text-foreground/80"
              )}
            >
              Upcoming
            </Tabs.Trigger>
          </Tabs.List>
        </div>

        {/* UPDATED 12-Mar-2026: Reordered content — Recent first, Upcoming second */}
        <div className="flex-1 min-h-0 overflow-hidden relative">
          <Tabs.Content value="recent" className="h-full overflow-y-auto outline-none">
            <RecentTransactions
              categories={categories}
              customBudgets={customBudgets}
              onEdit={(data, tx) => transactionActions.handleSubmit(data, tx)}
              onDelete={transactionActions.handleDelete}
              embedded={true}
            />
          </Tabs.Content>

          <Tabs.Content value="upcoming" className="h-full overflow-y-auto outline-none">
            <UpcomingTransactions
              recurringWithStatus={recurringWithStatus}
              onMarkPaid={onMarkPaid}
              isLoading={isLoading}
              categories={categories}
              embedded={true}
            />
          </Tabs.Content>
        </div>
      </Tabs.Root>
    </Card>
  );
}