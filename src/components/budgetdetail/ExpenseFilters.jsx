/**
 * Expense Filters Component
 * CREATED: 16-Jan-2026
 * UPDATED: 16-Jan-2026 - Compact 3-column layout with smart filtering
 * 
 * Collapsible filter panel for budget detail expenses
 */

import { useState, useMemo } from "react";
import { ChevronDown, Filter, X } from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Badge } from "@/components/ui/badge";
import { CustomButton } from "@/components/ui/CustomButton";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";

export default function ExpenseFilters({ 
    categories, 
    transactions,
    filters, 
    onFilterChange,
    activeFilterCount 
}) {
    const [isOpen, setIsOpen] = useState(false);

    // ADDED: 16-Jan-2026 - Calculate available categories (only show categories present in transactions)
    const availableCategories = useMemo(() => {
        const categoryIds = new Set(transactions.map(t => t.category_id).filter(Boolean));
        return categories.filter(cat => categoryIds.has(cat.id));
    }, [categories, transactions]);

    // ADDED: 16-Jan-2026 - Calculate available priorities
    const availablePriorities = useMemo(() => {
        const priorities = new Set();
        transactions.forEach(t => {
            const category = categories.find(c => c.id === t.category_id);
            const effectivePriority = t.financial_priority || (category ? category.priority : null);
            if (effectivePriority) priorities.add(effectivePriority);
        });
        return Array.from(priorities);
    }, [transactions, categories]);

    // ADDED: 16-Jan-2026 - Calculate filter summary for collapsed state
    const filterSummary = useMemo(() => {
        const items = [];
        if (filters.paidStatus !== 'all') {
            items.push(filters.paidStatus === 'paid' ? 'Paid' : 'Unpaid');
        }
        if (filters.priorities?.length > 0) {
            items.push(...filters.priorities.map(p => p.charAt(0).toUpperCase() + p.slice(1)));
        }
        if (filters.categories?.length > 0) {
            const categoryNames = filters.categories
                .map(id => categories.find(c => c.id === id)?.name)
                .filter(Boolean);
            items.push(...categoryNames);
        }
        
        if (items.length === 0) return null;
        if (items.length <= 2) return items.join(', ');
        return `${items[0]}, ${items[1]} +${items.length - 2} more`;
    }, [filters, categories]);

    const handleCategoryToggle = (categoryId) => {
        const current = filters.categories || [];
        const updated = current.includes(categoryId)
            ? current.filter(id => id !== categoryId)
            : [...current, categoryId];
        onFilterChange({ ...filters, categories: updated });
    };

    const handlePaidStatusChange = (status) => {
        onFilterChange({ ...filters, paidStatus: status });
    };

    const handlePriorityToggle = (priority) => {
        const current = filters.priorities || [];
        const updated = current.includes(priority)
            ? current.filter(p => p !== priority)
            : [...current, priority];
        onFilterChange({ ...filters, priorities: updated });
    };

    const clearFilters = () => {
        onFilterChange({ categories: [], paidStatus: 'all', priorities: [] });
    };

    const hasActiveFilters = activeFilterCount > 0;

    return (
        <Collapsible open={isOpen} onOpenChange={setIsOpen}>
            <div className="border rounded-lg bg-white">
                <CollapsibleTrigger className="w-full">
                    <div className="flex items-center justify-between px-4 py-2.5 hover:bg-gray-50 transition-colors">
                        <div className="flex items-center gap-2 min-w-0 flex-1">
                            <Filter className="w-4 h-4 text-gray-500 flex-shrink-0" />
                            <span className="font-medium text-gray-900 text-sm">Filters</span>
                            {hasActiveFilters && (
                                <>
                                    <Badge variant="secondary" className="flex-shrink-0">
                                        {activeFilterCount}
                                    </Badge>
                                    {!isOpen && filterSummary && (
                                        <span className="text-xs text-gray-500 truncate">
                                            {filterSummary}
                                        </span>
                                    )}
                                </>
                            )}
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                            {hasActiveFilters && !isOpen && (
                                <CustomButton 
                                    variant="ghost" 
                                    size="sm"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        clearFilters();
                                    }}
                                    className="h-7 px-2 text-xs"
                                >
                                    Clear
                                </CustomButton>
                            )}
                            <ChevronDown className={`w-4 h-4 text-gray-500 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                        </div>
                    </div>
                </CollapsibleTrigger>

                <CollapsibleContent>
                    <div className="border-t p-4">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            {/* Payment Status Column */}
                            <div>
                                <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Payment Status</h4>
                                <div className="space-y-2">
                                    {['all', 'paid', 'unpaid'].map((status) => (
                                        <div key={status} className="flex items-center gap-2">
                                            <Checkbox
                                                id={`status-${status}`}
                                                checked={filters.paidStatus === status}
                                                onCheckedChange={() => handlePaidStatusChange(status)}
                                            />
                                            <Label 
                                                htmlFor={`status-${status}`}
                                                className="text-sm text-gray-700 cursor-pointer capitalize"
                                            >
                                                {status}
                                            </Label>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Priority Column - Only show if there are multiple priorities */}
                            {availablePriorities.length > 1 && (
                                <div>
                                    <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Priority</h4>
                                    <div className="space-y-2">
                                        {availablePriorities.map((priority) => (
                                            <div key={priority} className="flex items-center gap-2">
                                                <Checkbox
                                                    id={`priority-${priority}`}
                                                    checked={(filters.priorities || []).includes(priority)}
                                                    onCheckedChange={() => handlePriorityToggle(priority)}
                                                />
                                                <Label 
                                                    htmlFor={`priority-${priority}`}
                                                    className="text-sm text-gray-700 cursor-pointer capitalize"
                                                >
                                                    {priority}
                                                </Label>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Categories Column - Only show categories that exist */}
                            {availableCategories.length > 0 && (
                                <div className={availablePriorities.length <= 1 ? 'md:col-span-2' : ''}>
                                    <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
                                        Categories ({availableCategories.length})
                                    </h4>
                                    <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto">
                                        {availableCategories.map((category) => (
                                            <button
                                                key={category.id}
                                                onClick={() => handleCategoryToggle(category.id)}
                                                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium transition-all ${
                                                    (filters.categories || []).includes(category.id)
                                                        ? 'bg-blue-100 text-blue-700 ring-1 ring-blue-600'
                                                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                                }`}
                                            >
                                                <span 
                                                    className="w-2 h-2 rounded-full flex-shrink-0" 
                                                    style={{ backgroundColor: category.color }}
                                                />
                                                {category.name}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Clear All Button */}
                        {hasActiveFilters && (
                            <div className="mt-4 pt-4 border-t">
                                <CustomButton 
                                    variant="outline" 
                                    size="sm" 
                                    onClick={clearFilters}
                                    className="w-full"
                                >
                                    <X className="w-4 h-4 mr-2" />
                                    Clear All Filters
                                </CustomButton>
                            </div>
                        )}
                    </div>
                </CollapsibleContent>
            </div>
        </Collapsible>
    );
}