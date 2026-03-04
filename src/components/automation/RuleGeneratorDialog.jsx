/**
 * RuleGeneratorDialog.jsx
 * ADDED 04-Mar-2026
 *
 * Full-screen Dialog that allows the user to:
 *   1. Trigger an analysis of their transaction history
 *   2. Review detected patterns as "rule candidates"
 *   3. Edit, select/deselect, and bulk-save them as CategoryRule records
 */

import { useEffect, useState, useMemo } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetFooter } from "@/components/ui/sheet";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerDescription, DrawerFooter } from "@/components/ui/drawer";
import { CustomButton } from "@/components/ui/CustomButton";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Loader2, Sparkles, BrainCircuit, ListChecks, Save, Search, ChevronLeft, ChevronRight } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useIsMobile } from "@/hooks/use-mobile";
import RuleCandidateRow from "./RuleCandidateRow";

const ITEMS_PER_PAGE = 20;

export default function RuleGeneratorDialog({
    isOpen,
    onOpenChange,
    candidates,
    isAnalyzing,
    selectedCount,
    allCategories,
    onAnalyze,
    onToggle,
    onToggleAll,
    onUpdate,
    onRemove,
    onSave,
    isSaving,
}) {
    const isMobile = useIsMobile();
    const [page, setPage] = useState(1);

    // Reset page when candidates change or dialog re-opens
    useEffect(() => {
        setPage(1);
    }, [candidates.length, isOpen]);

    // Auto-analyze when dialog opens
    useEffect(() => {
        if (isOpen && !isAnalyzing && candidates.length === 0) {
            onAnalyze();
        }
    }, [isOpen]); // eslint-disable-line react-hooks/exhaustive-deps

    // Pagination Logic
    const totalPages = Math.ceil(candidates.length / ITEMS_PER_PAGE);
    const paginatedCandidates = useMemo(() => {
        const start = (page - 1) * ITEMS_PER_PAGE;
        return candidates.slice(start, start + ITEMS_PER_PAGE);
    }, [candidates, page]);

    const allSelected = candidates.length > 0 && selectedCount === candidates.length;
    const someSelected = selectedCount > 0 && selectedCount < candidates.length;

    // Shared Content Body (Agnostic to container)
    const ContentBody = (
        <div className="flex flex-col h-full overflow-hidden">
            {isAnalyzing ? (
                <div className="flex flex-col items-center justify-center h-full gap-4">
                    <Loader2 className="w-10 h-10 text-amber-500 animate-spin" />
                    <div className="text-center">
                        <h3 className="text-sm font-semibold text-foreground">Analyzing Transactions</h3>
                        <p className="text-xs text-muted-foreground mt-1">Detecting patterns...</p>
                    </div>
                </div>
            ) : candidates.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full gap-4 p-6 text-center">
                    <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center">
                        <Search className="w-8 h-8 text-muted-foreground" />
                    </div>
                    <div>
                        <h3 className="text-sm font-semibold text-foreground">No New Patterns Found</h3>
                        <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
                            All detected patterns already have matching rules.
                        </p>
                    </div>
                    <CustomButton variant="outline" size="sm" onClick={onAnalyze}>
                        <Sparkles className="w-4 h-4 mr-2" />
                        Re-analyze
                    </CustomButton>
                </div>
            ) : (
                <>
                    {/* Toolbar */}
                    <div className="px-6 py-3 border-b bg-muted/30 flex items-center justify-between gap-4 shrink-0">
                        <div className="flex items-center gap-3 shrink-0">
                            <Checkbox
                                checked={allSelected}
                                ref={(el) => { if (el) el.dataset.indeterminate = someSelected; }}
                                onCheckedChange={(checked) => onToggleAll(!!checked)}
                            />
                            <span className="text-sm text-muted-foreground">
                                {selectedCount} selected
                            </span>
                        </div>
                        <Badge variant="secondary" className="text-xs">
                            <ListChecks className="w-3 h-3 mr-1" />
                            {candidates.length} total
                        </Badge>
                    </div>

                    {/* Scrollable List - Flex-1 fills remaining height */}
                    <ScrollArea className="flex-1">
                        <div className="p-6 space-y-3">
                            {paginatedCandidates.map((candidate) => (
                                <RuleCandidateRow
                                    key={candidate.id}
                                    candidate={candidate}
                                    categories={allCategories}
                                    onToggle={onToggle}
                                    onUpdate={onUpdate}
                                    onRemove={onRemove}
                                />
                            ))}
                        </div>
                    </ScrollArea>

                    {/* Pagination Controls */}
                    {totalPages > 1 && (
                        <div className="px-6 py-2 border-t flex items-center justify-between bg-background shrink-0">
                            <p className="text-xs text-muted-foreground">
                                Page {page} of {totalPages}
                            </p>
                            <div className="flex gap-1">
                                <CustomButton
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => setPage(p => Math.max(1, p - 1))}
                                    disabled={page === 1}
                                    className="h-8 w-8 p-0"
                                >
                                    <ChevronLeft className="w-4 h-4" />
                                </CustomButton>
                                <CustomButton
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                                    disabled={page === totalPages}
                                    className="h-8 w-8 p-0"
                                >
                                    <ChevronRight className="w-4 h-4" />
                                </CustomButton>
                            </div>
                        </div>
                    )}
                </>
            )}
        </div>
    );

    // --- MOBILE VIEW (Drawer) ---
    if (isMobile) {
        return (
            <Drawer open={isOpen} onOpenChange={onOpenChange}>
                <DrawerContent className="h-[92vh] flex flex-col">
                    <DrawerHeader className="px-4 text-left shrink-0">
                        <DrawerTitle className="flex items-center gap-2">
                            <BrainCircuit className="w-5 h-5 text-amber-500" />
                            Rule Generator
                        </DrawerTitle>
                        <DrawerDescription>Review transaction patterns</DrawerDescription>
                    </DrawerHeader>
                    {ContentBody}
                    {candidates.length > 0 && (
                        <DrawerFooter className="px-4 py-4 border-t shrink-0">
                            <CustomButton onClick={onSave} disabled={selectedCount === 0 || isSaving} className="w-full gap-2">
                                {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                                Save {selectedCount} Rules
                            </CustomButton>
                        </DrawerFooter>
                    )}
                </DrawerContent>
            </Drawer>
        );
    }

    // --- DESKTOP VIEW (Sheet) ---
    return (
        <Sheet open={isOpen} onOpenChange={onOpenChange}>
            <SheetContent side="right" className="w-full sm:max-w-xl flex flex-col p-0">
                <SheetHeader className="px-6 py-6 border-b shrink-0">
                    <SheetTitle className="flex items-center gap-2">
                        <BrainCircuit className="w-5 h-5 text-amber-500" />
                        Rule Generator
                    </SheetTitle>
                    <SheetDescription>
                        Analyzes your transaction history to detect naming and categorization patterns.
                    </SheetDescription>
                </SheetHeader>
                {ContentBody}
                {candidates.length > 0 && (
                    <SheetFooter className="px-6 py-4 border-t bg-muted/20 shrink-0 sm:justify-between sm:space-x-0">
                        <p className="text-xs text-muted-foreground self-center">Rules apply to future imports.</p>
                        <CustomButton onClick={onSave} disabled={selectedCount === 0 || isSaving} className="gap-2">
                            {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                            Save {selectedCount} Rules
                        </CustomButton>
                    </SheetFooter>
                )}
            </SheetContent>
        </Sheet>
    );
}