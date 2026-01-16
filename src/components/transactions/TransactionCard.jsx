import { Trash2, Check, Clock, Banknote } from "lucide-react";
import { format } from "date-fns";
import { useState, useRef, useEffect } from "react";
import { useSettings } from "../utils/SettingsContext";
import { formatCurrency } from "../utils/currencyUtils";
import { getCategoryIcon } from "../utils/iconMapConfig";
import QuickAddTransaction from "./QuickAddTransaction";
import { useTransactions, useCategories } from "../hooks/useBase44Entities";
import { CustomButton } from "@/components/ui/CustomButton";

export default function TransactionCard({ transaction, category, onEdit, onDelete }) {
    const { settings } = useSettings();
    const { transactions } = useTransactions();
    const { categories } = useCategories();
    const [isHovered, setIsHovered] = useState(false);
    const [expandLeft, setExpandLeft] = useState(false);
    const cardRef = useRef(null);

    const isIncome = transaction.type === 'income';
    const isPaid = transaction.isPaid;

    const IconComponent = getCategoryIcon(category?.icon);

    // Get category color with fallback
    const categoryColor = isIncome ? '#10B981' : (category?.color || '#6B7280');
    const categoryName = isIncome ? 'Income' : (category?.name || 'Uncategorized');

    // ADDED: 16-Jan-2026 - Detect if card is near right edge to expand left
    useEffect(() => {
        if (isHovered && cardRef.current) {
            const rect = cardRef.current.getBoundingClientRect();
            const expandedWidth = 280;
            const rightEdge = rect.right + (expandedWidth - 140);
            
            // If expanded card would go past viewport, expand left instead
            if (rightEdge > window.innerWidth - 20) {
                setExpandLeft(true);
            } else {
                setExpandLeft(false);
            }
        }
    }, [isHovered]);

    return (
        <div
            ref={cardRef}
            className="relative"
            style={{
                width: '140px',
                height: '140px',
            }}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
        >
            {/* Base Mini-Tile - Always 140px */}
            <div
                className={`absolute inset-0 bg-white border border-gray-200 transition-all duration-300 ease-in-out ${
                    isHovered ? 'shadow-lg' : 'shadow-sm'
                } ${!isIncome && !isPaid ? 'opacity-60' : ''}`}
                style={{ borderRadius: '16px', zIndex: isHovered ? 10 : 1 }}
            >
                {/* Collapsed State - Vertical Layout */}
                <div
                    className={`absolute inset-0 flex flex-col items-center justify-center gap-2 p-4 transition-opacity duration-300 ${
                        isHovered ? 'opacity-0 pointer-events-none' : 'opacity-100'
                    }`}
                >
                    {/* Icon Circle */}
                    <div
                        className="w-12 h-12 rounded-full flex items-center justify-center"
                        style={{ backgroundColor: `${categoryColor}20` }}
                    >
                        <IconComponent className="w-6 h-6" style={{ color: categoryColor }} />
                    </div>

                    {/* Category Name */}
                    <p className="text-sm font-semibold text-gray-900 text-center line-clamp-1">
                        {categoryName}
                    </p>

                    {/* Price Pill */}
                    <div
                        className="px-3 py-1 rounded-full"
                        style={{
                            backgroundColor: `${categoryColor}20`,
                            color: categoryColor,
                        }}
                    >
                        <p className="text-sm font-bold">
                            {isIncome ? '+' : '-'}{formatCurrency(transaction.amount, settings)}
                        </p>
                    </div>
                </div>

                {/* Expanded State - Absolute Positioned Overlay */}
                {isHovered && (
                    <div
                        className="absolute top-0 h-full bg-white border border-gray-200 transition-all duration-300 ease-in-out shadow-lg"
                        style={{
                            borderRadius: '16px',
                            width: '280px',
                            right: expandLeft ? 0 : 'auto',
                            left: expandLeft ? 'auto' : 0,
                            zIndex: 10,
                        }}
                    >
                        <div className="flex items-center gap-3 p-4 h-full">
                            {/* Left Side - Icon and Price */}
                            <div className="flex flex-col items-center gap-2 flex-shrink-0">
                                <div
                                    className="w-12 h-12 rounded-full flex items-center justify-center"
                                    style={{ backgroundColor: `${categoryColor}20` }}
                                >
                                    <IconComponent className="w-6 h-6" style={{ color: categoryColor }} />
                                </div>
                                <div
                                    className="px-2.5 py-1 rounded-full"
                                    style={{
                                        backgroundColor: `${categoryColor}20`,
                                        color: categoryColor,
                                    }}
                                >
                                    <p className="text-xs font-bold whitespace-nowrap">
                                        {isIncome ? '+' : '-'}{formatCurrency(transaction.amount, settings)}
                                    </p>
                                </div>
                            </div>

                            {/* Right Side - Merchant Name and Date */}
                            <div className="flex-1 min-w-0 flex flex-col justify-center">
                                <p className="text-base font-semibold text-gray-900 line-clamp-2 mb-0.5">
                                    {transaction.title}
                                </p>
                                <p className="text-xs text-gray-500">
                                    {format(new Date(transaction.date), "MMM d, yyyy")}
                                </p>
                            </div>

                            {/* Payment Status Indicator */}
                            {!isIncome && (
                                <div className="flex-shrink-0">
                                    {isPaid ? (
                                        <div className="w-6 h-6 rounded-full bg-green-100 flex items-center justify-center">
                                            <Check className="w-4 h-4 text-green-600" />
                                        </div>
                                    ) : (
                                        <div className="w-6 h-6 rounded-full bg-orange-100 flex items-center justify-center">
                                            <Clock className="w-4 h-4 text-orange-600" />
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Action buttons */}
                            <div className="absolute top-2 right-2 flex gap-1">
                                <QuickAddTransaction
                                    transaction={transaction}
                                    categories={categories}
                                    customBudgets={[]}
                                    onSubmit={(data) => onEdit(transaction, data)}
                                    isSubmitting={false}
                                    transactions={transactions}
                                    renderTrigger={true}
                                />
                                <CustomButton
                                    variant="ghost"
                                    size="icon-sm"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        onDelete(transaction.id);
                                    }}
                                    className="hover:bg-red-50 hover:text-red-600 h-6 w-6"
                                >
                                    <Trash2 className="w-3.5 h-3.5" />
                                </CustomButton>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

// COMMENTED OUT 16-Jan-2026: Old card design replaced with Hybrid Mini-Tile pattern
/*
import { Card, CardContent } from "@/components/ui/card";
import { Trash2, Check, Clock, Banknote } from "lucide-react";
import { format } from "date-fns";
import { motion } from "framer-motion";
import { useSettings } from "../utils/SettingsContext";
import { formatCurrency } from "../utils/currencyUtils";
import { getCategoryIcon } from "../utils/iconMapConfig";
import QuickAddTransaction from "./QuickAddTransaction";
import { useTransactions, useCategories } from "../hooks/useBase44Entities";
import { CustomButton } from "@/components/ui/CustomButton";

export default function TransactionCard({ transaction, category, onEdit, onDelete }) {
    const { settings } = useSettings();
    const { transactions } = useTransactions();
    const { categories } = useCategories();

    const isIncome = transaction.type === 'income';
    const isPaid = transaction.isPaid;

    const IconComponent = getCategoryIcon(category?.icon);

    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            whileHover={{ scale: 1.02 }}
            className="h-full"
        >
            <Card className={`border-none shadow-lg hover:shadow-xl transition-all h-full group ${!isIncome && !isPaid ? 'opacity-60' : ''
                }`}>
                <CardContent className="p-6 flex flex-col h-full min-h-[180px]">
                    <div className="flex justify-end gap-1 mb-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <QuickAddTransaction
                            transaction={transaction}
                            categories={categories}
                            customBudgets={[]}
                            onSubmit={(data) => onEdit(transaction, data)}
                            isSubmitting={false}
                            transactions={transactions}
                            renderTrigger={true}
                        />
                        <CustomButton
                            variant="ghost"
                            size="icon-sm"
                            onClick={() => onDelete(transaction.id)}
                            className="hover:bg-red-50 hover:text-red-600 h-7 w-7"
                        >
                            <Trash2 className="w-4 h-4" />
                        </CustomButton>
                    </div>

                    <div className="flex flex-col items-start gap-2 mb-3">
                        <div className="flex items-center gap-3 w-full">
                            <div className="flex-shrink-0">
                                {isIncome ? (
                                    <div
                                        className="w-12 h-12 rounded-xl flex items-center justify-center"
                                        style={{ backgroundColor: '#10B98120' }}
                                    >
                                        <Banknote className="w-6 h-6" style={{ color: '#10B981' }} />
                                    </div>
                                ) : category ? (
                                    <div
                                        className={`w-12 h-12 rounded-xl flex items-center justify-center ${!isPaid ? 'grayscale' : ''
                                            }`}
                                        style={{ backgroundColor: `${category.color}20` }}
                                    >
                                        <IconComponent className="w-6 h-6" style={{ color: category.color }} />
                                    </div>
                                ) : (
                                    <div className="w-12 h-12" />
                                )}
                            </div>

                            {category && (
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium text-gray-700">{category.name}</p>
                                    <p className="text-xs text-gray-500">
                                        {format(new Date(transaction.date), "MMM d, yyyy")}
                                    </p>
                                </div>
                            )}
                        </div>

                        <div className="w-full">
                            <p className="font-bold text-gray-900 line-clamp-2">{transaction.title}</p>
                            {transaction.notes && (
                                <p className="text-xs text-gray-400 mt-1 line-clamp-2">{transaction.notes}</p>
                            )}
                        </div>
                    </div>

                    <div className="mt-auto pt-3 border-t flex items-center justify-between">
                        <p className={`text-xl font-bold ${transaction.type === 'income' ? 'text-green-600' : 'text-red-600'}`}>
                            {transaction.type === 'income' ? '+' : '-'}{formatCurrency(transaction.amount, settings)}
                        </p>
                        {!isIncome && (isPaid ? (
                            <Check className="w-5 h-5 text-green-600 flex-shrink-0" />
                        ) : (
                            <Clock className="w-5 h-5 text-orange-500 flex-shrink-0" />
                        ))}
                    </div>
                </CardContent>
            </Card>
        </motion.div>
    );
}
*/