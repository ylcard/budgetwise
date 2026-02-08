import { useState, useMemo } from "react";
import { Check, Circle, ChevronDown } from "lucide-react";
import { CustomButton } from "@/components/ui/CustomButton";
import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
} from "@/components/ui/command";
import { X } from "lucide-react";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
import { iconMap } from "../utils/iconMapConfig";
import { FINANCIAL_PRIORITIES } from "../utils/constants";
import { Drawer, DrawerContent, DrawerTrigger } from "@/components/ui/drawer";
import { useIsMobile } from "@/hooks/use-mobile";

export default function CategorySelect({ value, onValueChange, categories, placeholder = "Select category", multiple = false }) {
    const [open, setOpen] = useState(false);
    const isMobile = useIsMobile();

    // SORTING LOGIC: Needs -> Wants -> Others (then Alphabetical)
    const sortedCategories = useMemo(() => {
        const priorityOrder = { needs: 1, wants: 2 };

        return [...categories].sort((a, b) => {
            // Safe access + case insensitive
            const pA = priorityOrder[(a.priority || '').toLowerCase()] || 4;
            const pB = priorityOrder[(b.priority || '').toLowerCase()] || 4;

            if (pA !== pB) return pA - pB;
            return a.name.localeCompare(b.name);
        });
    }, [categories]);

    const selectedCategory = useMemo(() => {
        if (multiple) return null;
        return sortedCategories.find(c => c.id === value);
    }, [sortedCategories, value, multiple]);

    const selectedCategories = useMemo(() => {
        if (!multiple || !Array.isArray(value)) return [];
        return sortedCategories.filter(c => value.includes(c.id));
    }, [sortedCategories, value, multiple]);

    const handleSelect = (categoryId) => {
        if (multiple) {
            const currentValues = Array.isArray(value) ? value : [];
            const newValues = currentValues.includes(categoryId)
                ? currentValues.filter(id => id !== categoryId)
                : [...currentValues, categoryId];
            onValueChange(newValues);
        } else {
            onValueChange(categoryId);
            setOpen(false);
        }
    };

    const handleClear = (e) => {
        e.stopPropagation();
        onValueChange(multiple ? [] : '');
    };

    const IconComponent = !multiple && selectedCategory?.icon && iconMap[selectedCategory.icon]
        ? iconMap[selectedCategory.icon]
        : Circle;

    const TriggerContent = (
        <CustomButton
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="w-full justify-between h-14 px-3 font-normal text-base"
        >
            {multiple ? (
                selectedCategories.length > 0 ? (
                    <span>{selectedCategories.length} selected</span>
                ) : (
                    <span className="text-muted-foreground">{placeholder}</span>
                )
            ) : (
                selectedCategory ? (
                    <div className="flex items-center gap-2">
                        <div
                            className="w-4 h-4 rounded flex items-center justify-center"
                            style={{ backgroundColor: `${selectedCategory.color}20` }}
                        >
                            <IconComponent className="w-2.5 h-2.5" style={{ color: selectedCategory.color }} />
                        </div>
                        <span>{selectedCategory.name}</span>
                    </div>
                ) : (
                    <span className="text-muted-foreground">{placeholder}</span>
                )
            )}

            {/* Implementation of handleClear UI */}
            {!multiple && value && (
                <div
                    className="ml-auto hover:bg-gray-100 p-0.5 rounded-full transition-colors"
                    onClick={handleClear}
                >
                    <X className="w-3.5 h-3.5 text-muted-foreground hover:text-foreground" />
                </div>
            )}

            {/* Fallback chevron if no value or if multiple */}
            {(!value || multiple) && <ChevronDown className="ml-auto h-4 w-4 opacity-50" />}
        </CustomButton>
    );

    const ListContent = (
        <Command className={isMobile ? "h-[50vh]" : "h-auto w-full overflow-visible"}>
            <CommandInput placeholder="Search category..." />
            <CommandList className={isMobile ? "max-h-[60vh] overflow-y-auto" : "max-h-64 overflow-y-auto overflow-x-hidden"}>
                <CommandEmpty>No category found.</CommandEmpty>
                {/* Group by Priority for better scannability */}
                {['needs', 'wants', 'other'].map((priority) => {
                    const groupCategories = sortedCategories.filter(c =>
                        priority === 'other'
                            ? !['needs', 'wants'].includes((c.priority || '').toLowerCase())
                            : (c.priority || '').toLowerCase() === priority
                    );

                    if (groupCategories.length === 0) return null;

                    return (
                        <CommandGroup
                            key={priority}
                            heading={FINANCIAL_PRIORITIES[priority]?.label || "Other"}
                            className="overflow-visible"
                        >
                            {groupCategories.map((category) => {
                                const Icon = category.icon && iconMap[category.icon] ? iconMap[category.icon] : Circle;
                                const isSelected = multiple
                                    ? (Array.isArray(value) && value.includes(category.id))
                                    : value === category.id;

                                return (
                                    <CommandItem
                                        key={category.id}
                                        value={category.name}
                                        onSelect={() => handleSelect(category.id)}
                                    >
                                        <Check
                                            className={`mr-2 h-4 w-4 ${isSelected ? "opacity-100" : "opacity-0"}`}
                                        />
                                        <div
                                            className="w-5 h-5 rounded flex items-center justify-center mr-2"
                                            style={{ backgroundColor: `${category.color}20` }}
                                        >
                                            <Icon className="w-3 h-3" style={{ color: category.color }} />
                                        </div>
                                        {category.name}
                                    </CommandItem>
                                );
                            })}
                        </CommandGroup>
                    );
                })}
            </CommandList>
        </Command>
    );

    if (isMobile) {
        return (
            <Drawer open={open} onOpenChange={setOpen} modal={true}>
                <DrawerTrigger asChild>
                    {TriggerContent}
                </DrawerTrigger>

                {/* Added mb-24 to keep the drawer above the bottom nav bar area */}
                {/* z-[105] places it above the modal (95) and layout (100) so it is interactive, but we visually offset it */}
                <DrawerContent className="z-[105] max-h-[70vh]" style={{ marginBottom: 'var(--safe-bottom)' }}>
                    <div className="mt-4 border-t">
                        {ListContent}
                    </div>
                </DrawerContent>
            </Drawer>
        );
    }

    return (
        <Popover open={open} onOpenChange={setOpen} modal={true}>
            <PopoverTrigger asChild>{TriggerContent}</PopoverTrigger>
            <PopoverContent className="w-[280px] p-0" align="start">
                {ListContent}
            </PopoverContent>
        </Popover>
    );
}
