import React from 'react';
import { useForm } from 'react-hook-form';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerFooter, DrawerClose } from "@/components/ui/drawer";
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from '@/components/ui/input';
import { Tag, Calendar, Wallet, CheckCircle2, Shield } from 'lucide-react';
import { getCategoryIcon } from '@/components/utils/iconMapConfig';

export function MassEditDrawer({
  open,
  onOpenChange,
  selectedCount,
  onSave,
  categories,
  customBudgets
}) {
  const { register, handleSubmit, setValue, reset, watch, formState: { isSubmitting } } = useForm();

  // Watch fields to show visual feedback or conditional rendering
  const watchedCategory = watch('categoryId');

  const onSubmit = (data) => {
    // 1. Filter out empty/undefined values
    const updates = {};

    if (data.categoryId && data.categoryId !== "no_change") updates.category_id = data.categoryId;
    if (data.date) updates.date = data.date;
    if (data.budgetId && data.budgetId !== "no_change") updates.budgetId = data.budgetId === "none" ? null : data.budgetId;
    if (data.financial_priority && data.financial_priority !== "no_change") updates.financial_priority = data.financial_priority;
    if (data.isPaid && data.isPaid !== "no_change") {
      updates.isPaid = data.isPaid === "true";
      // Auto-set paidDate if marking as paid and no date provided
      if (updates.isPaid && !updates.paidDate) {
        updates.paidDate = new Date().toISOString().split('T')[0];
      }
    }

    // Only proceed if we actually have updates
    if (Object.keys(updates).length > 0) {
      onSave(updates);
      // Reset form after successful save
      reset();
    } else {
      onOpenChange(false);
    }
  };

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="max-h-[90vh]">
        <DrawerHeader className="text-left">
          <DrawerTitle>Edit {selectedCount} Transactions</DrawerTitle>
          <p className="text-sm text-muted-foreground">
            Select properties to update. Fields left unchanged will remain as they are.
          </p>
        </DrawerHeader>

        <div className="p-4 space-y-6 overflow-y-auto pb-safe">
          <form id="mass-edit-form" onSubmit={handleSubmit(onSubmit)} className="space-y-4">

            {/* Category */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2 text-muted-foreground">
                <Tag className="w-4 h-4" /> Category
              </Label>
              <Select onValueChange={(val) => setValue('categoryId', val)}>
                <SelectTrigger>
                  <SelectValue placeholder="No Change" />
                </SelectTrigger>
                <SelectContent className="max-h-[200px]">
                  <SelectItem value="no_change">No Change</SelectItem>
                  {categories.map(cat => {
                    const Icon = getCategoryIcon(cat.icon);
                    return (
                      <SelectItem key={cat.id} value={cat.id}>
                        <div className="flex items-center gap-2">
                          <Icon className="w-4 h-4" style={{ color: cat.color }} />
                          {cat.name}
                        </div>
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>

            {/* Date */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2 text-muted-foreground">
                <Calendar className="w-4 h-4" /> Date
              </Label>
              <Input
                type="date"
                {...register('date')}
                className="block w-full"
              />
              <p className="text-[10px] text-muted-foreground text-right">Leave empty to keep original dates</p>
            </div>

            {/* Financial Priority */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2 text-muted-foreground">
                <Shield className="w-4 h-4" /> Financial Priority
              </Label>
              <Select onValueChange={(val) => setValue('financial_priority', val)}>
                <SelectTrigger>
                  <SelectValue placeholder="No Change" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="no_change">No Change</SelectItem>
                  <SelectItem value="needs">Needs (Essential)</SelectItem>
                  <SelectItem value="wants">Wants (Lifestyle)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Payment Status */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2 text-muted-foreground">
                <CheckCircle2 className="w-4 h-4" /> Payment Status
              </Label>
              <Select onValueChange={(val) => setValue('isPaid', val)}>
                <SelectTrigger>
                  <SelectValue placeholder="No Change" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="no_change">No Change</SelectItem>
                  <SelectItem value="true">Mark as Paid</SelectItem>
                  <SelectItem value="false">Mark as Unpaid</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Budget Assignment */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2 text-muted-foreground">
                <Wallet className="w-4 h-4" /> Assign to Budget
              </Label>
              <Select onValueChange={(val) => setValue('budgetId', val)}>
                <SelectTrigger>
                  <SelectValue placeholder="No Change" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="no_change">No Change</SelectItem>
                  <SelectItem value="none">Remove from Budget</SelectItem>
                  {customBudgets.map(b => (
                    <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </form>
        </div>

        <DrawerFooter>
          <Button type="submit" form="mass-edit-form" disabled={isSubmitting}>
            {isSubmitting ? "Updating..." : "Apply Changes"}
          </Button>
          <DrawerClose asChild>
            <Button variant="outline">Cancel</Button>
          </DrawerClose>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}