import { memo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CustomButton } from "@/components/ui/CustomButton";
import {
    Building2,
    RefreshCw,
    Trash2,
    CheckCircle2,
    XCircle,
    Clock
} from "lucide-react";
import { formatCurrency } from "../utils/currencyUtils";
import { formatDate } from "../utils/dateUtils";

/**
 * Bank Connection Card
 * CREATED: 26-Jan-2026
 * 
 * Displays individual bank connection with sync status and actions
 */

const BankConnectionCard = memo(function BankConnectionCard({
    connection,
    settings,
    onSync,
    onDelete,
    isSyncing
}) {

    // Helper: ISO Country Code to Emoji Flag
    const getFlagEmoji = (countryCode) => {
        if (!countryCode) return '🌍';
        const codePoints = countryCode
            .toUpperCase()
            .split('')
            .map(char => 127397 + char.charCodeAt());
        return String.fromCodePoint(...codePoints);
    };

    const statusConfig = {
        active: {
            icon: CheckCircle2,
            color: 'text-green-600',
            bg: 'bg-green-50',
            badge: 'bg-green-100 text-green-700'
        },
        expired: {
            icon: Clock,
            color: 'text-orange-600',
            bg: 'bg-orange-50',
            dot: 'bg-orange-500'
        },
        error: {
            icon: XCircle,
            color: 'text-red-600',
            bg: 'bg-red-50',
            dot: 'bg-red-500'
        }
    };

    const maskID = (id) => id ? `•••• ${id.slice(-4)}` : '••••';
    const config = statusConfig[connection?.status] || statusConfig.active;
    const StatusIcon = config.icon;

    return (
        <Card className="hover:shadow-md transition-shadow border-gray-200">
            <CardContent className="p-4">
                <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-lg ${config?.bg || 'bg-blue-50'} flex items-center justify-center`}>
                            <Building2 className={`w-5 h-5 ${config?.color || 'text-blue-600'}`} />
                        </div>

                        <div>
                            <h3 className="font-semibold text-gray-900">
                                {connection?.provider_name === 'Connecting...' ? 'Bank Connection' : (connection?.provider_name || 'Bank Account')}
                            </h3>
                            <div className="flex items-center gap-2 text-xs text-gray-500 mt-0.5">
                                <span className="flex items-center gap-1.5" title="Connection Status">
                                    <span className={`w-2 h-2 rounded-full ${config?.dot || 'bg-green-500'}`} />
                                    {connection?.status === 'active' ? 'Connected' : connection?.status}
                                </span>
                                <span className="text-gray-300">•</span>
                                <span title="Country">{getFlagEmoji(connection?.country)}</span>
                                <span className="text-gray-300">•</span>
                                <span>via TrueLayer</span>
                            </div>
                        </div>
                    </div>

                    {/* Actions moved to bottom, badge removed in favor of dot */}

                </div>

                {/* Accounts */}
                {connection?.accounts && connection.accounts.length > 0 && (
                    <div className="space-y-2 mb-4">
                        {connection.accounts.map((account, idx) => (
                            <div
                                key={idx}
                                className="flex items-center justify-between p-2 bg-gray-50 rounded-lg"
                            >
                                <div className="min-w-0 flex-1">
                                    <p className="text-sm font-medium text-gray-900 truncate">
                                        {account.name || 'Account'}
                                    </p>
                                    <p className="text-xs text-gray-500 truncate">
                                        {maskID(account.iban || account.account_id)}
                                    </p>
                                </div>
                                {account.balance !== undefined && account.balance !== null && settings && (
                                    <p className="text-sm font-semibold text-gray-900 ml-2">
                                        {formatCurrency(Number(account.balance || 0), settings)}
                                    </p>
                                )}
                            </div>
                        ))}
                    </div>
                )}

                {/* Last Sync */}
                {connection?.last_sync && settings && (
                    <div className="text-xs text-gray-500 mb-3">
                        Last synced: {formatDate(connection.last_sync, settings)}
                    </div>
                )}

                {/* Actions */}
                <div className="flex gap-2">
                    <CustomButton
                        variant="modify"
                        size="sm"
                        onClick={() => onSync(connection)}
                        disabled={isSyncing || connection.status !== 'active'}
                        className="flex-1"
                    >
                        <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`} />
                        {isSyncing ? 'Syncing...' : 'Sync Now'}
                    </CustomButton>
                    <CustomButton
                        variant="delete"
                        size="sm"
                        onClick={() => onDelete(connection)}
                    >
                        <Trash2 className="w-4 h-4" />
                    </CustomButton>
                </div>
            </CardContent>
        </Card>
    );
});

export default BankConnectionCard;