import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useIsMobile } from '@/hooks/use-mobile';
import { motion, AnimatePresence } from "framer-motion";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerFooter, DrawerClose, DrawerTrigger } from "@/components/ui/drawer";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from '@/components/ui/input';
import { Tag, Calendar, Wallet, CheckCircle2, Shield, Plus, X, Trash2, Search, Check, ChevronsUpDown } from 'lucide-react';
import { getCategoryIcon } from '@/components/utils/iconMapConfig';
import { cn } from '@/lib/utils';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { getBudgetDisplayName } from '../utils/generalUtils';

const MobileBudgetFormSelect = ({ value, options, onSelect, placeholder, searchTerm, onSearchChange }) => {
    const selectedBudget = options.find(b => b.id === value);
    const label = value === 'none' ? 'Remove from Budget' : (selectedBudget ? getBudgetDisplayName(selectedBudget) : placeholder);

    return (
        <Drawer>
            <DrawerTrigger asChild>
                <Button
                    variant="outline"
                    className="w-full justify-between h-10 px-3 font-normal text-sm bg-background"
                >
                    <span className={cn("truncate", (!selectedBudget && value !== 'none') && "text-muted-foreground")}>
                        {label}
                    </span>
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
            </DrawerTrigger>
            <DrawerContent className="z-[200] flex flex-col max-h-[85dvh]">
                <DrawerHeader>
                    <DrawerTitle>Select Budget</DrawerTitle>
                </DrawerHeader>
                <div className="px-4 pb-2">
                    <div className="relative">
                        <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Search budgets..."
                            className="pl-9 h-10 bg-muted/30"
                            value={searchTerm}
                            onChange={(e) => onSearchChange(e.target.value)}
                        />
                    </div>
                </div>
                <div className="p-4 space-y-1 overflow-y-auto flex-1 pb-[calc(2rem+env(safe-area-inset-bottom))]">
                    <DrawerClose asChild>
                        <button
                            onClick={() => onSelect('none')}
                            className={cn(
                                "w-full flex items-center justify-between px-4 py-3.5 rounded-xl text-sm font-medium transition-colors",
                                value === 'none' ? "bg-red-50 text-red-600" : "active:bg-gray-100 text-muted-foreground"
                            )}
                        >
                            <div className="flex items-center text-left">
                                <X className="w-4 h-4 mr-3" />
                                <div className="font-medium">Remove from Budget</div>
                            </div>
                            {value === 'none' && <Check className="w-5 h-5" />}
                        </button>
                    </DrawerClose>
                    {options.length === 0 ? (
                        <div className="py-6 text-center text-sm text-muted-foreground">No budgets found.</div>
                    ) : (
                        options.map((budget) => {
                            const isSelected = value === budget.id;
                            return (
                                <DrawerClose key={budget.id} asChild>
                                    <button
                                        onClick={() => onSelect(budget.id)}
                                        className={cn(
                                            "w-full flex items-center justify-between px-4 py-3.5 rounded-xl text-sm font-medium transition-colors",
                                            isSelected ? "bg-blue-50 text-blue-600" : "active:bg-gray-100"
                                        )}
                                    >
                                        <div className="flex items-center text-left">
                                            <span className={cn(
                                                "w-2.5 h-2.5 rounded-full mr-3 shrink-0",
                                                budget.status === 'active' ? 'bg-green-500' : 'bg-gray-300'
                                            )} />
                                            <div className="font-medium">{getBudgetDisplayName(budget)}</div>
                                        </div>
                                        {isSelected && <Check className="w-5 h-5" />}
                                    </button>
                                </DrawerClose>
                            );
                        })
                    )}
                </div>
            </DrawerContent>
        </Drawer>
    );
};

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
    const [isBudgetOpen, setIsBudgetOpen] = useState(false);
    const [budgetSearchTerm, setBudgetSearchTerm] = useState("");

    const { register, handleSubmit, setValue, watch, reset, unregister, formState: { isSubmitting } } = useForm();
    const currentBudgetId = watch('budgetId');

    const visibleBudgets = React.useMemo(() => {
        let filtered = customBudgets;
        if (budgetSearchTerm) {
            filtered = filtered.filter(b => b.name.toLowerCase().includes(budgetSearchTerm.toLowerCase()));
        }
        return [...filtered].sort((a, b) => {
            const dateA = new Date(a.startDate || 0).getTime();
            const dateB = new Date(b.startDate || 0).getTime();
            return dateB - dateA;
        });
    }, [customBudgets, budgetSearchTerm]);

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
    const renderMassEditForm = () => (
        <form id="mass-edit-form" onSubmit={handleSubmit(onSubmit)} className="space-y-6">

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
                                    <div className="w-full">
                                        {/* Desktop Budget Select */}
                                        <div className="hidden md:block">
                                            <Popover open={isBudgetOpen} onOpenChange={setIsBudgetOpen} modal={true}>
                                                <PopoverTrigger asChild>
                                                    <Button
                                                        variant="outline"
                                                        role="combobox"
                                                        aria-expanded={isBudgetOpen}
                                                        className="w-full justify-between font-normal h-10 text-sm bg-background"
                                                    >
                                                        {currentBudgetId === 'none'
                                                            ? 'Remove from Budget'
                                                            : (currentBudgetId
                                                                ? getBudgetDisplayName(customBudgets.find((b) => b.id === currentBudgetId))
                                                                : "Select budget...")}
                                                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                                    </Button>
                                                </PopoverTrigger>
                                                <PopoverContent className="w-[300px] p-0" align="start">
                                                    <Command shouldFilter={false} className="h-auto overflow-hidden">
                                                        <CommandInput
                                                            placeholder="Search budgets..."
                                                            onValueChange={setBudgetSearchTerm}
                                                        />
                                                        <CommandList>
                                                            <CommandEmpty>No relevant budget found.</CommandEmpty>
                                                            <CommandGroup heading={budgetSearchTerm ? "Search Results" : undefined}>
                                                                <CommandItem
                                                                    value="none"
                                                                    onSelect={() => {
                                                                        setValue('budgetId', 'none');
                                                                        setIsBudgetOpen(false);
                                                                    }}
                                                                    className="text-muted-foreground"
                                                                >
                                                                    <Check className={`mr-2 h-4 w-4 ${currentBudgetId === 'none' ? "opacity-100" : "opacity-0"}`} />
                                                                    <X className="w-4 h-4 mr-2" />
                                                                    Remove from Budget
                                                                </CommandItem>
                                                                {visibleBudgets.map((budget) => (
                                                                    <CommandItem
                                                                        key={budget.id}
                                                                        value={budget.id}
                                                                        onSelect={() => {
                                                                            setValue('budgetId', budget.id);
                                                                            setIsBudgetOpen(false);
                                                                        }}
                                                                    >
                                                                        <Check
                                                                            className={`mr-2 h-4 w-4 ${currentBudgetId === budget.id ? "opacity-100" : "opacity-0"}`}
                                                                        />
                                                                        <div className="flex items-center text-sm">
                                                                            <span className={`w-2 h-2 rounded-full mr-2 ${budget.status === 'active' ? 'bg-green-500' : 'bg-gray-300'}`} />
                                                                            {getBudgetDisplayName(budget)}
                                                                        </div>
                                                                    </CommandItem>
                                                                ))}
                                                            </CommandGroup>
                                                        </CommandList>
                                                    </Command>
                                                </PopoverContent>
                                            </Popover>
                                        </div>

                                        {/* Mobile Budget Drawer */}
                                        <div className="md:hidden">
                                            <MobileBudgetFormSelect
                                                value={currentBudgetId}
                                                onSelect={(val) => setValue('budgetId', val)}
                                                options={visibleBudgets}
                                                placeholder="Select budget..."
                                                searchTerm={budgetSearchTerm}
                                                onSearchChange={setBudgetSearchTerm}
                                            />
                                        </div>
                                    </div>
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
                        {renderMassEditForm()}
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
                    {renderMassEditForm()}
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