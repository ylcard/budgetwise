import { useState, useEffect, useMemo } from "react";
import { useSettings } from "@/components/utils/SettingsContext";
import { useMergedCategories } from "@/components/hooks/useMergedCategories";
import { useRuleActions } from "@/components/hooks/useRuleActions";
import { CustomButton } from "@/components/ui/CustomButton";
import { BrainCircuit, Trash2, Loader2, Plus, X, Sparkles, ShieldCheck, Code2, Type, ChevronLeft, ChevronRight, Search, ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import CategorySelect from "@/components/ui/CategorySelect";
import { motion, AnimatePresence } from "framer-motion";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { useFAB } from "@/components/hooks/FABContext"; // Import Global FAB
import CreateRuleDialog from "@/components/automation/CreateRuleDialog";

export default function AutomationRulesSettings() {
    const { user } = useSettings();
    const { categories } = useMergedCategories();

    const {
        rules, isLoading,
        isDialogOpen, setIsDialogOpen,
        selectedIds, setSelectedIds,
        isRegexMode, setIsRegexMode,
        isWholeWord, setIsWholeWord,
        editingRuleId,
        formData, setFormData,
        createRule, deleteRule, updateRule, deleteBulkRules,
        handleToggleRuleMode, handleAddKeyword, handleRemoveKeyword,
        handleEditKeyword, handleSaveRule, handleCloseDialog,
        openRuleForEdit
    } = useRuleActions();

    const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
    const [ruleToDelete, setRuleToDelete] = useState(null);

    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(10);

    // --- SORTING & FILTERING STATE ---
    const [sortConfig, setSortConfig] = useState({ key: 'created_at', direction: 'desc' });
    const [filterText, setFilterText] = useState('');
    const [filterCategory, setFilterCategory] = useState('all');
    const [filterPriority, setFilterPriority] = useState('all');

    // FAB Integration
    const { setFabButtons, clearFabButtons } = useFAB();

    const fabButtons = useMemo(() => {
        const buttons = [];

        buttons.push({
            key: 'add-rule',
            label: 'Add Rule',
            icon: 'PlusCircle',
            variant: 'create',
            onClick: () => {
                setIsDialogOpen(true);
            }
        });

        return buttons;
    }, [selectedIds.size, setIsDialogOpen]); // Re-calculate when selection changes

    useEffect(() => {
        setFabButtons(fabButtons);
        return () => clearFabButtons();
    }, [fabButtons, setFabButtons, clearFabButtons]);

    // Toggle Selection
    const toggleSelection = (id) => {
        const newSet = new Set(selectedIds);
        if (newSet.has(id)) newSet.delete(id);
        else newSet.add(id);
        setSelectedIds(newSet);
    };

    const toggleSelectAll = () => {
        if (selectedIds.size === rules.length) setSelectedIds(new Set());
        else setSelectedIds(new Set(rules.map(r => r.id)));
    };

    const confirmDelete = (id = 'bulk') => {
        setRuleToDelete(id);
        setDeleteConfirmOpen(true);
    };

    const executeDelete = () => {
        if (ruleToDelete === 'bulk') {
            deleteBulkRules.mutate(selectedIds);
        } else {
            deleteRule.mutate(ruleToDelete);
        }
        setDeleteConfirmOpen(false);
    };

    // --- INLINE EDITING LOGIC ---
    const [editingId, setEditingId] = useState(null); // Tracks which row is having its title edited
    const [editingKeyword, setEditingKeyword] = useState(null); // { ruleId, index, value }

    // --- FILTERING & SORTING LOGIC ---
    const processedRules = useMemo(() => {
        let result = [...rules];

        // 1. Filtering
        if (filterText) {
            const lowerText = filterText.toLowerCase();
            result = result.filter(r =>
                (r.renamedTitle && r.renamedTitle.toLowerCase().includes(lowerText)) ||
                (r.keyword && r.keyword.toLowerCase().includes(lowerText)) ||
                (r.regexPattern && r.regexPattern.toLowerCase().includes(lowerText))
            );
        }
        if (filterCategory !== 'all') {
            result = result.filter(r => r.categoryId === filterCategory);
        }
        if (filterPriority !== 'all') {
            result = result.filter(r => r.financial_priority === filterPriority);
        }

        // 2. Sorting
        result.sort((a, b) => {
            let aValue = a[sortConfig.key];
            let bValue = b[sortConfig.key];

            // Custom Sort Getters
            if (sortConfig.key === 'keywords') {
                aValue = a.regexPattern || a.keyword || "";
                bValue = b.regexPattern || b.keyword || "";
            } else if (sortConfig.key === 'category') {
                aValue = categories.find(c => c.id === a.categoryId)?.name || "";
                bValue = categories.find(c => c.id === b.categoryId)?.name || "";
            }

            // Handle nulls/undefined for generic strings
            if (!aValue) aValue = "";
            if (!bValue) bValue = "";

            if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
            if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
            return 0;
        });

        return result;
    }, [rules, filterText, filterCategory, filterPriority, sortConfig, categories]);

    // Pagination Logic
    const totalPages = Math.ceil(processedRules.length / itemsPerPage);
    const paginatedRules = useMemo(() => {
        const start = (currentPage - 1) * itemsPerPage;
        return processedRules.slice(start, start + itemsPerPage);
    }, [processedRules, currentPage, itemsPerPage]);

    // Reset page if filtered results shrink
    useEffect(() => {
        if (currentPage > totalPages && totalPages > 0) {
            setCurrentPage(totalPages);
        }
    }, [totalPages, currentPage]);

    // Wrapper to ensure user_email is included in inline updates
    const safeInlineUpdate = (id, field, value, e) => {
        updateRule.mutate({
            id,
            data: {
                [field]: value
            }
        });
    };

    // Header Sort Handler
    const handleSort = (key) => {
        setSortConfig(current => ({
            key,
            direction: current.key === key && current.direction === 'asc' ? 'desc' : 'asc'
        }));
    };

    // Sort Icon Helper
    const SortIcon = ({ columnKey }) => {
        if (sortConfig.key !== columnKey) return <ArrowUpDown className="w-3 h-3 ml-1 text-muted-foreground opacity-30" />;
        return sortConfig.direction === 'asc'
            ? <ArrowUp className="w-3 h-3 ml-1 text-blue-600" />
            : <ArrowDown className="w-3 h-3 ml-1 text-blue-600" />;
    };

    // Row Click Handler (Smart Selection)
    const handleRowClick = (e, ruleId) => {
        // Prevent selection if clicking interactive elements (inputs, buttons, checkboxes, etc)
        if (e.target.closest('input, button, [role="checkbox"], [role="combobox"], a, label')) return;
        toggleSelection(ruleId);
    };

    if (isLoading && rules.length === 0) {
        return <div className="flex justify-center p-8"><Loader2 className="w-6 h-6 animate-spin text-gray-400" /></div>;
    }

    return (
        <Card>
            <CardHeader>
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <CardTitle className="flex items-center gap-2">
                            <BrainCircuit className="w-5 h-5 text-amber-500" />
                            Automation Rules
                        </CardTitle>
                        <CardDescription>
                            {rules.length} rules active. Manage how transactions are recognized.
                        </CardDescription>
                    </div>

                    <div className="flex items-center gap-2 justify-end">
                        <AnimatePresence>
                            {selectedIds.size > 0 && (
                                <motion.div
                                    initial={{ scale: 0, opacity: 0 }}
                                    animate={{ scale: 1, opacity: 1 }}
                                    exit={{ scale: 0, opacity: 0 }}
                                    // Fixed position on mobile (left of Global FAB), Static on Desktop
                                    className="fixed bottom-[calc(5rem+env(safe-area-inset-bottom))] right-20 z-[110] md:static md:mr-2 md:z-0 flex items-center gap-2"
                                >
                                    <CustomButton
                                        variant="destructive"
                                        size="icon" // Round on mobile
                                        className="h-12 w-12 rounded-full shadow-lg md:h-9 md:w-auto md:px-4 md:rounded-md"
                                        onClick={() => confirmDelete('bulk')}
                                        disabled={deleteBulkRules.isPending}
                                    >
                                        <Trash2 className="w-5 h-5 md:mr-2 md:w-4 md:h-4" />
                                        <span className="hidden md:inline">Delete Selected ({selectedIds.size})</span>
                                    </CustomButton>
                                </motion.div>
                            )}
                        </AnimatePresence>
                        <CreateRuleDialog
                            open={isDialogOpen}
                            onOpenChange={(open) => {
                                if (!open) handleCloseDialog();
                                else setIsDialogOpen(true);
                            }}
                            formData={formData}
                            setFormData={setFormData}
                            isRegexMode={isRegexMode}
                            setIsRegexMode={setIsRegexMode}
                            isWholeWord={isWholeWord}
                            setIsWholeWord={setIsWholeWord}
                            onSubmit={handleSaveRule}
                            isSubmitting={createRule.isPending || updateRule.isPending}
                            isEditing={!!editingRuleId}
                        />

                        <CustomButton size="sm" className="gap-2 hidden md:flex" onClick={() => setIsDialogOpen(true)}>
                            <Plus className="w-4 h-4" />
                            <span className="hidden sm:inline">Add Rule</span>
                        </CustomButton>
                    </div>
                </div>
            </CardHeader>

            {/* --- FILTER BAR --- */}
            <div className="px-6 py-4 border-b bg-gray-50/50 flex flex-col md:flex-row gap-4 justify-between items-center">
                <div className="flex flex-1 w-full md:w-auto items-center gap-3">
                    <div className="relative flex-1 md:max-w-xs">
                        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Filter by keyword or name..."
                            value={filterText}
                            onChange={(e) => setFilterText(e.target.value)}
                            className="pl-9 h-9 bg-white"
                        />
                    </div>

                    {/* Desktop Filters */}
                    <div className="hidden md:flex items-center gap-2">
                        <CategorySelect
                            categories={categories}
                            value={filterCategory === 'all' ? undefined : filterCategory}
                            onValueChange={(val) => setFilterCategory(val || 'all')}
                            placeholder="All Categories"
                            className="w-[180px] h-9 bg-white"
                        />

                        {/* Toggle Style Filter for Priority */}
                        <div className="flex bg-gray-100 p-0.5 rounded-lg h-9 items-center">
                            <button
                                onClick={() => setFilterPriority('all')}
                                className={`px-3 py-1 text-xs font-medium rounded-md transition-all ${filterPriority === 'all' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}
                            >
                                All
                            </button>
                            <button
                                onClick={() => setFilterPriority('needs')}
                                className={`px-3 py-1 text-xs font-medium rounded-md flex items-center gap-1 transition-all ${filterPriority === 'needs' ? 'bg-white text-emerald-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                            >
                                <ShieldCheck className="w-3 h-3" /> Essentials
                            </button>
                            <button
                                onClick={() => setFilterPriority('wants')}
                                className={`px-3 py-1 text-xs font-medium rounded-md flex items-center gap-1 transition-all ${filterPriority === 'wants' ? 'bg-white text-amber-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                            >
                                <Sparkles className="w-3 h-3" /> Lifestyle
                            </button>
                        </div>

                        {(filterText || filterCategory !== 'all' || filterPriority !== 'all') && (
                            <CustomButton variant="ghost" size="sm" onClick={() => {
                                setFilterText('');
                                setFilterCategory('all');
                                setFilterPriority('all');
                            }}>
                                <X className="w-4 h-4 text-gray-500" />
                            </CustomButton>
                        )}
                    </div>
                </div>
            </div>

            <CardContent>
                {rules.length === 0 ? (
                    <div className="text-center py-8 text-gray-500 bg-gray-50 rounded-lg border border-dashed">
                        No automation rules learned yet. Categorize some transactions in the Sync Inbox to train the engine!
                    </div>
                ) : (
                    <>
                        {/* --- DESKTOP TABLE VIEW --- */}
                        <div className="hidden md:block rounded-md border overflow-hidden">
                            <Table>
                                <TableHeader className="bg-gray-50">
                                    <TableRow>
                                        <TableHead className="w-[40px]">
                                            <Checkbox
                                                checked={rules.length > 0 && selectedIds.size === rules.length}
                                                onCheckedChange={toggleSelectAll}
                                            />
                                        </TableHead>
                                        <TableHead className="w-[30%] cursor-pointer hover:bg-gray-100 transition-colors" onClick={() => handleSort('keywords')}>
                                            <div className="flex items-center">If Text Contains (Keywords) <SortIcon columnKey="keywords" /></div>
                                        </TableHead>
                                        <TableHead className="w-[25%] cursor-pointer hover:bg-gray-100 transition-colors" onClick={() => handleSort('renamedTitle')}>
                                            <div className="flex items-center">Rename To <SortIcon columnKey="renamedTitle" /></div>
                                        </TableHead>
                                        <TableHead className="w-[20%] cursor-pointer hover:bg-gray-100 transition-colors" onClick={() => handleSort('category')}>
                                            <div className="flex items-center">Category <SortIcon columnKey="category" /></div>
                                        </TableHead>
                                        <TableHead className="w-[15%] cursor-pointer hover:bg-gray-100 transition-colors" onClick={() => handleSort('financial_priority')}>
                                            <div className="flex items-center">Priority <SortIcon columnKey="financial_priority" /></div>
                                        </TableHead>
                                        <TableHead className="w-[50px]"></TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {paginatedRules.map((rule) => {
                                        const category = categories.find(c => c.id === rule.categoryId);
                                        const isSelected = selectedIds.has(rule.id);
                                        const isEditingTitle = editingId === rule.id;

                                        return (
                                            <TableRow
                                                key={rule.id}
                                                className={`cursor-pointer ${isSelected ? "bg-blue-50/40 hover:bg-blue-50/60" : "hover:bg-gray-50/50"}`}
                                                onClick={(e) => handleRowClick(e, rule.id)}
                                            >
                                                <TableCell>
                                                    <Checkbox
                                                        checked={isSelected}
                                                        onCheckedChange={() => toggleSelection(rule.id)}
                                                    />
                                                </TableCell>
                                                <TableCell>
                                                    <div className="flex items-start gap-2">
                                                        {/* MODE TOGGLE BUTTON */}
                                                        <button
                                                            onClick={() => handleToggleRuleMode(rule)}
                                                            className={`mt-0.5 p-1 rounded transition-colors ${rule.regexPattern ? 'bg-purple-100 text-purple-700 hover:bg-purple-200' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}
                                                            title={rule.regexPattern ? "Switch to Simple Keywords" : "Switch to Regex Mode"}
                                                        >
                                                            {rule.regexPattern ? <Type className="w-3 h-3" /> : <Code2 className="w-3 h-3" />}
                                                        </button>

                                                        <div className="flex flex-wrap gap-1.5 flex-1">
                                                            {rule.regexPattern ? (
                                                                editingKeyword?.ruleId === rule.id ? (
                                                                    <Input
                                                                        autoFocus
                                                                        defaultValue={rule.regexPattern}
                                                                        className="h-6 w-full max-w-[200px] text-xs font-mono px-1 py-0 bg-white shadow-sm border-purple-400"
                                                                        onBlur={(e) => {
                                                                            safeInlineUpdate(rule.id, 'regexPattern', e.target.value, e);
                                                                            setEditingKeyword(null);
                                                                        }}
                                                                        onKeyDown={(e) => {
                                                                            if (e.key === 'Enter') {
                                                                                e.preventDefault();
                                                                                safeInlineUpdate(rule.id, 'regexPattern', e.currentTarget.value, e);
                                                                                setEditingKeyword(null);
                                                                            }
                                                                            if (e.key === 'Escape') setEditingKeyword(null);
                                                                        }}
                                                                    />
                                                                ) : (
                                                                    <span
                                                                        className="inline-flex items-center px-2 py-0.5 rounded text-xs font-mono font-medium bg-purple-50 text-purple-700 border border-purple-100 w-full truncate max-w-[200px] cursor-pointer hover:border-purple-300 transition-all"
                                                                        title="Click to edit regex"
                                                                        onClick={() => setEditingKeyword({ ruleId: rule.id })}
                                                                    >
                                                                        <Code2 className="w-3 h-3 mr-1 opacity-50" />
                                                                        {rule.regexPattern}
                                                                    </span>
                                                                )
                                                            ) : (
                                                                <>
                                                                    {(rule.keyword || "").split(',').filter(k => k.trim()).map((kw, i) => (
                                                                        editingKeyword?.ruleId === rule.id && editingKeyword?.index === i ? (
                                                                            <Input
                                                                                key={i}
                                                                                autoFocus
                                                                                defaultValue={kw.trim()}
                                                                                className="h-6 w-24 text-xs px-1 py-0 bg-white shadow-sm border-blue-400"
                                                                                onBlur={(e) => handleEditKeyword(rule, i, e.target.value)}
                                                                                onKeyDown={(e) => {
                                                                                    if (e.key === 'Enter') handleEditKeyword(rule, i, e.currentTarget.value);
                                                                                    if (e.key === 'Escape') setEditingKeyword(null);
                                                                                }}
                                                                            />
                                                                        ) : (
                                                                            <span key={i}
                                                                                className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-700 border border-transparent hover:border-gray-300 cursor-pointer group transition-all"
                                                                                onClick={() => setEditingKeyword({ ruleId: rule.id, index: i, value: kw.trim() })}
                                                                                title="Click to edit keyword"
                                                                            >
                                                                                {kw.trim()}
                                                                                <button
                                                                                    onClick={(e) => {
                                                                                        e.stopPropagation();
                                                                                        handleRemoveKeyword(rule, kw.trim());
                                                                                    }}
                                                                                    className="ml-1 text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity p-0.5 rounded-full hover:bg-gray-200"
                                                                                >
                                                                                    <X className="w-3 h-3" />
                                                                                </button>
                                                                            </span>
                                                                        )
                                                                    ))}
                                                                    <Input
                                                                        className="h-6 w-20 text-[10px] px-1 bg-transparent border-dashed border-gray-300 focus:w-24 focus:bg-white focus:border-solid focus:border-blue-400 transition-all placeholder:text-gray-400"
                                                                        placeholder="+ Add"
                                                                        onKeyDown={(e) => {
                                                                            if (e.key === 'Enter') {
                                                                                handleAddKeyword(rule, e.currentTarget.value);
                                                                                e.currentTarget.value = '';
                                                                            }
                                                                        }}
                                                                    />
                                                                </>
                                                            )}
                                                        </div>
                                                    </div>
                                                </TableCell>
                                                <TableCell>
                                                    {isEditingTitle ? (
                                                        <div className="flex items-center gap-1">
                                                            <Input
                                                                autoFocus
                                                                defaultValue={rule.renamedTitle || ""}
                                                                className="h-8 text-sm"
                                                                onBlur={(e) => {
                                                                    safeInlineUpdate(rule.id, 'renamedTitle', e.target.value, e);
                                                                    setEditingId(null);
                                                                }}
                                                                onKeyDown={(e) => {
                                                                    if (e.key === 'Enter') {
                                                                        e.preventDefault();
                                                                        safeInlineUpdate(rule.id, 'renamedTitle', e.currentTarget.value, e);
                                                                        setEditingId(null);
                                                                    }
                                                                }}
                                                            />
                                                        </div>
                                                    ) : (
                                                        <span
                                                            onClick={() => setEditingId(rule.id)}
                                                            className="cursor-pointer border-b border-dotted border-gray-400 hover:border-gray-800 text-sm font-medium text-gray-900 inline-block pb-0.5"
                                                            title="Click to edit name"
                                                        >
                                                            {rule.renamedTitle || <span className="text-gray-400 italic font-normal">No rename (Use original)</span>}
                                                        </span>
                                                    )}
                                                </TableCell>
                                                <TableCell>
                                                    <CategorySelect
                                                        categories={categories}
                                                        value={rule.categoryId}
                                                        onValueChange={(id) => safeInlineUpdate(rule.id, 'categoryId', id, null)}
                                                        className="h-8 text-xs border-transparent bg-transparent hover:bg-gray-100 hover:border-gray-200 px-2"
                                                    />
                                                </TableCell>
                                                <TableCell>
                                                    {/* Toggle Switch Style */}
                                                    <div className="flex bg-gray-100 p-0.5 rounded-lg w-fit">
                                                        <button
                                                            type="button"
                                                            onClick={(e) => safeInlineUpdate(rule.id, 'financial_priority', 'needs', e)}
                                                            className={`px-2 py-0.5 rounded-md text-[10px] font-medium flex items-center gap-1 transition-all ${rule.financial_priority === 'needs' ? 'bg-white text-emerald-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                                                        >
                                                            <ShieldCheck className="w-3 h-3" /> Essentials
                                                        </button>
                                                        <button
                                                            type="button"
                                                            onClick={(e) => safeInlineUpdate(rule.id, 'financial_priority', 'wants', e)}
                                                            className={`px-2 py-0.5 rounded-md text-[10px] font-medium flex items-center gap-1 transition-all ${rule.financial_priority === 'wants' ? 'bg-white text-amber-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                                                        >
                                                            <Sparkles className="w-3 h-3" /> Lifestyle
                                                        </button>
                                                    </div>
                                                </TableCell>
                                                <TableCell>
                                                    <CustomButton
                                                        type="button"
                                                        variant="ghost"
                                                        size="sm"
                                                        className="h-8 w-8 p-0 text-gray-400 hover:text-red-600"
                                                        onClick={() => confirmDelete(rule.id)}
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </CustomButton>
                                                </TableCell>
                                            </TableRow>
                                        );
                                    })}
                                </TableBody>
                            </Table>
                        </div>

                        {/* Pagination Controls (Desktop) */}
                        {totalPages > 1 && (
                            <div className="hidden md:flex items-center justify-end p-4 border-t gap-2">
                                <div className="text-sm text-gray-500 mr-2">
                                    Page {currentPage} of {totalPages}
                                </div>
                                <CustomButton
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                    disabled={currentPage === 1}
                                    className="h-8 w-8 p-0"
                                >
                                    <ChevronLeft className="w-4 h-4" />
                                </CustomButton>
                                <CustomButton
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                                    disabled={currentPage === totalPages}
                                    className="h-8 w-8 p-0"
                                >
                                    <ChevronRight className="w-4 h-4" />
                                </CustomButton>
                            </div>
                        )}

                        {/* --- MOBILE LIST VIEW (Simplified) --- */}
                        <div className="md:hidden space-y-3">
                            {paginatedRules.map((rule) => {
                                const category = categories.find(c => c.id === rule.categoryId);
                                return (
                                    <div
                                        key={rule.id}
                                        className={`relative p-3 rounded-xl border bg-white shadow-sm transition-all ${selectedIds.has(rule.id) ? 'border-blue-500 bg-blue-50/30' : 'border-gray-100'}`}
                                        onClick={() => openRuleForEdit(rule)} // Open details on tap
                                    >
                                        <div className="flex items-center gap-3">
                                            {/* Selection Checkbox (Stop propagation to prevent opening dialog) */}
                                            <div onClick={(e) => e.stopPropagation()} className="shrink-0">
                                                <Checkbox
                                                    checked={selectedIds.has(rule.id)}
                                                    onCheckedChange={() => toggleSelection(rule.id)}
                                                    className="w-5 h-5 border-gray-300 data-[state=checked]:bg-blue-600 data-[state=checked]:border-blue-600"
                                                />
                                            </div>

                                            {/* Rule Info (Simplified) */}
                                            <div className="flex-1 min-w-0">
                                                <div className="font-semibold text-gray-900 text-sm truncate">
                                                    {rule.renamedTitle || "Untitled Rule"}
                                                </div>

                                                <div className="flex items-center gap-2 mt-0.5">
                                                    {/* Category Dot */}
                                                    {category && (
                                                        <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: category.color || '#ccc' }} />
                                                    )}
                                                    <span className="text-xs text-gray-500 truncate">{category ? category.name : "Uncategorized"}</span>
                                                </div>
                                            </div>

                                            {/* Delete Action */}
                                            <button
                                                onClick={(e) => { e.stopPropagation(); confirmDelete(rule.id); }}
                                                className="p-2 -mr-2 text-gray-300 hover:text-red-500 active:text-red-600 transition-colors"
                                            >
                                                <Trash2 className="w-5 h-5" />
                                            </button>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>

                        {/* Pagination Controls (Mobile) */}
                        {totalPages > 1 && (
                            <div className="flex md:hidden items-center justify-center pt-4 gap-4">
                                <CustomButton
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                    disabled={currentPage === 1}
                                >
                                    <ChevronLeft className="w-4 h-4 mr-1" /> Previous
                                </CustomButton>
                                <span className="text-sm font-medium text-gray-600">
                                    {currentPage} / {totalPages}
                                </span>
                                <CustomButton
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                                    disabled={currentPage === totalPages}
                                >
                                    Next <ChevronRight className="w-4 h-4 ml-1" />
                                </CustomButton>
                            </div>
                        )}
                    </>
                )}
            </CardContent>

            {/* DELETE CONFIRMATION DIALOG */}
            <AlertDialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                        <AlertDialogDescription>
                            {ruleToDelete === 'bulk'
                                ? `This will permanently delete ${selectedIds.size} automation rules.`
                                : "This action cannot be undone. The rule will be permanently removed."}
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={executeDelete} className="bg-red-600 hover:bg-red-700">
                            Delete
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </Card>
    );
}
