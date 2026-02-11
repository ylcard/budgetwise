import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { useSettings } from "@/components/utils/SettingsContext";
import { useCategories } from "@/components/hooks/useBase44Entities";
import { useToast } from "@/components/ui/use-toast";
import { CustomButton } from "@/components/ui/CustomButton";
import { BrainCircuit, Trash2, ArrowRight, Loader2, AlertCircle, Plus, Save } from "lucide-react";
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
    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [newRule, setNewRule] = useState({
        keyword: "",
        categoryId: "",
        renamedTitle: "",
        financial_priority: "wants"
    });

    // Fetch the user's saved rules
    const { data: rules = [], isLoading } = useQuery({
        queryKey: ['categoryRules', user?.email],
        queryFn: () => base44.entities.CategoryRule.list({ user_email: user?.email }),
        enabled: !!user?.email
    });

    // Delete Mutation
    const { mutate: deleteRule, isPending: isDeleting } = useMutation({
        mutationFn: (id) => base44.entities.CategoryRule.delete(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['categoryRules'] });
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

    // Create Mutation
    const { mutate: createRule, isPending: isCreating } = useMutation({
        mutationFn: () => base44.entities.CategoryRule.create({
            user_email: user.email,
            categoryId: newRule.categoryId,
            keyword: newRule.keyword,
            renamedTitle: newRule.renamedTitle || null,
            priority: 10,
            financial_priority: newRule.financial_priority
        }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['categoryRules'] });
            toast({ title: "Rule created", description: "Future transactions matching these keywords will be categorized automatically." });
            setIsCreateOpen(false);
            setNewRule({ keyword: "", categoryId: "", renamedTitle: "", financial_priority: "wants" });
        },
        onError: (error) => {
            toast({
                title: "Failed to create rule",
                description: error.message,
                variant: "destructive"
            });
        }
    });

    const handleCreate = () => {
        if (!newRule.keyword || !newRule.categoryId) {
            toast({ title: "Missing fields", description: "Please enter a keyword and select a category.", variant: "destructive" });
            return;
        }
        createRule();
    };

    if (isLoading) {
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

                    <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
                        <DialogTrigger asChild>
                            <CustomButton size="sm" className="gap-2">
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
                                        value={newRule.keyword}
                                        onChange={(e) => setNewRule({ ...newRule, keyword: e.target.value })}
                                    />
                                </div>
                                <div className="grid gap-2">
                                    <Label>Then assign category...</Label>
                                    <CategorySelect
                                        categories={categories}
                                        value={newRule.categoryId}
                                        onValueChange={(id) => setNewRule({ ...newRule, categoryId: id })}
                                    />
                                </div>
                                <div className="grid gap-2">
                                    <Label>Financial Priority</Label>
                                    <Select
                                        value={newRule.financial_priority}
                                        onValueChange={(val) => setNewRule({ ...newRule, financial_priority: val })}
                                    >
                                        <SelectTrigger>
                                            <SelectValue placeholder="Select priority" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="needs">Needs (Essential)</SelectItem>
                                            <SelectItem value="wants">Wants (Discretionary)</SelectItem>
                                            <SelectItem value="savings">Savings / Investments</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="grid gap-2">
                                    <Label htmlFor="rename">And rename to (optional)...</Label>
                                    <Input
                                        id="rename"
                                        placeholder="e.g. Taxi Ride"
                                        value={newRule.renamedTitle}
                                        onChange={(e) => setNewRule({ ...newRule, renamedTitle: e.target.value })}
                                    />
                                </div>
                            </div>
                            <DialogFooter>
                                <CustomButton onClick={handleCreate} disabled={isCreating} className="w-full sm:w-auto">
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
                                        <div className="flex items-center gap-2 mb-1">
                                            <span className="text-xs font-bold uppercase tracking-wider text-gray-400">If text contains:</span>
                                        </div>
                                        <div className="flex flex-wrap gap-1.5 mb-3">
                                            {rule.keyword.split(',').map((kw, i) => (
                                                <span key={i} className="inline-flex items-center px-2 py-1 rounded bg-gray-100 text-gray-700 text-xs font-mono font-medium truncate max-w-full">
                                                    {kw.trim()}
                                                </span>
                                            ))}
                                        </div>

                                        <div className="flex items-center gap-2 text-sm">
                                            <span className="text-gray-500">Rename to</span>
                                            <strong className="text-gray-900">{rule.renamedTitle || 'Original Name'}</strong>
                                            <ArrowRight className="w-4 h-4 text-gray-300" />
                                            <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 font-medium">
                                                {category ? category.name : <span className="text-red-500 flex items-center gap-1"><AlertCircle className="w-3 h-3" /> Missing Category</span>}
                                            </span>
                                        </div>
                                    </div>

                                    <CustomButton
                                        variant="destructive"
                                        size="icon"
                                        className="shrink-0 h-10 w-10 self-end sm:self-auto"
                                        onClick={() => deleteRule(rule.id)}
                                        disabled={isDeleting}
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </CustomButton>
                                </div>
                            );
                        })}
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
