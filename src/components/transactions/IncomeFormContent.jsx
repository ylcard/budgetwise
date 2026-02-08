import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { CustomButton } from "@/components/ui/CustomButton";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerTrigger } from "@/components/ui/drawer";
import { Calendar, StickyNote } from "lucide-react";
import AmountInput from "../ui/AmountInput";
import { CalendarView } from "../ui/DatePicker";
import { formatDateString, getFirstDayOfMonth, formatDate } from "../utils/dateUtils";
import { normalizeAmount } from "../utils/generalUtils";
import { useSettings } from "../utils/SettingsContext";

const MobileIncomeDateDrawer = ({ value, onChange, trigger }) => {
    return (
        <Drawer>
            <DrawerTrigger asChild>{trigger}</DrawerTrigger>
            <DrawerContent className="z-[200] flex flex-col max-h-[90dvh]">
                <DrawerHeader><DrawerTitle>Select Date</DrawerTitle></DrawerHeader>
                <div className="p-4 flex justify-center pb-[calc(2rem+env(safe-area-inset-bottom))]">
                    <CalendarView
                        selected={value ? new Date(value) : new Date()}
                        onSelect={(date) => {
                            if (date) onChange(formatDateString(date));
                        }}
                    />
                </div>
            </DrawerContent>
        </Drawer>
    );
};

export default function IncomeFormContent({
    initialTransaction,
    onSubmit,
    onCancel,
    isSubmitting,
    selectedMonth,
    selectedYear
}) {
    const { settings } = useSettings();
    const [showNotes, setShowNotes] = useState(!!initialTransaction?.notes);

    const getInitialDate = () => {
        const now = new Date();
        if (selectedMonth === now.getMonth() && selectedYear === now.getFullYear()) return formatDateString(now);
        return getFirstDayOfMonth(selectedMonth, selectedYear);
    };

    const [formData, setFormData] = useState({
        title: '',
        amount: null,
        originalCurrency: settings?.baseCurrency || 'USD',
        type: 'income',
        date: getInitialDate(),
        notes: ''
    });

    useEffect(() => {
        if (initialTransaction) {
            setFormData({
                title: initialTransaction.title || '',
                amount: initialTransaction.originalAmount || initialTransaction.amount || null,
                originalCurrency: initialTransaction.originalCurrency || settings?.baseCurrency || 'USD',
                type: 'income',
                date: initialTransaction.date || getInitialDate(),
                notes: initialTransaction.notes || ''
            });
        }
    }, [initialTransaction]);

    const handleSubmit = (e) => {
        e.preventDefault();
        const amountValue = parseFloat(normalizeAmount(formData.amount));

        onSubmit({
            title: formData.title,
            amount: amountValue,
            originalAmount: amountValue,
            originalCurrency: formData.originalCurrency,
            type: 'income',
            date: formData.date,
            category_id: null,
            budgetId: null,
            isPaid: true,
            paidDate: formData.date,
            notes: formData.notes || null,
            isCashTransaction: false
        });
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-6 pt-4">
            {/* Title: Borderless style */}
            <Input
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="Where is this income from?"
                className="text-lg font-medium border-0 border-b rounded-none px-0 h-10 focus-visible:ring-0 shadow-none placeholder:text-gray-400"
                required
                autoComplete="off"
            />

            {/* Row: Amount + Date Popover */}
            <div className="flex items-end gap-3">
                <div className="flex-1">
                    <AmountInput
                        value={formData.amount}
                        onChange={(val) => setFormData({ ...formData, amount: val })}
                        currency={formData.originalCurrency}
                        onCurrencyChange={(curr) => setFormData({ ...formData, originalCurrency: curr })}
                        placeholder="0.00"
                        required
                        className="text-2xl h-12 font-semibold"
                    />
                </div>

                <div className="pt-0">
                    {/* Mobile Date Drawer */}
                    <div className="md:hidden">
                        <MobileIncomeDateDrawer
                            value={formData.date}
                            onChange={(d) => setFormData({ ...formData, date: d })}
                            trigger={
                                <CustomButton type="button" variant="outline" className="h-12 px-3 bg-gray-50/50 border-dashed border-gray-300 text-sm">
                                    <Calendar className="w-3.5 h-3.5 mr-2 text-green-600" />
                                    <span className="text-green-700">{formData.date ? formatDate(new Date(formData.date), 'MMM d') : 'Date'}</span>
                                </CustomButton>
                            }
                        />
                    </div>

                    {/* Desktop Date Popover */}
                    <div className="hidden md:block">
                        <Popover modal={true}>
                            <PopoverTrigger asChild>
                                <CustomButton
                                    type="button"
                                    variant="outline"
                                    className="h-12 px-3 bg-gray-50/50 border-dashed border-gray-300 hover:border-gray-400 hover:bg-gray-100 transition-all text-sm"
                                >
                                    <Calendar className="w-3.5 h-3.5 mr-2 text-green-600" />
                                    <span className="text-green-700">{formData.date ? formatDate(new Date(formData.date), 'MMM d') : 'Date'}</span>
                                </CustomButton>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-4 popover-content-z-index" align="end" side="top">
                                <CalendarView
                                    selected={formData.date ? new Date(formData.date) : new Date()}
                                    onSelect={(date) => {
                                        if (date) setFormData({ ...formData, date: formatDateString(date) });
                                    }}
                                    className="p-0"
                                />
                            </PopoverContent>
                        </Popover>
                    </div>
                </div>
            </div>

            {/* Notes Section */}
            <div className="space-y-2 pt-2">
                <AnimatePresence mode="wait">
                    {!showNotes && !formData.notes ? (
                        <motion.div key="add-note-btn" exit={{ opacity: 0, scale: 0.95 }}>
                            <CustomButton type="button" variant="ghost" size="sm" onClick={() => setShowNotes(true)} className="text-muted-foreground h-8 px-2">
                                <StickyNote className="w-3.5 h-3.5 mr-2" /> Add Note
                            </CustomButton>
                        </motion.div>
                    ) : (
                        <motion.div key="notes-area" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
                            <Textarea
                                value={formData.notes}
                                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                                placeholder="Add details..."
                                rows={3}
                                className="resize-none"
                                autoFocus
                            />
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            <div className="flex justify-end gap-3 pt-2">
                <CustomButton type="button" variant="outline" onClick={onCancel}>Cancel</CustomButton>
                <CustomButton type="submit" disabled={isSubmitting} variant="primary">
                    {isSubmitting ? 'Saving...' : initialTransaction ? 'Update' : 'Add'}
                </CustomButton>
            </div>
        </form>
    );
}