import { useState, useMemo } from "react";
import { Check, ChevronsUpDown, Circle, X } from "lucide-react";
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
import { Badge } from "@/components/ui/badge";

export default function CategorySelect({ value, onValueChange, categories, placeholder = "Select category", multiple = false }) {
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
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <CustomButton
                    variant="outline"
                    role="combobox"
                    aria-expanded={open}
                    className="w-full justify-between min-h-[2.5rem] h-auto"
                >
                    {multiple ? (
                        <div className="flex flex-wrap gap-1 items-center">
                            {selectedCategories.length > 0 ? (
                                selectedCategories.map(cat => (
                                    <Badge key={cat.id} variant="secondary" className="mr-1 mb-1">
                                        {cat.name}
                                        <X
                                            className="ml-1 h-3 w-3 cursor-pointer hover:text-destructive"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handleSelect(cat.id);
                                            }}
                                        />
                                    </Badge>
                                ))
                            ) : (
                                <span className="text-muted-foreground">{placeholder}</span>
                            )}
                        </div>
                    ) : (
                        selectedCategory ? (
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
                        )
                    )}
                    <div className="flex items-center">
                        {(multiple ? (Array.isArray(value) && value.length > 0) : value) && (
                            <X
                                className="mr-2 h-4 w-4 shrink-0 opacity-50 hover:opacity-100 cursor-pointer"
                                onClick={handleClear}
                            />
                        )}
                        <ChevronsUpDown className="h-4 w-4 shrink-0 opacity-50" />
                    </div>
                </CustomButton>
            </PopoverTrigger>
            <PopoverContent className="w-full p-0" align="start">
                <Command>
                    <CommandInput placeholder="Search category..." />
                    <CommandEmpty>No category found.</CommandEmpty>
                    <CommandGroup className="max-h-64 overflow-auto">
                        {sortedCategories.map((category) => {
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
                </Command>
            </PopoverContent>
        </Popover>
    );
}
