import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { CustomButton } from "@/components/ui/CustomButton";
import { ChevronLeft, ChevronRight, X, Trash, Loader2, ArrowUpDown, ArrowUp, ArrowDown, Edit2, Trash2, Banknote } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { motion, AnimatePresence } from "framer-motion";
import { format } from "date-fns";
import { formatCurrency } from "../utils/currencyUtils";
import { useSettings } from "../utils/SettingsContext";
import { getCategoryIcon } from "../utils/iconMapConfig";
import QuickAddTransaction from "./QuickAddTransaction";

export default function TransactionList({
    transactions,
    categories,
    onEdit,
    onDelete,
    isLoading,
    onSubmit,
    isSubmitting,
    customBudgets = [],
    monthStart = null,
    monthEnd = null,
    currentPage = 1,
    totalPages = 1,
    onPageChange,
    itemsPerPage = 10,
    onItemsPerPageChange,
    totalItems = 0,
    selectedIds = new Set(),
    onToggleSelection,
    onSelectAll,
    onClearSelection,
    onDeleteSelected,
    isBulkDeleting,
    sortConfig = { key: 'date', direction: 'desc' },
    onSort
}) {

    const { settings } = useSettings();

    const categoryMap = categories.reduce((acc, cat) => {
        acc[cat.id] = cat;
        return acc;
    }, {});

    const handleSort = (key) => {
        let direction = 'asc';
        if (sortConfig.key === key && sortConfig.direction === 'asc') {
            direction = 'desc';
        }
        onSort({ key, direction });
    };

    const handleRowClick = (e, id) => {
        // Prevent toggling if clicking directly on actions or checkbox
        if (e.target.closest('button') || e.target.closest('a') || e.target.closest('[role="checkbox"]')) return;
        onToggleSelection(id, !selectedIds.has(id));
    };

    const handleMobileRowClick = (transaction) => {
        // If we are in "Selection Mode", tapping the row toggles the checkbox
        // otherwise, it opens the edit modal.
        if (selectedIds.size > 0) {
            onToggleSelection(transaction.id, !selectedIds.has(transaction.id));
        } else {
            onEdit(transaction);
        }
    };

    const SortIcon = ({ columnKey }) => {
        if (sortConfig.key !== columnKey) return <ArrowUpDown className="w-3 h-3 ml-1 text-gray-400" />;
        return sortConfig.direction === 'asc'
            ? <ArrowUp className="w-3 h-3 ml-1 text-blue-600" />
            : <ArrowDown className="w-3 h-3 ml-1 text-blue-600" />;
    };

    if (isLoading) {
        return (
            <Card className="border-none shadow-lg">
                <CardHeader>
                    <CardTitle>All Transactions</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="space-y-3">
                        {Array(8).fill(0).map((_, i) => (
                            <Skeleton key={i} className="h-16 md:h-20 w-full" />
                        ))}
                    </div>
                </CardContent>
            </Card>
        );
    }

    if (transactions.length === 0 && totalItems === 0) {
        return (
            <Card className="border-none shadow-lg">
                <CardHeader>
                    <CardTitle>All Transactions</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="h-40 flex items-center justify-center text-gray-400">
                        <p>No transactions found. Add your first one!</p>
                    </div>
                </CardContent>
            </Card>
        );
    }

    // Check if all items on current page are selected
    const isAllSelected = transactions.length > 0 && transactions.every(t => selectedIds.has(t.id));

    const handleSelectAll = (checked) => {
        const ids = transactions.map(t => t.id);
        onSelectAll(ids, checked);
    };

    const PaginationControls = () => (
        <div className="flex items-center gap-2">
            <div className="text-xs md:text-sm text-gray-500 mr-2">
                Page {currentPage}/{totalPages}
            </div>
            <CustomButton
                variant="outline"
                size="sm"
                onClick={() => onPageChange(currentPage - 1)}
                disabled={currentPage === 1}
                className="h-8 w-8 p-0"
            >
                <ChevronLeft className="w-4 h-4" />
            </CustomButton>
            <CustomButton
                variant="outline"
                size="sm"
                onClick={() => onPageChange(currentPage + 1)}
                disabled={currentPage === totalPages}
                className="h-8 w-8 p-0"
            >
                <ChevronRight className="w-4 h-4" />
            </CustomButton>
        </div>
    );


    return (
        <Card className="border-none shadow-md md:shadow-lg overflow-hidden">
            {/* Header: Adaptive Padding */}
            <CardHeader className="flex flex-row items-center justify-between py-3 px-3 md:py-4 md:px-6 bg-white border-b">
                <div className="flex items-center gap-2 md:gap-4">
                    <CardTitle className="text-base md:text-lg">Transactions ({totalItems})</CardTitle>

                    {/* Bulk Actions Header */}
                    <AnimatePresence>
                        {selectedIds.size > 0 && (
                            <motion.div
                                initial={{ opacity: 0, x: -10 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -10 }}
                                className="flex items-center gap-2"
                            >
                                <span className="text-[10px] md:text-xs font-semibold text-blue-600 bg-blue-50 px-2 py-1 rounded">
                                    {selectedIds.size}
                                </span>
                                <CustomButton variant="destructive" size="sm" onClick={onDeleteSelected} disabled={isBulkDeleting} className="h-7 text-xs px-2 md:px-3">
                                    <Trash className="w-3 h-3" />
                                    <span className="hidden md:inline ml-1">Delete</span>
                                </CustomButton>
                                <CustomButton variant="ghost" size="sm" onClick={onClearSelection} className="h-7 w-7 p-0 rounded-full"><X className="w-3 h-3" /></CustomButton>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>

                <div className="flex items-center gap-2 md:gap-4">
                    {totalPages > 1 && <PaginationControls />}
                    {/* Items per page hidden on mobile to save space */}
                    <div className="hidden md:flex items-center gap-2">
                        <span className="text-sm text-gray-500 hidden sm:inline">Show:</span>
                        <Select
                            value={String(itemsPerPage)}
                            onValueChange={(value) => onItemsPerPageChange(Number(value))}
                        >
                            <SelectTrigger className="w-[70px] h-8">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="10">10</SelectItem>
                                <SelectItem value="20">20</SelectItem>
                                <SelectItem value="50">50</SelectItem>
                                <SelectItem value="100">100</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </div>
            </CardHeader>

            {/* DESKTOP VIEW: Table */}
            <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-sm text-left">
                    <thead className="text-xs text-gray-500 uppercase bg-gray-50 border-b">
                        <tr>
                            <th className="px-4 py-3 w-10">
                                <Checkbox checked={isAllSelected} onCheckedChange={handleSelectAll} />
                            </th>
                            <th className="px-4 py-3 cursor-pointer hover:bg-gray-100 transition-colors text-center" onClick={() => handleSort('title')}>
                                <div className="flex items-center justify-center">Title <SortIcon columnKey="title" /></div>
                            </th>
                            <th className="px-4 py-3 cursor-pointer hover:bg-gray-100 transition-colors text-center" onClick={() => handleSort('date')}>
                                <div className="flex items-center justify-center">Date <SortIcon columnKey="date" /></div>
                            </th>
                            <th className="px-4 py-3 cursor-pointer hover:bg-gray-100 transition-colors text-center" onClick={() => handleSort('paidDate')}>
                                <div className="flex items-center justify-center">Paid Date <SortIcon columnKey="paidDate" /></div>
                            </th>
                            <th className="px-4 py-3 cursor-pointer hover:bg-gray-100 transition-colors text-center" onClick={() => handleSort('category')}>
                                <div className="flex items-center justify-center">Category <SortIcon columnKey="category" /></div>
                            </th>
                            <th className="px-4 py-3 text-right cursor-pointer hover:bg-gray-100 transition-colors" onClick={() => handleSort('amount')}>
                                <div className="flex items-center justify-end">Amount <SortIcon columnKey="amount" /></div>
                            </th>
                            <th className="px-4 py-3 w-1/4 text-center">Note</th>
                            <th className="px-4 py-3 w-20 text-center">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {transactions.map((transaction) => {
                            const category = categoryMap[transaction.category_id];
                            const isIncome = transaction.type === 'income';
                            const Icon = getCategoryIcon(category?.icon);

                            return (
                                <tr
                                    key={transaction.id}
                                    onClick={(e) => handleRowClick(e, transaction.id)}
                                    className={`group hover:bg-blue-50/50 transition-colors cursor-pointer ${selectedIds.has(transaction.id) ? 'bg-blue-50' : ''}`}
                                >
                                    <td className="px-4 py-2">
                                        <Checkbox
                                            checked={selectedIds.has(transaction.id)}
                                            onCheckedChange={(checked) => onToggleSelection(transaction.id, checked)}
                                        />
                                    </td>
                                    <td className="px-4 py-2 font-medium text-gray-900">{transaction.title}</td>
                                    <td className="px-4 py-2 text-gray-500 whitespace-nowrap">
                                        {format(new Date(transaction.date), "MMM d, yyyy")}
                                    </td>
                                    <td className="px-4 py-2 text-gray-500 whitespace-nowrap text-center">
                                        {isIncome ? (
                                            <span className="text-gray-300">-</span>
                                        ) : transaction.paidDate ? (
                                            <span className="text-xs bg-green-50 text-green-700 px-2 py-0.5 rounded-full border border-green-100">
                                                {format(new Date(transaction.paidDate), "MMM d, yyyy")}
                                            </span>
                                        ) : (
                                            <span className="text-xs text-gray-400 italic">Pending</span>
                                        )}
                                    </td>
                                    <td className="px-4 py-2">
                                        {isIncome ? (
                                            <div className="text-center text-xs font-medium text-emerald-600 bg-emerald-50 py-1 px-2 rounded-full w-fit mx-auto">Income</div>
                                        ) : category ? (
                                            <div className="flex items-center justify-center gap-2">
                                                <div className="w-6 h-6 rounded-full flex items-center justify-center shrink-0" style={{ backgroundColor: `${category.color}20` }}>
                                                    <Icon className="w-3 h-3" style={{ color: category.color }} />
                                                </div>
                                                <span className="truncate max-w-[120px]">{category.name}</span>
                                            </div>
                                        ) : (
                                            <span className="text-gray-400 text-xs">Uncategorized</span>
                                        )}
                                    </td>
                                    <td className="px-4 py-2 text-right">
                                        <span className={`font-mono font-medium ${isIncome ? 'text-green-600' : 'text-red-600'}`}>
                                            {isIncome ? '+' : '-'}{formatCurrency(transaction.amount, settings)}
                                        </span>
                                    </td>
                                    <td className="px-4 py-2 text-gray-500 text-xs truncate max-w-[200px]" title={transaction.notes}>
                                        {transaction.notes || '-'}
                                    </td>
                                    <td className="px-4 py-2">
                                        <div className="flex items-center justify-center gap-1">
                                            <CustomButton variant="ghost" size="sm" onClick={() => onEdit(transaction)} className="h-8 w-8 p-0 hover:bg-gray-100">
                                                <Edit2 className="w-3 h-3 text-gray-500" />
                                            </CustomButton>
                                            <CustomButton variant="ghost" size="sm" onClick={() => onDelete(transaction)} className="h-8 w-8 p-0 hover:bg-red-50 hover:text-red-600">
                                                <Trash2 className="w-3 h-3" />
                                            </CustomButton>
                                        </div>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>

            {/* MOBILE VIEW: List */}
            <div className="block md:hidden">
                <ul className="divide-y divide-gray-100">
                    {transactions.map((transaction) => {
                        const category = categoryMap[transaction.category_id];
                        const isIncome = transaction.type === 'income';
                        const Icon = getCategoryIcon(category?.icon);
                        const isSelected = selectedIds.has(transaction.id);

                        return (
                            <li
                                key={transaction.id}
                                className={`flex items-start p-3 gap-3 transition-colors ${isSelected ? 'bg-blue-50' : 'bg-white active:bg-gray-50'}`}
                                onClick={() => handleMobileRowClick(transaction)}
                            >
                                {/* Selection Checkbox */}
                                <div className="pt-1" onClick={(e) => e.stopPropagation()}>
                                    <Checkbox
                                        checked={isSelected}
                                        onCheckedChange={(checked) => onToggleSelection(transaction.id, checked)}
                                        className="h-5 w-5 rounded-md border-gray-300"
                                    />
                                </div>

                                {/* Icon */}
                                <div className="shrink-0 pt-0.5">
                                    {isIncome ? (
                                        <div className="w-9 h-9 rounded-full flex items-center justify-center bg-emerald-100">
                                            <Banknote className="w-4 h-4 text-emerald-600" />
                                        </div>
                                    ) : (
                                        <div
                                            className="w-9 h-9 rounded-full flex items-center justify-center"
                                            style={{ backgroundColor: category ? `${category.color}20` : '#f3f4f6' }}
                                        >
                                            {category ? (
                                                <Icon className="w-4 h-4" style={{ color: category.color }} />
                                            ) : (
                                                <span className="text-gray-400 text-xs">?</span>
                                            )}
                                        </div>
                                    )}
                                </div>

                                {/* Main Content */}
                                <div className="flex-1 min-w-0">
                                    <div className="flex justify-between items-start gap-2">
                                        <p className="text-sm font-semibold text-gray-900 truncate">
                                            {transaction.title}
                                        </p>
                                        <span className={`text-sm font-mono font-bold whitespace-nowrap ${isIncome ? 'text-green-600' : 'text-red-600'}`}>
                                            {isIncome ? '+' : '-'}{formatCurrency(transaction.amount, settings)}
                                        </span>
                                    </div>

                                    <div className="flex items-center gap-2 mt-0.5 text-xs text-gray-500">
                                        <span>{format(new Date(transaction.date), "MMM d")}</span>

                                        {!isIncome && (
                                            <>
                                                <span className="text-gray-300">•</span>
                                                <span className="truncate max-w-[100px]">{category?.name || 'Uncategorized'}</span>

                                                {transaction.paidDate && (
                                                    <span className={`ml-1 px-1.5 py-0.5 rounded-sm text-[10px] border ${transaction.paidDate
                                                        ? "bg-green-50 text-green-700 border-green-100"
                                                        : "bg-gray-100 text-gray-500 border-gray-200"
                                                        }`}>
                                                        Paid
                                                    </span>
                                                )}
                                            </>
                                        )}
                                    </div>
                                    {transaction.notes && (
                                        <p className="text-xs text-gray-400 mt-1 truncate">
                                            {transaction.notes}
                                        </p>
                                    )}
                                </div>
                            </li>
                        );
                    })}
                </ul>
            </div>

            {/* Bottom Pagination */}
            {totalPages > 1 && (
                <div className="flex items-center justify-end p-3 border-t bg-gray-50/50">
                    <PaginationControls />
                </div>
            )}
        </Card>
    );
}
