import React from 'react';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerTrigger } from '@/components/ui/drawer';
import { Check } from 'lucide-react';
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
    title,
    trigger
}) {
    const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;

    if (!isMobile) {
        // On desktop, render children as-is (regular Select behavior)
        return trigger;
    }

    const selectedOption = options.find(opt => opt.value === value);

    return (
        <Drawer open={open} onOpenChange={onOpenChange}>
            <DrawerTrigger asChild>
                {trigger}
            </DrawerTrigger>
            <DrawerContent className="max-h-[60vh]">
                <DrawerHeader>
                    <DrawerTitle>{title || placeholder}</DrawerTitle>
                </DrawerHeader>
                <div className="overflow-y-auto pb-4">
                    <div className="space-y-1 px-4">
                        {options.map((option) => (
                            <button
                                key={option.value}
                                onClick={() => {
                                    onValueChange(option.value);
                                    onOpenChange(false);
                                }}
                                className={cn(
                                    'w-full flex items-center justify-between px-4 py-3 rounded-lg transition-colors',
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
    );
}