import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { useSettings } from "@/components/utils/SettingsContext";
import { useCategories } from "@/components/hooks/useBase44Entities";
import { useToast } from "@/components/ui/use-toast";
import { CustomButton } from "@/components/ui/CustomButton";
import { BrainCircuit, Trash2, ArrowRight, Loader2, AlertCircle, Plus, X, Sparkles, ShieldCheck, Save, Edit2, Check } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import CategorySelect from "@/components/ui/CategorySelect";
import { MobileDrawerSelect } from "@/components/ui/MobileDrawerSelect";
import { FINANCIAL_PRIORITIES } from "@/components/utils/constants";
import { motion, AnimatePresence } from "framer-motion";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";

export default function AutomationRulesSettings() {
    const { user } = useSettings();
    const { categories } = useCategories();
    const { toast } = useToast();
    const queryClient = useQueryClient();

    // Selection & Dialog States
    const [selectedIds, setSelectedIds] = useState(new Set());
    const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
    const [ruleToDelete, setRuleToDelete] = useState(null); // ID or 'bulk'

    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [editingRule, setEditingRule] = useState(null); // null = Create Mode
    const [formData, setFormData] = useState({
        keyword: "",
        categoryId: "",
        renamedTitle: "",
        financial_priority: "wants"
    });

    // Fetch the user's saved rules
    const { data: rules = [], isLoading, isFetching } = useQuery({
        queryKey: ['categoryRules', user?.email],
        // CHANGE: Use .filter to explicitly request this user's matching rows
        queryFn: () => base44.entities.CategoryRule.filter({ user_email: user?.email }),
        enabled: !!user?.email
    });

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

    // Delete Mutation
    const { mutate: deleteRule, isPending: isDeleting } = useMutation({
        mutationFn: (id) => base44.entities.CategoryRule.delete(id),
        onSuccess: () => {
            // Remove from selection if it was selected
            if (selectedIds.has(ruleToDelete)) toggleSelection(ruleToDelete);
            queryClient.invalidateQueries({ queryKey: ['categoryRules', user?.email] });
            toast({
                title: "Rule deleted",
                description: "The automation engine has forgotten this rule.",
            });
        },
        onError: (error) => {
            toast({
                title: "Failed to delete rule",
                description: error.message,
                variant: "destructive"
            });
        }
    });

    // Update Mutation
    const { mutate: updateRule, isPending: isUpdating } = useMutation({
        mutationFn: ({ id, data }) => base44.entities.CategoryRule.update(id, { ...data }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['categoryRules', user?.email] });
            toast({ title: "Rule updated", description: "Your changes have been saved." });
            handleCloseDialog();
            setEditingId(null); // Close inline edit if active
        },
        onError: (error) => {
            toast({ title: "Failed to update", description: error.message, variant: "destructive" });
        }
    });

    // Create Mutation
    const { mutate: createRule, isPending: isCreating } = useMutation({
        mutationFn: () => base44.entities.CategoryRule.create({
            user_email: user.email,
            categoryId: formData.categoryId,
            keyword: formData.keyword,
            renamedTitle: formData.renamedTitle || null,
            priority: 10,
            financial_priority: formData.financial_priority
        }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['categoryRules', user?.email] });
            toast({ title: "Rule created", description: "Future transactions matching these keywords will be categorized automatically." });
            handleCloseDialog();
        },
        onError: (error) => {
            toast({
                title: "Failed to create rule",
                description: error.message,
                variant: "destructive"
            });
        }
    });

    // Bulk Delete Mutation
    const { mutate: deleteBulkRules, isPending: isBulkDeleting } = useMutation({
        mutationFn: async (ids) => {
            // Execute deletes in parallel
            await Promise.all(ids.map(id => base44.entities.CategoryRule.delete(id)));
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['categoryRules', user?.email] });
            setSelectedIds(new Set());
            toast({ title: "Rules deleted", description: "Selected automation rules have been removed." });
        },
        onError: (error) => {
            toast({ title: "Failed to delete rules", description: error.message, variant: "destructive" });
        }
    });

    const confirmDelete = (id = 'bulk') => {
        setRuleToDelete(id);
        setDeleteConfirmOpen(true);
    };

    const executeDelete = () => {
        if (ruleToDelete === 'bulk') {
            deleteBulkRules(Array.from(selectedIds));
        } else {
            deleteRule(ruleToDelete);
        }
        setDeleteConfirmOpen(false);
    };

    // --- INLINE EDITING LOGIC ---
    const [editingId, setEditingId] = useState(null); // Tracks which row is having its title edited
    const handleInlineUpdate = (ruleId, field, value) => {
        updateRule({ id: ruleId, data: { [field]: value } });
    };

    const handleAddKeyword = (rule, newKeyword) => {
        if (!newKeyword.trim()) return;
        const currentKeywords = rule.keyword.split(',').map(k => k.trim());
        if (currentKeywords.includes(newKeyword.trim())) return;

        const updatedKeywords = [...currentKeywords, newKeyword.trim()].join(',');
        updateRule({ id: rule.id, data: { keyword: updatedKeywords } });
    };

    const handleCreateSave = () => {
        if (!formData.keyword || !formData.categoryId) {
            toast({ title: "Missing fields", description: "Please enter a keyword and select a category.", variant: "destructive" });
            return;
        }
        createRule();
    };

    const handleRemoveKeyword = (rule, keywordToRemove) => {
        const currentKeywords = rule.keyword.split(',').map(k => k.trim());
        const updatedKeywords = currentKeywords.filter(k => k !== keywordToRemove).join(',');

        if (!updatedKeywords) {
            toast({ title: "Cannot remove last keyword", description: "A rule must have at least one keyword.", variant: "destructive" });
            return;
        }
        updateRule({ id: rule.id, data: { keyword: updatedKeywords } });
    };

    const handleCloseDialog = () => {
        setIsDialogOpen(false);
        setEditingRule(null);
        setFormData({ keyword: "", categoryId: "", renamedTitle: "", financial_priority: "wants" });
    };

    if (isLoading || (isFetching && rules.length === 0)) {
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
                                        disabled={isBulkDeleting}
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
                                    <div className="grid gap-2">
                                        <Label htmlFor="keywords">If text contains...</Label>
                                        <Input
                                            id="keywords"
                                            placeholder="e.g. Uber, Lyft (comma separated)"
                                            value={formData.keyword}
                                            onChange={(e) => setFormData({ ...formData, keyword: e.target.value })}
                                        />
                                    </div>
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
                                    <CustomButton onClick={handleCreateSave} disabled={isCreating} className="w-full sm:w-auto">
                                        {isCreating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
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
                                                    <div className="flex flex-wrap gap-1.5">
                                                        {rule.keyword.split(',').map((kw, i) => (
                                                            <span key={i} className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-700 border group">
                                                                {kw.trim()}
                                                                <button
                                                                    onClick={() => handleRemoveKeyword(rule, kw.trim())}
                                                                    className="ml-1 text-gray-400 hover:text-red-500 hidden group-hover:inline-block"
                                                                >
                                                                    <X className="w-3 h-3" />
                                                                </button>
                                                            </span>
                                                        ))}
                                                        <Input
                                                            className="h-6 w-20 text-[10px] px-1 bg-transparent border-dashed border-gray-300 focus:w-32 transition-all"
                                                            placeholder="+ Add"
                                                            onKeyDown={(e) => {
                                                                if (e.key === 'Enter') {
                                                                    handleAddKeyword(rule, e.currentTarget.value);
                                                                    e.currentTarget.value = '';
                                                                }
                                                            }}
                                                        />
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
                                                            <ShieldCheck className="w-3 h-3" /> Needs
                                                        </button>
                                                        <button
                                                            onClick={() => handleInlineUpdate(rule.id, 'financial_priority', 'wants')}
                                                            className={`px-2 py-0.5 rounded-md text-[10px] font-medium flex items-center gap-1 transition-all ${rule.financial_priority === 'wants' ? 'bg-white text-amber-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                                                        >
                                                            <Sparkles className="w-3 h-3" /> Wants
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
                                        <div className="text-sm font-mono text-gray-800 break-words">{rule.keyword}</div>
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
