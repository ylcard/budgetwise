import { useQueryClient } from "@tanstack/react-query";
import { QUERY_KEYS } from "../components/hooks/queryKeys";
import { PullToRefresh } from "../components/ui/PullToRefresh";
import { useSettings } from "@/components/utils/SettingsContext";
import AutomationRulesSettings from "../components/settings/AutomationRulesSettings";
import { useRuleGenerator } from "../components/hooks/useRuleGenerator";
import RuleGeneratorDialog from "../components/automation/RuleGeneratorDialog";
import { CustomButton } from "@/components/ui/CustomButton";
import { BrainCircuit } from "lucide-react";

export default function Automation() {
    const queryClient = useQueryClient();
    const { user } = useSettings();

    const ruleGenerator = useRuleGenerator();

    const handleRefresh = async () => {
        await queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.CATEGORY_RULES, user?.email] });
    };

    return (
        <PullToRefresh onRefresh={handleRefresh}>
            <div className="p-4 md:p-8">
                <div className="max-w-7xl mx-auto space-y-6">
                    <div className="flex items-center justify-between gap-4 flex-wrap">
                        <div>
                            <h1 className="text-3xl md:text-4xl font-bold text-foreground">Automation</h1>
                            <p className="text-muted-foreground mt-1">Manage how the engine recognizes and cleans your transactions</p>
                        </div>
                        <CustomButton
                            variant="outline"
                            className="gap-2"
                            onClick={() => ruleGenerator.setIsOpen(true)}
                        >
                            <BrainCircuit className="w-4 h-4 text-amber-500" />
                            Generate Rules
                        </CustomButton>
                    </div>

                    <AutomationRulesSettings />

                    <RuleGeneratorDialog
                        isOpen={ruleGenerator.isOpen}
                        onOpenChange={ruleGenerator.setIsOpen}
                        candidates={ruleGenerator.candidates}
                        isAnalyzing={ruleGenerator.isAnalyzing}
                        selectedCount={ruleGenerator.selectedCount}
                        allCategories={ruleGenerator.allCategories}
                        onAnalyze={ruleGenerator.analyze}
                        onToggle={ruleGenerator.toggleCandidate}
                        onToggleAll={ruleGenerator.toggleAll}
                        onUpdate={ruleGenerator.updateCandidate}
                        onRemove={ruleGenerator.removeCandidate}
                        onSave={ruleGenerator.saveRules}
                        isSaving={ruleGenerator.isSaving}
                    />
                </div>
            </div>
        </PullToRefresh>
    );
}