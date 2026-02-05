import { useState, useMemo } from "react";
import { Check, Circle } from "lucide-react";
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

export default function CategorySelect({ value, onValueChange, categories, placeholder = "Select category", multiple = false }) {
    const [open, setOpen] = useState(false);

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

    return (
        <Popover open={open} onOpenChange={setOpen} modal={true}>
            <PopoverTrigger asChild>
                <CustomButton
                    variant="outline"
                    role="combobox"
                    aria-expanded={open}
                    className="w-full justify-between h-9 px-3 font-normal"
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
                    {(!value || multiple) && <div className="ml-auto opacity-50">▼</div>}
                </CustomButton>
            </PopoverTrigger>
            <PopoverContent className="w-[200px] p-0" align="start">
                <Command className="h-auto w-full overflow-visible">
                    <CommandInput placeholder="Search category..." />
                    <CommandList className="max-h-64 overflow-y-auto overflow-x-hidden">
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
            </PopoverContent>
        </Popover>
    );
}
