import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { CustomButton } from '@/components/ui/CustomButton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AmountInput } from '@/components/ui/AmountInput';
// import DatePicker from '@/components/ui/DatePicker';
import DatePickerV2 from "@/components/ui/DatePickerV2";
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useSettings } from '../utils/SettingsContext';
import { formatDateString, addDays, normalizeToMidnight } from '../utils/dateUtils';
import { TrendingUp, DollarSign, Percent, Zap } from 'lucide-react';

const FREQUENCY_OPTIONS = [
  { value: 'monthly', label: 'Monthly' },
  { value: 'biweekly', label: 'Bi-weekly' },
  { value: 'weekly', label: 'Weekly' }
];

const FUNDING_TYPE_OPTIONS = [
  { value: 'fixed', label: 'Fixed Amount', icon: DollarSign },
  { value: 'percentage', label: '% of Income', icon: Percent }
];

/**
 * GoalForm Component
 * Handles creation and editing of financial goals with flexible funding strategies.
 * @param {Object} props
 * @param {Object} [props.goal] - Existing goal data for edit mode.
 * @param {Function} props.onSubmit - Callback function for form submission.
 * @param {Function} props.onCancel - Callback function for cancellation.
 */
export const GoalForm = ({ goal, onSubmit, onCancel }) => {
  const { settings } = useSettings();
  const baseCurrency = settings?.baseCurrency || 'EUR';
  const [fundingType, setFundingType] = useState(goal?.funding_rule?.type || 'fixed');
  const [enableStrategy, setEnableStrategy] = useState(!!goal?.funding_rule);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isSubmitting }
  } = useForm({
    defaultValues: {
      title: goal?.title || '',
      description: goal?.description || '',
      target_amount: goal?.target_amount || '',
      deadline: goal?.deadline || formatDateString(addDays(normalizeToMidnight(new Date()), 180)),
      funding_frequency: goal?.funding_rule?.frequency || 'monthly',
      funding_amount: goal?.funding_rule?.amount || '',
      funding_percentage: goal?.funding_rule?.percentage || '',
      icon: goal?.icon || 'Target',
      color: goal?.color || '#3B82F6'
    }
  });

  const deadline = watch('deadline');

  const handleFormSubmit = (data) => {
    const goalData = {
      title: data.title,
      description: data.description,
      target_amount: parseFloat(data.target_amount),
      deadline: data.deadline,
      icon: data.icon,
      color: data.color,
      funding_rule: enableStrategy ? {
        type: fundingType,
        frequency: data.funding_frequency,
        ...(fundingType === 'fixed'
          ? { amount: parseFloat(data.funding_amount) }
          : { percentage: parseFloat(data.funding_percentage) })
      } : null
    };

    onSubmit(goalData);
  };

  return (
    <form onSubmit={handleSubmit(handleFormSubmit)} className="flex flex-col h-full overflow-hidden">
      <div className="flex-1 overflow-y-auto space-y-4 py-2 pr-1">
        {/* Title */}
        <div className="space-y-2">
          <Label htmlFor="title">Goal Title *</Label>
          <Input
            id="title"
            placeholder="e.g., Emergency Fund, Vacation, New Car"
            {...register('title', { required: 'Title is required' })}
          />
          {errors.title && (
            <p className="text-xs text-destructive">{errors.title.message}</p>
          )}
        </div>

        {/* Description */}
        <div className="space-y-2">
          <Label htmlFor="description">Description</Label>
          <Textarea
            id="description"
            placeholder="Optional: Add notes about this goal..."
            rows={2}
            {...register('description')}
          />
        </div>

        {/* Target Amount */}
        <div className="space-y-2">
          <Label htmlFor="target_amount">Target Amount *</Label>
          <AmountInput
            value={watch('target_amount')}
            onChange={(value) => setValue('target_amount', value)}
            placeholder="0.00"
            currency={baseCurrency}
          />
          {errors.target_amount && (
            <p className="text-xs text-destructive">{errors.target_amount.message}</p>
          )}
        </div>

        {/* Deadline */}
        <div className="space-y-2">
          <Label>Deadline *</Label>
          <DatePickerV2
            value={deadline}
            onChange={(date) => setValue('deadline', date)}
          />
          {errors.deadline && (
            <p className="text-xs text-destructive">{errors.deadline.message}</p>
          )}
        </div>

        {/* Progressive Disclosure: Funding Strategy */}
        <div className="pt-4 border-t border-border space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label className="text-sm font-medium flex items-center gap-2">
                <Zap className="w-4 h-4 text-amber-500" />
                Automate Funding
              </Label>
              <p className="text-xs text-muted-foreground">Set a recurring contribution rule</p>
            </div>
            <Switch
              checked={enableStrategy}
              onCheckedChange={setEnableStrategy}
            />
          </div>

          {enableStrategy && (
            <div className="space-y-4 animate-in fade-in slide-in-from-top-2 duration-200">
              {/* Funding Type Toggle */}
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground uppercase tracking-wider">Strategy: Fixed vs Proportional</Label>
                <Tabs value={fundingType} onValueChange={setFundingType} className="w-full">
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="fixed" className="gap-2">
                      <DollarSign className="w-4 h-4" />
                    </TabsTrigger>
                    <TabsTrigger value="percentage" className="gap-2">
                      <Percent className="w-4 h-4" />
                    </TabsTrigger>
                  </TabsList>
                </Tabs>
              </div>

              {/* Consolidated Row: Amount + Frequency */}
              <div className="grid grid-cols-[1fr_120px] gap-3">
                <div className="space-y-2">
                  <Label className="text-xs">{fundingType === 'fixed' ? 'Amount' : 'Percent'}</Label>
                  {fundingType === 'fixed' ? (
                    <AmountInput
                      value={watch('funding_amount')}
                      onChange={(value) => setValue('funding_amount', value)}
                      placeholder="0.00"
                      currency={baseCurrency}
                    />
                  ) : (
                    <AmountInput
                      value={watch('funding_percentage')}
                      onChange={(value) => setValue('funding_percentage', value)}
                      placeholder="0"
                      hideSymbol={true}
                      className="pr-8"
                    />
                  )}
                  {fundingType === 'percentage' && (
                    <div className="absolute right-3 top-[34px] pointer-events-none">
                      <Percent className="w-3.5 h-3.5 text-muted-foreground" />
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <Label className="text-xs">Frequency</Label>
                  <Select
                    value={watch('funding_frequency')}
                    onValueChange={(value) => setValue('funding_frequency', value)}
                  >
                    <SelectTrigger className="text-sm bg-background">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent position="popper" className="z-[300]">
                      {FREQUENCY_OPTIONS.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-3 pt-4 border-t border-border bg-background mt-auto pb-6">
        <CustomButton
          type="button"
          variant="outline"
          onClick={onCancel}
          className="flex-1"
        >
          Cancel
        </CustomButton>
        <CustomButton
          type="submit"
          variant="create"
          disabled={isSubmitting}
          className="flex-1"
        >
          {goal ? 'Update Goal' : 'Create Goal'}
        </CustomButton>
      </div>
    </form>
  );
};