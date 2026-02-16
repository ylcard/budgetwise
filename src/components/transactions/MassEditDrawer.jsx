import React from 'react';
import { Drawer } from 'vaul';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Tag, Calendar, Bank } from 'lucide-react';

const massEditSchema = z.object({
  categoryId: z.string().optional(),
  date: z.string().optional(),
  accountId: z.string().optional(),
});

export const MassEditDrawer = ({ selectedCount, onSave, onClose }) => {
  const { register, handleSubmit, formState: { isDirty } } = useForm({
    resolver: zodResolver(massEditSchema),
  });

  const onSubmit = (data) => {
    // Filter out undefined/empty fields so we only update what's changed
    const updates = Object.fromEntries(
      Object.entries(data).filter(([_, value]) => value !== undefined && value !== "")
    );
    onSave(updates);
  };

  return (
    <Drawer.Root open={selectedCount > 0} onClose={onClose}>
      <Drawer.Portal>
        <Drawer.Overlay className="fixed inset-0 bg-black/40" />
        <Drawer.Content className="bg-zinc-100 flex flex-col rounded-t-[10px] h-[50%] mt-24 fixed bottom-0 left-0 right-0 p-4">
          <div className="mx-auto w-12 h-1.5 flex-shrink-0 rounded-full bg-zinc-300 mb-8" />
          <div className="max-w-md mx-auto w-full">
            <Drawer.Title className="font-medium mb-2 text-zinc-900">
              Edit {selectedCount} Transactions
            </Drawer.Title>
            <p className="text-zinc-500 text-sm mb-6">
              Only fields you modify will be updated across all selected items.
            </p>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div className="flex flex-col gap-2">
                <label className="text-xs font-semibold uppercase text-zinc-400 flex items-center gap-2">
                  <Tag size={14} /> New Category
                </label>
                <select {...register('categoryId')} className="w-full p-3 rounded-lg border bg-white">
                  <option value="">Keep original</option>
                  <option value="food">Food & Dining</option>
                  <option value="transport">Transport</option>
                </select>
              </div>

              <div className="flex flex-col gap-2">
                <label className="text-xs font-semibold uppercase text-zinc-400 flex items-center gap-2">
                  <Calendar size={14} /> New Date
                </label>
                <input type="date" {...register('date')} className="w-full p-3 rounded-lg border bg-white" />
              </div>

              <Button 
                type="submit" 
                className="w-full mt-6"
                disabled={!isDirty}
              >
                Update Selected
              </Button>
            </form>
          </div>
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  );
};
