import { useState, useCallback, useEffect } from 'react';
import * as Tabs from '@radix-ui/react-tabs';
import { clsx } from 'clsx';
import useEmblaCarousel from 'embla-carousel-react';
import UpcomingTransactions from './UpcomingTransactions';
import RecentTransactions from './RecentTransactions';
import { Card } from '@/components/ui/card';

/**
 * ActivityHub Component
 *
 * Renders Recent + Upcoming Transactions with responsive layout:
 * - Desktop (lg+): Tabs inside a Card (embedded in sidebar)
 * - Mobile (<lg): Full-width Embla carousel with pagination dots
 *
 * UPDATED 12-Mar-2026: Consolidated desktop tabs + mobile carousel into one component.
 *   Previously, mobile carousel was hardcoded in Dashboard.
 */
export function ActivityHub({
  recurringWithStatus,
  onMarkPaid,
  isLoading,
  categories,
  customBudgets,
  transactionActions,
  settings,
  isMobile = false,
}) {
  // --- SHARED STATE ---
  // UPDATED 12-Mar-2026: Default to 'recent' tab first per user request
  const [activeTab, setActiveTab] = useState('recent');

  // --- MOBILE: Embla Carousel ---
  const [emblaRef, emblaApi] = useEmblaCarousel({ align: 'start', skipSnaps: false, startIndex: 0 });
  const [selectedIndex, setSelectedIndex] = useState(0);

  const onEmblaSelect = useCallback(() => {
    if (!emblaApi) return;
    setSelectedIndex(emblaApi.selectedScrollSnap());
  }, [emblaApi]);

  useEffect(() => {
    if (!emblaApi) return;
    emblaApi.on('select', onEmblaSelect);
  }, [emblaApi, onEmblaSelect]);

  // --- MOBILE LAYOUT ---
  if (isMobile) {
    return (
      <div className="w-full max-w-full mx-auto overflow-hidden mt-2">
        <div className="overflow-hidden rounded-xl" ref={emblaRef}>
          <div className="flex touch-pan-y h-[calc(100dvh-var(--header-total-height)-var(--nav-total-height)-5rem)]">
            {/* Slide 1: Recent (UPDATED 12-Mar-2026: Recent first to match desktop tab order) */}
            <div className="flex-[0_0_100%] min-w-0 px-4 h-full overflow-y-auto scrollbar-hide" data-tutorial="recent-transactions">
              <RecentTransactions
                categories={categories}
                settings={settings}
                customBudgets={customBudgets}
                onEdit={(data, transaction) => transactionActions.handleSubmit(data, transaction)}
                onDelete={transactionActions.handleDelete}
                embedded={false}
              />
            </div>
            {/* Slide 2: Upcoming */}
            <div className="flex-[0_0_100%] min-w-0 px-4 h-full overflow-y-auto scrollbar-hide" data-tutorial="upcoming-transactions">
              <UpcomingTransactions
                recurringWithStatus={recurringWithStatus}
                onMarkPaid={onMarkPaid}
                isLoading={isLoading}
                categories={categories}
                embedded={false}
              />
            </div>
          </div>
        </div>

        {/* Pagination Dots */}
        <div className="flex justify-center items-center gap-1.5 mt-4">
          {[0, 1].map((index) => (
            <div
              key={index}
              className={`h-1.5 rounded-full transition-all duration-300 ${
                selectedIndex === index ? "w-4 bg-primary" : "w-1.5 bg-border"
              }`}
            />
          ))}
        </div>
      </div>
    );
  }

  // --- DESKTOP LAYOUT (Tabs) ---
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