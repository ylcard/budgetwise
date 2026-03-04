/**
 * RuleGeneratorDialog.jsx
 * ADDED 04-Mar-2026
 *
 * Full-screen Dialog that allows the user to:
 *   1. Trigger an analysis of their transaction history
 *   2. Review detected patterns as "rule candidates"
 *   3. Edit, select/deselect, and bulk-save them as CategoryRule records
 */
import { useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogPortal } from "@/components/ui/dialog";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerDescription, DrawerFooter } from "@/components/ui/drawer";
import { CustomButton } from "@/components/ui/CustomButton";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Loader2, Sparkles, BrainCircuit, ListChecks, Save, Search } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useIsMobile } from "@/hooks/use-mobile";
import RuleCandidateRow from "./RuleCandidateRow";

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

    // Auto-analyze when dialog opens
    useEffect(() => {
        if (isOpen && !isAnalyzing && candidates.length === 0) {
            onAnalyze();
        }
    }, [isOpen]); // eslint-disable-line react-hooks/exhaustive-deps

    const allSelected = candidates.length > 0 && selectedCount === candidates.length;
    const someSelected = selectedCount > 0 && selectedCount < candidates.length;

    const Content = (
        <>
            <div className="flex flex-col h-full max-h-[inherit] overflow-hidden">
                {/* Header */}
                <DialogHeader className={isMobile ? "px-4 pt-4 pb-2 text-left" : "px-6 pt-6 pb-4 border-b"}>
                    {isMobile && (
                        <div className="mx-auto w-12 h-1.5 rounded-full bg-muted mb-4 md:hidden" />
                    )}
                    <DialogTitle className="flex items-center gap-2">
                        <BrainCircuit className="w-5 h-5 text-amber-500" />
                        Rule Generator
                    </DialogTitle>
                    <DialogDescription>
                        Analyzes your transaction history to detect naming and categorization patterns, then creates automation rules from them.
                    </DialogDescription>
                </DialogHeader>

                {/* Content */}
                <div className="flex-1 min-h-0 overflow-hidden">
                    {isAnalyzing ? (
                        <div className="flex flex-col items-center justify-center h-64 gap-4">
                            <Loader2 className="w-10 h-10 text-amber-500 animate-spin" />
                            <div className="text-center">
                                <h3 className="text-sm font-semibold text-foreground">Analyzing Transactions</h3>
                                <p className="text-xs text-muted-foreground mt-1">Detecting patterns from the last 6 months...</p>
                            </div>
                        </div>
                    ) : candidates.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-64 gap-4">
                            <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center">
                                <Search className="w-8 h-8 text-muted-foreground" />
                            </div>
                            <div className="text-center">
                                <h3 className="text-sm font-semibold text-foreground">No New Patterns Found</h3>
                                <p className="text-xs text-muted-foreground mt-1 max-w-sm">
                                    All detected patterns already have matching rules, or there isn't enough data yet. Import more transactions and try again.
                                </p>
                            </div>
                            <CustomButton
                                variant="outline"
                                size="sm"
                                onClick={onAnalyze}
                            >
                                <Sparkles className="w-4 h-4 mr-2" />
                                Re-analyze
                            </CustomButton>
                        </div>
                    ) : (
                        <div className="flex flex-col h-full">
                            {/* Toolbar */}
                            <div className="px-6 py-3 border-b bg-muted/30 flex items-center justify-between gap-4">
                                <div className="flex items-center gap-3 shrink-0">
                                    <Checkbox
                                        checked={allSelected}
                                        ref={(el) => {
                                            if (el) el.dataset.indeterminate = someSelected;
                                        }}
                                        onCheckedChange={(checked) => onToggleAll(!!checked)}
                                    />
                                    <span className="text-sm text-muted-foreground">
                                        {selectedCount} of {candidates.length} selected
                                    </span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Badge variant="secondary" className="text-xs">
                                        <ListChecks className="w-3 h-3 mr-1" />
                                        {candidates.length} candidates
                                    </Badge>
                                    <CustomButton
                                        variant="outline"
                                        size="sm"
                                        onClick={onAnalyze}
                                        className="text-xs h-7"
                                    >
                                        <Sparkles className="w-3 h-3 mr-1" />
                                        Refresh
                                    </CustomButton>
                                </div>
                            </div>

                            {/* Candidate List */}
                            <ScrollArea className="flex-1 px-6 py-4">
                                <div className="space-y-3">
                                    {candidates.map((candidate) => (
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
                        </div>
                    )}
                </div>

                {/* Footer */}
                {candidates.length > 0 && (
                    <DialogFooter className="px-6 py-4 border-t bg-muted/20">
                        <div className="flex items-center justify-between w-full gap-4">
                            <p className="hidden sm:block text-xs text-muted-foreground">
                                Selected rules will be saved and applied to future imports automatically.
                            </p>
                            <CustomButton
                                onClick={onSave}
                                disabled={selectedCount === 0 || isSaving}
                                className="gap-2 w-full sm:w-auto"
                            >
                                {isSaving ? (
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                ) : (
                                    <Save className="w-4 h-4" />
                                )}
                                Save {selectedCount} Rule{selectedCount !== 1 ? "s" : ""}
                            </CustomButton>
                        </div>
                    </DialogFooter>
                )}
            </div>
        </>
    );

    if (isMobile) {
        return (
            <Drawer open={isOpen} onOpenChange={onOpenChange}>
                <DrawerContent className="max-h-[92vh]">
                    {Content}
                </DrawerContent>
            </Drawer>
        );
    }

    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-3xl max-h-[85vh] flex flex-col p-0 overflow-hidden block">
                {Content}
            </DialogContent>
        </Dialog>
    );
}