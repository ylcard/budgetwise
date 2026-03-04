/**
 * RuleCandidateRow.jsx
 * ADDED 04-Mar-2026
 *
 * A single row in the Rule Generator candidate list.
 * Displays the raw description, suggested title, category, priority,
 * frequency badge, and allows inline editing before saving.
 */

import { memo, useMemo } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { X, ArrowRight, ShieldCheck, Sparkles } from "lucide-react";
import CategorySelect from "@/components/ui/CategorySelect";

const RuleCandidateRow = memo(function RuleCandidateRow({
  candidate,
  categories,
  onToggle,
  onUpdate,
  onRemove,
}) {
  const { id, rawDescription, keyword, renamedTitle, categoryId, financial_priority, frequency, selected } = candidate;

  // Determine visual cues dynamically based on current values
  const hasRename = renamedTitle && renamedTitle.trim().length > 0;
  const hasCategory = !!categoryId;
  const hasPriority = !!financial_priority;

  // Token Logic for surgical keyword building
  const allTokens = useMemo(() => {
    return rawDescription
      .split(/[\s*]+/) // Split on spaces or asterisks
      .map(t => t.replace(/^[.,!?;:]|[.,!?;:]$/g, ""))
      .filter(Boolean);
  }, [rawDescription]);

  // Check if we are in "Raw Mode" (haven't started surgical selection yet)
  const isRawMode = useMemo(() => keyword === rawDescription, [keyword, rawDescription]);
  const activeTokens = useMemo(() => isRawMode ? [] : (keyword || "").split(",").map(k => k.trim()).filter(Boolean), [keyword, isRawMode]);

  const toggleToken = (token) => {
    let newTokens;
    if (isRawMode) {
      // First click: Replace the raw string with just this token
      newTokens = [token];
    } else {
      newTokens = activeTokens.includes(token)
        ? activeTokens.filter(t => t !== token)
        : [...activeTokens, token];
    }

    // If all tokens cleared, revert to rawDescription as fallback
    onUpdate(id, "keyword", newTokens.length > 0 ? newTokens.join(", ") : rawDescription);
  };

  return (
    <div
      className={`group relative rounded-xl border p-4 transition-all ${selected
        ? "border-blue-200 bg-blue-50/30 dark:border-blue-800 dark:bg-blue-950/20"
        : "border-border bg-card opacity-60"
        }`}
    >
      {/* Header: Checkbox + Raw Description + Frequency */}
      <div className="flex items-start gap-3">
        <Checkbox
          checked={selected}
          onCheckedChange={() => onToggle(id)}
          className="mt-1 shrink-0"
        />

        <div className="flex-1 min-w-0 space-y-3">
          {/* Row 1: Pattern Detection Summary */}
          <div className="flex items-center gap-2 flex-wrap">
            <code className="text-xs font-mono bg-muted px-2 py-0.5 rounded truncate max-w-[240px]" title={rawDescription}>
              {rawDescription}
            </code>
            {hasRename && (
              <ArrowRight className="w-3 h-3 text-muted-foreground shrink-0" />
            )}
            {hasRename && (
              <span className="text-xs font-medium text-foreground truncate max-w-[180px]" title={renamedTitle}>
                {renamedTitle}
              </span>
            )}
            <Badge variant="secondary" className="text-[10px] shrink-0">
              {frequency}×
            </Badge>
            {hasRename && (
              <Badge variant="outline" className="text-[10px] text-emerald-600 border-emerald-200 dark:border-emerald-800 shrink-0">
                Rename
              </Badge>
            )}
            {hasCategory && (
              <Badge variant="outline" className="text-[10px] text-blue-600 border-blue-200 dark:border-blue-800 shrink-0">
                Category
              </Badge>
            )}
            {hasPriority && (
              <Badge variant="outline" className="text-[10px] text-amber-600 border-amber-200 dark:border-amber-800 shrink-0">
                Priority
              </Badge>
            )}
          </div>

          {/* Row 2: Editable Fields */}
          {selected && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {/* Keyword */}
              <div className="sm:col-span-2 lg:col-span-2">
                <div className="flex items-center justify-between">
                  <label className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
                    Match Logic: <span className="text-amber-600 font-bold">{keyword.includes(',') ? 'OR (Any)' : 'PHRASE (Exact)'}</span>
                  </label>
                </div>
                <div className="flex flex-wrap gap-1 mt-1.5 mb-2">
                  {allTokens.map((token, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => toggleToken(token)}
                      className={`text-[10px] px-2 py-0.5 rounded-md border transition-all truncate max-w-[150px] ${activeTokens.includes(token)
                        ? "bg-amber-100 border-amber-300 text-amber-700 dark:bg-amber-900/40 dark:border-amber-700 dark:text-amber-300"
                        : "bg-muted border-transparent text-muted-foreground opacity-50 hover:opacity-100"
                        }`}
                    >
                      {token}
                    </button>
                  ))}
                </div>
                <Input
                  value={keyword}
                  onChange={(e) => onUpdate(id, "keyword", e.target.value)}
                  className="h-8 text-xs"
                  placeholder="Keywords (comma-separated for OR)..."
                />
              </div>

              {/* Renamed Title */}
              <div>
                <label className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Rename To</label>
                <Input
                  value={renamedTitle}
                  onChange={(e) => onUpdate(id, "renamedTitle", e.target.value)}
                  className="h-8 text-xs mt-0.5"
                  placeholder="Clean display name..."
                />
              </div>

              {/* Category */}
              <div>
                <label className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Category</label>
                <CategorySelect
                  categories={categories}
                  value={categoryId}
                  onValueChange={(val) => onUpdate(id, "categoryId", val)}
                  className="h-8 text-xs mt-0.5"
                />
              </div>

              {/* Priority Toggle */}
              <div>
                <label className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Priority</label>
                <div className="flex bg-muted p-0.5 rounded-lg h-8 items-center mt-0.5">
                  <button
                    type="button"
                    onClick={() => onUpdate(id, "financial_priority", "needs")}
                    className={`flex-1 px-2 py-1 rounded-md text-[10px] font-medium flex items-center justify-center gap-1 transition-all ${financial_priority === "needs"
                      ? "bg-background text-emerald-700 shadow-sm dark:text-emerald-400"
                      : "text-muted-foreground hover:text-foreground"
                      }`}
                  >
                    <ShieldCheck className="w-3 h-3" /> Essentials
                  </button>
                  <button
                    type="button"
                    onClick={() => onUpdate(id, "financial_priority", "wants")}
                    className={`flex-1 px-2 py-1 rounded-md text-[10px] font-medium flex items-center justify-center gap-1 transition-all ${financial_priority === "wants"
                      ? "bg-background text-amber-600 shadow-sm dark:text-amber-400"
                      : "text-muted-foreground hover:text-foreground"
                      }`}
                  >
                    <Sparkles className="w-3 h-3" /> Lifestyle
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Remove button */}
        <button
          onClick={() => onRemove(id)}
          className="shrink-0 p-1.5 rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10 opacity-0 group-hover:opacity-100 transition-all"
          title="Dismiss this suggestion"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
});

export default RuleCandidateRow;