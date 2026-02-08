import React, { useState } from 'react';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerTrigger } from '@/components/ui/drawer';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Check, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * CREATED: 03-Feb-2026
 * MobileDrawerSelect - iOS-style action sheet for mobile select dropdowns
 * Usage: Wrap around Select components on mobile to provide native-like experience
 */

export function MobileDrawerSelect({
    open,
    onOpenChange,
    value,
    onValueChange,
    options = [],
    placeholder = 'Select an option',
    className,
    title,
    customTrigger // Renamed from trigger for clarity in our Atomic design
}) {

    // Support uncontrolled state so each row doesn't need its own 'open' state
    const [internalOpen, setInternalOpen] = useState(false);

    const isControlled = open !== undefined;
    const finalOpen = isControlled ? open : internalOpen;
    const finalOnOpenChange = isControlled ? onOpenChange : setInternalOpen;

    // Find the label for the currently selected value
    const selectedOption = options.find(opt => opt.value === value);
    const displayLabel = selectedOption ? selectedOption.label : placeholder;

    // Common trigger styling to match Shadcn SelectTrigger
    const defaultTriggerClass = cn(
        "flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
        className
    );

    return (
        <>
            {/* DESKTOP VIEW: Standard Select */}
            <div className="hidden md:block w-full">
                <Select value={value} onValueChange={onValueChange}>
                    <SelectTrigger className={className}>
                        <SelectValue placeholder={placeholder} />
                    </SelectTrigger>
                    <SelectContent>
                        {options.map((option) => (
                            <SelectItem key={option.value} value={option.value}>
                                {option.label}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>

            {/* MOBILE VIEW: Drawer */}
            <div className="md:hidden w-full">
                <Drawer open={finalOpen} onOpenChange={finalOnOpenChange}>
                    <DrawerTrigger asChild>
                        {customTrigger ? customTrigger : (
                            <button className={defaultTriggerClass}>
                                <span className="truncate">{displayLabel}</span>
                                <ChevronDown className="h-4 w-4 opacity-50" />
                            </button>
                        )}
                    </DrawerTrigger>
                    <DrawerContent className="max-h-[70vh] z-[60] outline-none" style={{ marginBottom: 'var(--nav-total-height)' }}>
                        <DrawerHeader>
                            <DrawerTitle>{title || placeholder}</DrawerTitle>
                        </DrawerHeader>
                        <div className="overflow-y-auto pb-8 pt-2">
                            <div className="space-y-1 px-4">
                                {options.map((option) => (
                                    <button
                                        key={option.value}
                                        onClick={() => {
                                            onValueChange(option.value);
                                            // Close drawer automatically on selection
                                            finalOnOpenChange(false);
                                        }}
                                        className={cn(
                                            'w-full flex items-center justify-between px-4 py-3 rounded-lg transition-colors text-left text-sm',
                                            value === option.value
                                                ? 'bg-blue-50 text-blue-600 font-semibold'
                                                : 'hover:bg-gray-100 text-gray-900'
                                        )}
                                    >
                                        <span>{option.label}</span>
                                        {value === option.value && (
                                            <Check className="w-5 h-5" />
                                        )}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </DrawerContent>
                </Drawer>
            </div>
        </>
    );
}