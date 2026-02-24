import React, { useState } from 'react';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerDescription } from '@/components/ui/drawer';
import { CustomButton } from '@/components/ui/CustomButton';
import { AmountInput } from '@/components/ui/AmountInput';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useSettings } from '../utils/SettingsContext';
import { calculatePlannedContribution } from '../utils/goalCalculations';
import { useMonthlyIncome } from '../hooks/useDerivedData';
import { PartyPopper, TrendingUp, X } from 'lucide-react';
import confetti from 'canvas-confetti';
import * as Dialog from '@radix-ui/react-dialog';
import { useIsMobile } from '@/hooks/use-mobile';

/**
 * GoalSettlementDrawer - Confirm mental deposit for goal cycle
 */
export const GoalSettlementDrawer = ({
  open,
  onOpenChange,
  goal,
  onConfirm,
  transactions,
  selectedMonth,
  selectedYear
}) => {
  const { settings } = useSettings();
  const baseCurrency = settings?.baseCurrency || 'USD';
  const formatCurrency = (value) => new Intl.NumberFormat(undefined, {
    style: 'currency',
    currency: baseCurrency
  }).format(value);
  const monthlyIncome = useMonthlyIncome(transactions, selectedMonth, selectedYear);

  const suggestedAmount = goal?.funding_rule
    ? calculatePlannedContribution(goal.funding_rule, monthlyIncome)
    : 0;

  const [amount, setAmount] = useState(suggestedAmount.toString());
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isMobile = useIsMobile();

  const handleConfirm = async () => {
    setIsSubmitting(true);
    try {
      const depositAmount = parseFloat(amount);
      await onConfirm({
        amount: depositAmount,
        notes,
        source: 'manual'
      });

      // Celebration if goal is complete
      const newBalance = (goal.virtual_balance || 0) + depositAmount;
      if (newBalance >= goal.target_amount) {
        confetti({
          particleCount: 100,
          spread: 70,
          origin: { y: 0.6 }
        });
      }

      onOpenChange(false);
      setAmount(suggestedAmount.toString());
      setNotes('');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!goal) return null;

  const willComplete = (goal.virtual_balance || 0) + parseFloat(amount || 0) >= goal.target_amount;

  const mainContent = (
    <div className="space-y-4 mt-4">
      {/* Current Progress */}
      <div className="p-3 rounded-lg bg-muted/30 border border-border">
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Current Balance</span>
          <span className="font-medium">{formatCurrency(goal.virtual_balance || 0)}</span>
        </div>
        <div className="flex justify-between text-sm mt-1">
          <span className="text-muted-foreground">Target</span>
          <span className="font-medium">{formatCurrency(goal.target_amount)}</span>
        </div>
      </div>

      {/* Deposit Amount */}
      <div className="space-y-2">
        <Label>Deposit Amount</Label>
        <AmountInput
          value={amount}
          onChange={setAmount}
          placeholder="0.00"
          currency={baseCurrency}
        />
        <p className="text-xs text-muted-foreground">
          Suggested: {formatCurrency(suggestedAmount)} (based on your funding rule)
        </p>
      </div>

      {/* Notes */}
      <div className="space-y-2">
        <Label>Notes (Optional)</Label>
        <Textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Add any notes about this deposit..."
          rows={2}
        />
      </div>

      {/* New Balance Preview */}
      {amount && parseFloat(amount) > 0 && (
        <div className="p-3 rounded-lg bg-primary/10 border border-primary/20">
          <div className="flex justify-between">
            <span className="text-sm font-medium">New Balance</span>
            <span className="text-sm font-semibold text-primary">
              {formatCurrency((goal.virtual_balance || 0) + parseFloat(amount))}
            </span>
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-3 pt-2">
        <CustomButton
          type="button"
          variant="outline"
          onClick={() => onOpenChange(false)}
          className="flex-1"
          disabled={isSubmitting}
        >
          Cancel
        </CustomButton>
        <CustomButton
          type="button"
          variant="success"
          onClick={handleConfirm}
          className="flex-1"
          disabled={!amount || parseFloat(amount) <= 0 || isSubmitting}
        >
          {isSubmitting ? 'Confirming...' : 'Confirm Deposit'}
        </CustomButton>
      </div>
    </div>
  );

  if (!isMobile) {
    return (
      <Dialog.Root open={open} onOpenChange={onOpenChange}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm" />
          <Dialog.Content className="fixed left-[50%] top-[50%] z-50 w-full max-w-md translate-x-[-50%] translate-y-[-50%] border border-border bg-background p-6 shadow-lg rounded-xl">
            <div className="flex items-start justify-between">
              <div>
                <Dialog.Title className="text-lg font-bold flex items-center gap-2">
                  {willComplete ? <PartyPopper className="w-5 h-5 text-primary" /> : <TrendingUp className="w-5 h-5" />}
                  Confirm Mental Deposit
                </Dialog.Title>
                <Dialog.Description className="text-sm text-muted-foreground mt-1">
                  {willComplete ? '🎉 This deposit will complete your goal!' : `Add your progress towards "${goal.title}"`}
                </Dialog.Description>
              </div>
            </div>
            {mainContent}
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    );
  }

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="px-4 pb-8">
        <DrawerHeader className="text-left">
          <DrawerTitle className="flex items-center gap-2">
            {willComplete ? <PartyPopper className="w-5 h-5 text-primary" /> : <TrendingUp className="w-5 h-5" />}
            Confirm Mental Deposit
          </DrawerTitle>
          <DrawerDescription>
            {willComplete ? '🎉 This deposit will complete your goal!' : `Add your progress towards "${goal.title}"`}
          </DrawerDescription>
        </DrawerHeader>
        {mainContent}
      </DrawerContent>
    </Drawer>
  );
};