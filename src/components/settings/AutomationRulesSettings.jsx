import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { useSettings } from "@/components/utils/SettingsContext";
import { useCategories } from "@/components/hooks/useBase44Entities";
import { useToast } from "@/components/ui/use-toast";
import { CustomButton } from "@/components/ui/CustomButton";
import { BrainCircuit, Trash2, ArrowRight, Loader2, AlertCircle } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function AutomationRulesSettings() {
    const { user } = useSettings();
    const { categories } = useCategories();
    const { toast } = useToast();
    const queryClient = useQueryClient();

    // Fetch the user's saved rules
    const { data: rules = [], isLoading } = useQuery({
        queryKey: ['categoryRules'],
        queryFn: () => base44.entities.CategoryRule.list({ user_email: user?.email }),
        enabled: !!user?.email
    });

    // Delete Mutation
    const { mutate: deleteRule, isPending: isDeleting } = useMutation({
        mutationFn: (id) => base44.entities.CategoryRule.delete(id),
        onSuccess: () => {
            queryClient.invalidateQueries(['categoryRules']);
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

    if (isLoading) {
        return <div className="flex justify-center p-8"><Loader2 className="w-6 h-6 animate-spin text-gray-400" /></div>;
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <BrainCircuit className="w-5 h-5 text-amber-500" />
                    Automation Rules
                </CardTitle>
                <CardDescription>
                    These are the rules the AI learned from your inbox. If a rule is categorizing things incorrectly, delete it here.
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
                                                {category ? category.name : <span className="text-red-500 flex items-center gap-1"><AlertCircle className="w-3 h-3"/> Missing Category</span>}
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
