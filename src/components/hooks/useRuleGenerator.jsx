import { useState, useMemo, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { useSettings } from "@/components/utils/SettingsContext";
import { toast } from "sonner";
import { QUERY_KEYS } from "./queryKeys";
import { fetchWithRetry } from "../utils/generalUtils";
import { formatDateString, normalizeToMidnight } from "../utils/dateUtils";
import { subMonths } from 'date-fns';

// ─── Constants ───────────────────────────────────────────────────────
const CANDIDATE_QUERY_KEY = "rule_generator_candidates";
const MIN_FREQUENCY = 1; // Show even if it happened once, as long as it has a pattern

// Common financial noise words to strip out for the "Stable Core"
const STOP_WORDS = new Set([
  "THE", "AND", "OF", "TO", "FOR", "IN", "AT", "BY",
  "VISA", "MASTERCARD", "AMEX", "PAYPAL", "STRIPE", "SQUARE",
  "SL", "SA", "INC", "LTD", "LLC", "GMBH", "CORP", "S.L.", "S.A.",
  "WWW", "COM", "NET", "ORG", "HTTP", "HTTPS",
  "PAYMENT", "PURCHASE", "BILL", "TRANSFER", "POS", "CARD", "DEBIT", "CREDIT",
  "DIRECT", "DEBIT", "REF", "ID", "TX", "NO", "N", "DE", "PARA"
]);

// ─── Logic: Stable Signature Extraction ──────────────────────────────
/**
 * Reduces a raw dirty string to its "stable core".
 * Removes noise words and isolated numbers to find the merchant entity.
 * e.g., "N 2026058000127951 ENERGIA NUFRI S.L." -> "ENERGIA NUFRI"
 */
function getStableSignature(rawDescription) {
  if (!rawDescription) return "";

  return rawDescription
    .toUpperCase()
    // Split by whitespace or asterisks, but preserve internal dots, slashes, and dashes
    .split(/[\s*]+/)
    .filter(token => {
      if (!token) return false;

      // Clean only leading/trailing punctuation (e.g. "III," -> "III")
      const cleanToken = token.replace(/^[.,!?;:]|[.,!?;:]$/g, "");

      if (STOP_WORDS.has(cleanToken)) return false;
      if (/^\d+$/.test(cleanToken)) return false;
      if (cleanToken.length > 8 && /\d/.test(cleanToken) && /[A-Z]/.test(cleanToken)) return false;

      return cleanToken.length > 1;

    })
    .join(" ");
}

/**
 * Analyzes transaction history to find recurring patterns that are not yet covered by rules.
 * @param {Array} transactions - List of past transactions.
 * @param {Array} existingRules - Currently active category rules.
 * @param {Array} categories - Available categories for mapping.
 */
export const extractCandidates = (transactions, existingRules, categories) => {
  if (!transactions?.length) return [];

  // 1. Build existing rule check (Optimized)
  const existingKeywords = new Set();
  (existingRules || []).forEach(r => {
    if (r.keyword) {
      r.keyword.split(",").forEach(k => existingKeywords.add(k.trim().toUpperCase()));
    }
  });

  // 2. Group by "Stable Signature"
  const groupMap = new Map();

  for (const tx of transactions) {
    if (tx.type === "income") continue;
    const raw = (tx.rawDescription || "").trim();
    if (!raw) continue;

    // Generate the "Brain" signature
    const signature = getStableSignature(raw);

    // If signature is empty (e.g. raw was just "123456"), fall back to raw or skip
    const key = signature || raw.toUpperCase();

    // Skip if this KEYWORD (the stable core) is already a known rule
    if (existingKeywords.has(key)) continue;

    // Skip if the raw string matches a known rule (redundancy check)
    // e.g. Rule="AMAZON", Raw="AMAZON 123" -> Signature="AMAZON" -> Matched above.
    // But what if Rule="AMAZON 123"? We check inclusions.
    let covered = false;
    for (const ruleKey of existingKeywords) {
      if (raw.toUpperCase().includes(ruleKey)) {
        covered = true;
        break;
      }
    }
    if (covered) continue;

    if (!groupMap.has(key)) {
      groupMap.set(key, {
        signature: key,
        rawSample: raw, // Keep one raw example for display
        titles: new Map(),
        categories: new Map(),
        priorities: new Map(),
        count: 0,
      });
    }

    const group = groupMap.get(key);
    group.count++;

    // Track title frequency
    const title = (tx.title || "").trim();
    // Only count if it's NOT just the raw string (meaning user renamed it)
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

  // 3. Convert groups into candidates
  const candidates = [];

  for (const [, group] of groupMap) {
    if (group.count < MIN_FREQUENCY) continue;

    const topTitle = getMostFrequent(group.titles);
    const topCategoryId = getMostFrequent(group.categories);
    const topPriority = getMostFrequent(group.priorities);

    // Filter: Must have valuable info (a rename OR a category)
    if (!topCategoryId && !topTitle) continue;

    const category = categories.find(c => c.id === topCategoryId);

    candidates.push({
      id: `cand_${hashString(group.signature)}`,
      rawDescription: group.rawSample, // Show the user what the bank sent
      keyword: group.signature,        // The Smart Core (Editable)

      // Suggestions based on history
      renamedTitle: topTitle || "",
      categoryId: topCategoryId || "",
      financial_priority: topPriority || "wants",

      // Display meta
      suggestedCategoryName: category?.name || "Uncategorized",
      frequency: group.count,
      hasRename: !!topTitle,
      hasCategory: !!topCategoryId,
      selected: true,
    });
  }

  // Sort: High frequency first
  candidates.sort((a, b) => b.frequency - a.frequency);

  return candidates;
};

/**
 * Returns the key with the highest value in a Map<Key, Count>.
 */
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

/**
 * Simple string hashing for generating stable temp IDs.
 */
function hashString(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash |= 0;
  }
  return Math.abs(hash).toString(36);
}

/**
 * Hook managing the state and logic for the Rule Generator Wizard.
 */
export function useRuleGenerator() {
  const { user } = useSettings();
  const queryClient = useQueryClient();

  const [isOpen, setIsOpen] = useState(false);
  const [candidates, setCandidates] = useState([]);

  // Fetch transactions (last 6 months) using centralized date logic
  const { data: transactions = [], isLoading: txLoading } = useQuery({
    queryKey: [CANDIDATE_QUERY_KEY, "transactions", user?.email],
    queryFn: async () => {
      // Normalize "Now" to local midnight and subtract 6 months
      const today = normalizeToMidnight(new Date());
      const cutoff = subMonths(today, 6);
      const cutoffStr = formatDateString(cutoff);

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

  // Fetch categories
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
    return [
      ...userCategories.map(c => ({ ...c, isSystemCategory: false })),
      ...systemCategories.map(c => ({ ...c, isSystemCategory: true })),
    ];
  }, [userCategories, systemCategories]);

  const isAnalyzing = txLoading || rulesLoading;

  // Generate candidates
  const analyze = useCallback(() => {
    if (isAnalyzing) return;
    const result = extractCandidates(transactions, existingRules, allCategories);
    setCandidates(result);
  }, [transactions, existingRules, allCategories, isAnalyzing]);

  // Toggles & Updates
  const toggleCandidate = useCallback((candidateId) => {
    setCandidates(prev => prev.map(c => c.id === candidateId ? { ...c, selected: !c.selected } : c));
  }, []);

  const toggleAll = useCallback((selected) => {
    setCandidates(prev => prev.map(c => ({ ...c, selected })));
  }, []);

  const updateCandidate = useCallback((candidateId, field, value) => {
    setCandidates(prev => prev.map(c => c.id === candidateId ? { ...c, [field]: value } : c));
  }, []);

  const removeCandidate = useCallback((candidateId) => {
    setCandidates(prev => prev.filter(c => c.id !== candidateId));
  }, []);

  // Save Mutation
  const saveMutation = useMutation({
    mutationFn: async () => {
      const toSave = candidates.filter(c => c.selected);
      if (toSave.length === 0) return { count: 0 };

      const rules = toSave.map(c => ({
        keyword: c.keyword, // This is now the CLEAN signature (e.g. "ENERGIA NUFRI")
        renamedTitle: c.renamedTitle || null,
        categoryId: c.categoryId || null,
        financial_priority: c.financial_priority || "wants",
        user_email: user.email,
        priority: 10,
      }));

      await fetchWithRetry(() => base44.entities.CategoryRule.bulkCreate(rules));
      return { count: rules.length };
    },
    onSuccess: ({ count }) => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.CATEGORY_RULES] });
      toast.success("Rules Created", { description: `${count} rules saved.` });
      setIsOpen(false);
      setCandidates([]);
    },
    onError: (error) => {
      toast.error("Error", { description: error?.message });
    },
  });

  const selectedCount = useMemo(() => candidates.filter(c => c.selected).length, [candidates]);

  return {
    isOpen, setIsOpen,
    candidates, isAnalyzing, selectedCount, allCategories,
    analyze, toggleCandidate, toggleAll, updateCandidate, removeCandidate,
    saveRules: saveMutation.mutate,
    isSaving: saveMutation.isPending,
  };
}