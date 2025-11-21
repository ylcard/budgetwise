import React, { useState, useMemo } from "react";
import { Check, ChevronsUpDown, Circle } from "lucide-react";
import { CustomButton } from "@/components/ui/CustomButton";
import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
} from "@/components/ui/command";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
import { iconMap } from "../utils/iconMapConfig";

export function CategorySelect({ value, onValueChange, categories, placeholder = "Select category" }) {
    const [open, setOpen] = useState(false);

    // SORTING LOGIC: Needs -> Wants -> Savings -> Others (then Alphabetical)
    const sortedCategories = useMemo(() => {
        const priorityOrder = { needs: 1, wants: 2, savings: 3 };

        return [...categories].sort((a, b) => {
            // Safe access + case insensitive
            const pA = priorityOrder[(a.priority || '').toLowerCase()] || 4;
            const pB = priorityOrder[(b.priority || '').toLowerCase()] || 4;

            if (pA !== pB) return pA - pB;
            return a.name.localeCompare(b.name);
        });
    }, [categories]);

    const selectedCategory = useMemo(() => {
        return sortedCategories.find(c => c.id === value);
    }, [sortedCategories, value]);

    const IconComponent = selectedCategory?.icon && iconMap[selectedCategory.icon]
        ? iconMap[selectedCategory.icon]
        : Circle;

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <CustomButton
                    variant="outline"
                    role="combobox"
                    aria-expanded={open}
                    className="w-full justify-between"
                >
                    {selectedCategory ? (
                        <div className="flex items-center gap-2">
                            <div
                                className="w-5 h-5 rounded flex items-center justify-center"
                                style={{ backgroundColor: `${selectedCategory.color}20` }}
                            >
                                <IconComponent className="w-3 h-3" style={{ color: selectedCategory.color }} />
                            </div>
                            <span>{selectedCategory.name}</span>
                        </div>
                    ) : (
                        <span className="text-muted-foreground">{placeholder}</span>
                    )}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </CustomButton>
            </PopoverTrigger>
            <PopoverContent className="w-full p-0">
                <Command>
                    <CommandInput placeholder="Search category..." />
                    <CommandEmpty>No category found.</CommandEmpty>
                    <CommandGroup className="max-h-64 overflow-auto">
                        {sortedCategories.map((category) => {
                            const Icon = category.icon && iconMap[category.icon] ? iconMap[category.icon] : Circle;
                            return (
                                <CommandItem
                                    key={category.id}
                                    value={category.name}
                                    onSelect={() => {
                                        onValueChange(category.id);
                                        setOpen(false);
                                    }}
                                >
                                    <Check
                                        className={`mr-2 h-4 w-4 ${value === category.id ? "opacity-100" : "opacity-0"}`}
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
                </Command>
            </PopoverContent>
        </Popover>
    );
}
