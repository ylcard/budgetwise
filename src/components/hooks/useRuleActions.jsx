import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { useSettings } from "@/components/utils/SettingsContext";
import { useToast } from "@/components/ui/use-toast";
import { QUERY_KEYS } from "./queryKeys";

export function useRuleActions() {
    const { user } = useSettings();
    const { toast } = useToast();
    const queryClient = useQueryClient();

    // UI States
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [selectedIds, setSelectedIds] = useState(new Set());
    const [isRegexMode, setIsRegexMode] = useState(false);
    const [formData, setFormData] = useState({
        keyword: "",
        regexPattern: "",
        categoryId: "",
        renamedTitle: "",
        financial_priority: "wants"
    });

    const invalidate = () => queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.CATEGORY_RULES, user?.email] });

    const createRule = useMutation({
        mutationFn: () => base44.entities.CategoryRule.create({
            user_email: user.email,
            categoryId: formData.categoryId,
            keyword: isRegexMode ? null : formData.keyword,
            regexPattern: isRegexMode ? formData.regexPattern : null,
            renamedTitle: formData.renamedTitle || null,
            priority: 10,
            financial_priority: formData.financial_priority
        }),
        onSuccess: () => {
            invalidate();
            setIsDialogOpen(false);
            setFormData({ keyword: "", regexPattern: "", categoryId: "", renamedTitle: "", financial_priority: "wants" });
            toast({ title: "Rule created" });
        }
    });

    const deleteRule = useMutation({
        mutationFn: (id) => base44.entities.CategoryRule.delete(id),
        onSuccess: invalidate
    });

    const updateRule = useMutation({
        mutationFn: ({ id, data }) => base44.entities.CategoryRule.update(id, data),
        onSuccess: invalidate
    });

    return {
        isDialogOpen, setIsDialogOpen,
        selectedIds, setSelectedIds,
        isRegexMode, setIsRegexMode,
        formData, setFormData,
        createRule, deleteRule, updateRule
    };
}
