import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useAutoAnimate } from '@formkit/auto-animate/react';
import { CheckCircle2, Clock, AlertCircle, CalendarDays, X, ExternalLink } from 'lucide-react';
import { CustomButton } from '../ui/CustomButton';
import { useTransactionActions } from '../hooks/useActions';
import clsx from 'clsx';
import { ConfirmMatchDialog } from './ConfirmMatchDialog';
import { formatDate, parseDate } from '../utils/dateUtils';

/**
 * UpcomingTransactions Component
 *
 * Displays a scrollable list of upcoming recurring bills and income.
 *
 * @param {Object} props
 * @param {Object} props.recurringWithStatus - Contains currentMonthItems and timelineItems
 * @param {Function} props.onMarkPaid - Callback to mark a recurring item as paid
 * @param {boolean} props.isLoading - Loading state for the container
 * @param {Array} props.categories - Category entities for icon/color mapping
 * @param {boolean} props.embedded - Whether this is running inside the ActivityHub (removes outer card styles)
 */
export default function UpcomingTransactions({
  recurringWithStatus = { currentMonthItems: [] },
  onMarkPaid,
  isLoading,
  categories,
  embedded = false
}) {
  const [viewMode, setViewMode] = useState('current'); // 'current' | 'timeline'
  const [ignoredMatches, setIgnoredMatches] = useState(new Set()); // Local state to dismiss suggestions
  const [confirmingMatch, setConfirmingMatch] = useState(null); // { transaction, template }
  const [listRef] = useAutoAnimate();
  const { handleConfirmMatch } = useTransactionActions();

  const { currentMonthItems } = recurringWithStatus;

  if (isLoading) {
    return <div className="animate-pulse h-64 bg-muted rounded-xl"></div>;
  }

  return (
    <div className={clsx(
      "flex flex-col w-full max-w-full overflow-hidden h-full",
      !embedded && "bg-card rounded-xl border border-border shadow-sm max-h-[500px] lg:max-h-[650px]"
    )}>
      {/* Header Area (Only show if NOT embedded, otherwise ActivityHub handles title) */}
      {!embedded && (
        <div className="p-4 border-b border-border flex flex-col sm:flex-row sm:items-center justify-between gap-4 flex-shrink-0">
          <div>
            {/* UPDATED 12-Mar-2026: Renamed title; subtitle is now a link to recurring tab */}
            <h2 className="text-lg font-bold text-foreground">Upcoming Transactions</h2>
            <Link
              to="/transactions?tab=recurring"
              className="text-sm text-muted-foreground hover:text-primary flex items-center gap-1 transition-colors"
            >
              Manage your recurring transactions
              <ExternalLink className="w-3 h-3" />
            </Link>
          </div>
        </div>
      )}
      {/* ADDED 12-Mar-2026: Subtitle link when embedded in ActivityHub */}
      {embedded && (
        <div className="px-3 pt-2 pb-1 flex-shrink-0">
          <Link
            to="/transactions?tab=recurring"
            className="text-xs text-muted-foreground hover:text-primary flex items-center gap-1 transition-colors"
          >
            Manage recurring transactions
            <ExternalLink className="w-3 h-3" />
          </Link>
        </div>
      )}

      <div className={clsx("flex-1 overflow-y-auto overscroll-contain", embedded ? "p-2" : "p-2 sm:p-4")}>
        {currentMonthItems.length === 0 ? (
          <div className="py-8 text-center text-muted-foreground flex flex-col items-center gap-2">
            <CalendarDays className="h-8 w-8 opacity-50" />
            <p>No upcoming transactions found.</p>
          </div>
        ) : (
          <ul ref={listRef} className="space-y-3">
            {currentMonthItems.map((item) => {
              const uniqueKey = item.id;
              const displayDate = parseDate(item.calculatedNextDate);
              const isExpense = item.type === 'expense';
              const showMatchSuggestion = item.needsReview && !ignoredMatches.has(item.id);

              return (
                <li
                  key={uniqueKey}
                  className="flex flex-col sm:flex-row sm:items-center justify-between p-3 rounded-lg border border-border/50 bg-bg-subtle gap-3 transition-colors hover:bg-muted/50"
                >
                  <div className="flex items-start gap-3">
                    {/* Status Indicator Icon */}
                    <div className="mt-0.5 flex-shrink-0">
                      {item.isPaid ? (
                        <CheckCircle2 className="h-5 w-5 text-[hsl(var(--stat-income-text))]" />
                      ) : item.status === 'overdue' ? (
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
                        {formatDate(displayDate, 'MMM do, yyyy')}

                        {/* Contextual Status Badges */}
                        {!item.isPaid && (
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

                    <div className="flex-shrink-0">
                      {item.isPaid ? (
                        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-[hsl(var(--status-paid-bg))] text-[hsl(var(--status-paid-text))]">
                          Paid
                        </span>
                      ) : (
                        showMatchSuggestion ? (
                          <div className="flex items-center gap-1">
                            <CustomButton
                              variant="outline"
                              size="sm"
                              className="h-8 text-xs min-w-[80px] border-amber-500 text-amber-600 bg-amber-50 hover:bg-amber-100"
                              onClick={() => setConfirmingMatch({
                                transaction: item.suggestedTransactions[0],
                                template: item
                              })}
                            >
                              Confirm Match
                            </CustomButton>
                            <button
                              onClick={() => {
                                const next = new Set(ignoredMatches);
                                next.add(item.id);
                                setIgnoredMatches(next);
                              }}
                              className="p-1.5 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                              title="Ignore Suggestion"
                            >
                              <X className="h-4 w-4" />
                            </button>
                          </div>
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
                        )
                      )}
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}

        <ConfirmMatchDialog
          isOpen={!!confirmingMatch}
          onClose={() => setConfirmingMatch(null)}
          matchData={confirmingMatch}
          onConfirm={() => {
            handleConfirmMatch(confirmingMatch.transaction, confirmingMatch.template);
            setConfirmingMatch(null);
          }}
        />
      </div>
    </div>
  );
}