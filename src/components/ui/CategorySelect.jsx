import { useState, useMemo } from "react";
import { Check, Circle, ChevronDown, PlusCircle, Loader2 } from "lucide-react";
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
import { iconMap, suggestIconForCategory } from "../utils/iconMapConfig";
import { FINANCIAL_PRIORITIES, PRESET_COLORS } from "../utils/constants";
import { Drawer, DrawerContent, DrawerTrigger, DrawerPortal } from "@/components/ui/drawer";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";
import { useToast } from "@/components/ui/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { QUERY_KEYS } from "../hooks/queryKeys";
import { useSettings } from "@/components/utils/SettingsContext";
import { useMergedCategories } from "../hooks/useMergedCategories"; // ADDED 14-Feb-2026

export default function CategorySelect({ value, onValueChange, categories: providedCategories, placeholder = "Select category", multiple = false }) {
    const [open, setOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState("");
    const [isCreating, setIsCreating] = useState(false);
    const isMobile = useIsMobile();
    const { toast } = useToast();
    const queryClient = useQueryClient();
    const { user } = useSettings();
    
    // ADDED 14-Feb-2026: Use merged categories if not provided externally
    const { categories: mergedCategories } = useMergedCategories();
    const categories = providedCategories || mergedCategories;

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

    // UPDATED 14-Feb-2026: Check if the current search term matches an existing category
    // Also check if category is a system category to prevent duplicate creation
    const exactMatchExists = useMemo(() => {
        if (!searchTerm) return true; // Don't show create if empty
        return categories.some(c => c.name.toLowerCase() === searchTerm.trim().toLowerCase());
    }, [categories, searchTerm]);
    
    // ADDED 14-Feb-2026: Prevent creation if name matches system category
    const canCreate = useMemo(() => {
        if (!searchTerm.trim()) return false;
        const matchingCategory = categories.find(c => c.name.toLowerCase() === searchTerm.trim().toLowerCase());
        return !matchingCategory; // Can only create if no match exists (system or custom)
    }, [categories, searchTerm]);

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
        setSearchTerm("");
    };

    const handleCreateCategory = async () => {
        if (!searchTerm.trim() || isCreating) return;

        setIsCreating(true);
        const name = searchTerm.trim();

        try {
            // 1. Deterministic Color (Hash string to index)
            let hash = 0;
            for (let i = 0; i < name.length; i++) {
                hash = name.charCodeAt(i) + ((hash << 5) - hash);
            }
            const colorIndex = Math.abs(hash) % PRESET_COLORS.length;
            const color = PRESET_COLORS[colorIndex];

            // 2. Inference Icon
            const icon = suggestIconForCategory(name);

            // 3. Create
            const newCat = await base44.entities.Category.create({
                name: name,
                icon: icon,
                color: color,
                type: 'expense',
                priority: 'wants', // Default safety
                user_email: user.email
            });

            // 4. Refresh & Select
            await queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.CATEGORIES] });

            onValueChange(multiple ? [...(value || []), newCat.id] : newCat.id);
            setOpen(false);
            setSearchTerm("");

            toast({
                title: `Category '${newCat.name}' created`,
                description: "Icon and color auto-assigned.",
            });

        } catch (error) {
            console.error(error);
            toast({ title: "Failed to create category", variant: "destructive" });
        } finally {
            setIsCreating(false);
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
            className="w-full justify-between h-12 px-3 font-normal text-sm"
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
        <Command shouldFilter={true} className={isMobile ? "flex flex-col h-full max-h-[80vh]" : "h-auto w-full overflow-visible"}>
            <CommandInput
                placeholder="Search or create..."
                value={searchTerm}
                onValueChange={setSearchTerm}
            />
            <CommandList className={cn(
                "overflow-y-auto",
                isMobile ? "max-h-none flex-1 pb-[env(safe-area-inset-bottom)]" : "max-h-64"
            )}>
                <CommandEmpty className="py-2 px-4 text-sm">
                    {/* UPDATED 14-Feb-2026: Show create button only if name doesn't match any category */}
                    {canCreate && searchTerm.trim().length > 0 ? (
                        <button
                            onClick={handleCreateCategory}
                            disabled={isCreating}
                            className="flex items-center gap-2 w-full text-left p-2 rounded-md hover:bg-gray-100 text-blue-600 transition-colors"
                        >
                            {isCreating ? <Loader2 className="w-4 h-4 animate-spin" /> : <PlusCircle className="w-4 h-4" />}
                            <span className="font-semibold">Create custom "{searchTerm}"</span>
                        </button>
                    ) : (
                        <span className="text-gray-500">No matching category.</span>
                    )}
                </CommandEmpty>
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
                                        <span>{category.name}</span>
                                        {/* ADDED 14-Feb-2026: Show badge for system categories */}
                                        {category.isSystemCategory && (
                                           <span className="ml-auto text-[10px] bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded">System</span>
                                        )}
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
            <Drawer open={open} onOpenChange={setOpen} modal={false} dismissible={true}>
                <DrawerTrigger asChild>
                    {TriggerContent}
                </DrawerTrigger>

                <DrawerPortal>
                    {/* Force the overlay to be invisible or absent so it doesn't block touches */}
                    <DrawerContent className="z-[600] fixed bottom-0 left-0 right-0 max-h-[85vh] outline-none px-0 shadow-2xl border-t-2">
                        <div className="mt-4 border-t overflow-hidden flex flex-col h-full">
                            {ListContent}
                        </div>
                    </DrawerContent>
                </DrawerPortal>
            </Drawer>
        );
    }

    return (
        <Popover open={open} onOpenChange={setOpen} modal={true}>
            <PopoverTrigger asChild>{TriggerContent}</PopoverTrigger>
            <PopoverContent className="w-[280px] p-0 z-[600]" align="start">
                {ListContent}
            </PopoverContent>
        </Popover>
    );
}