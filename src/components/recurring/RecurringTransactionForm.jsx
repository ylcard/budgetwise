import { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { CustomButton } from "@/components/ui/CustomButton";
import { Label } from "@/components/ui/label";
import { MobileDrawerSelect } from "@/components/ui/MobileDrawerSelect"; // ADDED 03-Feb-2026: iOS-native action sheets on mobile
import { Checkbox } from "@/components/ui/checkbox";
import { AlertCircle, StickyNote, Tag, Search, Check, Calendar } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerTrigger, DrawerClose } from "@/components/ui/drawer";
import AmountInput from "../ui/AmountInput";
import DatePicker, { CalendarView } from "../ui/DatePicker";
import CategorySelect from "../ui/CategorySelect";
import { useSettings } from "../utils/SettingsContext";
import { formatDateString, formatDate } from "../utils/dateUtils";
import { normalizeAmount } from "../utils/generalUtils";
import { cn } from "@/lib/utils";
import { FINANCIAL_PRIORITIES } from "../utils/constants";
import { getCategoryIcon } from "../utils/iconMapConfig";
import { useIsMobile } from "@/hooks/use-mobile";

const FREQUENCY_OPTIONS = [
    { value: "daily", label: "Daily" },
    { value: "weekly", label: "Weekly" },
    { value: "biweekly", label: "Every 2 Weeks" },
    { value: "monthly", label: "Monthly" },
    { value: "quarterly", label: "Quarterly" },
    { value: "yearly", label: "Yearly" },
];

const MobileCategoryFormSelect = ({ value, categories, onSelect, placeholder }) => {
    const [searchTerm, setSearchTerm] = useState("");
    const selectedCategory = categories.find(c => c.id === value);
    const label = selectedCategory ? selectedCategory.name : placeholder;

    const filteredCategories = categories.filter(cat =>
        cat.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <Drawer>
            <DrawerTrigger asChild>
                <CustomButton
                    variant="outline"
                    className="w-full justify-between h-12 px-3 font-normal text-sm"
                >
                    <span className={cn("truncate", !selectedCategory && "text-muted-foreground")}>
                        {label}
                    </span>
                    <Tag className="h-4 w-4 opacity-50" />
                </CustomButton>
            </DrawerTrigger>
            <DrawerContent className="z-[600] flex flex-col max-h-[90dvh]">
                <DrawerHeader>
                    <DrawerTitle>Select Category</DrawerTitle>
                </DrawerHeader>

                <div className="px-4 pb-2">
                    <div className="relative">
                        <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Search categories..."
                            className="pl-9 h-10 bg-muted/30"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                </div>

                <div className="p-4 space-y-1 overflow-y-auto flex-1 pb-[calc(2rem+env(safe-area-inset-bottom))]">
                    {filteredCategories.map((cat) => {
                        const isSelected = value === cat.id;
                        const Icon = getCategoryIcon(cat.icon);
                        return (
                            <DrawerClose key={cat.id} asChild>
                                <button
                                    onClick={() => onSelect(cat.id)}
                                    className={cn(
                                        "w-full flex items-center justify-between px-4 py-4 rounded-xl text-base font-medium transition-colors",
                                        isSelected ? "bg-blue-50 text-blue-600" : "active:bg-gray-100"
                                    )}
                                >
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ backgroundColor: `${cat.color}20` }}>
                                            <Icon className="w-4 h-4" style={{ color: cat.color }} />
                                        </div>
                                        <span>{cat.name}</span>
                                    </div>
                                    {isSelected && <Check className="w-5 h-5" />}
                                </button>
                            </DrawerClose>
                        );
                    })}
                </div>
            </DrawerContent>
        </Drawer>
    );
};

const ResponsiveDatePicker = ({ value, onChange, placeholder, className }) => {
    const isMobile = useIsMobile();
    const dateValue = value ? new Date(value) : undefined;

    if (isMobile) {
        return (
            <Drawer>
                <DrawerTrigger asChild>
                    <CustomButton
                        variant="outline"
                        className={cn("w-full justify-start text-left font-normal", !value && "text-muted-foreground", className)}
                    >
                        <Calendar className="mr-2 h-4 w-4" />
                        {value ? formatDate(dateValue, 'MMM dd, yyyy') : <span>{placeholder}</span>}
                    </CustomButton>
                </DrawerTrigger>
                <DrawerContent className="z-[600]">
                    <div className="p-4 pb-8 flex justify-center">
                        <CalendarView selected={dateValue} onSelect={(d) => onChange(d ? formatDateString(d) : '')} />
                    </div>
                </DrawerContent>
            </Drawer>
        );
    }

    return (
        <DatePicker value={value} onChange={onChange} placeholder={placeholder} className={className} />
    );
};

export default function RecurringTransactionForm({
    initialData = null,
    categories = [],
    onSubmit,
    onCancel,
    isSubmitting = false,
}) {
    const { settings, user } = useSettings();
    const [validationError, setValidationError] = useState(null);
    const [showNotes, setShowNotes] = useState(!!initialData?.notes);

    const [formData, setFormData] = useState({
        title: '',
        amount: null,
        type: 'expense',
        category_id: '',
        financial_priority: '',
        frequency: 'monthly',
        nextOccurrence: formatDateString(new Date()),
        notes: '',
        isActive: true,
    });

    // Initialize form data from initialData (for editing)
    useEffect(() => {
        if (initialData) {
            setFormData({
                title: initialData.title || '',
                amount: initialData.amount || null,
                type: initialData.type || 'expense',
                category_id: initialData.category_id || '',
                financial_priority: initialData.financial_priority || '',
                frequency: initialData.frequency || 'monthly',
                nextOccurrence: initialData.nextOccurrence || formatDateString(new Date()),
                notes: initialData.notes || '',
                isActive: initialData.isActive ?? true,
            });
            if (initialData.notes) setShowNotes(true);
        }
    }, [initialData, settings?.baseCurrency]);

    // Auto-set Priority based on Category
    useEffect(() => {
        if (formData.category_id && formData.type === 'expense') {
            if (initialData && formData.category_id === initialData.category_id) return;
            const selectedCategory = categories.find(c => c.id === formData.category_id);
            if (selectedCategory?.priority) {
                setFormData(prev => ({ ...prev, financial_priority: selectedCategory.priority }));
            }
        }
    }, [formData.category_id, categories, initialData, formData.type]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setValidationError(null);

        const normalizedAmount = normalizeAmount(formData.amount);
        const amount = parseFloat(normalizedAmount);

        if (!formData.title.trim()) {
            setValidationError("Please enter a title.");
            return;
        }
        if (isNaN(amount) || amount <= 0) {
            setValidationError("Please enter a valid amount.");
            return;
        }
        if (formData.type === 'expense' && !formData.financial_priority) {
            setValidationError("Please select a financial priority for expenses.");
            return;
        }

        const submitData = {
            title: formData.title.trim(),
            amount: amount,
            type: formData.type,
            category_id: formData.type === 'expense' ? (formData.category_id || null) : null,
            financial_priority: formData.type === 'expense' ? (formData.financial_priority || null) : null,
            frequency: formData.frequency,
            nextOccurrence: formData.nextOccurrence,
            notes: formData.notes || null,
            isActive: formData.isActive,
            user_email: user.email,
        };

        onSubmit(submitData);
    };

    return (
        <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0 overflow-hidden">
            <div className="flex-1 overflow-y-auto px-4 pb-4 pt-4 md:px-0 md:overflow-visible">
                {validationError && (
                    <Alert variant="destructive">
                        <AlertCircle className="h-4 w-4" />
                        <AlertDescription>{validationError}</AlertDescription>
                    </Alert>
                )}

                {/* Type Toggle */}
                <div className="flex justify-center pb-2 mb-6">
                    <div className="flex gap-2 p-1 bg-slate-100/80 rounded-lg">
                        <CustomButton
                            type="button"
                            variant={formData.type === 'expense' ? 'default' : 'ghost'}
                            size="sm"
                            onClick={() => setFormData({ ...formData, type: 'expense' })}
                            className={cn("w-24 transition-all", formData.type === 'expense' && "shadow-sm")}
                        >
                            Expense
                        </CustomButton>
                        <CustomButton
                            type="button"
                            variant={formData.type === 'income' ? 'success' : 'ghost'}
                            size="sm"
                            onClick={() => setFormData({ ...formData, type: 'income' })}
                            className={cn("w-24 transition-all", formData.type === 'income' && "shadow-sm")}
                        >
                            Income
                        </CustomButton>
                    </div>
                </div>

                {/* Title */}
                <div className="mb-6">
                    <Input
                        id="title"
                        value={formData.title}
                        onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                        placeholder="Title (e.g., Rent, Netflix)"
                        className="text-lg font-medium border-0 border-b rounded-none px-0 h-10 focus-visible:ring-0 shadow-none placeholder:text-gray-400"
                        required
                        autoComplete="off"
                    />
                </div>

                {/* Amount */}
                <div className="mb-6">
                    <AmountInput
                        id="amount"
                        value={formData.amount}
                        onChange={(value) => setFormData({ ...formData, amount: value })}
                        placeholder="0.00"
                        currency={settings?.baseCurrency || 'EUR'}
                        required
                        className="text-2xl h-12 font-semibold"
                    />
                </div>

                {/* Frequency & Date Row */}
                <div className="grid grid-cols-2 gap-4 mb-6">
                    <div className="space-y-1.5">
                        <Label className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Frequency</Label>
                        <MobileDrawerSelect
                            value={formData.frequency}
                            onValueChange={(value) => setFormData({ ...formData, frequency: value })}
                            placeholder="Select frequency"
                            options={FREQUENCY_OPTIONS}
                        />
                    </div>
                    <div className="space-y-1.5">
                        <Label className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Next Due Date</Label>
                        <ResponsiveDatePicker
                            value={formData.nextOccurrence}
                            onChange={(value) => setFormData({ ...formData, nextOccurrence: value })}
                            placeholder="Select date"
                            className="h-10"
                        />
                    </div>
                </div>

                {/* Category & Priority (Expenses only) */}
                <AnimatePresence>
                    {formData.type === 'expense' && (
                        <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: "auto", opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ type: "spring", bounce: 0, duration: 0.4 }}
                            className="overflow-hidden"
                        >
                            {/* Margin added INSIDE the animated container to collapse smoothly */}
                            <div className="space-y-1.5 mb-6">
                                <Label className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Category & Priority</Label>
                                <div className="flex gap-3">
                                    <div className="flex-[3]">
                                        <div className="hidden md:block">
                                            <CategorySelect
                                                value={formData.category_id}
                                                onValueChange={(value) => setFormData({ ...formData, category_id: value })}
                                                categories={categories}
                                                placeholder="Category"
                                            />
                                        </div>
                                        <div className="md:hidden">
                                            <MobileCategoryFormSelect
                                                value={formData.category_id}
                                                onSelect={(value) => setFormData({ ...formData, category_id: value })}
                                                categories={categories}
                                                placeholder="Category"
                                            />
                                        </div>
                                    </div>
                                    <div className="flex-[2]">
                                        <CustomButton
                                            type="button"
                                            variant="outline"
                                            className={cn(
                                                "w-full h-10 justify-center px-3 text-sm font-medium transition-colors border-dashed",
                                                formData.financial_priority ? "bg-blue-50/50 border-blue-200 border-solid" : "text-muted-foreground hover:bg-gray-50"
                                            )}
                                            onClick={() => {
                                                const opts = Object.keys(FINANCIAL_PRIORITIES).filter(k => k !== 'savings');
                                                if (opts.length === 0) return;
                                                const next = (!formData.financial_priority || formData.financial_priority === opts[1]) ? opts[0] : opts[1];
                                                setFormData({ ...formData, financial_priority: next });
                                            }}
                                        >
                                            {formData.financial_priority ? (
                                                <div className="flex items-center gap-2">
                                                    <div className="w-2.5 h-2.5 rounded-full shadow-sm" style={{ backgroundColor: FINANCIAL_PRIORITIES[formData.financial_priority].color }} />
                                                    <span className="text-gray-900">{FINANCIAL_PRIORITIES[formData.financial_priority].label}</span>
                                                </div>
                                            ) : (
                                                <div className="flex items-center gap-2">
                                                    <Tag className="w-4 h-4 opacity-50" />
                                                    <span>Priority</span>
                                                </div>
                                            )}
                                        </CustomButton>
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Notes */}
                <div className="space-y-2 mb-6">
                    <AnimatePresence mode="wait">
                        {!showNotes && !formData.notes ? (
                            <motion.div key="add-note-btn" exit={{ opacity: 0, scale: 0.95 }}>
                                <CustomButton
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => setShowNotes(true)}
                                    className="text-muted-foreground h-8 px-2"
                                >
                                    <StickyNote className="w-3.5 h-3.5 mr-2" />
                                    Add Note
                                </CustomButton>
                            </motion.div>
                        ) : (
                            <motion.div key="notes-area" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
                                <Textarea
                                    id="notes"
                                    value={formData.notes}
                                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                                    placeholder="Additional details..."
                                    rows={2}
                                    className="resize-none"
                                    autoFocus={!initialData?.notes} // Focus only if freshly opened
                                />
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>

                {/* Active Toggle */}
                <div className="flex items-center space-x-2 bg-slate-50 p-3 rounded-lg border border-slate-100">
                    <Checkbox
                        id="isActive"
                        checked={formData.isActive}
                        onCheckedChange={(checked) => setFormData({ ...formData, isActive: checked })}
                    />
                    <Label htmlFor="isActive" className="cursor-pointer font-medium text-slate-700">
                        Active
                    </Label>
                </div>
            </div>

            {/* Action Buttons */}
            <div className="shrink-0 bg-background border-t p-4 pb-[max(1rem,env(safe-area-inset-bottom))] md:border-none md:p-0 md:pt-4 flex justify-end gap-3 z-10">
                <CustomButton type="button" variant="outline" onClick={onCancel}>
                    Cancel
                </CustomButton>
                <CustomButton type="submit" disabled={isSubmitting} variant="primary">
                    {isSubmitting ? 'Saving...' : (initialData ? 'Update' : 'Create')}
                </CustomButton>
            </div>
        </form>
    );
}