import { useState, useRef, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { useSettings } from "@/components/utils/SettingsContext";
import { useCategories } from "@/components/hooks/useBase44Entities";
import { useToast } from "@/components/ui/use-toast";
import { CustomButton } from "@/components/ui/CustomButton";
import { BrainCircuit, Trash2, ArrowRight, Loader2, AlertCircle, Plus, X, Sparkles, ShieldCheck, Save } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import CategorySelect from "@/components/ui/CategorySelect";
import { MobileDrawerSelect } from "@/components/ui/MobileDrawerSelect";
import { FINANCIAL_PRIORITIES } from "@/components/utils/constants";

export default function AutomationRulesSettings() {
    const { user } = useSettings();
    const { categories } = useCategories();
    const { toast } = useToast();
    const queryClient = useQueryClient();
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

    // Delete Mutation
    const { mutate: deleteRule, isPending: isDeleting } = useMutation({
        mutationFn: (id) => base44.entities.CategoryRule.delete(id),
        onSuccess: () => {
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

    // --- INLINE EDITING LOGIC ---
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
                <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2">
                        <BrainCircuit className="w-5 h-5 text-amber-500" />
                        Automation Rules
                    </CardTitle>

                    <Dialog open={isDialogOpen} onOpenChange={(open) => !open && handleCloseDialog()}>
                        <DialogTrigger asChild onClick={() => setIsDialogOpen(true)}>
                            <CustomButton size="sm" className="gap-2" onClick={() => setIsDialogOpen(true)}>
                                <Plus className="w-4 h-4" />
                                <span className="hidden sm:inline">Add Rule</span>
                            </CustomButton>
                        </DialogTrigger>
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
                <CardDescription>
                    Manage the rules that automatically categorize your transactions.
                </CardDescription>
            </CardHeader>
            <CardContent>
                {rules.length === 0 ? (
                    <div className="text-center py-8 text-gray-500 bg-gray-50 rounded-lg border border-dashed">
                        No automation rules learned yet. Categorize some transactions in the Sync Inbox to train the engine!
                    </div>
                ) : (
                    <div className="space-y-3">
                        {rules.map((rule) => {
                            const category = categories.find(c => c.id === rule.categoryId);

                            return (
                                <div key={rule.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 border rounded-xl bg-white hover:border-amber-200 transition-colors gap-4">
                                    <div className="flex-1 overflow-hidden">

                                        {/* GRID LAYOUT FOR ALIGNMENT */}
                                        <div className="grid grid-cols-[1fr_auto_1fr] gap-4 items-center">

                                            {/* LEFT SIDE: MATCHING CRITERIA */}
                                            <div className="space-y-2">
                                                <div className="text-[10px] uppercase tracking-wider font-bold text-gray-400 flex items-center gap-1">
                                                    If bank text contains
                                                </div>
                                                <div className="flex flex-wrap gap-2">
                                                    {rule.keyword.split(',').map((kw, i) => (
                                                        <div key={i} className="group relative inline-flex items-center">
                                                            <span className="inline-flex items-center px-2.5 py-1.5 rounded-md bg-gray-100 text-gray-700 text-sm font-mono font-medium border border-gray-200 hover:border-gray-300 transition-colors">
                                                                {kw.trim()}
                                                                <button
                                                                    onClick={() => handleRemoveKeyword(rule, kw.trim())}
                                                                    className="ml-1.5 text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                                                                >
                                                                    <X className="w-3 h-3" />
                                                                </button>
                                                            </span>
                                                        </div>
                                                    ))}

                                                    {/* Inline Add Keyword Input */}
                                                    <div className="inline-flex items-center">
                                                        <Input
                                                            className="h-8 w-24 text-xs px-2 py-1 bg-transparent border-dashed border-gray-300 focus:border-amber-400 focus:ring-0 placeholder:text-gray-400"
                                                            placeholder="+ Add"
                                                            onKeyDown={(e) => {
                                                                if (e.key === 'Enter') {
                                                                    handleAddKeyword(rule, e.currentTarget.value);
                                                                    e.currentTarget.value = '';
                                                                }
                                                            }}
                                                        />
                                                    </div>
                                                </div>
                                            </div>

                                            {/* CENTER: ARROW */}
                                            <div className="flex flex-col items-center justify-center pt-4">
                                                <ArrowRight className="w-5 h-5 text-gray-300" />
                                            </div>

                                            {/* RIGHT SIDE: RESULT */}
                                            <div className="space-y-2">
                                                <div className="text-[10px] uppercase tracking-wider font-bold text-emerald-600/70">
                                                    Apply this category & name
                                                </div>

                                                <div className="flex flex-col gap-2">
                                                    {/* Editable Title */}
                                                    <Input
                                                        defaultValue={rule.renamedTitle || rule.keyword.split(',')[0].trim()}
                                                        className="h-8 font-semibold text-gray-900 border-transparent hover:border-gray-200 focus:border-blue-500 px-2 -ml-2 transition-all bg-transparent"
                                                        onBlur={(e) => {
                                                            if (e.target.value !== (rule.renamedTitle || "")) {
                                                                handleInlineUpdate(rule.id, 'renamedTitle', e.target.value);
                                                            }
                                                        }}
                                                        onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()}
                                                    />

                                                    <div className="flex items-center gap-2">
                                                        {/* Category Select */}
                                                        <div className="w-40">
                                                            <CategorySelect
                                                                categories={categories}
                                                                value={rule.categoryId}
                                                                onValueChange={(id) => handleInlineUpdate(rule.id, 'categoryId', id)}
                                                                className="h-8 text-xs border-gray-200 bg-white"
                                                            />
                                                        </div>

                                                        {/* Priority Select */}
                                                        <div className="w-28">
                                                            <MobileDrawerSelect
                                                                value={rule.financial_priority || 'wants'}
                                                                onValueChange={(val) => handleInlineUpdate(rule.id, 'financial_priority', val)}
                                                                options={Object.entries(FINANCIAL_PRIORITIES).filter(([k]) => k !== 'savings').map(([k, v]) => ({ value: k, label: v.label }))}
                                                                customTrigger={
                                                                    <button className={`w-full flex items-center gap-1.5 px-2 h-8 rounded-md border text-xs font-medium transition-colors ${rule.financial_priority === 'needs' ? 'bg-emerald-50 border-emerald-100 text-emerald-700' : 'bg-amber-50 border-amber-100 text-amber-700'}`}>
                                                                        {rule.financial_priority === 'needs' ? <ShieldCheck className="w-3.5 h-3.5" /> : <Sparkles className="w-3.5 h-3.5" />}
                                                                        <span className="truncate">{FINANCIAL_PRIORITIES[rule.financial_priority || 'wants']?.label}</span>
                                                                    </button>
                                                                }
                                                            />
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex items-center self-center pl-4 border-l border-gray-100">
                                        <CustomButton
                                            variant="destructive"
                                            size="icon"
                                            className="h-8 w-8 opacity-40 hover:opacity-100 transition-opacity"
                                            onClick={() => deleteRule(rule.id)}
                                            disabled={isDeleting}
                                        >
                                            <Trash2 className="w-3.5 h-3.5" />
                                        </CustomButton>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
