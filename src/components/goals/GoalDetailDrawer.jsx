import React, { useState } from 'react';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerDescription } from '@/components/ui/drawer';
import { CustomButton } from '@/components/ui/CustomButton';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { getCategoryIcon } from '../utils/iconMapConfig';
import { calculateGoalProgress, projectCompletionDate } from '../utils/goalCalculations';
import { useSettings } from '../utils/SettingsContext';
import { format, parseISO } from 'date-fns';
import {
  Calendar,
  TrendingUp,
  History,
  Edit,
  Pause,
  Play,
  CheckCircle2,
  AlertCircle,
  DollarSign,
  Percent,
  X
} from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import * as Dialog from '@radix-ui/react-dialog';
import { useIsMobile } from '@/hooks/use-mobile';

/**
 * GoalDetailDrawer - Full details and history for a goal
 */
export const GoalDetailDrawer = ({
  open,
  onOpenChange,
  goal,
  feasibilityData,
  onEdit,
  onTogglePause,
  onComplete,
  monthlyIncome
}) => {
  const { settings } = useSettings();
  const formatCurrency = (value) => new Intl.NumberFormat(undefined, {
    style: 'currency',
    currency: settings?.baseCurrency || 'USD'
  }).format(value);
  const [activeTab, setActiveTab] = useState('overview');
  const isMobile = useIsMobile();

  if (!goal) return null;

  const Icon = getCategoryIcon(goal.icon);
  const progress = calculateGoalProgress(goal.virtual_balance || 0, goal.target_amount);
  const isComplete = goal.status === 'completed';
  const isPaused = goal.status === 'paused';

  const projectedDate = projectCompletionDate(goal, monthlyIncome);

  const mainContent = (
    <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col min-h-0">
      <TabsList className="w-full grid grid-cols-2 mx-4 mt-4">
        <TabsTrigger value="overview">Overview</TabsTrigger>
        <TabsTrigger value="history">History</TabsTrigger>
      </TabsList>

      <ScrollArea className="flex-1 px-4">
        <TabsContent value="overview" className="space-y-4 mt-4">
          {/* Progress Section */}
          <div className="space-y-3">
            <h4 className="text-sm font-medium text-foreground">Progress</h4>
            <div className="space-y-2">
              <Progress value={progress} className="h-3" />
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">{formatCurrency(goal.virtual_balance || 0)}</span>
                <span className="font-medium text-foreground">{progress.toFixed(1)}%</span>
                <span className="text-muted-foreground">{formatCurrency(goal.target_amount)}</span>
              </div>
            </div>
          </div>

          {/* Key Metrics */}
          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 rounded-lg bg-muted/30 border border-border">
              <div className="flex items-center gap-2 text-muted-foreground mb-1">
                <Calendar className="w-4 h-4" />
                <span className="text-xs">Deadline</span>
              </div>
              <p className="text-sm font-medium">{format(parseISO(goal.deadline), 'MMM dd, yyyy')}</p>
            </div>

            <div className="p-3 rounded-lg bg-muted/30 border border-border">
              <div className="flex items-center gap-2 text-muted-foreground mb-1">
                <TrendingUp className="w-4 h-4" />
                <span className="text-xs">Deposits</span>
              </div>
              <p className="text-sm font-medium">{goal.ledger_history?.length || 0} total</p>
            </div>
          </div>

          {/* Funding Rule */}
          <div className="space-y-2">
            <h4 className="text-sm font-medium text-foreground">Funding Strategy</h4>
            <div className="p-3 rounded-lg bg-muted/30 border border-border">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {goal.funding_rule?.type === 'fixed' ? (
                    <>
                      <DollarSign className="w-4 h-4 text-muted-foreground" />
                      <span className="text-sm">
                        {formatCurrency(goal.funding_rule.amount)} {goal.funding_rule.frequency}
                      </span>
                    </>
                  ) : (
                    <>
                      <Percent className="w-4 h-4 text-muted-foreground" />
                      <span className="text-sm">
                        {goal.funding_rule.percentage}% of income {goal.funding_rule.frequency}
                      </span>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Feasibility Status */}
          {feasibilityData && !isComplete && !isPaused && (
            <div className={`p-4 rounded-lg border ${feasibilityData.status === 'on_track'
                ? 'bg-[hsl(var(--status-paid-bg))] border-[hsl(var(--status-paid-text))]'
                : 'bg-[hsl(var(--status-unpaid-bg))] border-[hsl(var(--status-unpaid-text))]'
              }`}>
              <div className="flex items-start gap-2">
                {feasibilityData.status === 'on_track' ? (
                  <CheckCircle2 className="w-5 h-5 text-[hsl(var(--status-paid-text))] shrink-0 mt-0.5" />
                ) : (
                  <AlertCircle className="w-5 h-5 text-[hsl(var(--status-unpaid-text))] shrink-0 mt-0.5" />
                )}
                <div className="flex-1">
                  <h5 className="text-sm font-medium">{feasibilityData.message}</h5>
                  <p className="text-xs text-muted-foreground mt-1">{feasibilityData.recommendation}</p>
                  {projectedDate && feasibilityData.status === 'on_track' && (
                    <p className="text-xs text-muted-foreground mt-2">
                      Projected completion: {format(projectedDate, 'MMM dd, yyyy')}
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}
        </TabsContent>

        <TabsContent value="history" className="space-y-3 mt-4">
          <h4 className="text-sm font-medium text-foreground">Deposit History</h4>
          {goal.ledger_history && goal.ledger_history.length > 0 ? (
            <div className="space-y-2">
              {[...goal.ledger_history].reverse().map((deposit, index) => (
                <div
                  key={index}
                  className="p-3 rounded-lg bg-muted/30 border border-border flex justify-between items-start"
                >
                  <div>
                    <p className="text-sm font-medium">{formatCurrency(deposit.amount)}</p>
                    <p className="text-xs text-muted-foreground">
                      {format(parseISO(deposit.timestamp), 'MMM dd, yyyy - HH:mm')}
                    </p>
                    {deposit.notes && (
                      <p className="text-xs text-muted-foreground mt-1 italic">{deposit.notes}</p>
                    )}
                  </div>
                  <Badge variant="secondary" className="text-xs">
                    {deposit.source}
                  </Badge>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <History className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No deposits yet</p>
            </div>
          )}
        </TabsContent>
      </ScrollArea>
    </Tabs>
  );

  const actionContent = (
    <div className="p-4 border-t border-border flex gap-2">
      {!isComplete && (
        <>
          <CustomButton
            variant="outline"
            size="icon"
            onClick={() => onTogglePause(goal)}
          >
            {isPaused ? <Play className="w-4 h-4" /> : <Pause className="w-4 h-4" />}
          </CustomButton>
          <CustomButton
            variant="outline"
            onClick={() => onEdit(goal)}
            className="flex-1"
          >
            <Edit className="w-4 h-4 mr-2" />
            Edit
          </CustomButton>
        </>
      )}
      {!isComplete && progress >= 100 && (
        <CustomButton
          variant="success"
          onClick={() => onComplete(goal)}
          className="flex-1"
        >
          <CheckCircle2 className="w-4 h-4 mr-2" />
          Mark Complete
        </CustomButton>
      )}
    </div>
  );

  if (!isMobile) {
    return (
      <Dialog.Root open={open} onOpenChange={onOpenChange}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm" />
          <Dialog.Content className="fixed left-[50%] top-[50%] z-50 flex flex-col w-full max-w-2xl max-h-[85vh] translate-x-[-50%] translate-y-[-50%] border border-border bg-background shadow-lg rounded-xl overflow-hidden">
            <div className="p-4 border-b border-border flex items-start gap-3">
              <div className="p-3 rounded-xl shrink-0" style={{ backgroundColor: `${goal.color || '#3B82F6'}20`, color: goal.color || '#3B82F6' }}>
                <Icon className="w-6 h-6" />
              </div>
              <div className="flex-1 min-w-0 mt-1">
                <Dialog.Title className="text-lg font-bold truncate leading-none text-foreground">{goal.title}</Dialog.Title>
                <Dialog.Description className="text-sm text-muted-foreground truncate mt-1.5">
                  {goal.description || 'No description'}
                </Dialog.Description>
              </div>
              <Badge variant={isComplete ? 'success' : isPaused ? 'secondary' : feasibilityData?.status === 'on_track' ? 'success' : feasibilityData?.status === 'funding_gap' ? 'warning' : 'default'} className="mt-1">
                {isComplete ? 'Completed' : isPaused ? 'Paused' : feasibilityData?.status === 'on_track' ? 'On Track' : 'Funding Gap'}
              </Badge>
              <Dialog.Close asChild>
                <CustomButton variant="ghost" size="icon" className="w-8 h-8 rounded-full ml-2 shrink-0">
                  <X className="w-4 h-4" />
                </CustomButton>
              </Dialog.Close>
            </div>
            {mainContent}
            {actionContent}
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    );
  }

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="max-h-[90vh]">
        <DrawerHeader className="border-b border-border text-left">
          <div className="flex items-start gap-3">
            <div className="p-3 rounded-xl shrink-0" style={{ backgroundColor: `${goal.color || '#3B82F6'}20`, color: goal.color || '#3B82F6' }}>
              <Icon className="w-6 h-6" />
            </div>
            <div className="flex-1 min-w-0">
              <DrawerTitle className="truncate">{goal.title}</DrawerTitle>
              <DrawerDescription className="truncate">{goal.description || 'No description'}</DrawerDescription>
            </div>
            <Badge variant={isComplete ? 'success' : isPaused ? 'secondary' : feasibilityData?.status === 'on_track' ? 'success' : feasibilityData?.status === 'funding_gap' ? 'warning' : 'default'}>
              {isComplete ? 'Completed' : isPaused ? 'Paused' : feasibilityData?.status === 'on_track' ? 'On Track' : 'Funding Gap'}
            </Badge>
          </div>
        </DrawerHeader>
        {mainContent}
        {actionContent}
      </DrawerContent>
    </Drawer>
  );
};