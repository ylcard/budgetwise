import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useIsMobile } from '@/hooks/use-mobile';
import { motion, AnimatePresence } from "framer-motion";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerFooter, DrawerClose } from "@/components/ui/drawer";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from '@/components/ui/input';
import { Tag, Calendar, Wallet, CheckCircle2, Shield, Plus, X, Trash2 } from 'lucide-react';
import { getCategoryIcon } from '@/components/utils/iconMapConfig';
import { cn } from '@/lib/utils';

export function MassEditDrawer({
    open,
    onOpenChange,
    selectedCount,
    onSave,
    categories,
    customBudgets
}) {
    const isMobile = useIsMobile();
    const [activeFields, setActiveFields] = useState([]);

    const { register, handleSubmit, setValue, reset, unregister, formState: { isSubmitting } } = useForm();

    // Configuration for available fields
    const availableFields = [
        { id: 'categoryId', label: 'Category', icon: Tag },
        { id: 'date', label: 'Date', icon: Calendar },
        { id: 'financial_priority', label: 'Priority', icon: Shield },
        { id: 'isPaid', label: 'Payment Status', icon: CheckCircle2 },
        { id: 'budgetId', label: 'Budget', icon: Wallet },
    ];

    const handleAddField = (fieldId) => {
        if (!activeFields.includes(fieldId)) {
            setActiveFields([...activeFields, fieldId]);
        }
    };

    const handleRemoveField = (fieldId) => {
        setActiveFields(activeFields.filter(id => id !== fieldId));
        unregister(fieldId); // Remove from form data completely
        if (fieldId === 'isPaid') unregister('paidDate'); // Cleanup related field
    };

    const onSubmit = (data) => {
        const updates = {};

        // Only process fields that are currently active
        if (activeFields.includes('categoryId')) updates.category_id = data.categoryId;
        if (activeFields.includes('date')) updates.date = data.date;
        if (activeFields.includes('budgetId')) updates.budgetId = data.budgetId === "none" ? null : data.budgetId;
        if (activeFields.includes('financial_priority')) updates.financial_priority = data.financial_priority;

        if (activeFields.includes('isPaid')) {
            updates.isPaid = data.isPaid === "true";
            if (updates.isPaid) {
                updates.paidDate = new Date().toISOString().split('T')[0];
            }
        }

        if (Object.keys(updates).length > 0) {
            onSave(updates);
            reset();
            setActiveFields([]);
        } else {
            onOpenChange(false);
        }
    };

    // Shared Form Content
    const MassEditForm = ({ className }) => (
        <form id="mass-edit-form" onSubmit={handleSubmit(onSubmit)} className={cn("space-y-6", className)}>

            {/* 1. Field Selector - Only show buttons for inactive fields */}
            <div className="flex flex-wrap gap-2">
                {availableFields.filter(f => !activeFields.includes(f.id)).map(field => (
                    <Button
                        key={field.id}
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => handleAddField(field.id)}
                        className="h-9 border-dashed border-zinc-300 text-muted-foreground hover:text-primary hover:border-primary hover:bg-primary/5 transition-all"
                    >
                        <Plus className="w-3.5 h-3.5 mr-1.5" />
                        {field.label}
                    </Button>
                ))}
            </div>

            {/* 2. Active Fields List with Animation */}
            <div className="space-y-3">
                <AnimatePresence mode="popLayout">
                    {activeFields.length === 0 && (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className="text-center py-8 text-sm text-muted-foreground/60 border-2 border-dashed rounded-xl"
                        >
                            Select a property above to edit it
                        </motion.div>
                    )}

                    {activeFields.map((fieldId) => {
                        const fieldConfig = availableFields.find(f => f.id === fieldId);
                        const Icon = fieldConfig.icon;

                        return (
                            <motion.div
                                key={fieldId}
                                layout
                                initial={{ opacity: 0, y: 10, scale: 0.98 }}
                                animate={{ opacity: 1, y: 0, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.95, transition: { duration: 0.2 } }}
                                className="relative bg-muted/40 border rounded-xl p-3 md:p-4 group"
                            >
                                <div className="flex items-center justify-between mb-2">
                                    <Label className="flex items-center gap-2 text-foreground font-medium">
                                        <div className="p-1.5 bg-background rounded-md shadow-sm">
                                            <Icon className="w-3.5 h-3.5 text-primary" />
                                        </div>
                                        {fieldConfig.label}
                                    </Label>
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="icon"
                                        onClick={() => handleRemoveField(fieldId)}
                                        className="h-6 w-6 text-muted-foreground hover:text-destructive hover:bg-destructive/10 -mr-1"
                                    >
                                        <X className="w-3.5 h-3.5" />
                                    </Button>
                                </div>

                                {/* Render Specific Input Based on ID */}
                                {fieldId === 'categoryId' && (
                                    <Select onValueChange={(val) => setValue('categoryId', val)} defaultValue="">
                                        <SelectTrigger className="bg-background">
                                            <SelectValue placeholder="Select Category" />
                                        </SelectTrigger>
                                        <SelectContent className="max-h-[200px]">
                                            {categories.map(cat => {
                                                const CatIcon = getCategoryIcon(cat.icon);
                                                return (
                                                    <SelectItem key={cat.id} value={cat.id}>
                                                        <div className="flex items-center gap-2">
                                                            <CatIcon className="w-4 h-4" style={{ color: cat.color }} />
                                                            {cat.name}
                                                        </div>
                                                    </SelectItem>
                                                );
                                            })}
                                        </SelectContent>
                                    </Select>
                                )}

                                {fieldId === 'date' && (
                                    <Input
                                        type="date"
                                        {...register('date')}
                                        className="bg-background block w-full"
                                    />
                                )}

                                {fieldId === 'financial_priority' && (
                                    <Select onValueChange={(val) => setValue('financial_priority', val)}>
                                        <SelectTrigger className="bg-background">
                                            <SelectValue placeholder="Select Priority" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="needs">Needs (Essential)</SelectItem>
                                            <SelectItem value="wants">Wants (Lifestyle)</SelectItem>
                                        </SelectContent>
                                    </Select>
                                )}

                                {fieldId === 'isPaid' && (
                                    <Select onValueChange={(val) => setValue('isPaid', val)}>
                                        <SelectTrigger className="bg-background">
                                            <SelectValue placeholder="Select Status" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="true">Mark as Paid</SelectItem>
                                            <SelectItem value="false">Mark as Unpaid</SelectItem>
                                        </SelectContent>
                                    </Select>
                                )}

                                {fieldId === 'budgetId' && (
                                    <Select onValueChange={(val) => setValue('budgetId', val)}>
                                        <SelectTrigger className="bg-background">
                                            <SelectValue placeholder="Select Budget" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="none">Remove from Budget</SelectItem>
                                            {customBudgets.map(b => (
                                                <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                )}
                            </motion.div>
                        );
                    })}
                </AnimatePresence>
            </div>
        </form>
    );

    // Desktop: Dialog
    if (!isMobile) {
        return (
            <Dialog open={open} onOpenChange={onOpenChange}>
                <DialogContent className="sm:max-w-[425px]">
                    <DialogHeader>
                        <DialogTitle>Edit {selectedCount} Transactions</DialogTitle>
                    </DialogHeader>

                    <div className="py-2">
                        <MassEditForm />
                    </div>

                    <DialogFooter>
                        <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
                        <Button
                            type="submit"
                            form="mass-edit-form"
                            disabled={isSubmitting || activeFields.length === 0}
                        >
                            {isSubmitting ? "Updating..." : "Apply Changes"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        );
    }

    // Mobile: Drawer
    return (
        <Drawer open={open} onOpenChange={onOpenChange}>
            <DrawerContent className="max-h-[90vh]">
                <DrawerHeader className="text-left">
                    <DrawerTitle>Edit {selectedCount} Transactions</DrawerTitle>
                </DrawerHeader>

                <div className="p-4 overflow-y-auto">
                    <MassEditForm />
                </div>

                <DrawerFooter>
                    <Button
                        type="submit"
                        form="mass-edit-form"
                        disabled={isSubmitting || activeFields.length === 0}
                    >
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