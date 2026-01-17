import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, X } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { CustomButton } from "@/components/ui/CustomButton";
// import DateRangePicker from "../ui/DateRangePicker";
import { DayPicker } from "react-day-picker";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import "react-day-picker/dist/style.css";
import CategorySelect from "../ui/CategorySelect";
import { useMemo } from "react";
import { isDateInRange } from "../utils/dateUtils";
import { usePeriod } from "../hooks/usePeriod";

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
                        {/* Direct implementation of DayPicker Range Mode */}
                        <Popover open={isPickerOpen} onOpenChange={setIsPickerOpen}>
                            <PopoverTrigger asChild>
                                <CustomButton
                                    variant="outline"
                                    className="h-9 justify-start text-left font-normal"
                                >
                                    <CalendarIcon className="mr-2 h-4 w-4" />
                                    {filters.startDate && filters.endDate ? (
                                        <span>
                                            {/* You can change this text to whatever you want, e.g., just "Jan 2026" */}
                                            {format(new Date(filters.startDate), "LLL dd, y")} - {format(new Date(filters.endDate), "LLL dd, y")}
                                        </span>
                                    ) : (
                                        <span>Pick a date</span>
                                    )}
                                </CustomButton>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="end">
                                <DayPicker
                                    mode="range"
                                    defaultMonth={filters.startDate ? new Date(filters.startDate) : new Date()}
                                    selected={{
                                        from: filters.startDate ? new Date(filters.startDate) : undefined,
                                        to: filters.endDate ? new Date(filters.endDate) : undefined
                                    }}
                                    onSelect={handleRangeSelect}
                                    weekStartsOn={1}
                                    showOutsideDays
                                    className="p-3"
                                    modifiersClassNames={{
                                        selected: 'bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground focus:bg-primary focus:text-primary-foreground',
                                        today: 'bg-accent text-accent-foreground'
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
                        <Select
                            value={filters.type}
                            onValueChange={(value) => setFilters({ ...filters, type: value })}
                        >
                            <SelectTrigger className="h-9">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Types</SelectItem>
                                <SelectItem value="income">Income</SelectItem>
                                <SelectItem value="expense">Expense</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    {/* Category (Multi-select) */}
                    <div className="space-y-1 lg:col-span-1">
                        <Label className="text-xs text-gray-500">Category</Label>
                        <CategorySelect
                            value={filters.category}
                            onValueChange={handleCategoryChange}
                            categories={categories}
                            placeholder="All Categories"
                            multiple={true}
                        />
                    </div>

                    {/* Financial Priority */}
                    <div className="space-y-1">
                        <Label className="text-xs text-gray-500">Priority</Label>
                        <Select
                            value={filters.financialPriority}
                            onValueChange={(value) => setFilters({ ...filters, financialPriority: value })}
                        >
                            <SelectTrigger className="h-9">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Priorities</SelectItem>
                                <SelectItem value="needs">Needs</SelectItem>
                                <SelectItem value="wants">Wants</SelectItem>
                                <SelectItem value="savings">Savings</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    {/* Custom Budget */}
                    <div className="space-y-1">
                        <Label className="text-xs text-gray-500">Budget</Label>
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
                                    <SelectItem key={b.id} value={b.id}>
                                        {b.name}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    {/* Payment Status */}
                    <div className="space-y-1">
                        <Label className="text-xs text-gray-500">Payment</Label>
                        <Select
                            value={filters.paymentStatus}
                            onValueChange={(value) => setFilters({ ...filters, paymentStatus: value })}
                        >
                            <SelectTrigger className="h-9">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Status</SelectItem>
                                <SelectItem value="paid">Paid</SelectItem>
                                <SelectItem value="unpaid">Unpaid</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    {/* Cash Status */}
                    <div className="space-y-1">
                        <Label className="text-xs text-gray-500">Cash</Label>
                        <Select
                            value={filters.cashStatus}
                            onValueChange={(value) => setFilters({ ...filters, cashStatus: value })}
                        >
                            <SelectTrigger className="h-9">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All</SelectItem>
                                <SelectItem value="cash_only">Cash</SelectItem>
                                <SelectItem value="exclude_cash">Card</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
