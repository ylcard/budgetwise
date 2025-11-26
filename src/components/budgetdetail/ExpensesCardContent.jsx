import { formatCurrency, getCurrencySymbol } from "../utils/currencyUtils";

export default function ExpensesCardContent({ budget, stats, settings }) {
    const hasPaid = stats.paid.totalBaseCurrencyAmount > 0 || stats.paid.foreignCurrencyDetails.length > 0;
    const hasUnpaid = stats.unpaid.totalBaseCurrencyAmount > 0 || stats.unpaid.foreignCurrencyDetails.length > 0;

    if (hasPaid && hasUnpaid) {
        return (
            <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col items-center justify-center">
                    <p className="text-xs text-gray-500 mb-1">Paid</p>
                    {stats.paid.totalBaseCurrencyAmount > 0 && (
                        <div className="text-lg font-bold text-gray-900">
                            {formatCurrency(stats.paid.totalBaseCurrencyAmount, settings)}
                        </div>
                    )}
                    {stats.paid.foreignCurrencyDetails.map(({ currencyCode, amount }, index) => (
                        <div key={`${currencyCode}-${index}`} className="text-sm font-semibold text-gray-700 mt-1">
                            {getCurrencySymbol(currencyCode)}{amount.toFixed(2)}
                        </div>
                    ))}
                </div>
                <div className="flex flex-col items-center justify-center">
                    <p className="text-xs text-gray-500 mb-1">Unpaid</p>
                    {stats.unpaid.totalBaseCurrencyAmount > 0 && (
                        <div className="text-lg font-bold text-orange-600">
                            {formatCurrency(stats.unpaid.totalBaseCurrencyAmount, settings)}
                        </div>
                    )}
                    {stats.unpaid.foreignCurrencyDetails.map(({ currencyCode, amount }, index) => (
                        <div key={`${currencyCode}-${index}`} className="text-sm font-semibold text-orange-500 mt-1">
                            {getCurrencySymbol(currencyCode)}{amount.toFixed(2)}
                        </div>
                    ))}
                </div>
            </div>
        );
    } else if (hasPaid) {
        return (
            <div className="flex flex-col items-center justify-center h-full">
                <p className="text-xs text-gray-500 mb-1">Paid</p>
                {stats.paid.totalBaseCurrencyAmount > 0 && (
                    <div className="text-lg font-bold text-gray-900">
                        {formatCurrency(stats.paid.totalBaseCurrencyAmount, settings)}
                    </div>
                )}
                {stats.paid.foreignCurrencyDetails.map(({ currencyCode, amount }, index) => (
                    <div key={`${currencyCode}-${index}`} className="text-sm font-semibold text-gray-700 mt-1">
                        {getCurrencySymbol(currencyCode)}{amount.toFixed(2)}
                    </div>
                ))}
            </div>
        );
    } else if (hasUnpaid) {
        return (
            <div className="flex flex-col items-center justify-center h-full">
                <p className="text-xs text-gray-500 mb-1">Unpaid</p>
                {stats.unpaid.totalBaseCurrencyAmount > 0 && (
                    <div className="text-lg font-bold text-orange-600">
                        {formatCurrency(stats.unpaid.totalBaseCurrencyAmount, settings)}
                    </div>
                )}
                {stats.unpaid.foreignCurrencyDetails.map(({ currencyCode, amount }, index) => (
                    <div key={`${currencyCode}-${index}`} className="text-sm font-semibold text-orange-500 mt-1">
                        {getCurrencySymbol(currencyCode)}{amount.toFixed(2)}
                    </div>
                ))}
            </div>
        );
    } else {
        return <div className="text-center text-gray-400">No expenses</div>;
    }
}
