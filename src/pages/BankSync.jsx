import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { addDays, format, differenceInDays, subDays } from "date-fns";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { CustomButton } from "@/components/ui/CustomButton";
import { Card, CardContent } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useSettings } from "../components/utils/SettingsContext";
import { useConfirm } from "../components/ui/ConfirmDialogProvider";
import { useToast } from "../components/ui/use-toast";
import BankConnectionCard from "../components/banksync/BankConnectionCard";
import BulkReviewInbox from "../components/banksync/BulkReviewInbox";
import {
    Building2,
    Plus,
    Loader2,
    Sparkles,
    Info,
    BellDot,
    Calendar as CalendarIcon,
    History
} from "lucide-react";
import { useFAB } from "../components/hooks/FABContext";

/**
 * Bank Sync Page
 * CREATED: 26-Jan-2026
 * MODIFIED: 11-Feb-2026 - Migrated to Silent Sync Architecture
 * 
 * Manages bank connections via TrueLayer and Enable Banking APIs
 * Features:
 * - Connect new banks (TrueLayer or Enable Banking)
 * - View connected accounts
 * - Manual sync with preview
 * - Auto-sync configuration
 */

export default function BankSync() {
    const { settings, user } = useSettings();
    const { toast } = useToast();
    const { confirmAction } = useConfirm();
    const queryClient = useQueryClient();
    const { setFabButtons, clearFabButtons } = useFAB();

    // --- NEW: Review Inbox State ---
    const [showReviewInbox, setShowReviewInbox] = useState(false);
    const { data: needsReviewTransactions = [] } = useQuery({
        queryKey: ['transactions', 'needsReview'],
        queryFn: () => base44.entities.Transaction.filter({ needsReview: true }),
    });

    const [syncing, setSyncing] = useState(null);
    const [syncStatus, setSyncStatus] = useState("");
    const [syncDateFrom, setSyncDateFrom] = useState(format(subDays(new Date(), 30), 'yyyy-MM-dd'));

    // Fetch bank connections
    const { data: connections = [], isLoading } = useQuery({
        queryKey: ['bankConnections'],
        queryFn: () => base44.entities.BankConnection.list(),
    });

    // MODIFIED: 26-Jan-2026 - TrueLayer shows banks in auth dialog, no API to fetch list
    const initiateConnection = useCallback(async () => {
        try {
            // Force the production URL if we are not on localhost
            const redirectUrl = window.location.hostname === 'localhost'
                ? `${window.location.origin}/BankSync`
                : 'https://presso.base44.app/BankSync';

            const state = Math.random().toString(36).substring(7);

            // Store state for verification
            sessionStorage.setItem('bank_sync_state', state);
            sessionStorage.setItem('bank_sync_provider', 'truelayer');

            const response = await base44.functions.invoke('trueLayerAuth', {
                action: 'generateAuthLink',
                redirectUrl,
                state
            });

            window.location.href = response.data.authUrl;
        } catch (error) {
            toast({
                title: "Failed to start connection",
                description: error.message,
                variant: "destructive"
            });
        }
    }, [toast]);

    // Fix: Prevent React 18 double-fire of async useEffect
    const processedRef = useRef(false);

    useEffect(() => {
        const handleCallback = async () => {
            // If we have already processed a code in this session, stop.
            if (processedRef.current) return;

            if (!user) return;

            const urlParams = new URLSearchParams(window.location.search);
            const code = urlParams.get('code');
            const state = urlParams.get('state');
            const error = urlParams.get('error');
            const errorDesc = urlParams.get('error_description');

            if (error) {
                toast({
                    title: "Connection failed",
                    description: errorDesc || error,
                    variant: "destructive"
                });
                window.history.replaceState({}, '', '/BankSync');
                return;
            }

            if (code && state) {
                // Lock immediately to prevent race conditions
                processedRef.current = true;

                const storedState = sessionStorage.getItem('bank_sync_state');
                const storedProvider = sessionStorage.getItem('bank_sync_provider');

                if (state !== storedState) {
                    toast({
                        title: "Security error",
                        description: "Invalid state parameter",
                        variant: "destructive"
                    });
                    return;
                }

                try {
                    const redirectUrl = `${window.location.origin}/BankSync`;

                    if (storedProvider === 'truelayer') {
                        // Exchange code for access token
                        const tokenResponse = await base44.functions.invoke('trueLayerAuth', {
                            action: 'exchangeCode',
                            code,
                            redirectUrl
                        });

                        const tokens = tokenResponse.data.tokens;

                        // Calculate expiry: Current time + expires_in seconds
                        const expiresIn = Number(tokens?.expires_in) || 3600;
                        const expiryDate = new Date(Date.now() + (expiresIn * 1000));
                        const expiryString = isNaN(expiryDate.getTime())
                            ? new Date(Date.now() + 3600000).toISOString()
                            : expiryDate.toISOString();

                        // MODIFIED: 26-Jan-2026 - User selects bank in TrueLayer dialog, no stored bank info
                        // Save connection with generic info, will be updated after first sync
                        const newConn = await base44.entities.BankConnection.create({
                            provider: 'truelayer',
                            provider_name: 'Connecting...',
                            provider_id: 'truelayer',
                            country: 'ES',
                            access_token: tokens.access_token,
                            refresh_token: tokens.refresh_token,
                            token_expiry: expiryString,
                            accounts: [],
                            status: 'active',
                            auto_sync_enabled: true,
                            user_email: user.email
                        });

                        // Immediately trigger first sync to populate account info
                        handleSync(newConn);

                        toast({
                            title: "Bank connected!",
                            description: "Successfully connected via TrueLayer"
                        });
                    }

                    queryClient.invalidateQueries(['bankConnections']);

                    // Clear storage and URL
                    sessionStorage.removeItem('bank_sync_state');
                    sessionStorage.removeItem('bank_sync_provider');
                    window.history.replaceState({}, '', '/BankSync');

                } catch (error) {
                    // Reset lock on failure to allow retry if needed (optional)
                    // processedRef.current = false;

                    toast({
                        title: "Failed to complete connection",
                        description: error.message,
                        variant: "destructive"
                    });
                }
            }
        };

        handleCallback();
    }, [queryClient, toast, user]);

    // Use ref to stabilize the callback and prevent FAB context loops
    const connectionRef = useRef(initiateConnection);
    useEffect(() => {
        connectionRef.current = initiateConnection;
    }, [initiateConnection]);

    const fabButtons = useMemo(() => [
        {
            key: 'connect-bank',
            label: 'Connect Bank',
            icon: 'Building2',
            variant: 'create',
            onClick: () => connectionRef.current()
        }
    ], []);

    useEffect(() => {
        setFabButtons(fabButtons);
        return () => clearFabButtons();
    }, [fabButtons]);

    const handleSync = useCallback(async (connection) => {
        setSyncing(connection.id);

        setSyncStatus("Preparing sync...");

        try {
            const now = new Date();
            const fromDate = new Date(syncDateFrom);

            // Calculate chunks to prevent timeouts (max 730 days per chunk)
            const chunks = [];
            let currentStart = fromDate;
            const MAX_CHUNK_DAYS = 730;

            while (currentStart < now) {
                let currentEnd = addDays(currentStart, MAX_CHUNK_DAYS);
                if (currentEnd > now) currentEnd = now;

                chunks.push({
                    from: format(currentStart, 'yyyy-MM-dd'),
                    to: format(currentEnd, 'yyyy-MM-dd')
                });

                // Next chunk starts the day after currentEnd
                currentStart = addDays(currentEnd, 1);
            }

            let totalImported = 0;

            // Execute chunks sequentially
            for (let i = 0; i < chunks.length; i++) {
                const chunk = chunks[i];
                const progress = chunks.length > 1 ? ` (Part ${i + 1}/${chunks.length})` : '';
                setSyncStatus(`Syncing history${progress}...`);

                console.log(`🔄 [SYNC] Chunk ${i + 1}: ${chunk.from} to ${chunk.to}`);

                const response = await base44.functions.invoke('trueLayerSync', {
                    connectionId: connection.id,
                    dateFrom: chunk.from,
                    dateTo: chunk.to
                });

                if (response.data?.importedCount) {
                    totalImported += response.data.importedCount;
                }
            }

            if (totalImported > 0) {
                toast({
                    title: "Sync complete!",
                    description: `Successfully imported ${totalImported} new transactions.`,
                    variant: "success"
                });

                queryClient.invalidateQueries(['transactions']);
                queryClient.invalidateQueries(['bankConnections']);
            } else {
                toast({
                    title: "No new transactions",
                    description: "All transactions are up to date."
                });
                // Still update connection to reflect the sync attempt time
                queryClient.invalidateQueries(['bankConnections']);
            }
        } catch (error) {
            console.error('❌ [SYNC] Full Error Object:', error.response?.data);
            console.error('❌ [SYNC] Status:', error.response?.status);
            console.error('❌ [SYNC] Error occurred:', error);
            console.error('❌ [SYNC] Error message:', error.message);
            console.error('❌ [SYNC] Error stack:', error.stack);
            toast({
                title: "Sync failed",
                description: error.message,
                variant: "destructive"
            });
        } finally {
            console.log('🔄 [SYNC] Sync completed, resetting syncing state');
            setSyncing(null);
            setSyncStatus("");
        }
    }, [toast, queryClient, syncDateFrom]);

    // Delete connection
    const { mutate: deleteConnection } = useMutation({
        mutationFn: (id) => base44.entities.BankConnection.delete(id),
        onSuccess: () => {
            queryClient.invalidateQueries(['bankConnections']);
            toast({
                title: "Connection removed",
                description: "Bank connection has been deleted"
            });
        }
    });

    const handleDelete = useCallback((connection) => {
        confirmAction(
            "Remove Bank Connection",
            `Are you sure you want to disconnect ${connection.provider_name || 'this bank'}? This will not delete imported transactions.`,
            () => deleteConnection(connection.id),
            { confirmText: "Remove", destructive: true }
        );
    }, [confirmAction, deleteConnection]);

    return (
        <div className="container max-w-6xl mx-auto p-6">
            <div className="mb-8">
                <div className="flex items-center justify-between mb-4">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
                            <Building2 className="w-8 h-8 text-blue-600" />
                            Bank Sync
                        </h1>
                        <p className="text-gray-600 mt-1">
                            Connect your bank accounts to automatically import transactions
                        </p>
                    </div>

                    <CustomButton
                        variant="create"
                        onClick={initiateConnection}
                        className="hidden md:flex"
                    >
                        <Plus className="w-4 h-4" />
                        Connect Bank
                    </CustomButton>
                </div>

                {/* Date Range Selector */}
                <div className="flex flex-wrap items-center gap-4 mb-6">
                    <div className="flex items-center gap-2 bg-white px-3 py-2 rounded-lg border border-gray-200 shadow-sm">
                        <CalendarIcon className="w-4 h-4 text-gray-500" />
                        <span className="text-sm text-gray-600 mr-1">Sync from:</span>
                        <input
                            type="date"
                            value={syncDateFrom}
                            max={format(new Date(), 'yyyy-MM-dd')}
                            onChange={(e) => setSyncDateFrom(e.target.value)}
                            className="text-sm font-medium text-gray-900 focus:outline-none bg-transparent"
                        />
                    </div>

                    <button
                        onClick={() => setSyncDateFrom(format(subDays(new Date(), 2192), 'yyyy-MM-dd'))}
                        className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors"
                        title="Sync max available history (approx 6 years)"
                    >
                        <History className="w-3.5 h-3.5" />
                        Sync All History
                    </button>
                </div>

                <p className="text-xs text-gray-400 mb-6 flex items-center gap-1">
                    <Info className="w-3 h-3" />
                    Securely powered by TrueLayer. Connections are read-only.
                </p>

                {/* Progress Indicator */}
                {syncing && (
                    <div className="flex items-center gap-2 mb-6 text-sm text-blue-600 animate-pulse bg-blue-50 p-3 rounded-xl border border-blue-100 shadow-sm w-fit">
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span className="font-medium">{syncStatus}</span>
                    </div>
                )}

                {/* --- NEW: NEEDS REVIEW INBOX --- */}
                {needsReviewTransactions.length > 0 && (
                    <Card className="mt-6 border-amber-200 bg-amber-50">
                        <CardContent className="p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                            <div className="flex items-center gap-3">
                                <div className="bg-amber-100 p-2 rounded-full">
                                    <BellDot className="w-5 h-5 text-amber-600" />
                                </div>
                                <div>
                                    <h3 className="font-semibold text-amber-900">Review Inbox</h3>
                                    <p className="text-sm text-amber-700">You have {needsReviewTransactions.length} transactions that need categorization.</p>
                                </div>
                            </div>
                            <CustomButton
                                variant="create"
                                className="bg-amber-500 hover:bg-amber-600 text-white w-full sm:w-auto"
                                onClick={() => setShowReviewInbox(true)}
                            >
                                Review Now
                            </CustomButton>
                        </CardContent>
                    </Card>
                )}
            </div>

            {/* Connections */}
            {isLoading ? (
                <Card>
                    <CardContent className="p-12 text-center text-gray-500">
                        Loading connections...
                    </CardContent>
                </Card>
            ) : connections.length === 0 ? (
                <Card>
                    <CardContent className="p-12 text-center">
                        <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-4">
                            <Sparkles className="w-8 h-8 text-blue-600" />
                        </div>
                        <h3 className="text-lg font-semibold text-gray-900 mb-2">
                            No banks connected yet
                        </h3>
                        <p className="text-gray-600 mb-6">
                            Connect your bank to start automatically importing transactions
                        </p>
                        {/* MODIFIED: 26-Jan-2026 - Direct to TrueLayer auth dialog */}
                        <CustomButton
                            variant="create"
                            onClick={initiateConnection}
                        >
                            <Plus className="w-4 h-4" />
                            Connect Your First Bank
                        </CustomButton>
                    </CardContent>
                </Card>
            ) : (
                <div className="grid gap-4 md:grid-cols-2">
                    {connections.map(connection => (
                        <BankConnectionCard
                            key={connection.id}
                            connection={connection}
                            settings={settings}
                            onSync={handleSync}
                            onDelete={handleDelete}
                            isSyncing={syncing === connection.id}
                        />
                    ))}
                </div>
            )}

            {/* Bulk Review Dialog */}
            <BulkReviewInbox
                open={showReviewInbox}
                onOpenChange={setShowReviewInbox}
                transactions={needsReviewTransactions}
            />
        </div>
    );
}