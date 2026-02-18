import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import AmountInput from "../ui/AmountInput";
import { CustomButton } from "@/components/ui/CustomButton";
import { Search, X, Check, Tag, ChevronRight, TrendingUp, TrendingDown, Shield, Sparkles, CheckCircle, Clock, Banknote, CreditCard, SlidersHorizontal, CalendarDays } from "lucide-react";
import DateRangePicker from "../ui/DateRangePicker";
import { cn } from "@/lib/utils";
import CategorySelect from "../ui/CategorySelect";
import { useMemo, useState } from "react";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerTrigger, DrawerClose, DrawerFooter } from "@/components/ui/drawer";
import { isDateInRange } from "../utils/dateUtils";
import { usePeriod } from "../hooks/usePeriod";
import { getCategoryIcon } from "../utils/iconMapConfig";
import { AnimatePresence, motion } from "framer-motion";

// Move helpers OUTSIDE to prevent re-mounting on every state change
const MobileSelectTrigger = ({ label, value, options, onSelect, placeholder }) => {
    const selectedLabel = options.find(opt => opt.value === value)?.label || placeholder || value;
    return (
        <Drawer modal={false}>
            <DrawerTrigger asChild>
                <button className="flex h-9 w-full items-center justify-between rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm md:hidden text-foreground">
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
                                    value === opt.value ? "bg-primary/10 text-primary" : "active:bg-accent"
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
                <button className="flex h-9 w-full items-center justify-between rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm md:hidden text-foreground">
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
                                    isSelected ? "bg-primary/10 text-primary" : "active:bg-accent"
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
                <div className="p-4 border-t bg-muted/50 pb-[calc(1rem+env(safe-area-inset-bottom))]">
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

// Helper Component for Toggle Buttons
const FilterToggle = ({ value, onChange, options }) => (
    <div className="flex bg-muted p-1 rounded-lg w-full">
        {options.map((opt) => (
            <button
                key={opt.value}
                onClick={() => onChange(opt.value === value ? 'all' : opt.value)} // Click active to deselect (optional UX choice, or just set)
                className={cn(
                    "flex-1 flex items-center justify-center gap-1.5 py-1.5 text-xs font-medium rounded-md transition-all",
                    value === opt.value ? "bg-background shadow text-primary" : "text-muted-foreground hover:text-foreground"
                )}
            >
                {opt.icon && <opt.icon className="w-3.5 h-3.5" />}
                <span>{opt.label}</span>
            </button>
        ))}
    </div>
);

// Reusable filter fields content - MOVED OUTSIDE the function to prevent remounting
const FilterFields = ({ filters, setFilters, categories, filteredCustomBudgets, handleCategoryChange }) => (
    <>
        {/* Category (Multi-select) */}
        <div className="space-y-1 lg:col-span-1">
            <Label className="text-xs text-muted-foreground">Category</Label>
            <CategorySelect
                value={filters.category}
                onValueChange={handleCategoryChange}
                categories={categories}
                placeholder="All Categories"
                multiple={true}
            />
        </div>

        {/* Custom Budget */}
        <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Budget</Label>
            <div className="md:hidden">
                <MobileSelectTrigger
                    label="Select Budget"
                    value={filters.budgetId}
                    placeholder="All Budgets"
                    onSelect={(val) => setFilters({ ...filters, budgetId: val })}
                    options={[
                        { value: 'all', label: 'All Budgets' },
                        ...filteredCustomBudgets.map(b => ({ value: b.id, label: b.name }))
                    ]}
                />
            </div>
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
        </div>

        {/* Type */}
        <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Type</Label>
            <FilterToggle
                value={filters.type}
                onChange={(val) => setFilters({ ...filters, type: val })}
                options={[
                    { value: 'income', label: 'Income', icon: TrendingUp },
                    { value: 'expense', label: 'Expense', icon: TrendingDown }
                ]}
            />
        </div>

        {/* Financial Priority */}
        <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Priority</Label>
            <FilterToggle
                value={filters.financialPriority}
                onChange={(val) => setFilters({ ...filters, financialPriority: val })}
                options={[
                    { value: 'needs', label: 'Essentials', icon: Shield },
                    { value: 'wants', label: 'Lifestyle', icon: Sparkles }
                ]}
            />
        </div>

        {/* Payment Status */}
        <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Payment</Label>
            <FilterToggle
                value={filters.paymentStatus}
                onChange={(val) => setFilters({ ...filters, paymentStatus: val })}
                options={[
                    { value: 'paid', label: 'Paid', icon: CheckCircle },
                    { value: 'unpaid', label: 'Unpaid', icon: Clock }
                ]}
            />
        </div>

        {/* Cash Status */}
        <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Cash</Label>
            <FilterToggle
                value={filters.cashStatus}
                onChange={(val) => setFilters({ ...filters, cashStatus: val })}
                options={[
                    { value: 'cash_only', label: 'Cash', icon: Banknote },
                    { value: 'exclude_cash', label: 'Card', icon: CreditCard }
                ]}
            />
        </div>

        {/* Amount Range */}
        <div className="space-y-1 col-span-1 md:col-span-2 lg:col-span-1">
            <Label className="text-xs text-muted-foreground">Amount Range</Label>
            <div className="flex items-center gap-2">
                <AmountInput
                    placeholder="Min"
                    className="h-9 text-xs"
                    hideSymbol={true}
                    value={filters.minAmount}
                    onChange={(val) => setFilters({ ...filters, minAmount: val })}
                />
                <span className="text-muted-foreground">-</span>
                <AmountInput
                    placeholder="Max"
                    className="h-9 text-xs"
                    hideSymbol={true}
                    value={filters.maxAmount}
                    onChange={(val) => setFilters({ ...filters, maxAmount: val })}
                />
            </div>
        </div>
    </>
);

export default function TransactionFilters({ filters, setFilters, categories, allCustomBudgets = [], sortConfig, onSort }) {
    const { monthStart, monthEnd } = usePeriod();
    const [isMobileDrawerOpen, setIsMobileDrawerOpen] = useState(false);

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
            endDate: monthEnd,
            minAmount: '',
            maxAmount: ''
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
        filters.type !== 'all',
        filters.category.length > 0,
        filters.paymentStatus !== 'all',
        filters.cashStatus !== 'all',
        filters.financialPriority !== 'all',
        filters.budgetId !== 'all',
        filters.minAmount !== '',
        filters.maxAmount !== ''
    ].filter(Boolean).length;

    return (
        <Card className="border-none shadow-md md:shadow-lg bg-card">
            <CardContent className="p-3 md:p-4 space-y-4">
                {/* Top Row: Search and Date Range */}
                <div className="flex gap-2">
                    <div className="relative flex-1">
                        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Search..."
                            className="pl-9 bg-muted/50 md:bg-background"
                            value={filters.search}
                            onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                        />
                    </div>

                    {/* MOBILE: Filter & Date Buttons */}
                    <div className="flex md:hidden gap-2">
                        <Drawer open={isMobileDrawerOpen} onOpenChange={setIsMobileDrawerOpen}>
                            <DrawerTrigger asChild>
                                <CustomButton variant="outline" size="icon" className="relative shrink-0">
                                    <SlidersHorizontal className="w-4 h-4 text-muted-foreground" />
                                    {activeFilterCount > 0 && (
                                        <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[10px] text-primary-foreground">
                                            {activeFilterCount}
                                        </span>
                                    )}
                                </CustomButton>
                            </DrawerTrigger>
                            <DrawerContent className="max-h-[85vh]">
                                <DrawerHeader>
                                    <DrawerTitle>Filters</DrawerTitle>
                                </DrawerHeader>
                                <div className="p-4 overflow-y-auto space-y-4">

                                    {/* Sorting Section */}
                                    <div className="space-y-2 pb-4 border-b border-border">
                                        <Label className="text-xs text-muted-foreground">Sort By</Label>
                                        <div className="grid grid-cols-2 gap-2">
                                            {[
                                                { label: 'Date', key: 'date' },
                                                { label: 'Amount', key: 'amount' },
                                                { label: 'Category', key: 'category' },
                                                { label: 'Paid Date', key: 'paidDate' }
                                            ].map((sortItem) => {
                                                const isActive = sortConfig?.key === sortItem.key;
                                                return (
                                                    <button
                                                        key={sortItem.key}
                                                        onClick={() => onSort({
                                                            key: sortItem.key,
                                                            direction: isActive && sortConfig.direction === 'desc' ? 'asc' : 'desc'
                                                        })}
                                                        className={cn(
                                                            "flex items-center justify-center px-3 py-2 rounded-lg text-sm font-medium border transition-colors",
                                                            isActive ? "bg-primary/10 border-primary text-primary" : "bg-card border-input hover:bg-accent"
                                                        )}
                                                    >
                                                        {sortItem.label}
                                                        {isActive && (sortConfig.direction === 'asc' ? <TrendingUp className="w-3 h-3 ml-2" /> : <TrendingDown className="w-3 h-3 ml-2" />)}
                                                    </button>
                                                )
                                            })}
                                        </div>
                                    </div>

                                    {/* Date Range Picker (Moved from top bar) */}
                                    <div className="space-y-1">
                                        <Label className="text-xs text-muted-foreground">Date Range</Label>
                                        <DateRangePicker
                                            startDate={filters.startDate}
                                            endDate={filters.endDate}
                                            onRangeChange={handleDateRangeChange}
                                            className="w-full"
                                        />
                                    </div>
                                    <FilterFields
                                        filters={filters}
                                        setFilters={setFilters}
                                        categories={categories}
                                        filteredCustomBudgets={filteredCustomBudgets}
                                        handleCategoryChange={handleCategoryChange}
                                    />
                                </div>
                                <DrawerFooter>
                                    <div className="flex gap-2 w-full">
                                        <CustomButton variant="outline" className="flex-1" onClick={handleClearFilters}>
                                            Clear All
                                        </CustomButton>
                                        <DrawerClose asChild>
                                            <CustomButton variant="primary" className="flex-1">
                                                Show Results
                                            </CustomButton>
                                        </DrawerClose>
                                    </div>
                                </DrawerFooter>
                            </DrawerContent>
                        </Drawer>
                    </div>

                    {/* DESKTOP: Date Picker & Clear Button */}
                    <div className="hidden md:flex items-center">
                        <AnimatePresence>
                            {(activeFilterCount > 0 || filters.search) && (
                                <motion.div
                                    initial={{ width: 0, opacity: 0, x: 20 }}
                                    animate={{ width: "auto", opacity: 1, x: 0 }}
                                    exit={{ width: 0, opacity: 0, x: 20 }}
                                    transition={{ duration: 0.2, ease: "easeOut" }}
                                    className="overflow-hidden flex items-center"
                                >
                                    <CustomButton
                                        variant="ghost"
                                        size="sm"
                                        onClick={handleClearFilters}
                                        className="text-muted-foreground hover:text-destructive mr-2 whitespace-nowrap px-2 md:px-3"
                                    >
                                        <X className="w-4 h-4 mr-1" />
                                        Clear
                                    </CustomButton>
                                </motion.div>
                            )}
                        </AnimatePresence>

                        <DateRangePicker
                            startDate={filters.startDate}
                            endDate={filters.endDate}
                            onRangeChange={handleDateRangeChange}
                        />
                    </div>
                </div>

                {/* DESKTOP: Grid Layout (Hidden on Mobile) */}
                <div className="hidden md:grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
                    <FilterFields
                        filters={filters}
                        setFilters={setFilters}
                        categories={categories}
                        filteredCustomBudgets={filteredCustomBudgets}
                        handleCategoryChange={handleCategoryChange}
                    />
                </div>

                {/* Mobile Active Filters Summary (Visual Cue) */}
                <div className="md:hidden flex gap-2 overflow-x-auto pb-1 no-scrollbar">
                    {activeFilterCount > 0 && (
                        <div className="text-xs bg-primary/10 text-primary px-2 py-1 rounded-full whitespace-nowrap">
                            {activeFilterCount} Active Filters
                        </div>
                    )}
                    {isDateChanged && (
                        <div className="text-xs bg-accent text-accent-foreground px-2 py-1 rounded-full whitespace-nowrap flex items-center">
                            <CalendarDays className="w-3 h-3 mr-1" />
                            Custom Dates
                        </div>
                    )}
                </div>
            </CardContent>
        </Card>
    );
}