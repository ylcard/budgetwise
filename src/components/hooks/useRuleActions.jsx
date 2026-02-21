import { useState } from "react";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { useSettings } from "@/components/utils/SettingsContext";
import { useToast } from "@/components/ui/use-toast";
import { QUERY_KEYS } from "./queryKeys";
import { fetchWithRetry } from "../utils/generalUtils";

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
        queryFn: () => fetchWithRetry(() => base44.entities.CategoryRule.filter({ created_by: user?.email })),
        enabled: !!user?.email,
        staleTime: 1000 * 60 * 60,
    });

    const [isRegexMode, setIsRegexMode] = useState(false);
    const [isWholeWord, setIsWholeWord] = useState(false);
    const [formData, setFormData] = useState({
        keyword: "",
        regexPattern: "",
        categoryId: "",
        renamedTitle: "",
        financial_priority: "wants"
    });

    const invalidate = () => queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.CATEGORY_RULES, user?.email] });

    const createRule = useMutation({
        mutationFn: () => fetchWithRetry(() => base44.entities.CategoryRule.create({
            created_by: user.email,
            user_email: user.email,
            categoryId: formData.categoryId,
            // Logic: If Regex Mode -> use regexPattern
            // If Whole Word -> generate regex with boundaries \b
            // Else -> use simple keyword
            keyword: (!isRegexMode && !isWholeWord) ? formData.keyword : null,
            regexPattern: isRegexMode
                ? formData.regexPattern
                : (isWholeWord ? `(?i)\\b${formData.keyword.trim()}\\b` : null),
            renamedTitle: formData.renamedTitle || null,
            priority: 10,
            financial_priority: formData.financial_priority
        })),
        onSuccess: () => {
            invalidate();
            handleCloseDialog();
            toast({ title: "Rule created", description: "Transactions will be categorized automatically." });
        }
    });

    const deleteRule = useMutation({
        mutationFn: (id) => fetchWithRetry(() => base44.entities.CategoryRule.delete(id)),
        onSuccess: invalidate
    });

    const updateRule = useMutation({
        mutationFn: ({ id, data }) => fetchWithRetry(() => base44.entities.CategoryRule.update(id, {
            ...data,
            user_email: user.email
        })),
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
            await fetchWithRetry(() => base44.entities.CategoryRule.deleteMany({ id: { $in: idArray } }));
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
    const handleInlineUpdate = (ruleId, field, value, e) => {
        // Validation logic reused
        if (e && e.preventDefault) e.preventDefault();
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
    const handleSaveRule = (e) => {
        if (e && e.preventDefault) e.preventDefault();
        if (!formData.categoryId) return toast({ title: "Missing Category", variant: "destructive" });
        // Validation
        if (isRegexMode) {
            if (!formData.regexPattern) return toast({ title: "Missing Pattern", variant: "destructive" });
            try { new RegExp(formData.regexPattern); }
            catch (e) { return toast({ title: "Invalid Regex", description: e.message, variant: "destructive" }); }
        } else {
            if (!formData.keyword) return toast({ title: "Missing Keywords", variant: "destructive" });
        }

        // Prepare payload logic is now inside the mutationFn to keep this clean,
        // but we need to pass the current state to the update mutation manually
        const payload = { ...formData };

        // TRANSFORM: Handle "Whole Word" conversion for Updates
        if (!isRegexMode && isWholeWord) {
            payload.regexPattern = `(?i)\\b${formData.keyword.trim()}\\b`;
            payload.keyword = null;
        } else if (isRegexMode) {
            payload.keyword = null;
        } else {
            payload.regexPattern = null;
        }

        if (editingRuleId) {
            updateRule.mutate({ id: editingRuleId, data: payload });
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
        // Detect if it was saved as a Whole Word regex (starts with (?i)\b and ends with \b)
        const isWholeWordRegex = rule.regexPattern && rule.regexPattern.startsWith("(?i)\\b") && rule.regexPattern.endsWith("\\b");

        if (isWholeWordRegex) {
            setIsRegexMode(false); // Show as simple mode to the user
            setIsWholeWord(true);
            // Extract the keyword back out
            const extracted = rule.regexPattern.replace("(?i)\\b", "").replace("\\b", "");
            setFormData(prev => ({ ...prev, keyword: extracted, regexPattern: "" }));
        } else {
            setIsWholeWord(false);
        }
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
        setIsWholeWord(true); // Default to Whole Word for safety when creating from transaction
        setIsDialogOpen(true);
    };

    const handleCloseDialog = () => {
        setIsDialogOpen(false);
        setIsRegexMode(false);
        setIsWholeWord(false);
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
        isWholeWord, setIsWholeWord,
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
