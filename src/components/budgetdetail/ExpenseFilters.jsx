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
        <div className={`border rounded-lg bg-white transition-all duration-300 ${isOpen ? 'w-full' : 'w-12'} overflow-visible`}>
            {/* Header - Always visible */}
            <div className="flex items-center justify-between px-3 py-2.5 border-b">
                {isOpen ? (
                    <>
                        <div className="flex items-center gap-2 min-w-0 flex-1">
                            <Filter className="w-4 h-4 text-gray-500 flex-shrink-0" />
                            <span className="font-medium text-gray-900 text-sm">Filters</span>
                            {hasActiveFilters && (
                                <Badge variant="secondary" className="flex-shrink-0">
                                    {activeFilterCount}
                                </Badge>
                            )}
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                            {hasActiveFilters && (
                                <CustomButton 
                                    variant="ghost" 
                                    size="sm"
                                    onClick={clearFilters}
                                    className="h-7 px-2 text-xs"
                                >
                                    Clear
                                </CustomButton>
                            )}
                            <button
                                onClick={() => setIsOpen(false)}
                                className="p-1 hover:bg-gray-100 rounded transition-colors"
                            >
                                <ChevronDown className="w-4 h-4 text-gray-500 -rotate-90" />
                            </button>
                        </div>
                    </>
                ) : (
                    <div className="flex flex-col items-center gap-2 w-full">
                        <button
                            onClick={() => setIsOpen(true)}
                            className="p-1.5 hover:bg-gray-100 rounded transition-colors relative"
                            title="Open filters"
                        >
                            <Filter className="w-4 h-4 text-gray-500" />
                            {hasActiveFilters && (
                                <span className="absolute -top-1 -right-1 w-3 h-3 bg-blue-600 rounded-full text-[8px] text-white flex items-center justify-center">
                                    {activeFilterCount}
                                </span>
                            )}
                        </button>
                        {hasActiveFilters && (
                            <CustomButton 
                                variant="ghost" 
                                size="sm"
                                onClick={clearFilters}
                                className="h-7 w-7 p-0"
                                title="Clear filters"
                            >
                                <X className="w-3 h-3" />
                            </CustomButton>
                        )}
                    </div>
                )}
            </div>

            {/* Filter Content - Only visible when expanded */}
            {isOpen && (
                <div className="p-4 space-y-6 overflow-visible">
                    {/* Filter Summary when expanded */}
                    {hasActiveFilters && filterSummary && (
                        <div className="text-xs text-gray-600 bg-blue-50 px-3 py-2 rounded">
                            Active: {filterSummary}
                        </div>
                    )}

                    {/* Payment Status */}
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

                    {/* Priority - Only show if there are multiple priorities */}
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

                    {/* Categories - Only show categories that exist */}
                    {availableCategories.length > 0 && (
                        <div>
                            <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
                                Categories ({availableCategories.length})
                            </h4>
                            <div className="flex flex-wrap gap-2">
                                {availableCategories.map((category) => (
                                    <button
                                        key={category.id}
                                        onClick={() => handleCategoryToggle(category.id)}
                                        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all flex-shrink-0 ${
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
            )}
        </div>
    );
}