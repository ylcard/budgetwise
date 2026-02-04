import { Card, CardContent } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { CustomButton } from "@/components/ui/CustomButton";
import { DayPicker } from "react-day-picker";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarIcon, Search, X, ChevronLeft, ChevronRight, Check, Tag } from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import CategorySelect from "../ui/CategorySelect";
import { useState, useMemo, useCallback } from "react";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerTrigger, DrawerClose } from "@/components/ui/drawer";
import { isDateInRange } from "../utils/dateUtils";
import { usePeriod } from "../hooks/usePeriod";
import { getCategoryIcon } from "../utils/iconMapConfig";

export default function TransactionFilters({ filters, setFilters, categories, allCustomBudgets = [] }) {
    const { monthStart, monthEnd } = usePeriod();
    const [isPickerOpen, setIsPickerOpen] = useState(false);

    const handleCategoryChange = (newCategories) => {
        setFilters({ ...filters, category: newCategories });
    };

    const handleRangeSelect = (range) => {
        // We only update if we have a range or it's cleared
        setFilters({
            ...filters,
            startDate: range?.from ? format(range.from, 'yyyy-MM-dd') : '',
            endDate: range?.to ? format(range.to, 'yyyy-MM-dd') : ''
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
            customBudgetId: 'all',
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
        filters.customBudgetId !== 'all',
        isDateChanged
    ].filter(Boolean).length;

    // Prepare the selected range object for DayPicker
    const selectedRange = {
        from: filters.startDate ? new Date(filters.startDate) : undefined,
        to: filters.endDate ? new Date(filters.endDate) : undefined
    };

    // Helper to render native-like selection for mobile
    const MobileSelectTrigger = ({ label, value, options, onSelect, placeholder }) => {
        const selectedLabel = options.find(opt => opt.value === value)?.label || placeholder || value;
        return (
            <Drawer>
                <DrawerTrigger asChild>
                    <button className="flex h-9 w-full items-center justify-between rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm md:hidden">
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
                                    onClick={() => {
                                        onSelect(opt.value);
                                    }}
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

    // NEW: Specialized multi-select trigger for Categories
    const MobileCategoryTrigger = () => {
        const selectedCount = filters.category.length;
        const label = selectedCount === 0 ? "All Categories" : `${selectedCount} Selected`;

        return (
            <Drawer>
                <DrawerTrigger asChild>
                    <button className="flex h-9 w-full items-center justify-between rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm md:hidden">
                        <span className="truncate">{label}</span>
                        <Tag className="h-4 w-4 opacity-50" />
                    </button>
                </DrawerTrigger>
                <DrawerContent>
                    <DrawerHeader>
                        <DrawerTitle>Select Categories</DrawerTitle>
                    </DrawerHeader>
                    <div className="p-4 space-y-1 max-h-[60vh] overflow-y-auto pb-[calc(2rem+env(safe-area-inset-bottom))]">
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
                                        handleCategoryChange(newCats);
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
                </DrawerContent>
            </Drawer>
        );
    };

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

                        <Popover open={isPickerOpen} onOpenChange={setIsPickerOpen}>
                            <PopoverTrigger asChild>
                                <CustomButton
                                    id="date"
                                    variant="outline"
                                    className={cn(
                                        "w-[260px] justify-start text-left font-normal",
                                        !filters.startDate && "text-muted-foreground"
                                    )}
                                >
                                    <CalendarIcon className="mr-2 h-4 w-4" />
                                    {filters.startDate ? (
                                        filters.endDate ? (
                                            <>
                                                {format(new Date(filters.startDate), "LLL dd, y")} -{" "}
                                                {format(new Date(filters.endDate), "LLL dd, y")}
                                            </>
                                        ) : (
                                            format(new Date(filters.startDate), "LLL dd, y")
                                        )
                                    ) : (
                                        <span>Pick a date</span>
                                    )}
                                </CustomButton>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="end">
                                <DayPicker
                                    mode="range"
                                    defaultMonth={selectedRange.from}
                                    selected={selectedRange}
                                    onSelect={handleRangeSelect}
                                    showOutsideDays={false}
                                    className="p-3"
                                    classNames={{
                                        months: "flex flex-col sm:flex-row space-y-4 sm:space-x-4 sm:space-y-0",
                                        month: "space-y-4",
                                        caption: "flex justify-center pt-1 relative items-center",
                                        caption_label: "text-sm font-medium",
                                        nav: "space-x-1 flex items-center absolute right-1",
                                        nav_button: cn(
                                            buttonVariants({ variant: "outline" }),
                                            "h-7 w-7 bg-transparent p-0 opacity-50 hover:opacity-100"
                                        ),
                                        nav_button_previous: "",
                                        nav_button_next: "",
                                        table: "w-full border-collapse space-y-1",
                                        weekdays: "flex",
                                        weekday: "text-muted-foreground rounded-md w-9 font-normal text-[0.8rem]",
                                        week: "flex w-full mt-2",
                                        cell: "h-9 w-9 text-center text-sm p-0 relative [&:has([aria-selected].day-range-end)]:rounded-r-md [&:has([aria-selected].day-outside)]:bg-blue-50/50 [&:has([aria-selected])]:bg-blue-50 first:[&:has([aria-selected])]:rounded-l-md last:[&:has([aria-selected])]:rounded-r-md focus-within:relative focus-within:z-20",
                                        day: cn(
                                            buttonVariants({ variant: "ghost" }),
                                            "h-9 w-9 p-0 font-normal aria-selected:opacity-100"
                                        ),
                                        range_end: "day-range-end",
                                        selected: "bg-blue-600 text-white hover:bg-blue-600 hover:text-white focus:bg-blue-600 focus:text-white rounded-full",
                                        today: "bg-accent text-accent-foreground",
                                        outside: "day-outside text-muted-foreground opacity-50 aria-selected:bg-blue-50/50 aria-selected:text-muted-foreground aria-selected:opacity-30",
                                        disabled: "text-muted-foreground opacity-50",
                                        range_middle: "aria-selected:bg-blue-50 aria-selected:text-blue-700 !rounded-none",
                                        hidden: "invisible",
                                    }}
                                    components={{
                                        IconLeft: ({ ...props }) => <ChevronLeft {...props} className="h-4 w-4" />,
                                        IconRight: ({ ...props }) => <ChevronRight {...props} className="h-4 w-4" />,
                                    }}
                                />
                            </PopoverContent>
                        </Popover>

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
                        <MobileCategoryTrigger />
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
                                value={filters.customBudgetId}
                                onValueChange={(value) => setFilters({ ...filters, customBudgetId: value })}
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
                            value={filters.customBudgetId}
                            options={[
                                { value: 'all', label: 'All Budgets' },
                                ...filteredCustomBudgets.map(b => ({ value: b.id, label: b.name }))
                            ]}
                            onSelect={(val) => setFilters({ ...filters, customBudgetId: val })}
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