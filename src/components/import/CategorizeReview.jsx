import { useMemo, useState } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CustomButton } from "@/components/ui/CustomButton";
import { Trash2, ArrowUpDown, ArrowUp, ArrowDown, Star, Clock, CheckCircle } from "lucide-react";
import { formatCurrency } from "@/components/utils/currencyUtils";
import { useSettings } from "@/components/utils/SettingsContext";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue, SelectGroup, SelectLabel } from "@/components/ui/select";
import { MobileDrawerSelect } from "@/components/ui/MobileDrawerSelect"; // ADDED 03-Feb-2026: iOS-native action sheets on mobile
import { Checkbox } from "@/components/ui/checkbox";
import CategorySelect from "@/components/ui/CategorySelect";
import { parseDate, formatDate, isDateInRange } from "@/components/utils/dateUtils";

export default function CategorizeReview({ data, categories, allBudgets = [], onUpdateRow, onDeleteRows }) {
    const { settings } = useSettings();
    const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' });
    const [selectedIndices, setSelectedIndices] = useState(new Set());

    // Requires refactor to allow intelligent filter, not just "active" CBs. For back-filling. */}
    // --- Sorting Logic ---
    const handleSort = (key) => {
        let direction = 'asc';
        if (sortConfig.key === key && sortConfig.direction === 'asc') {
            direction = 'desc';
        }
        setSortConfig({ key, direction });
    };

    const sortedData = useMemo(() => {
        const sortableItems = data.map((item, index) => ({ ...item, originalIndex: index }));
        if (sortConfig.key) {
            sortableItems.sort((a, b) => {
                let aValue = a[sortConfig.key];
                let bValue = b[sortConfig.key];

                // Handle specific sorts
                if (sortConfig.key === 'amount') aValue = Math.abs(a.amount);
                if (sortConfig.key === 'amount') bValue = Math.abs(b.amount);

                if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
                if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
                return 0;
            });
        }
        return sortableItems;
    }, [data, sortConfig]);

    // --- Selection Logic ---
    const toggleSelectAll = () => {
        if (selectedIndices.size === data.length) {
            setSelectedIndices(new Set());
        } else {
            const allIndices = new Set(data.map((_, i) => i));
            setSelectedIndices(allIndices);
        }
    };

    const toggleSelectRow = (originalIndex) => {
        const newSelected = new Set(selectedIndices);
        if (newSelected.has(originalIndex)) {
            newSelected.delete(originalIndex);
        } else {
            newSelected.add(originalIndex);
        }
        setSelectedIndices(newSelected);
    };

    const handleDeleteSelected = () => {
        onDeleteRows(Array.from(selectedIndices));
        setSelectedIndices(new Set());
    };

    // DEPRECATED: Show ALL budgets, but sort by relevance to the import dates.
    // const sortedCustomBudgets = useMemo(() => {
    //     if (data.length === 0) return customBudgets;

    // Separate Custom vs System budgets for the UI
    const customBudgets = useMemo(() => allBudgets.filter(b => !b.isSystemBudget), [allBudgets]);

    const sortedCustomBudgets = useMemo(() => {
        if (data.length === 0) return customBudgets;

        // Safe date parsing using dateUtils
        const timestamps = data.map(d => parseDate(d.date)?.getTime()).filter(t => t);
        const avgTime = timestamps.length > 0 ? (timestamps.reduce((a, b) => a + b, 0) / timestamps.length) : new Date().getTime();

        return [...customBudgets].sort((a, b) => {
            // Compare distance from budget start to average import date
            const timeA = parseDate(a.startDate)?.getTime() || 0;
            const timeB = parseDate(b.startDate)?.getTime() || 0;
            return Math.abs(timeA - avgTime) - Math.abs(timeB - avgTime);
        });
    }, [customBudgets, data]);

    // Helper for Sort Icons
    const getSortIcon = (key) => {
        if (sortConfig.key !== key) return <ArrowUpDown className="w-3 h-3 ml-1 opacity-50" />;
        return sortConfig.direction === 'asc'
            ? <ArrowUp className="w-3 h-3 ml-1 text-blue-500" />
            : <ArrowDown className="w-3 h-3 ml-1 text-blue-500" />;
    };

    return (
        <Card>
            <CardHeader>
                <div className="flex justify-between items-center">
                    <div>
                        <CardTitle className="flex items-center gap-2">
                            <span>Review & Categorize</span>
                            <Badge variant="outline">{data.length} records</Badge>
                        </CardTitle>
                        <p className="text-sm text-gray-500 mt-1">
                            Review the automatically categorized transactions below.
                        </p>
                    </div>
                    {selectedIndices.size > 0 && (
                        <CustomButton
                            variant="delete"
                            size="sm"
                            onClick={handleDeleteSelected}
                            className="animate-in fade-in slide-in-from-top-1"
                        >
                            <Trash2 className="w-4 h-4 mr-2" />
                            Delete {selectedIndices.size} Selected
                        </CustomButton>
                    )}
                </div>
            </CardHeader>
            <CardContent>
                <div className="rounded-md border overflow-auto max-h-[600px]">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead className="w-[40px]">
                                    <Checkbox
                                        checked={data.length > 0 && selectedIndices.size === data.length}
                                        onCheckedChange={toggleSelectAll}
                                    />
                                </TableHead>
                                <TableHead
                                    className="cursor-pointer hover:bg-gray-50 transition-colors whitespace-nowrap"
                                    onClick={() => handleSort('date')}
                                >
                                    <div className="flex items-center">Date {getSortIcon('date')}</div>
                                </TableHead>
                                <TableHead
                                    className="cursor-pointer hover:bg-gray-50 transition-colors"
                                    onClick={() => handleSort('title')}
                                >
                                    <div className="flex items-center">Title {getSortIcon('title')}</div>
                                </TableHead>
                                <TableHead className="w-[200px]">Category</TableHead>
                                <TableHead className="w-[180px]">Budget</TableHead>
                                <TableHead className="w-[110px]">Priority</TableHead>
                                <TableHead
                                    className="text-right cursor-pointer hover:bg-gray-50 transition-colors"
                                    onClick={() => handleSort('amount')}
                                >
                                    <div className="flex items-center justify-end">Amount {getSortIcon('amount')}</div>
                                </TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {sortedData.map((row) => (
                                <TableRow key={row.originalIndex} className={selectedIndices.has(row.originalIndex) ? "bg-blue-50/50" : ""}>
                                    <TableCell>
                                        <Checkbox
                                            checked={selectedIndices.has(row.originalIndex)}
                                            onCheckedChange={() => toggleSelectRow(row.originalIndex)}
                                        />
                                    </TableCell>
                                    <TableCell className="whitespace-nowrap font-medium text-gray-700">
                                        {row.date}
                                    </TableCell>
                                    <TableCell className="max-w-[200px] truncate" title={row.title}>
                                        {row.title}
                                    </TableCell>
                                    <TableCell>
                                        {row.type === 'expense' ? (
                                            <CategorySelect
                                                value={row.categoryId}
                                                categories={categories}
                                                onValueChange={(value) => {
                                                    const cat = categories.find(c => c.id === value);
                                                    onUpdateRow(row.originalIndex, {
                                                        categoryId: value,
                                                        category: cat ? cat.name : 'Uncategorized',
                                                        financial_priority: cat ? (cat.priority || 'wants') : row.financial_priority
                                                    });
                                                }}
                                            />
                                        ) : (
                                            <span className="text-gray-400 text-xs">-</span>
                                        )}
                                    </TableCell>
                                    <TableCell>
                                        {row.type === 'expense' ? (
                                            <MobileDrawerSelect
                                                value={row.budgetId || "system"}
                                                onValueChange={(val) => {
                                                    if (val === "system") {
                                                        onUpdateRow(row.originalIndex, { budgetId: null });
                                                    } else {
                                                        // Selected a Custom Budget
                                                        onUpdateRow(row.originalIndex, {
                                                            budgetId: val
                                                        });
                                                    }
                                                }}
                                                placeholder="Select Budget"
                                                options={[
                                                    {
                                                        value: "system",
                                                        label: `${row.financial_priority ? row.financial_priority.charAt(0).toUpperCase() + row.financial_priority.slice(1) : 'System Budget'} (${(() => {
                                                            // Use paidDate if available to match import logic (Cash Flow)
                                                            const effectiveDate = (row.isPaid && row.paidDate) ? row.paidDate : row.date;
                                                            const d = parseDate(effectiveDate);
                                                            if (!d) return '';
                                                            const isCurr = d.getFullYear() === new Date().getFullYear();
                                                            return formatDate(d, isCurr ? "MMM" : "MMM yyyy");
                                                        })()})`
                                                    },
                                                    ...sortedCustomBudgets.map(cb => ({
                                                        value: cb.id,
                                                        label: cb.name
                                                    }))
                                                ]}
                                                className="w-full h-8 text-xs"
                                            />
                                        ) : (
                                            <span className="text-gray-400 text-xs">-</span>
                                        )}
                                    </TableCell>
                                    <TableCell>
                                        {row.type === 'expense' ? (
                                            <MobileDrawerSelect
                                                value={row.financial_priority || 'wants'}
                                                onValueChange={(val) => onUpdateRow(row.originalIndex, { financial_priority: val })}
                                                placeholder="Select priority"
                                                options={[
                                                    { value: "needs", label: "Needs" },
                                                    { value: "wants", label: "Wants" },
                                                    { value: "savings", label: "Savings" }
                                                ]}
                                                className="w-full h-8 text-xs"
                                            />
                                        ) : (
                                            <span className="text-gray-400 text-xs">-</span>
                                        )}
                                    </TableCell>
                                    <TableCell className={`text-right font-medium ${row.type === 'expense' ? 'text-red-600' : 'text-green-600'}`}>
                                        {formatCurrency(Math.abs(row.amount), settings)}
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </div>
            </CardContent>
        </Card>
    );
}