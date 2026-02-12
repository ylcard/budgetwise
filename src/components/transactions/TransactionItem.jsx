import { useState, useEffect } from "react";
import { CustomButton } from "@/components/ui/CustomButton";
import { Trash2, Circle, Check, Clock, Banknote, MapPin } from "lucide-react";
import { format } from "date-fns";
import { motion } from "framer-motion";
import { useSettings } from "../utils/SettingsContext";
import { formatCurrency } from "../utils/currencyUtils";
import { getCategoryIcon } from "../utils/iconMapConfig";
import QuickAddTransaction from "./QuickAddTransaction";
import { detectCrossPeriodSettlement } from "../utils/calculationEngine";
import { Checkbox } from "@/components/ui/checkbox";

export default function TransactionItem({
    transaction,
    category,
    onDelete,
    onSubmit,
    isSubmitting,
    categories,
    customBudgets = [],
    monthStart = null,
    monthEnd = null,
    isSelected = false,
    onSelect
}) {
    const { settings } = useSettings();

    const isIncome = transaction.type === 'income';
    const isPaid = transaction.isPaid;

    // --- VISUAL ENRICHMENT (Google Places API) ---
    const [enrichedData, setEnrichedData] = useState(null);

    // Lazy load Places data for merchants
    useEffect(() => {
        // Only fetch for expenses that have a title
        if (isIncome || !transaction.title) return;

        const fetchMerchantDetails = async () => {
            try {
                // Securely access the API key from environment variables
                const apiKey = import.meta.env.VITE_GOOGLE_MAPS_KEY;
                if (!apiKey) return;

                const response = await fetch('https://places.googleapis.com/v1/places:searchText', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'X-Goog-Api-Key': apiKey,
                        // Only asking for the fields we need to keep payload small (DisplayName + Icon)
                        'X-Goog-FieldMask': 'places.displayName,places.iconMaskBaseUri,places.iconBackgroundColor'
                    },
                    body: JSON.stringify({ textQuery: transaction.title })
                });
                const data = await response.json();
                if (data.places && data.places.length > 0) {
                    setEnrichedData(data.places[0]);
                }
            } catch (e) { console.warn('Enrichment failed', e); }
        };

        // Debounce slightly to prevent spamming API on fast scrolls
        const timer = setTimeout(fetchMerchantDetails, 500);
        return () => clearTimeout(timer);
    }, [transaction.title, isIncome]);

    const IconComponent = getCategoryIcon(category?.icon);

    const currentYear = new Date().getFullYear();
    const paidYear = transaction.paidDate ? new Date(transaction.paidDate).getFullYear() : null;
    const showYear = paidYear && paidYear !== currentYear;

    const crossPeriodInfo = monthStart && monthEnd
        ? detectCrossPeriodSettlement(transaction, monthStart, monthEnd, customBudgets)
        : { isCrossPeriod: false };

    return (
        <motion.div
            initial={{ opacity: 1, x: 0 }}
            animate={{ opacity: 1, x: 0 }}
            className={`flex items-center justify-between p-4 rounded-lg hover:bg-gray-50 transition-all border border-gray-100 group ${!isIncome && !isPaid ? 'opacity-60' : ''
                }`}
        >
            <div className="mr-4">
                <Checkbox
                    checked={isSelected}
                    onCheckedChange={(checked) => onSelect(transaction.id, checked)}
                />
            </div>
            <div className="flex items-center gap-4 flex-1">
                {isIncome ? (
                    <div
                        className="w-12 h-12 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform"
                        style={{ backgroundColor: '#10B98120' }}
                    >
                        <Banknote className="w-6 h-6" style={{ color: '#10B981' }} />
                    </div>
                ) : (
                    // Logic: Show Google Logo if found, otherwise show Category Icon, otherwise show default Circle
                    <div
                        className={`w-12 h-12 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform overflow-hidden ${!isPaid ? 'grayscale' : ''}`}
                        style={{ backgroundColor: enrichedData?.iconBackgroundColor || (category ? `${category.color}20` : '#f3f4f6') }}
                    >
                        {enrichedData?.iconMaskBaseUri ? (
                            <img src={enrichedData.iconMaskBaseUri} className="w-6 h-6" alt="Merchant" />
                        ) : category ? (
                            <IconComponent className="w-6 h-6" style={{ color: category.color }} />
                        ) : (
                            <Circle className="w-6 h-6 text-gray-300" />
                        )}
                    </div>
                )}

                <div className="flex-1">
                    <div className="flex items-center gap-2">
                        <p className="font-semibold text-gray-900">
                            {/* Prefer the "Official" Google Name, fallback to our raw title */}
                            {enrichedData?.displayName?.text || transaction.title}
                        </p>
                        {enrichedData && <MapPin className="w-3 h-3 text-blue-400 opacity-50" />}
                        
                        {!isIncome && (isPaid ? (
                            <Check className="w-4 h-4 text-green-600" />
                        ) : (
                            <Clock className="w-4 h-4 text-orange-500" />
                        ))}
                    </div>

                    <div className="flex items-center gap-3 mt-1">
                        <p className="text-sm text-gray-500">
                            {format(new Date(transaction.date), "MMM d, yyyy")}
                        </p>
                        {!isIncome && isPaid && transaction.paidDate && (
                            <>
                                <span className="text-gray-300">•</span>
                                <p className="text-xs text-green-600">
                                    Paid {format(new Date(transaction.paidDate), showYear ? "MMM d, yyyy" : "MMM d")}
                                </p>
                            </>
                        )}
                        {category && (
                            <>
                                <span className="text-gray-300">•</span>
                                <p className="text-sm text-gray-500">{category.name}</p>
                            </>
                        )}
                    </div>

                    {transaction.notes && (
                        <p className="text-sm text-gray-400 mt-1 line-clamp-1">{transaction.notes}</p>
                    )}

                    {crossPeriodInfo.isCrossPeriod && (
                        <div className="mt-2 flex items-center gap-2">
                            <div className="px-2 py-1 bg-orange-50 text-orange-700 text-xs rounded-md border border-orange-200 flex items-center gap-1">
                                <Circle className="w-3 h-3 fill-orange-500" />
                                <span>Linked to {crossPeriodInfo.bucketName} ({crossPeriodInfo.originalPeriod})</span>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            <div className="flex items-center gap-4">
                <div className="text-right">
                    <p className={`text-xl font-bold ${transaction.type === 'income' ? 'text-green-600' : 'text-red-600'}`}>
                        {transaction.type === 'income' ? '+' : '-'}{formatCurrency(transaction.amount, settings)}
                    </p>
                </div>

                <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <QuickAddTransaction
                        transaction={transaction}
                        categories={categories}
                        customBudgets={customBudgets}
                        onSubmit={(data) => onSubmit(data, transaction)}
                        isSubmitting={isSubmitting}
                        transactions={[]}
                        renderTrigger={true}
                    />
                    <CustomButton
                        variant="ghost"
                        size="icon"
                        onClick={() => onDelete(transaction)}
                        className="hover:bg-red-50 hover:text-red-600"
                    >
                        <Trash2 className="w-4 h-4" />
                    </CustomButton>
                </div>
            </div>
        </motion.div>
    );
}