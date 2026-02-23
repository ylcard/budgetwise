import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { CustomButton } from '@/components/ui/CustomButton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AmountInput } from '@/components/ui/AmountInput';
import DatePicker from '@/components/ui/DatePicker';
import { useSettings } from '../utils/SettingsContext';
import { addMonths } from 'date-fns';
import { Target, Calendar, TrendingUp, DollarSign, Percent } from 'lucide-react';

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
 * GoalForm - Form for creating/editing goals
 */
export const GoalForm = ({ goal, onSubmit, onCancel }) => {
  const { baseCurrency, currencySymbol } = useSettings();
  const [fundingType, setFundingType] = useState(goal?.funding_rule?.type || 'fixed');

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
      deadline: goal?.deadline || addMonths(new Date(), 6).toISOString().split('T')[0],
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
      funding_rule: {
        type: fundingType,
        frequency: data.funding_frequency,
        ...(fundingType === 'fixed'
          ? { amount: parseFloat(data.funding_amount) }
          : { percentage: parseFloat(data.funding_percentage) })
      }
    };

    onSubmit(goalData);
  };

  return (
    <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4">
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
        <DatePicker
          value={deadline}
          onChange={(date) => setValue('deadline', date)}
        />
        {errors.deadline && (
          <p className="text-xs text-destructive">{errors.deadline.message}</p>
        )}
      </div>

      {/* Funding Rule Header */}
      <div className="pt-4 border-t border-border">
        <h4 className="text-sm font-medium text-foreground mb-3 flex items-center gap-2">
          <TrendingUp className="w-4 h-4" />
          Funding Strategy
        </h4>
      </div>

      {/* Funding Type */}
      <div className="space-y-2">
        <Label>Contribution Type</Label>
        <div className="grid grid-cols-2 gap-2">
          {FUNDING_TYPE_OPTIONS.map((option) => {
            const Icon = option.icon;
            return (
              <CustomButton
                key={option.value}
                type="button"
                variant={fundingType === option.value ? 'default' : 'outline'}
                onClick={() => setFundingType(option.value)}
                className="justify-start gap-2"
              >
                <Icon className="w-4 h-4" />
                {option.label}
              </CustomButton>
            );
          })}
        </div>
      </div>

      {/* Funding Amount/Percentage */}
      <div className="space-y-2">
        <Label htmlFor={fundingType === 'fixed' ? 'funding_amount' : 'funding_percentage'}>
          {fundingType === 'fixed' ? 'Contribution Amount' : 'Contribution Percentage'}
        </Label>
        {fundingType === 'fixed' ? (
          <AmountInput
            value={watch('funding_amount')}
            onChange={(value) => setValue('funding_amount', value)}
            placeholder="0.00"
            currency={baseCurrency}
          />
        ) : (
          <div className="relative">
            <Input
              id="funding_percentage"
              type="number"
              step="0.1"
              min="0"
              max="100"
              placeholder="5"
              {...register('funding_percentage', {
                min: { value: 0, message: 'Must be at least 0' },
                max: { value: 100, message: 'Cannot exceed 100%' }
              })}
            />
            <Percent className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
          </div>
        )}
        {errors.funding_amount && (
          <p className="text-xs text-destructive">{errors.funding_amount.message}</p>
        )}
        {errors.funding_percentage && (
          <p className="text-xs text-destructive">{errors.funding_percentage.message}</p>
        )}
      </div>

      {/* Frequency */}
      <div className="space-y-2">
        <Label htmlFor="funding_frequency">Contribution Frequency</Label>
        <Select
          value={watch('funding_frequency')}
          onValueChange={(value) => setValue('funding_frequency', value)}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {FREQUENCY_OPTIONS.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Actions */}
      <div className="flex gap-3 pt-4">
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