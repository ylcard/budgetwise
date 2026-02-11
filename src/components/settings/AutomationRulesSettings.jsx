import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { useSettings } from "@/components/utils/SettingsContext";
import { useCategories } from "@/components/hooks/useBase44Entities";
import { useToast } from "@/components/ui/use-toast";
import { CustomButton } from "@/components/ui/CustomButton";
import { BrainCircuit, Trash2, ArrowRight, Loader2, AlertCircle, Plus, Pencil, ArrowRightCircle } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import CategorySelect from "@/components/ui/CategorySelect";

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
        mutationFn: ({ id, data }) => base44.entities.CategoryRule.update(id, data),
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

    const handleSave = () => {
        if (!formData.keyword || !formData.categoryId) {
            toast({ title: "Missing fields", description: "Please enter a keyword and select a category.", variant: "destructive" });
            return;
        }

        if (editingRule) {
            updateRule({ id: editingRule.id, data: formData });
        } else {
            createRule();
        }
    };

    const handleEditClick = (rule) => {
        setEditingRule(rule);
        setFormData({
            keyword: rule.keyword,
            categoryId: rule.categoryId,
            renamedTitle: rule.renamedTitle || "",
            financial_priority: rule.financial_priority || "wants"
        });
        setIsDialogOpen(true);
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
                                <DialogTitle>{editingRule ? "Edit Rule" : "Create Automation Rule"}</DialogTitle>
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
                                <CustomButton onClick={handleSave} disabled={isCreating || isUpdating} className="w-full sm:w-auto">
                                    {(isCreating || isUpdating) && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
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
                                        <div className="flex items-center gap-2 mb-1">
                                            <span className="text-xs font-bold uppercase tracking-wider text-gray-400">If text contains:</span>
                                        </div>
                                        <div className="flex flex-wrap gap-1.5 mb-4">
                                            {rule.keyword.split(',').map((kw, i) => (
                                                <span key={i} className="inline-flex items-center px-2.5 py-1 rounded-md bg-gray-100 text-gray-700 text-xs font-mono font-medium border border-gray-200">
                                                    {kw.trim()}
                                                </span>
                                            ))}
                                        </div>

                                        {/* BEFORE & AFTER VISUALIZATION */}
                                        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 text-sm bg-slate-50 p-3 rounded-lg border border-slate-100">
                                            {/* BEFORE STATE */}
                                            <div className="flex flex-col">
                                                <span className="text-[10px] uppercase tracking-wider font-bold text-slate-400 mb-1">Incoming</span>
                                                <div className="text-gray-500 italic font-mono bg-white px-2 py-1 rounded border border-dashed border-gray-300">
                                                    "{rule.keyword.split(',')[0].trim()}..."
                                                </div>
                                            </div>

                                            <ArrowRight className="hidden sm:block w-4 h-4 text-slate-300 mx-1" />

                                            {/* AFTER STATE */}
                                            <div className="flex flex-col">
                                                <span className="text-[10px] uppercase tracking-wider font-bold text-emerald-600/70 mb-1">Result</span>
                                                <div className="flex items-center gap-2">
                                                    <span className="font-semibold text-gray-900 bg-white px-2 py-1 rounded border shadow-sm">
                                                        {rule.renamedTitle || rule.keyword.split(',')[0].trim()}
                                                    </span>
                                                    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border ${category ? '' : 'bg-red-50 text-red-600 border-red-200'}`} style={category ? { backgroundColor: `${category.color}15`, color: category.color, borderColor: `${category.color}30` } : {}}>
                                                        {category ? category.name : "Missing Category"}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-2 self-end sm:self-center">
                                        <CustomButton variant="outline" size="icon" className="h-9 w-9" onClick={() => handleEditClick(rule)}>
                                            <Pencil className="w-4 h-4 text-gray-500" />
                                        </CustomButton>
                                        <CustomButton
                                            variant="destructive"
                                            size="icon"
                                            className="h-9 w-9"
                                            onClick={() => deleteRule(rule.id)}
                                            disabled={isDeleting}
                                        >
                                            <Trash2 className="w-4 h-4" />
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
