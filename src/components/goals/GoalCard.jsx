import React from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { getCategoryIcon } from '../utils/iconMapConfig';
import { calculateGoalProgress } from '../utils/goalCalculations';
import { useSettings } from '../utils/SettingsContext';
import { format, parseISO } from 'date-fns';
import { Calendar, TrendingUp, AlertCircle, CheckCircle2 } from 'lucide-react';

/**
 * GoalCard - Compact visual representation of a goal
 * Used in the goal carousel/grid
 */
export const GoalCard = ({ goal, onClick, feasibilityData }) => {
  const { settings } = useSettings();
  const formatCurrency = (value) => new Intl.NumberFormat(undefined, { 
    style: 'currency', 
    currency: settings?.baseCurrency || 'USD' 
  }).format(value);
  const Icon = getCategoryIcon(goal.icon);

  const progress = calculateGoalProgress(goal.virtual_balance || 0, goal.target_amount);
  const isComplete = goal.status === 'completed';
  const isPaused = goal.status === 'paused';

  const getStatusConfig = () => {
    if (isComplete) {
      return {
        badge: { label: 'Completed', variant: 'success', icon: CheckCircle2 },
        color: 'hsl(var(--status-paid-text))'
      };
    }
    if (isPaused) {
      return {
        badge: { label: 'Paused', variant: 'secondary', icon: null },
        color: 'hsl(var(--muted-foreground))'
      };
    }
    if (feasibilityData?.status === 'on_track') {
      return {
        badge: { label: 'On Track', variant: 'success', icon: TrendingUp },
        color: 'hsl(var(--status-paid-text))'
      };
    }
    if (feasibilityData?.status === 'funding_gap') {
      return {
        badge: { label: 'Funding Gap', variant: 'warning', icon: AlertCircle },
        color: 'hsl(var(--stat-expense-text))'
      };
    }
    return {
      badge: { label: 'Active', variant: 'default', icon: null },
      color: goal.color || '#3B82F6'
    };
  };

  const statusConfig = getStatusConfig();
  const StatusIcon = statusConfig.badge.icon;

  return (
    <motion.div
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      transition={{ type: 'spring', stiffness: 300, damping: 20 }}
    >
      <Card
        className="cursor-pointer hover:shadow-lg transition-shadow relative overflow-hidden"
        onClick={onClick}
        style={{
          borderLeft: `4px solid ${statusConfig.color}`
        }}
      >
        <CardContent className="p-4 space-y-3">
          {/* Header */}
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <div
                className="p-2 rounded-lg shrink-0"
                style={{
                  backgroundColor: `${goal.color || '#3B82F6'}20`,
                  color: goal.color || '#3B82F6'
                }}
              >
                <Icon className="w-5 h-5" />
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="font-semibold text-foreground truncate">{goal.title}</h3>
                <p className="text-xs text-muted-foreground truncate">{goal.description || 'No description'}</p>
              </div>
            </div>
            <Badge
              variant={statusConfig.badge.variant}
              className="shrink-0 gap-1 text-xs"
            >
              {StatusIcon && <StatusIcon className="w-3 h-3" />}
              {statusConfig.badge.label}
            </Badge>
          </div>

          {/* Progress */}
          <div className="space-y-1.5">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Progress</span>
              <span className="font-medium text-foreground">{progress.toFixed(0)}%</span>
            </div>
            <Progress value={progress} className="h-2" />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>{formatCurrency(goal.virtual_balance || 0)}</span>
              <span>{formatCurrency(goal.target_amount)}</span>
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between text-xs pt-1 border-t border-border">
            <div className="flex items-center gap-1 text-muted-foreground">
              <Calendar className="w-3 h-3" />
              <span>{format(parseISO(goal.deadline), 'MMM dd, yyyy')}</span>
            </div>
            {goal.ledger_history && goal.ledger_history.length > 0 && (
              <span className="text-muted-foreground">
                {goal.ledger_history.length} deposits
              </span>
            )}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
};