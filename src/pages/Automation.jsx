import { useMemo, useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { QUERY_KEYS } from "../components/hooks/queryKeys";
import { PullToRefresh } from "../components/ui/PullToRefresh";
import { useFAB } from "../components/hooks/FABContext";
import { useSettings } from "@/components/utils/SettingsContext";
import AutomationRulesSettings from "../components/settings/AutomationRulesSettings";

export default function Automation() {
    const queryClient = useQueryClient();
    const { user } = useSettings();
    const { setFabButtons, clearFabButtons } = useFAB();

    const handleRefresh = async () => {
        await queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.CATEGORY_RULES, user?.email] });
    };

    const fabButtons = useMemo(() => [
        {
            key: 'add-rule',
            label: 'Add Rule',
            icon: 'PlusCircle',
            variant: 'create',
            onClick: () => {
                // We'll need to trigger the dialog here
                window.dispatchEvent(new CustomEvent('open-rule-dialog'));
            }
        }
    ], []);

    useEffect(() => {
        setFabButtons(fabButtons);
        return () => clearFabButtons();
    }, [fabButtons, setFabButtons, clearFabButtons]);

    return (
        <PullToRefresh onRefresh={handleRefresh}>
            <div className="min-h-screen p-4 md:p-8">
                <div className="max-w-7xl mx-auto space-y-6">
                    <div>
                        <h1 className="text-3xl md:text-4xl font-bold text-gray-900">Automation</h1>
                        <p className="text-gray-500 mt-1">Manage how the engine recognizes and cleans your transactions</p>
                    </div>
                    
                    <AutomationRulesSettings />
                </div>
            </div>
        </PullToRefresh>
    );
}
