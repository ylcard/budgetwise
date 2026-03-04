/**
 * useRuleGenerator.jsx
 * ADDED 04-Mar-2026
 *
 * Analyzes existing transactions to detect patterns where:
 *   1. rawDescription differs from the final title (renaming pattern)
 *   2. A category was manually assigned
 *
 * Groups identical raw descriptions together, counts frequency,
 * and produces "rule candidates" the user can review and bulk-save
 * as CategoryRule records.
 */
import { useState, useMemo, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { useSettings } from "@/components/utils/SettingsContext";
import { showToast } from "@/components/ui/use-toast";
import { QUERY_KEYS } from "./queryKeys";
import { fetchWithRetry } from "../utils/generalUtils";

// ─── Constants ───────────────────────────────────────────────────────
const CANDIDATE_QUERY_KEY = "rule_generator_candidates";
const MIN_FREQUENCY = 1; // Minimum occurrences to surface as candidate

// ─── Candidate Extraction Logic (pure function) ─────────────────────
/**
 * Scans transactions and existing rules to find new rule candidates.
 *
 * A candidate is generated when:
 *   - rawDescription exists AND differs from title (renaming pattern detected)
 *   - OR a category_id is assigned (categorization pattern detected)
 *   - AND no existing rule already covers that rawDescription
 *
 * @param {Array} transactions
 * @param {Array} existingRules
 * @param {Array} categories
 * @returns {Array} Array of candidate objects
 */
export const extractCandidates = (transactions, existingRules, categories) => {
    if (!transactions?.length) return [];

    // Build a set of existing rule keywords for fast O(1) dedup
    const existingKeywords = new Set();
    (existingRules || []).forEach(r => {
        if (r.keyword) {
            r.keyword.split(",").forEach(k => existingKeywords.add(k.trim().toUpperCase()));
        }
        if (r.regexPattern) {
            // We can't reliably deduplicate regex, so we skip
        }
    });

    // Group transactions by rawDescription
    const groupMap = new Map();

    for (const tx of transactions) {
        if (tx.type === "income") continue; // Skip income transactions
        const raw = (tx.rawDescription || "").trim();
        if (!raw) continue;

        // Skip if an existing rule already covers this exact keyword
        if (existingKeywords.has(raw.toUpperCase())) continue;

        const key = raw.toUpperCase();

        if (!groupMap.has(key)) {
            groupMap.set(key, {
                rawDescription: raw,
                titles: new Map(),      // title -> count
                categories: new Map(),  // category_id -> count
                priorities: new Map(),  // financial_priority -> count
                count: 0,
            });
        }

        const group = groupMap.get(key);
        group.count++;

        // Track title frequency
        const title = (tx.title || "").trim();
        if (title && title.toUpperCase() !== raw.toUpperCase()) {
            group.titles.set(title, (group.titles.get(title) || 0) + 1);
        }

        // Track category frequency
        if (tx.category_id) {
            group.categories.set(tx.category_id, (group.categories.get(tx.category_id) || 0) + 1);
        }

        // Track priority frequency
        if (tx.financial_priority) {
            group.priorities.set(tx.financial_priority, (group.priorities.get(tx.financial_priority) || 0) + 1);
        }
    }

    // Convert groups into candidates
    const candidates = [];

    for (const [, group] of groupMap) {
        if (group.count < MIN_FREQUENCY) continue;

        // Determine "winner" for each field by frequency
        const topTitle = getMostFrequent(group.titles);
        const topCategoryId = getMostFrequent(group.categories);
        const topPriority = getMostFrequent(group.priorities);

        // Must have at least a category OR a title rename to be useful
        if (!topCategoryId && !topTitle) continue;

        const category = categories.find(c => c.id === topCategoryId);

        candidates.push({
            id: `cand_${hashString(group.rawDescription)}`,
            rawDescription: group.rawDescription,
            suggestedKeyword: group.rawDescription,
            suggestedTitle: topTitle || "",
            suggestedCategoryId: topCategoryId || "",
            suggestedCategoryName: category?.name || "Uncategorized",
            suggestedPriority: topPriority || "wants",
            frequency: group.count,
            hasRename: !!topTitle,
            hasCategory: !!topCategoryId,
            // Editable state (user can override before saving)
            keyword: group.rawDescription,
            renamedTitle: topTitle || "",
            categoryId: topCategoryId || "",
            financial_priority: topPriority || "wants",
            selected: true, // Pre-selected for bulk save
        });
    }

    // Sort by frequency descending (most impactful first)
    candidates.sort((a, b) => b.frequency - a.frequency);

    return candidates;
};

// ─── Helpers ─────────────────────────────────────────────────────────
function getMostFrequent(map) {
    if (map.size === 0) return null;
    let maxKey = null;
    let maxCount = 0;
    for (const [key, count] of map) {
        if (count > maxCount) {
            maxCount = count;
            maxKey = key;
        }
    }
    return maxKey;
}

function hashString(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        const char = str.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash |= 0;
    }
    return Math.abs(hash).toString(36);
}

// ─── Hook ────────────────────────────────────────────────────────────
export function useRuleGenerator() {
    const { user } = useSettings();
    const queryClient = useQueryClient();

    const [isOpen, setIsOpen] = useState(false);
    const [candidates, setCandidates] = useState([]);

    // Fetch transactions (last 6 months for pattern detection)
    const { data: transactions = [], isLoading: txLoading } = useQuery({
        queryKey: [CANDIDATE_QUERY_KEY, "transactions", user?.email],
        queryFn: async () => {
            const cutoff = new Date();
            cutoff.setMonth(cutoff.getMonth() - 6);
            const cutoffStr = cutoff.toISOString().split("T")[0];
            return fetchWithRetry(() =>
                base44.entities.Transaction.filter({
                    created_by: user?.email,
                    date: { $gte: cutoffStr },
                })
            );
        },
        enabled: !!user?.email && isOpen,
        staleTime: 1000 * 60 * 5,
    });

    // Fetch existing rules
    const { data: existingRules = [], isLoading: rulesLoading } = useQuery({
        queryKey: [QUERY_KEYS.CATEGORY_RULES, user?.email],
        queryFn: () => fetchWithRetry(() => base44.entities.CategoryRule.filter({ created_by: user?.email })),
        enabled: !!user?.email && isOpen,
        staleTime: 1000 * 60 * 60,
    });

    // Fetch categories (for display names)
    const { data: userCategories = [] } = useQuery({
        queryKey: [QUERY_KEYS.CATEGORIES, user?.email],
        queryFn: () => fetchWithRetry(() => base44.entities.Category.filter({ created_by: user?.email })),
        enabled: !!user?.email && isOpen,
        staleTime: 1000 * 60 * 60,
    });

    const { data: systemCategories = [] } = useQuery({
        queryKey: [QUERY_KEYS.SYSTEM_CATEGORIES],
        queryFn: () => fetchWithRetry(() => base44.entities.SystemCategory.list()),
        enabled: isOpen,
        staleTime: 1000 * 60 * 60,
    });

    const allCategories = useMemo(() => {
        const merged = [
            ...userCategories.map(c => ({ ...c, isSystemCategory: false })),
            ...systemCategories.map(c => ({ ...c, isSystemCategory: true })),
        ];
        return merged;
    }, [userCategories, systemCategories]);

    const isAnalyzing = txLoading || rulesLoading;

    // Generate candidates when data is ready
    const analyze = useCallback(() => {
        if (isAnalyzing) return;
        const result = extractCandidates(transactions, existingRules, allCategories);
        setCandidates(result);
    }, [transactions, existingRules, allCategories, isAnalyzing]);

    // Toggle candidate selection
    const toggleCandidate = useCallback((candidateId) => {
        setCandidates(prev =>
            prev.map(c => c.id === candidateId ? { ...c, selected: !c.selected } : c)
        );
    }, []);

    // Toggle all
    const toggleAll = useCallback((selected) => {
        setCandidates(prev => prev.map(c => ({ ...c, selected })));
    }, []);

    // Update a candidate field
    const updateCandidate = useCallback((candidateId, field, value) => {
        setCandidates(prev =>
            prev.map(c => c.id === candidateId ? { ...c, [field]: value } : c)
        );
    }, []);

    // Remove a candidate from the list
    const removeCandidate = useCallback((candidateId) => {
        setCandidates(prev => prev.filter(c => c.id !== candidateId));
    }, []);

    // Bulk save selected candidates as CategoryRule records
    const saveMutation = useMutation({
        mutationFn: async () => {
            const toSave = candidates.filter(c => c.selected);
            if (toSave.length === 0) return { count: 0 };

            const rules = toSave.map(c => ({
                keyword: c.keyword,
                renamedTitle: c.renamedTitle || null,
                categoryId: c.categoryId,
                financial_priority: c.financial_priority || "wants",
                user_email: user.email,
                priority: 10,
            }));

            await fetchWithRetry(() => base44.entities.CategoryRule.bulkCreate(rules));
            return { count: rules.length };
        },
        onSuccess: ({ count }) => {
            queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.CATEGORY_RULES] });
            showToast({
                title: "Rules Created",
                description: `${count} automation rule${count !== 1 ? "s" : ""} saved successfully.`,
            });
            setIsOpen(false);
            setCandidates([]);
        },
        onError: (error) => {
            showToast({
                title: "Error",
                description: error?.message || "Failed to save rules.",
                variant: "destructive",
            });
        },
    });

    const selectedCount = useMemo(() => candidates.filter(c => c.selected).length, [candidates]);

    return {
        // State
        isOpen,
        setIsOpen,
        candidates,
        isAnalyzing,
        selectedCount,
        allCategories,

        // Actions
        analyze,
        toggleCandidate,
        toggleAll,
        updateCandidate,
        removeCandidate,
        saveRules: saveMutation.mutate,
        isSaving: saveMutation.isPending,
    };
}