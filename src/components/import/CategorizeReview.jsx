import { useMemo, useState } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CustomButton } from "@/components/ui/CustomButton";
import { Trash2, ArrowUpDown, ArrowUp, ArrowDown, RefreshCw, Check, X, Tag, Calendar, Wallet, ShieldCheck, Sparkles } from "lucide-react";
import { formatCurrency } from "@/components/utils/currencyUtils";
import { useSettings } from "@/components/utils/SettingsContext";
import { Input } from "@/components/ui/input";
import { MobileDrawerSelect } from "@/components/ui/MobileDrawerSelect";
import { Checkbox } from "@/components/ui/checkbox";
import CategorySelect from "@/components/ui/CategorySelect";
import { FINANCIAL_PRIORITIES } from "@/components/utils/constants";
import { parseDate, formatDate } from "@/components/utils/dateUtils";

export default function CategorizeReview({ data, categories, allBudgets = [], onUpdateRow, onDeleteRows }) {
    const { settings } = useSettings();
    const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' });
    const [selectedIndices, setSelectedIndices] = useState(new Set());

    const [editingTitle, setEditingTitle] = useState({ index: null, value: "" });

    const startEditing = (index, currentTitle) => {
        setEditingTitle({ index, value: currentTitle });
    };

    const saveTitle = (index) => {
        onUpdateRow(index, { title: editingTitle.value });
        setEditingTitle({ index: null, value: "" });
    };

    const cancelEditing = () => {
        setEditingTitle({ index: null, value: "" });
    };

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
                {/* --- MOBILE VIEW (Cards) --- */}
                <div className="block md:hidden space-y-4">
                    {sortedData.map((row) => (
                        <div
                            key={row.originalIndex}
                            className={`p-4 rounded-2xl border bg-white shadow-sm space-y-3 ${selectedIndices.has(row.originalIndex) ? "border-blue-500 bg-blue-50/30" : "border-gray-100"}`}
                        >
                            {/* Header: Identity & Amount */}
                            <div className="flex justify-between items-center">
                                <div className="flex items-center gap-3 overflow-hidden">
                                    <Checkbox
                                        checked={selectedIndices.has(row.originalIndex)}
                                        onCheckedChange={() => toggleSelectRow(row.originalIndex)}
                                    />
                                    <div className="flex flex-col">
                                        {editingTitle.index === row.originalIndex ? (
                                            <Input
                                                value={editingTitle.value}
                                                onChange={(e) => setEditingTitle(prev => ({ ...prev, value: e.target.value }))}
                                                className="h-7 text-sm"
                                                autoFocus
                                                onBlur={() => saveTitle(row.originalIndex)}
                                                onKeyDown={(e) => {
                                                    if (e.key === 'Enter') {
                                                        saveTitle(row.originalIndex);
                                                    }
                                                    if (e.key === 'Escape') cancelEditing();
                                                }}
                                            />
                                        ) : (
                                            <span onClick={() => startEditing(row.originalIndex, row.title)} className="font-bold text-gray-900 leading-none truncate max-w-[140px] sm:max-w-[200px]">
                                                {row.title}
                                            </span>
                                        )}
                                        <span className="text-[10px] text-gray-400 font-bold uppercase mt-1 tracking-wider">{row.date}</span>
                                    </div>
                                </div>

                                <div
                                    className={`text-right cursor-pointer`}
                                    onClick={() => onUpdateRow(row.originalIndex, { type: row.type === 'expense' ? 'income' : 'expense' })}
                                >
                                    <div className={`text-lg font-black flex items-center justify-end gap-1 leading-none ${row.type === 'expense' ? 'text-red-600' : 'text-green-600'}`}>
                                        {formatCurrency(row.amount, settings)}
                                        <RefreshCw className="w-3 h-3 opacity-30" />
                                    </div>
                                </div>
                            </div>

                            {/* Actions Stack: Semantic Icons */}
                            <div className="space-y-2 pt-2 border-t border-gray-100">
                                {/* Row 1: Category */}
                                <CategorySelect
                                    value={row.categoryId}
                                    categories={categories}
                                    className="border-none bg-gray-50/60 h-9 px-3 shadow-none hover:bg-gray-100 justify-start w-full text-xs font-medium"
                                    onValueChange={(value) => {
                                        const cat = categories.find(c => c.id === value);
                                        onUpdateRow(row.originalIndex, {
                                            categoryId: value,
                                            category: cat ? cat.name : 'Uncategorized',
                                            financial_priority: cat ? (cat.priority || 'wants') : row.financial_priority
                                        });
                                    }}
                                />

                                {/* Row 2: Priority */}
                                <MobileDrawerSelect
                                    value={row.financial_priority || 'wants'}
                                    onValueChange={(val) => onUpdateRow(row.originalIndex, { financial_priority: val })}
                                    options={Object.entries(FINANCIAL_PRIORITIES).filter(([k]) => k !== 'savings').map(([k, v]) => ({ value: k, label: v.label }))}
                                    customTrigger={
                                        <button className="w-full flex items-center gap-3 px-3 h-9 rounded-lg bg-gray-50/60 hover:bg-gray-100 transition-colors text-left">
                                            {row.financial_priority === 'needs' ? <ShieldCheck className="w-4 h-4 text-emerald-500" /> : <Sparkles className="w-4 h-4 text-amber-500" />}
                                            <span className="text-xs font-medium text-gray-700">{FINANCIAL_PRIORITIES[row.financial_priority]?.label}</span>
                                        </button>
                                    }
                                />

                                {/* Row 3: Budget */}
                                <MobileDrawerSelect
                                    value={row.budgetId || "system"}
                                    onValueChange={(val) => onUpdateRow(row.originalIndex, { budgetId: val === "system" ? null : val })}
                                    options={[
                                        {
                                            value: "system",
                                            label: `System: ${FINANCIAL_PRIORITIES[row.financial_priority]?.label} (${(() => {
                                                const effectiveDate = (row.isPaid && row.paidDate) ? row.paidDate : row.date;
                                                const d = parseDate(effectiveDate);
                                                if (!d) return '';
                                                const isCurr = d.getFullYear() === new Date().getFullYear();
                                                return formatDate(d, isCurr ? "MMM" : "MMM yyyy");
                                            })()})`
                                        },
                                        ...sortedCustomBudgets.map(cb => ({ value: cb.id, label: cb.name }))
                                    ]}
                                    customTrigger={
                                        <button className="w-full flex items-center gap-3 px-3 h-9 rounded-lg bg-gray-50/60 hover:bg-gray-100 transition-colors text-left overflow-hidden">
                                            <Wallet className="w-4 h-4 text-indigo-500 flex-shrink-0" />
                                            <span className="text-xs font-medium text-gray-700 truncate pr-2">
                                                {row.budgetId ? sortedCustomBudgets.find(b => b.id === row.budgetId)?.name : "System Budget"}
                                            </span>
                                        </button>
                                    }
                                />
                            </div>
                        </div>
                    ))}
                </div>

                {/* --- DESKTOP VIEW (Refined Table) --- */}
                <div className="hidden md:block rounded-md border overflow-auto max-h-[600px]">
                    <Table className="relative">
                        <TableHeader>
                            <TableRow>
                                <TableHead className="w-[40px]">
                                    <Checkbox
                                        checked={data.length > 0 && selectedIndices.size === data.length}
                                        onCheckedChange={toggleSelectAll}
                                    />
                                </TableHead>
                                <TableHead
                                    className="cursor-pointer hover:bg-gray-50 transition-colors"
                                    onClick={() => handleSort('title')}
                                >
                                    <div className="flex items-center">Transaction {getSortIcon('title')}</div>
                                </TableHead>
                                <TableHead className="w-[180px]">Category</TableHead>
                                <TableHead className="w-[160px]">Budget</TableHead>
                                <TableHead className="w-[120px]">Priority</TableHead>
                                <TableHead
                                    className="text-right cursor-pointer hover:bg-gray-50 transition-colors"
                                    onClick={() => handleSort('amount')}
                                >
                                    <div className="flex items-center justify-end">Amount/Type {getSortIcon('amount')}</div>
                                </TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {sortedData.map((row) => (
                                <TableRow key={row.originalIndex} className={`${selectedIndices.has(row.originalIndex) ? "bg-blue-50/30" : ""} group`}>
                                    <TableCell>
                                        <Checkbox
                                            checked={selectedIndices.has(row.originalIndex)}
                                            onCheckedChange={() => toggleSelectRow(row.originalIndex)}
                                        />
                                    </TableCell>
                                    <TableCell className="max-w-[220px]">
                                        <div className="flex flex-col">
                                            {editingTitle.index === row.originalIndex ? (
                                                <div className="flex items-center gap-1 animate-in fade-in zoom-in-95 duration-200">
                                                    <Input
                                                        value={editingTitle.value}
                                                        onChange={(e) => setEditingTitle(prev => ({ ...prev, value: e.target.value }))}
                                                        className="h-8 text-sm"
                                                        autoFocus
                                                        onKeyDown={(e) => {
                                                            if (e.key === 'Enter') {
                                                                saveTitle(row.originalIndex);
                                                            }
                                                            if (e.key === 'Escape') cancelEditing();
                                                        }}
                                                    />
                                                    <button onClick={() => saveTitle(row.originalIndex)} className="text-green-600 hover:bg-green-50 p-1 rounded"><Check className="w-4 h-4" /></button>
                                                </div>
                                            ) : (
                                                <span
                                                    onClick={() => startEditing(row.originalIndex, row.title)}
                                                    className="font-medium text-gray-900 cursor-pointer hover:underline decoration-dotted truncate"
                                                >
                                                    {row.title}
                                                </span>
                                            )}
                                            <span className="text-[10px] text-gray-400 font-bold uppercase tracking-tight">{row.date}</span>
                                        </div>
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
                                                        label: `${FINANCIAL_PRIORITIES[row.financial_priority]?.label || 'System Budget'} (${(() => {
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
                                                options={Object.entries(FINANCIAL_PRIORITIES)
                                                    .filter(([key]) => key !== 'savings')
                                                    .map(([key, config]) => ({
                                                        value: key,
                                                        label: config.label
                                                    }))}
                                                className="w-full h-8 text-xs"
                                            />
                                        ) : (
                                            <span className="text-gray-400 text-xs">-</span>
                                        )}
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <div className="flex items-center justify-end gap-2 group/amount">
                                            <button
                                                onClick={() => onUpdateRow(row.originalIndex, { type: row.type === 'expense' ? 'income' : 'expense' })}
                                                className="opacity-0 group-hover/amount:opacity-100 transition-opacity p-1 hover:bg-gray-100 rounded text-gray-400 hover:text-blue-600"
                                            >
                                                <RefreshCw className="w-3.5 h-3.5" />
                                            </button>
                                            <span className={`font-bold ${row.type === 'expense' ? 'text-red-600' : 'text-green-600'}`}>
                                                {formatCurrency(row.amount, settings)}
                                            </span>
                                        </div>
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