import React, { memo, useMemo } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { RefreshCw } from "lucide-react";
import RecurringTransactionCard from "./RecurringTransactionCard";

const RecurringTransactionList = memo(function RecurringTransactionList({
    recurringTransactions = [],
    categories = [],
    onEdit,
    onDelete,
    onToggleActive,
    isLoading,
}) {
    // Create category lookup map for performance
    const categoryMap = useMemo(() => {
        return categories.reduce((acc, cat) => {
            acc[cat.id] = cat;
            return acc;
        }, {});
    }, [categories]);

    if (isLoading) {
        return (
            <div className="space-y-3">
                {[1, 2, 3].map(i => (
                    <Skeleton key={i} className="h-24 w-full rounded-lg" />
                ))}
            </div>
        );
    }

    if (recurringTransactions.length === 0) {
        return (
            <div className="text-center py-12 bg-gray-50 rounded-lg border border-dashed">
                <RefreshCw className="w-12 h-12 mx-auto text-gray-300 mb-4" />
                <h3 className="text-lg font-medium text-gray-600">No Recurring Transactions</h3>
                <p className="text-gray-500 mt-1">Set up recurring transactions to automate your budgeting.</p>
            </div>
        );
    }

    return (
        <div className="space-y-3">
            {recurringTransactions.map(recurring => (
                <RecurringTransactionCard
                    key={recurring.id}
                    recurring={recurring}
                    category={categoryMap[recurring.category_id]}
                    onEdit={onEdit}
                    onDelete={onDelete}
                    onToggleActive={onToggleActive}
                />
            ))}
        </div>
    );
});

export default RecurringTransactionList;