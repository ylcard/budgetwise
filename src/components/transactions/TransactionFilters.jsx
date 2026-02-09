import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { CustomButton } from "@/components/ui/CustomButton";
import { Search, X, Check, Tag } from "lucide-react";
import DateRangePicker from "./DateRangePicker";
import { cn } from "@/lib/utils";
import CategorySelect from "../ui/CategorySelect";
import { useMemo } from "react";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerTrigger, DrawerClose } from "@/components/ui/drawer";
import { isDateInRange } from "../utils/dateUtils";
import { usePeriod } from "../hooks/usePeriod";
import { getCategoryIcon } from "../utils/iconMapConfig";

// Move helpers OUTSIDE to prevent re-mounting on every state change
const MobileSelectTrigger = ({ label, value, options, onSelect, placeholder }) => {
    const selectedLabel = options.find(opt => opt.value === value)?.label || placeholder || value;
    return (
        <Drawer>
            <DrawerTrigger asChild>
                <button className="flex h-9 w-full items-center justify-between rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm md:hidden text-gray-900">
                    <span className="truncate">{selectedLabel}</span>
                    <ChevronRight className="h-4 w-4 opacity-50" />
                </button>
            </DrawerTrigger>
            <DrawerContent>
                <DrawerHeader>
                    <DrawerTitle>{label}</DrawerTitle>
                </DrawerHeader>
                <div className="p-4 space-y-1 max-h-[60vh] overflow-y-auto pb-[calc(2rem+env(safe-area-inset-bottom))]">
                    {options.map((opt) => (
                        <DrawerClose key={opt.value} asChild>
                            <button
                                onClick={() => onSelect(opt.value)}
                                className={cn(
                                    "w-full text-left px-4 py-4 rounded-xl text-base font-medium transition-colors",
                                    value === opt.value ? "bg-blue-50 text-blue-600" : "active:bg-gray-100"
                                )}
                            >
                                {opt.label}
                            </button>
                        </DrawerClose>
                    ))}
                </div>
            </DrawerContent>
        </Drawer>
    );
};

const MobileCategoryTrigger = ({ filters, categories, onCategoryChange }) => {
    const selectedCount = filters.category.length;
    const label = selectedCount === 0 ? "All Categories" : `${selectedCount} Selected`;

    return (
        <Drawer>
            <DrawerTrigger asChild>
                <button className="flex h-9 w-full items-center justify-between rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm md:hidden text-gray-900">
                    <span className="truncate">{label}</span>
                    <Tag className="h-4 w-4 opacity-50" />
                </button>
            </DrawerTrigger>
            <DrawerContent>
                <DrawerHeader>
                    <DrawerTitle>Select Categories</DrawerTitle>
                </DrawerHeader>
                <div className="p-4 space-y-1 max-h-[50vh] overflow-y-auto">
                    {categories.map((cat) => {
                        const isSelected = filters.category.includes(cat.id);
                        const Icon = getCategoryIcon(cat.icon);
                        return (
                            <button
                                key={cat.id}
                                onClick={() => {
                                    const newCats = isSelected
                                        ? filters.category.filter(id => id !== cat.id)
                                        : [...filters.category, cat.id];
                                    onCategoryChange(newCats);
                                }}
                                className={cn(
                                    "w-full flex items-center justify-between px-4 py-4 rounded-xl text-base font-medium transition-colors",
                                    isSelected ? "bg-blue-50 text-blue-600" : "active:bg-gray-100"
                                )}
                            >
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ backgroundColor: `${cat.color}20` }}>
                                        <Icon className="w-4 h-4" style={{ color: cat.color }} />
                                    </div>
                                    <span>{cat.name}</span>
                                </div>
                                {isSelected && <Check className="w-5 h-5" />}
                            </button>
                        );
                    })}
                </div>
                <div className="p-4 border-t bg-gray-50/50 pb-[calc(1rem+env(safe-area-inset-bottom))]">
                    <DrawerClose asChild>
                        <CustomButton variant="primary" className="w-full h-12 text-base font-bold">
                            Apply
                        </CustomButton>
                    </DrawerClose>
                </div>
            </DrawerContent>
        </Drawer>
    );
};

export default function TransactionFilters({ filters, setFilters, categories, allCustomBudgets = [] }) {
    const { monthStart, monthEnd } = usePeriod();

    const handleCategoryChange = (newCategories) => {
        setFilters({ ...filters, category: newCategories });
    };

    const handleDateRangeChange = (startStr, endStr) => {
        setFilters({
            ...filters,
            startDate: startStr,
            endDate: endStr
        });
    };

    const handleClearFilters = () => {
        setFilters({
            ...filters,
            search: '',
            type: 'all',
            category: [],
            paymentStatus: 'all',
            cashStatus: 'all',
            financialPriority: 'all',
            budgetId: 'all',
            startDate: monthStart,
            endDate: monthEnd
        });
    };

    // Filter custom budgets based on selected date range
    const filteredCustomBudgets = useMemo(() => {
        if (!filters.startDate || !filters.endDate) return [];
        return allCustomBudgets.filter(b => {
            // Show active/planned/completed budgets that overlap with the selected range
            return isDateInRange(filters.startDate, b.startDate, b.endDate) ||
                isDateInRange(filters.endDate, b.startDate, b.endDate) ||
                (new Date(b.startDate) >= new Date(filters.startDate) && new Date(b.endDate) <= new Date(filters.endDate));
        });
    }, [allCustomBudgets, filters.startDate, filters.endDate]);

    const isDateChanged = filters.startDate !== monthStart || filters.endDate !== monthEnd;

    const activeFilterCount = [
        filters.search,
        filters.type !== 'all',
        filters.category.length > 0,
        filters.paymentStatus !== 'all',
        filters.cashStatus !== 'all',
        filters.financialPriority !== 'all',
        filters.budgetId !== 'all',
        isDateChanged
    ].filter(Boolean).length;

    return (
        <Card className="border-none shadow-lg">
            <CardContent className="p-4 space-y-4">
                {/* Top Row: Search and Date Range */}
                <div className="flex flex-col md:flex-row gap-4 justify-between">
                    <div className="relative flex-1 max-w-md">
                        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
                        <Input
                            placeholder="Search transactions..."
                            className="pl-9"
                            value={filters.search}
                            onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                        />
                    </div>
                    <div className="flex items-center gap-2">

                        <DateRangePicker
                            startDate={filters.startDate}
                            endDate={filters.endDate}
                            onRangeChange={handleDateRangeChange}
                        />

                        {activeFilterCount > 0 && (
                            <CustomButton
                                variant="ghost"
                                size="sm"
                                onClick={handleClearFilters}
                                className="text-gray-500 hover:text-red-600"
                            >
                                <X className="w-4 h-4 mr-1" />
                                Clear
                            </CustomButton>
                        )}
                    </div>
                </div>

                {/* Filters Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
                    {/* Type */}
                    <div className="space-y-1">
                        <Label className="text-xs text-gray-500">Type</Label>
                        <div className="hidden md:block">
                            <Select value={filters.type} onValueChange={(value) => setFilters({ ...filters, type: value })}>
                                <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All Types</SelectItem>
                                    <SelectItem value="income">Income</SelectItem>
                                    <SelectItem value="expense">Expense</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <MobileSelectTrigger
                            label="Transaction Type"
                            value={filters.type}
                            options={[
                                { value: 'all', label: 'All Types' },
                                { value: 'income', label: 'Income' },
                                { value: 'expense', label: 'Expense' }
                            ]}
                            onSelect={(val) => setFilters({ ...filters, type: val })}
                        />
                    </div>

                    {/* Category (Multi-select) */}
                    <div className="space-y-1 lg:col-span-1">
                        <Label className="text-xs text-gray-500">Category</Label>
                        <div className="hidden md:block">
                            <CategorySelect
                                value={filters.category}
                                onValueChange={handleCategoryChange}
                                categories={categories}
                                placeholder="All Categories"
                                multiple={true}
                            />
                        </div>
                        <MobileCategoryTrigger
                            filters={filters}
                            categories={categories}
                            onCategoryChange={handleCategoryChange}
                        />
                    </div>

                    {/* Financial Priority */}
                    <div className="space-y-1">
                        <Label className="text-xs text-gray-500">Priority</Label>
                        <div className="hidden md:block">
                            <Select value={filters.financialPriority} onValueChange={(value) => setFilters({ ...filters, financialPriority: value })}>
                                <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All Priorities</SelectItem>
                                    <SelectItem value="needs">Needs</SelectItem>
                                    <SelectItem value="wants">Wants</SelectItem>
                                    <SelectItem value="savings">Savings</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <MobileSelectTrigger
                            label="Financial Priority"
                            value={filters.financialPriority}
                            options={[
                                { value: 'all', label: 'All Priorities' },
                                { value: 'needs', label: 'Needs' },
                                { value: 'wants', label: 'Wants' },
                                { value: 'savings', label: 'Savings' }
                            ]}
                            onSelect={(val) => setFilters({ ...filters, financialPriority: val })}
                        />
                    </div>

                    {/* Custom Budget */}
                    <div className="space-y-1">
                        <Label className="text-xs text-gray-500">Budget</Label>
                        <div className="hidden md:block">
                            <Select
                                value={filters.budgetId}
                                onValueChange={(value) => setFilters({ ...filters, budgetId: value })}
                            >
                                <SelectTrigger className="h-9">
                                    <SelectValue placeholder="All Budgets" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All Budgets</SelectItem>
                                    {filteredCustomBudgets.map(b => (
                                        <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <MobileSelectTrigger
                            label="Linked Budget"
                            value={filters.budgetId}
                            options={[
                                { value: 'all', label: 'All Budgets' },
                                ...filteredCustomBudgets.map(b => ({ value: b.id, label: b.name }))
                            ]}
                            onSelect={(val) => setFilters({ ...filters, budgetId: val })}
                        />
                    </div>

                    {/* Payment Status */}
                    <div className="space-y-1">
                        <Label className="text-xs text-gray-500">Payment</Label>
                        <div className="hidden md:block">
                            <Select
                                value={filters.paymentStatus}
                                onValueChange={(value) => setFilters({ ...filters, paymentStatus: value })}
                            >
                                <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All Status</SelectItem>
                                    <SelectItem value="paid">Paid</SelectItem>
                                    <SelectItem value="unpaid">Unpaid</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <MobileSelectTrigger
                            label="Payment Status"
                            value={filters.paymentStatus}
                            options={[
                                { value: 'all', label: 'All Status' },
                                { value: 'paid', label: 'Paid' },
                                { value: 'unpaid', label: 'Unpaid' }
                            ]}
                            onSelect={(val) => setFilters({ ...filters, paymentStatus: val })}
                        />
                    </div>

                    {/* Cash Status */}
                    <div className="space-y-1">
                        <Label className="text-xs text-gray-500">Cash</Label>
                        <div className="hidden md:block">
                            <Select
                                value={filters.cashStatus}
                                onValueChange={(value) => setFilters({ ...filters, cashStatus: value })}
                            >
                                <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All</SelectItem>
                                    <SelectItem value="cash_only">Cash</SelectItem>
                                    <SelectItem value="exclude_cash">Card</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <MobileSelectTrigger
                            label="Cash/Card"
                            value={filters.cashStatus}
                            options={[
                                { value: 'all', label: 'All' },
                                { value: 'cash_only', label: 'Cash Only' },
                                { value: 'exclude_cash', label: 'Card Only' }
                            ]}
                            onSelect={(val) => setFilters({ ...filters, cashStatus: val })}
                        />
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}