import { formatCurrency, getCurrencySymbol } from "../utils/currencyUtils";

export default function ExpensesCardContent({ budget, stats, settings }) {
    if (budget.isSystemBudget) {
        const hasPaid = stats.paid.totalBaseCurrencyAmount > 0 || stats.paid.foreignCurrencyDetails.length > 0;
        const hasUnpaid = stats.unpaid.totalBaseCurrencyAmount > 0 || stats.unpaid.foreignCurrencyDetails.length > 0;

        if (hasPaid && hasUnpaid) {
            // Both paid and unpaid - use grid
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
            // Only paid - center it
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
            // Only unpaid - center it
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
    } else {
        // Custom budget logic
        const baseCurrency = settings.baseCurrency || 'USD';
        const digitalPaid = (stats?.digital?.spent || 0) - (stats?.digital?.unpaid || 0);

        const paidByCurrency = {};
        if (digitalPaid > 0) {
            paidByCurrency[baseCurrency] = digitalPaid;
        }

        if (stats?.cashByCurrency) {
            Object.entries(stats.cashByCurrency).forEach(([currency, data]) => {
                if (data?.spent > 0) {
                    paidByCurrency[currency] = (paidByCurrency[currency] || 0) + data.spent;
                }
            });
        }

        const hasPaid = Object.keys(paidByCurrency).length > 0;
        const hasUnpaid = (stats?.digital?.unpaid || 0) > 0;

        if (hasPaid && hasUnpaid) {
            // Both paid and unpaid - use grid
            return (
                <div className="grid grid-cols-2 gap-4">
                    <div className="flex flex-col items-center justify-center">
                        <p className="text-xs text-gray-500 mb-1">Paid</p>
                        {Object.entries(paidByCurrency).map(([currency, amount], index) => (
                            <div key={currency} className={index === 0 ? "text-lg font-bold text-gray-900" : "text-sm font-semibold text-gray-700 mt-1"}>
                                {currency === baseCurrency
                                    ? formatCurrency(amount, settings)
                                    : `${getCurrencySymbol(currency)}${amount.toFixed(2)}`
                                }
                            </div>
                        ))}
                    </div>
                    <div className="flex flex-col items-center justify-center">
                        <p className="text-xs text-gray-500 mb-1">Unpaid</p>
                        <div className="text-lg font-bold text-orange-600">
                            {formatCurrency(stats.digital.unpaid, settings)}
                        </div>
                    </div>
                </div>
            );
        } else if (hasPaid) {
            // Only paid - center it
            return (
                <div className="flex flex-col items-center justify-center h-full">
                    <p className="text-xs text-gray-500 mb-1">Paid</p>
                    {Object.entries(paidByCurrency).map(([currency, amount], index) => (
                        <div key={currency} className={index === 0 ? "text-lg font-bold text-gray-900" : "text-sm font-semibold text-gray-700 mt-1"}>
                            {currency === baseCurrency
                                ? formatCurrency(amount, settings)
                                : `${getCurrencySymbol(currency)}${amount.toFixed(2)}`
                            }
                        </div>
                    ))}
                </div>
            );
        } else if (hasUnpaid) {
            // Only unpaid - center it
            return (
                <div className="flex flex-col items-center justify-center h-full">
                    <p className="text-xs text-gray-500 mb-1">Unpaid</p>
                    <div className="text-lg font-bold text-orange-600">
                        {formatCurrency(stats.digital.unpaid, settings)}
                    </div>
                </div>
            );
        } else {
            return <div className="text-center text-gray-400">No expenses</div>;
        }
    }
}
