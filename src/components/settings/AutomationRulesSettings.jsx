import { useState, useEffect } from "react";
import { useSettings } from "@/components/utils/SettingsContext";
import { useCategories } from "@/components/hooks/useBase44Entities";
import { useRuleActions } from "@/components/hooks/useRuleActions";
import { CustomButton } from "@/components/ui/CustomButton";
import { BrainCircuit, Trash2, Loader2, Plus, X, Sparkles, ShieldCheck, Code2, Type } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import CategorySelect from "@/components/ui/CategorySelect";
import { motion, AnimatePresence } from "framer-motion";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";

export default function AutomationRulesSettings() {
    const { user } = useSettings();
    const { categories } = useCategories();

    const {
        rules, isLoading,
        isDialogOpen, setIsDialogOpen,
        selectedIds, setSelectedIds,
        isRegexMode, setIsRegexMode,
        formData, setFormData,
        createRule, deleteRule, updateRule, deleteBulkRules,
        handleToggleRuleMode, handleAddKeyword, handleRemoveKeyword,
        handleEditKeyword, handleCreateSave, handleCloseDialog
    } = useRuleActions();

    const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
    const [ruleToDelete, setRuleToDelete] = useState(null); // ID or 'bulk'

    // Listen for FAB events from the Page
    useEffect(() => {
        const openDialog = () => setIsDialogOpen(true);
        window.addEventListener('open-rule-dialog', openDialog);
        return () => window.removeEventListener('open-rule-dialog', openDialog);
    }, [setIsDialogOpen]);

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

    const handleInlineUpdate = (ruleId, field, value) => {
        // VALIDATION: If updating regex, check validity first
        if (field === 'regexPattern' && value) {
            try {
                new RegExp(value);
            } catch (e) {
                // We can use a local toast or just return. 
                // Ideally, this validation should also be in the hook, but for inline UI edits, it's okay here.
                // However, since we deleted the local toast import, we should probably let the hook handle the update attempt
                // OR re-import useToast if we want UI feedback before mutation.
                return; // Stop update
            }
        }
        updateRule.mutate({ id: ruleId, data: { [field]: value } });
    };

    if (isLoading) {
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

                    <div className="flex items-center gap-2">
                        <AnimatePresence>
                            {selectedIds.size > 0 && (
                                <motion.div
                                    initial={{ opacity: 0, x: 10 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: 10 }}
                                    className="flex items-center gap-2 mr-2"
                                >
                                    <span className="text-sm font-medium text-blue-600 bg-blue-50 px-2 py-1 rounded">
                                        {selectedIds.size} selected
                                    </span>
                                    <CustomButton
                                        variant="destructive"
                                        size="sm"
                                        onClick={() => confirmDelete('bulk')}
                                        disabled={deleteBulkRules.isPending}
                                    >
                                        <Trash2 className="w-4 h-4 mr-1" /> Delete
                                    </CustomButton>
                                </motion.div>
                            )}
                        </AnimatePresence>

                        <Dialog open={isDialogOpen} onOpenChange={(open) => !open && handleCloseDialog()}>
                            <DialogTrigger asChild onClick={() => setIsDialogOpen(true)}>
                                <CustomButton size="sm" className="gap-2" onClick={() => setIsDialogOpen(true)}>
                                    <Plus className="w-4 h-4" />
                                    <span className="hidden sm:inline">Add Rule</span>
                                </CustomButton>
                            </DialogTrigger>

                            {/* CREATE DIALOG CONTENT (Unchanged) */}
                            <DialogContent className="sm:max-w-[425px]">
                                <DialogHeader>
                                    <DialogTitle>Create Automation Rule</DialogTitle>
                                    <DialogDescription>
                                        When a transaction contains the keywords below, it will be automatically categorized.
                                    </DialogDescription>
                                </DialogHeader>
                                <div className="grid gap-4 py-4">

                                    {/* MODE TOGGLE */}
                                    <div className="flex items-center space-x-2 bg-gray-50 p-2 rounded-lg border">
                                        <button
                                            className={`flex-1 text-xs font-medium py-1.5 rounded-md transition-all ${!isRegexMode ? 'bg-white shadow text-gray-900' : 'text-gray-500 hover:text-gray-900'}`}
                                            onClick={() => setIsRegexMode(false)}
                                        >
                                            Simple Keywords
                                        </button>
                                        <button
                                            className={`flex-1 text-xs font-medium py-1.5 rounded-md transition-all ${isRegexMode ? 'bg-white shadow text-purple-700' : 'text-gray-500 hover:text-gray-900'}`}
                                            onClick={() => setIsRegexMode(true)}
                                        >
                                            Regex (Advanced)
                                        </button>
                                    </div>

                                    {isRegexMode ? (
                                        <div className="grid gap-2">
                                            <Label htmlFor="regex" className="text-purple-700 flex items-center gap-2"><Code2 className="w-3 h-3" /> Regular Expression</Label>
                                            <Input
                                                id="regex"
                                                placeholder="^Uber.*Eats?$"
                                                className="font-mono text-xs"
                                                value={formData.regexPattern}
                                                onChange={(e) => setFormData({ ...formData, regexPattern: e.target.value })}
                                            />
                                            <p className="text-[10px] text-gray-500">Be careful with complex patterns (ReDoS risk).</p>
                                        </div>
                                    ) : (
                                        <div className="grid gap-2">
                                            <Label htmlFor="keywords">If text contains...</Label>
                                            <Input
                                                id="keywords"
                                                placeholder="e.g. Uber, Lyft (comma separated)"
                                                value={formData.keyword}
                                                onChange={(e) => setFormData({ ...formData, keyword: e.target.value })}
                                            />
                                        </div>
                                    )}

                                    <div className="grid gap-2">
                                        <Label>Then assign category...</Label>
                                        <CategorySelect
                                            categories={categories}
                                            value={formData.categoryId}
                                            onValueChange={(id) => setFormData({ ...formData, categoryId: id })}
                                        />
                                    </div>
                                    <div className="grid gap-2">
                                        <Label>Financial Priority</Label>
                                        <Select
                                            value={formData.financial_priority}
                                            onValueChange={(val) => setFormData({ ...formData, financial_priority: val })}
                                        >
                                            <SelectTrigger>
                                                <SelectValue placeholder="Select priority" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="needs">Essentials</SelectItem>
                                                <SelectItem value="wants">Lifestyle</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="grid gap-2">
                                        <Label htmlFor="rename">And rename to (optional)...</Label>
                                        <Input
                                            id="rename"
                                            placeholder="e.g. Taxi Ride"
                                            value={formData.renamedTitle}
                                            onChange={(e) => setFormData({ ...formData, renamedTitle: e.target.value })}
                                        />
                                    </div>
                                </div>
                                <DialogFooter>
                                    <CustomButton onClick={handleCreateSave} disabled={createRule.isPending} className="w-full sm:w-auto">
                                        {createRule.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                        Save Rule
                                    </CustomButton>
                                </DialogFooter>
                            </DialogContent>
                        </Dialog>
                    </div>
                </div>
            </CardHeader>
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
                                        <TableHead className="w-[30%]">If Text Contains (Keywords)</TableHead>
                                        <TableHead className="w-[25%]">Rename To</TableHead>
                                        <TableHead className="w-[20%]">Category</TableHead>
                                        <TableHead className="w-[15%]">Priority</TableHead>
                                        <TableHead className="w-[50px]"></TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {rules.map((rule) => {
                                        const category = categories.find(c => c.id === rule.categoryId);
                                        const isSelected = selectedIds.has(rule.id);
                                        const isEditingTitle = editingId === rule.id;

                                        return (
                                            <TableRow key={rule.id} className={isSelected ? "bg-blue-50/40" : ""}>
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
                                                                            handleInlineUpdate(rule.id, 'regexPattern', e.target.value);
                                                                            setEditingKeyword(null);
                                                                        }}
                                                                        onKeyDown={(e) => {
                                                                            if (e.key === 'Enter') {
                                                                                handleInlineUpdate(rule.id, 'regexPattern', e.currentTarget.value);
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
                                                                    handleInlineUpdate(rule.id, 'renamedTitle', e.target.value);
                                                                    setEditingId(null);
                                                                }}
                                                                onKeyDown={(e) => {
                                                                    if (e.key === 'Enter') {
                                                                        handleInlineUpdate(rule.id, 'renamedTitle', e.currentTarget.value);
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
                                                        onValueChange={(id) => handleInlineUpdate(rule.id, 'categoryId', id)}
                                                        className="h-8 text-xs border-transparent bg-transparent hover:bg-gray-100 hover:border-gray-200 px-2"
                                                    />
                                                </TableCell>
                                                <TableCell>
                                                    {/* Toggle Switch Style */}
                                                    <div className="flex bg-gray-100 p-0.5 rounded-lg w-fit">
                                                        <button
                                                            onClick={() => handleInlineUpdate(rule.id, 'financial_priority', 'needs')}
                                                            className={`px-2 py-0.5 rounded-md text-[10px] font-medium flex items-center gap-1 transition-all ${rule.financial_priority === 'needs' ? 'bg-white text-emerald-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                                                        >
                                                            <ShieldCheck className="w-3 h-3" /> Essentials
                                                        </button>
                                                        <button
                                                            onClick={() => handleInlineUpdate(rule.id, 'financial_priority', 'wants')}
                                                            className={`px-2 py-0.5 rounded-md text-[10px] font-medium flex items-center gap-1 transition-all ${rule.financial_priority === 'wants' ? 'bg-white text-amber-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                                                        >
                                                            <Sparkles className="w-3 h-3" /> Lifestyle
                                                        </button>
                                                    </div>
                                                </TableCell>
                                                <TableCell>
                                                    <CustomButton
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

                        {/* --- MOBILE LIST VIEW (Simplified) --- */}
                        <div className="md:hidden space-y-3">
                            {rules.map((rule) => (
                                <div key={rule.id} className={`p-3 rounded-lg border bg-white ${selectedIds.has(rule.id) ? 'border-blue-300 ring-1 ring-blue-300' : 'border-gray-200'}`}>
                                    {/* Mobile implementation would mimic the table row content but stacked */}
                                    {/* Keeping it simpler here for brevity, assuming standard mobile adaptation */}
                                    <div className="flex justify-between items-start mb-2">
                                        <Checkbox checked={selectedIds.has(rule.id)} onCheckedChange={() => toggleSelection(rule.id)} />
                                        <CustomButton variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => confirmDelete(rule.id)}>
                                            <X className="w-4 h-4 text-gray-400" />
                                        </CustomButton>
                                    </div>
                                    <div className="mb-2">
                                        <div className="text-xs font-bold text-gray-500 uppercase">Match</div>
                                        {rule.regexPattern ? (
                                            <div className="text-sm font-mono text-purple-700 break-all flex items-center gap-1">
                                                <Code2 className="w-3 h-3 opacity-50" /> {rule.regexPattern}
                                            </div>
                                        ) : (
                                            <div className="text-sm font-mono text-gray-800 break-words">
                                                {rule.keyword ? rule.keyword.split(',').join(', ') : <span className="text-gray-400 italic">No keywords</span>}
                                            </div>
                                        )}
                                    </div>
                                    <div>
                                        <div className="text-xs font-bold text-emerald-600 uppercase">Apply</div>
                                        <div className="font-medium text-gray-900">{rule.renamedTitle || "Original Title"}</div>
                                    </div>
                                </div>
                            ))}
                        </div>
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
