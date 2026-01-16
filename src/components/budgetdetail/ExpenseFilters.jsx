/**
 * Expense Filters Component
 * CREATED: 16-Jan-2026
 * 
 * Collapsible filter panel for budget detail expenses
 */

import { useState } from "react";
import { ChevronDown, Filter, X } from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Badge } from "@/components/ui/badge";
import { CustomButton } from "@/components/ui/CustomButton";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";

export default function ExpenseFilters({ 
    categories, 
    filters, 
    onFilterChange,
    activeFilterCount 
}) {
    const [isOpen, setIsOpen] = useState(false);

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
                    <div className="flex items-center justify-between p-4 hover:bg-gray-50 transition-colors">
                        <div className="flex items-center gap-2">
                            <Filter className="w-4 h-4 text-gray-500" />
                            <span className="font-medium text-gray-900">Filters</span>
                            {hasActiveFilters && (
                                <Badge variant="secondary" className="ml-2">
                                    {activeFilterCount}
                                </Badge>
                            )}
                        </div>
                        <ChevronDown className={`w-5 h-5 text-gray-500 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                    </div>
                </CollapsibleTrigger>

                <CollapsibleContent>
                    <Separator />
                    <div className="p-4 space-y-6">
                        {/* Payment Status Filter */}
                        <div>
                            <h4 className="text-sm font-medium text-gray-900 mb-3">Payment Status</h4>
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

                        <Separator />

                        {/* Priority Filter */}
                        <div>
                            <h4 className="text-sm font-medium text-gray-900 mb-3">Financial Priority</h4>
                            <div className="space-y-2">
                                {['needs', 'wants', 'savings'].map((priority) => (
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

                        <Separator />

                        {/* Category Filter */}
                        <div>
                            <h4 className="text-sm font-medium text-gray-900 mb-3">Categories</h4>
                            <div className="space-y-2 max-h-48 overflow-y-auto">
                                {categories.map((category) => (
                                    <div key={category.id} className="flex items-center gap-2">
                                        <Checkbox
                                            id={`cat-${category.id}`}
                                            checked={(filters.categories || []).includes(category.id)}
                                            onCheckedChange={() => handleCategoryToggle(category.id)}
                                        />
                                        <Label 
                                            htmlFor={`cat-${category.id}`}
                                            className="text-sm text-gray-700 cursor-pointer flex items-center gap-2"
                                        >
                                            <span 
                                                className="w-3 h-3 rounded-full" 
                                                style={{ backgroundColor: category.color }}
                                            />
                                            {category.name}
                                        </Label>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Clear Filters */}
                        {hasActiveFilters && (
                            <>
                                <Separator />
                                <CustomButton 
                                    variant="outline" 
                                    size="sm" 
                                    onClick={clearFilters}
                                    className="w-full"
                                >
                                    <X className="w-4 h-4 mr-2" />
                                    Clear All Filters
                                </CustomButton>
                            </>
                        )}
                    </div>
                </CollapsibleContent>
            </div>
        </Collapsible>
    );
}