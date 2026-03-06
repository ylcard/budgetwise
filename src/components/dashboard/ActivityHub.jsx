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
  const [activeTab, setActiveTab] = useState('upcoming');

  return (
    <Card className="h-full border-border shadow-sm flex flex-col overflow-hidden bg-card">
      <Tabs.Root value={activeTab} onValueChange={setActiveTab} className="flex flex-col h-full">
        {/* Header / Segmented Control */}
        <div className="p-4 border-b border-border flex-shrink-0">
          <Tabs.List className="grid grid-cols-2 gap-2 bg-muted p-1 rounded-lg">
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
          </Tabs.List>
        </div>

        {/* Scrollable Content Area - Defined Height controlled by Parent Grid */}
        <div className="flex-1 overflow-hidden relative">
          <Tabs.Content value="upcoming" className="h-full overflow-y-auto outline-none">
            <UpcomingTransactions
              recurringWithStatus={recurringWithStatus}
              onMarkPaid={onMarkPaid}
              isLoading={isLoading}
              categories={categories}
              embedded={true} // New prop to tell component it's inside a wrapper
            />
          </Tabs.Content>
          
          <Tabs.Content value="recent" className="h-full overflow-y-auto outline-none">
            <RecentTransactions 
              categories={categories}
              customBudgets={customBudgets}
              onEdit={(data, tx) => transactionActions.handleSubmit(data, tx)}
              onDelete={transactionActions.handleDelete}
              embedded={true}
            />
          </Tabs.Content>
        </div>
      </Tabs.Root>
    </Card>
  );
}
