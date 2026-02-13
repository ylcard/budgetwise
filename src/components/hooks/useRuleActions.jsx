import { useState } from "react";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
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
    const [editingRuleId, setEditingRuleId] = useState(null); // Moved from component

    // Fetch Rules
    const { data: rules = [], isLoading, isFetching } = useQuery({
        queryKey: [QUERY_KEYS.CATEGORY_RULES, user?.email],
        queryFn: () => base44.entities.CategoryRule.filter({ user_email: user?.email }),
        enabled: !!user?.email
    });

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
            handleCloseDialog();
            toast({ title: "Rule created", description: "Transactions will be categorized automatically." });
        }
    });

    const deleteRule = useMutation({
        mutationFn: (id) => base44.entities.CategoryRule.delete(id),
        onSuccess: invalidate
    });

    const updateRule = useMutation({
        mutationFn: ({ id, data }) => base44.entities.CategoryRule.update(id, data),
        onSuccess: () => {
            invalidate();
            if (isDialogOpen) handleCloseDialog();
        }
    });

    // Bulk Delete Mutation
    const deleteBulkRules = useMutation({
        mutationFn: async (ids) => {
            const idArray = Array.from(ids);
            // Batch deletions if needed, simplistic approach for now
            await base44.entities.CategoryRule.deleteMany({ id: { $in: idArray } });
        },
        onSuccess: () => {
            invalidate();
            setSelectedIds(new Set());
            toast({ title: "Rules deleted", description: "Selected automation rules have been removed." });
        },
        onError: (e) => toast({ title: "Failed", description: e.message, variant: "destructive" })
    });

    // --- Helper Handlers ---
    const handleToggleRuleMode = (rule) => {
        if (rule.regexPattern) {
            if (window.confirm("Switch to Keyword mode? This will delete your current regex pattern.")) {
                updateRule.mutate({ id: rule.id, data: { regexPattern: null, keyword: null } });
            }
        } else {
            const currentKeywords = (rule.keyword || "").split(',').map(k => k.trim()).filter(Boolean);
            const escapedKeywords = currentKeywords.map(k => k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
            const suggestedRegex = escapedKeywords.length > 0 ? `(${escapedKeywords.join('|')})` : "";
            if (window.confirm(`Switch to Regex mode? This will convert keywords to: ${suggestedRegex}`)) {
                updateRule.mutate({ id: rule.id, data: { keyword: null, regexPattern: suggestedRegex } });
            }
        }
    };

    const handleAddKeyword = (rule, newKeyword) => {
        if (!newKeyword.trim()) return;
        const currentKeywords = (rule.keyword || "").split(',').map(k => k.trim()).filter(Boolean);
        if (currentKeywords.includes(newKeyword.trim())) return;
        const updatedKeywords = [...currentKeywords, newKeyword.trim()].join(',');
        updateRule.mutate({ id: rule.id, data: { keyword: updatedKeywords } });
    };

    const handleRemoveKeyword = (rule, keywordToRemove) => {
        const currentKeywords = (rule.keyword || "").split(',').map(k => k.trim()).filter(Boolean);
        const updatedKeywords = currentKeywords.filter(k => k !== keywordToRemove).join(',');
        if (!updatedKeywords) {
            toast({ title: "Cannot remove last keyword", variant: "destructive" });
            return;
        }
        updateRule.mutate({ id: rule.id, data: { keyword: updatedKeywords } });
    };

    const handleEditKeyword = (rule, index, newValue) => {
        const currentKeywords = (rule.keyword || "").split(',').map(k => k.trim());
        if (!newValue.trim()) {
            handleRemoveKeyword(rule, currentKeywords[index]);
            return;
        }
        if (currentKeywords[index] === newValue.trim()) return;
        currentKeywords[index] = newValue.trim();
        updateRule.mutate({ id: rule.id, data: { keyword: currentKeywords.join(',') } });
    };

    // Moved from component: Inline validation and update
    const handleInlineUpdate = (ruleId, field, value) => {
        // Validation logic reused
        if (field === 'regexPattern' && value) {
            try {
                new RegExp(value);
            } catch (e) {
                return; // Silently fail or use toast if preferred
            }
        }
        updateRule.mutate({ id: ruleId, data: { [field]: value } });
    };

    // Unified Save Handler (Create vs Update)
    const handleSaveRule = () => {
        if (!formData.categoryId) return toast({ title: "Missing Category", variant: "destructive" });
        if (isRegexMode && !formData.regexPattern) return toast({ title: "Missing Pattern", variant: "destructive" });
        if (!isRegexMode && !formData.keyword) return toast({ title: "Missing Keywords", variant: "destructive" });

        if (isRegexMode) {
            try { new RegExp(formData.regexPattern); }
            catch (e) { return toast({ title: "Invalid Regex", description: e.message, variant: "destructive" }); }
        }

        if (editingRuleId) {
            updateRule.mutate({ id: editingRuleId, data: formData });
        } else {
            createRule.mutate();
        }
    };

    const openRuleForEdit = (rule) => {
        setFormData({
            keyword: rule.keyword || "",
            regexPattern: rule.regexPattern || "",
            categoryId: rule.categoryId || "",
            renamedTitle: rule.renamedTitle || "",
            financial_priority: rule.financial_priority || "needs"
        });
        setEditingRuleId(rule.id);
        setIsRegexMode(!!rule.regexPattern);
        setIsDialogOpen(true);
    };

    // NEW: Open dialog pre-filled with data from a specific transaction
    const openCreateRuleFromTransaction = (transaction) => {
        // 1. Heuristic: Remove specific IDs (3+ digits) and special chars to suggest a clean keyword
        const sourceText = transaction.rawDescription || transaction.title || "";
        const suggestedKeyword = sourceText
            .replace(/[0-9]{3,}/g, '') // Remove IDs/Dates
            .replace(/[*#]/g, ' ')     // Remove bank noise separators
            .replace(/\s+/g, ' ')      // Collapse multiple spaces
            .trim();

        setFormData({
            keyword: suggestedKeyword,
            regexPattern: "",
            categoryId: transaction.category_id || "",
            renamedTitle: transaction.title || "", // Pre-fill with the title the user (or AI) already set
            financial_priority: transaction.financial_priority || "wants"
        });
        setEditingRuleId(null); // Ensure we are creating a new rule, not editing an old one
        setIsRegexMode(false);
        setIsDialogOpen(true);
    };

    const handleCloseDialog = () => {
        setIsDialogOpen(false);
        setIsRegexMode(false);
        setEditingRuleId(null);
        setFormData({ keyword: "", regexPattern: "", categoryId: "", renamedTitle: "", financial_priority: "wants" });
    };

    return {
        // Data
        rules,
        isLoading: isLoading || isFetching,

        // UI State
        isDialogOpen, setIsDialogOpen,
        selectedIds, setSelectedIds,
        isRegexMode, setIsRegexMode,
        editingRuleId,
        formData, setFormData,

        // Mutations
        createRule, deleteRule, updateRule,
        deleteBulkRules,

        // Handlers
        handleToggleRuleMode,
        handleAddKeyword,
        handleRemoveKeyword,
        handleEditKeyword,
        handleSaveRule,
        handleInlineUpdate,
        openRuleForEdit,
        handleCloseDialog,
        openCreateRuleFromTransaction
    };
}
