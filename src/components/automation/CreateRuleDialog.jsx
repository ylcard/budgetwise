import { useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { CustomButton } from "@/components/ui/CustomButton";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import CategorySelect from "@/components/ui/CategorySelect";
import { Loader2, Code2, Type, ShieldCheck, Sparkles } from "lucide-react";
import { useMergedCategories } from "@/components/hooks/useMergedCategories";
import { useSettings } from "@/components/utils/SettingsContext";

export default function CreateRuleDialog({
    open,
    onOpenChange,
    formData,
    setFormData,
    isRegexMode,
    setIsRegexMode,
    isWholeWord,
    setIsWholeWord,
    onSubmit,
    isSubmitting,
    isEditing
}) {
    const { categories } = useMergedCategories();

    const { user } = useSettings();

    // Automatically inject user_email into formData when dialog opens
    // This prevents 422 errors because the schema requires this field.
    useEffect(() => {
        if (open && user?.email && formData && !formData.user_email) {
            setFormData(prev => ({
                ...prev,
                user_email: user.email
            }));
        }
    }, [open, user, formData, setFormData]);

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[425px]">
                <form onSubmit={onSubmit}>
                    <DialogHeader>
                        <DialogTitle>{isEditing ? "Edit Rule" : "Create Automation Rule"}</DialogTitle>
                        <DialogDescription>
                            When a transaction contains the keywords below, it will be automatically categorized.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">

                        {/* MODE TOGGLE */}
                        <div className="flex items-center space-x-2 bg-gray-50 p-2 rounded-lg border">
                            <button
                                className={`flex-1 text-xs font-medium py-1.5 rounded-md transition-all ${!isRegexMode ? 'bg-white shadow text-gray-900' : 'text-gray-500 hover:text-gray-900'}`}
                                onClick={() => setIsRegexMode(false)}
                            >
                                <Type className="w-3 h-3 inline mr-1" /> Simple Keywords
                            </button>
                            <button
                                className={`flex-1 text-xs font-medium py-1.5 rounded-md transition-all ${isRegexMode ? 'bg-white shadow text-purple-700' : 'text-gray-500 hover:text-gray-900'}`}
                                onClick={() => setIsRegexMode(true)}
                            >
                                <Code2 className="w-3 h-3 inline mr-1" /> Regex (Advanced)
                            </button>
                        </div>

                        {isRegexMode ? (
                            <div className="grid gap-2">
                                <Label htmlFor="regex" className="text-purple-700 flex items-center gap-2">Regular Expression</Label>
                                <Input
                                    id="regex"
                                    placeholder="^Uber.*Eats?$"
                                    className="font-mono text-xs"
                                    value={formData.regexPattern}
                                    onChange={(e) => setFormData({ ...formData, regexPattern: e.target.value })}
                                />
                            </div>
                        ) : (
                            <div className="grid gap-2">
                                <Label htmlFor="keywords">If text contains...</Label>
                                <Input
                                    id="keywords"
                                    placeholder="e.g. Uber, Lyft (comma separated)"
                                    value={formData.keyword}
                                    onChange={(e) => setFormData({ ...formData, keyword: e.target.value })}
                                />
                                <div className="flex items-center space-x-2 mt-1">
                                    <input
                                        type="checkbox"
                                        id="wholeWord"
                                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 h-4 w-4"
                                        checked={isWholeWord}
                                        onChange={(e) => setIsWholeWord(e.target.checked)}
                                    />
                                    <Label htmlFor="wholeWord" className="text-xs font-normal text-gray-500 cursor-pointer">
                                        Match whole words only (Strict)
                                    </Label>
                                </div>
                            </div>
                        )}

                        <div className="grid gap-2">
                            <Label>Then assign category...</Label>
                            <CategorySelect
                                categories={categories}
                                value={formData.categoryId}
                                onValueChange={(id) => setFormData({ ...formData, categoryId: id })}
                            />
                        </div>

                        <div className="grid gap-2">
                            <Label>Financial Priority</Label>
                            <Select
                                value={formData.financial_priority}
                                onValueChange={(val) => setFormData({ ...formData, financial_priority: val })}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Select priority" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="needs">
                                        <span className="flex items-center gap-2"><ShieldCheck className="w-4 h-4 text-emerald-500" /> Essentials</span>
                                    </SelectItem>
                                    <SelectItem value="wants">
                                        <span className="flex items-center gap-2"><Sparkles className="w-4 h-4 text-amber-500" /> Lifestyle</span>
                                    </SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="grid gap-2">
                            <Label htmlFor="rename">And rename to (optional)...</Label>
                            <Input
                                id="rename"
                                placeholder="e.g. Taxi Ride"
                                value={formData.renamedTitle}
                                onChange={(e) => setFormData({ ...formData, renamedTitle: e.target.value })}
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <CustomButton type="submit" disabled={isSubmitting} className="w-full sm:w-auto">
                            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Save Rule
                        </CustomButton>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
