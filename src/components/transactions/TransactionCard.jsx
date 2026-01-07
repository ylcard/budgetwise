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
                    {/* Action buttons */}
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

                    {/* Icon and category section */}
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

                        {/* Transaction title */}
                        <div className="w-full">
                            <p className="font-bold text-gray-900 line-clamp-2">{transaction.title}</p>
                            {transaction.notes && (
                                <p className="text-xs text-gray-400 mt-1 line-clamp-2">{transaction.notes}</p>
                            )}
                        </div>
                    </div>

                    {/* Amount and status */}
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