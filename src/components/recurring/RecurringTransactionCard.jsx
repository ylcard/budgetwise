import React, { memo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CustomButton } from "@/components/ui/CustomButton";
import { Pencil, Trash2, Pause, Play, Calendar, ArrowDown, ArrowUp } from "lucide-react";
import { useSettings } from "../utils/SettingsContext";
import { formatCurrency } from "../utils/currencyUtils";
import { formatDate } from "../utils/dateUtils";
// UPDATED 13-Jan-2026: Changed getIconComponent to getCategoryIcon (correct function name)
import { getCategoryIcon } from "../utils/iconMapConfig";

const FREQUENCY_LABELS = {
    daily: "Daily",
    weekly: "Weekly",
    biweekly: "Every 2 Weeks",
    monthly: "Monthly",
    quarterly: "Quarterly",
    yearly: "Yearly",
};

const RecurringTransactionCard = memo(function RecurringTransactionCard({
    recurring,
    category,
    onEdit,
    onDelete,
    onToggleActive,
}) {
    const { settings } = useSettings();

    const IconComponent = category ? getCategoryIcon(category.icon) : null;
    const isIncome = recurring.type === 'income';
    const isActive = recurring.isActive;

    return (
        <Card className={`transition-all duration-200 hover:shadow-md ${!isActive ? 'opacity-60' : ''}`}>
            <CardContent className="p-4">
                <div className="flex items-center justify-between">
                    {/* Left: Icon + Info */}
                    <div className="flex items-center gap-3">
                        <div
                            className="w-10 h-10 rounded-full flex items-center justify-center"
                            style={{ backgroundColor: isIncome ? '#10B98120' : (category?.color || '#6B7280') + '20' }}
                        >
                            {isIncome ? (
                                <ArrowDown className="w-5 h-5 text-green-600" />
                            ) : IconComponent ? (
                                <IconComponent className="w-5 h-5" style={{ color: category?.color || '#6B7280' }} />
                            ) : (
                                <ArrowUp className="w-5 h-5" style={{ color: category?.color || '#6B7280' }} />
                            )}
                        </div>
                        <div>
                            <h3 className="font-medium text-gray-900">{recurring.title}</h3>
                            <div className="flex items-center gap-2 mt-1">
                                <Badge variant="outline" className="text-xs">
                                    {FREQUENCY_LABELS[recurring.frequency] || recurring.frequency}
                                </Badge>
                                {recurring.nextOccurrence && (
                                    <span className="text-xs text-gray-500 flex items-center gap-1">
                                        <Calendar className="w-3 h-3" />
                                        Next: {formatDate(recurring.nextOccurrence, settings.dateFormat)}
                                    </span>
                                )}
                                {!isActive && (
                                    <Badge variant="secondary" className="text-xs bg-gray-200">Paused</Badge>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Right: Amount + Actions */}
                    <div className="flex items-center gap-4">
                        <span className={`font-semibold text-lg ${isIncome ? 'text-green-600' : 'text-gray-900'}`}>
                            {isIncome ? '+' : '-'}{formatCurrency(recurring.amount, settings)}
                        </span>
                        <div className="flex items-center gap-1">
                            <CustomButton
                                variant="ghost"
                                size="icon-sm"
                                onClick={() => onToggleActive(recurring)}
                                title={isActive ? "Pause" : "Resume"}
                            >
                                {isActive ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                            </CustomButton>
                            <CustomButton
                                variant="ghost"
                                size="icon-sm"
                                onClick={() => onEdit(recurring)}
                                className="hover:bg-blue-50 hover:text-blue-600"
                            >
                                <Pencil className="w-4 h-4" />
                            </CustomButton>
                            <CustomButton
                                variant="ghost"
                                size="icon-sm"
                                onClick={() => onDelete(recurring)}
                                className="hover:bg-red-50 hover:text-red-600"
                            >
                                <Trash2 className="w-4 h-4" />
                            </CustomButton>
                        </div>
                    </div>
                </div>

                {/* Extra Info Row */}
                {(recurring.notes || recurring.endDate) && (
                    <div className="mt-3 pt-3 border-t border-gray-100 text-sm text-gray-500">
                        {recurring.notes && <p className="line-clamp-1">{recurring.notes}</p>}
                        {recurring.endDate && (
                            <p className="text-xs mt-1">Ends: {formatDate(recurring.endDate, settings.dateFormat)}</p>
                        )}
                    </div>
                )}
            </CardContent>
        </Card>
    );
});

export default RecurringTransactionCard;