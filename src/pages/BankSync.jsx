import { useState, useEffect, useCallback } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { CustomButton } from "@/components/ui/CustomButton";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useSettings } from "../components/utils/SettingsContext";
import { useConfirm } from "../components/ui/ConfirmDialogProvider";
import { useToast } from "../components/ui/use-toast";
import BankConnectionCard from "../components/banksync/BankConnectionCard";
import BankSelectionDialog from "../components/banksync/BankSelectionDialog";
import TransactionPreviewDialog from "../components/banksync/TransactionPreviewDialog";
import { 
    Building2, 
    Plus, 
    AlertCircle,
    Sparkles,
    Info
} from "lucide-react";

/**
 * Bank Sync Page
 * CREATED: 26-Jan-2026
 * MODIFIED: 26-Jan-2026 - Added TrueLayer support alongside Enable Banking
 * 
 * Manages bank connections via TrueLayer and Enable Banking APIs
 * Features:
 * - Connect new banks (TrueLayer or Enable Banking)
 * - View connected accounts
 * - Manual sync with preview
 * - Auto-sync configuration
 */

export default function BankSync() {
    const { settings } = useSettings();
    const { toast } = useToast();
    const { confirmAction } = useConfirm();
    const queryClient = useQueryClient();

    const [showBankSelection, setShowBankSelection] = useState(false);
    const [showTransactionPreview, setShowTransactionPreview] = useState(false);
    const [previewTransactions, setPreviewTransactions] = useState(null);
    const [loadingBanks, setLoadingBanks] = useState(false);
    const [syncing, setSyncing] = useState(null);
    const [banks, setBanks] = useState(null);
    const [selectedProvider, setSelectedProvider] = useState('truelayer'); // ADDED: 26-Jan-2026

    // Fetch bank connections
    const { data: connections = [], isLoading } = useQuery({
        queryKey: ['bankConnections'],
        queryFn: () => base44.entities.BankConnection.list(),
    });

    // MODIFIED: 26-Jan-2026 - Support both TrueLayer and Enable Banking
    const loadBanks = useCallback(async (provider = 'truelayer') => {
        setLoadingBanks(true);
        setSelectedProvider(provider);
        try {
            if (provider === 'truelayer') {
                const response = await base44.functions.invoke('trueLayerAuth', {
                    action: 'getProviders'
                });
                // Transform TrueLayer providers to match bank list format
                const providers = (response.data.providers || []).map(p => ({
                    name: p.display_name,
                    country: p.country,
                    provider_id: p.provider_id,
                    logo: p.logo_uri,
                }));
                setBanks(providers);
            } else {
                const response = await base44.functions.invoke('enableBankingAuth', {
                    action: 'getASPSPs'
                });
                setBanks(response.data.aspsps);
            }
        } catch (error) {
            toast({
                title: "Failed to load banks",
                description: error.message,
                variant: "destructive"
            });
        } finally {
            setLoadingBanks(false);
        }
    }, [toast]);

    // MODIFIED: 26-Jan-2026 - Support both providers
    const handleSelectBank = useCallback(async (bank) => {
        try {
            const redirectUrl = `${window.location.origin}/BankSync`;
            const state = Math.random().toString(36).substring(7);
            
            // Store state and provider for verification
            sessionStorage.setItem('bank_sync_state', state);
            sessionStorage.setItem('bank_sync_provider', selectedProvider);
            sessionStorage.setItem('bank_sync_bank', JSON.stringify(bank));

            if (selectedProvider === 'truelayer') {
                const response = await base44.functions.invoke('trueLayerAuth', {
                    action: 'generateAuthLink',
                    redirectUrl,
                    state,
                    providerId: bank.provider_id
                });
                window.location.href = response.data.authUrl;
            } else {
                const response = await base44.functions.invoke('enableBankingAuth', {
                    action: 'startAuth',
                    aspsp: bank,
                    redirectUrl,
                    state
                });
                window.location.href = response.data.redirectUrl;
            }
        } catch (error) {
            toast({
                title: "Failed to start connection",
                description: error.message,
                variant: "destructive"
            });
        }
    }, [toast, selectedProvider]);

    // MODIFIED: 26-Jan-2026 - Handle both TrueLayer and Enable Banking callbacks
    useEffect(() => {
        const handleCallback = async () => {
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
                const storedState = sessionStorage.getItem('bank_sync_state');
                const storedProvider = sessionStorage.getItem('bank_sync_provider');
                const storedBank = sessionStorage.getItem('bank_sync_bank');

                if (state !== storedState) {
                    toast({
                        title: "Security error",
                        description: "Invalid state parameter",
                        variant: "destructive"
                    });
                    return;
                }

                try {
                    const bank = JSON.parse(storedBank);
                    const redirectUrl = `${window.location.origin}/BankSync`;

                    if (storedProvider === 'truelayer') {
                        // Exchange code for access token
                        const tokenResponse = await base44.functions.invoke('trueLayerAuth', {
                            action: 'exchangeCode',
                            code,
                            redirectUrl
                        });

                        const tokens = tokenResponse.data.tokens;
                        const expiryDate = new Date(Date.now() + tokens.expires_in * 1000);

                        // Save connection
                        await base44.entities.BankConnection.create({
                            provider: 'truelayer',
                            provider_name: bank.name,
                            provider_id: bank.provider_id,
                            country: bank.country,
                            access_token: tokens.access_token,
                            refresh_token: tokens.refresh_token,
                            token_expiry: expiryDate.toISOString(),
                            accounts: [],
                            status: 'active',
                            auto_sync_enabled: true,
                            user_email: (await base44.auth.me()).email
                        });

                        toast({
                            title: "Bank connected!",
                            description: `Successfully connected to ${bank.name} via TrueLayer`
                        });
                    } else {
                        // Enable Banking flow
                        const response = await base44.functions.invoke('enableBankingAuth', {
                            action: 'createSession',
                            code
                        });

                        const session = response.data.session;

                        await base44.entities.BankConnection.create({
                            provider: 'enable_banking',
                            provider_name: bank.name,
                            provider_id: bank.name,
                            country: bank.country,
                            access_token: session.session_id,
                            accounts: session.accounts || [],
                            status: 'active',
                            auto_sync_enabled: true,
                            user_email: (await base44.auth.me()).email
                        });

                        toast({
                            title: "Bank connected!",
                            description: `Successfully connected to ${bank.name} via Enable Banking`
                        });
                    }

                    queryClient.invalidateQueries(['bankConnections']);

                    // Clear storage and URL
                    sessionStorage.removeItem('bank_sync_state');
                    sessionStorage.removeItem('bank_sync_provider');
                    sessionStorage.removeItem('bank_sync_bank');
                    window.history.replaceState({}, '', '/BankSync');

                } catch (error) {
                    toast({
                        title: "Failed to complete connection",
                        description: error.message,
                        variant: "destructive"
                    });
                }
            }
        };

        handleCallback();
    }, [queryClient, toast]);

    // MODIFIED: 26-Jan-2026 - Support both providers
    const handleSync = useCallback(async (connection) => {
        setSyncing(connection.id);
        try {
            const dateFrom = new Date();
            dateFrom.setDate(dateFrom.getDate() - 30);

            const functionName = connection.provider === 'truelayer' 
                ? 'trueLayerSync' 
                : 'syncBankTransactions';

            const response = await base44.functions.invoke(functionName, {
                connectionId: connection.id,
                dateFrom: dateFrom.toISOString().split('T')[0],
                dateTo: new Date().toISOString().split('T')[0]
            });

            if (response.data.transactions && response.data.transactions.length > 0) {
                setPreviewTransactions(response.data.transactions);
                setShowTransactionPreview(true);
            } else {
                toast({
                    title: "No new transactions",
                    description: "All transactions are up to date"
                });
            }
        } catch (error) {
            toast({
                title: "Sync failed",
                description: error.message,
                variant: "destructive"
            });
        } finally {
            setSyncing(null);
        }
    }, [toast]);

    // Import transactions
    const { mutate: importTransactions, isPending: isImporting } = useMutation({
        mutationFn: async (transactions) => {
            // Get existing to avoid duplicates
            const existing = await base44.entities.Transaction.list();
            const existingKeys = new Set(
                existing.map(t => `${t.title}_${t.date}_${t.amount}`)
            );

            const newTransactions = transactions
                .filter(tx => {
                    const key = `${tx.description}_${tx.date}_${tx.amount}`;
                    return !existingKeys.has(key);
                })
                .map(tx => ({
                    title: tx.description,
                    amount: tx.amount,
                    originalAmount: tx.amount,
                    originalCurrency: tx.currency,
                    type: tx.type,
                    date: tx.date,
                    notes: `Imported from ${tx.accountName}`
                }));

            if (newTransactions.length === 0) {
                throw new Error('All transactions already exist');
            }

            return base44.entities.Transaction.bulkCreate(newTransactions);
        },
        onSuccess: (data) => {
            queryClient.invalidateQueries(['transactions']);
            setShowTransactionPreview(false);
            setPreviewTransactions(null);
            toast({
                title: "Transactions imported!",
                description: `Successfully imported ${data.length} transactions`
            });
        },
        onError: (error) => {
            toast({
                title: "Import failed",
                description: error.message,
                variant: "destructive"
            });
        }
    });

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
        confirmAction({
            title: "Remove Bank Connection",
            description: `Are you sure you want to disconnect ${connection.aspsp_name}? This will not delete imported transactions.`,
            confirmText: "Remove",
            onConfirm: () => deleteConnection(connection.id)
        });
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
                    {/* MODIFIED: 26-Jan-2026 - Provider selection */}
                    <div className="flex gap-2">
                        <CustomButton
                            variant="create"
                            onClick={() => {
                                loadBanks('truelayer');
                                setShowBankSelection(true);
                            }}
                        >
                            <Plus className="w-4 h-4" />
                            Connect UK Bank
                        </CustomButton>
                        <CustomButton
                            variant="outline"
                            onClick={() => {
                                loadBanks('enable_banking');
                                setShowBankSelection(true);
                            }}
                        >
                            <Plus className="w-4 h-4" />
                            Connect EU Bank
                        </CustomButton>
                    </div>
                </div>

                {/* MODIFIED: 26-Jan-2026 - Updated info for both providers */}
                <Alert className="bg-blue-50 border-blue-200">
                    <Info className="h-4 w-4 text-blue-600" />
                    <AlertDescription className="text-blue-900">
                        <strong>Secure Bank Connection:</strong> Connect via TrueLayer (UK banks) or Enable Banking (6,000+ European banks). 
                        Your credentials are never stored, and connections are read-only.
                    </AlertDescription>
                </Alert>
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
                        {/* MODIFIED: 26-Jan-2026 - Provider selection */}
                        <div className="flex gap-3 justify-center">
                            <CustomButton
                                variant="create"
                                onClick={() => {
                                    loadBanks('truelayer');
                                    setShowBankSelection(true);
                                }}
                            >
                                <Plus className="w-4 h-4" />
                                Connect UK Bank
                            </CustomButton>
                            <CustomButton
                                variant="outline"
                                onClick={() => {
                                    loadBanks('enable_banking');
                                    setShowBankSelection(true);
                                }}
                            >
                                <Plus className="w-4 h-4" />
                                Connect EU Bank
                            </CustomButton>
                        </div>
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

            {/* Dialogs */}
            <BankSelectionDialog
                open={showBankSelection}
                onOpenChange={setShowBankSelection}
                banks={banks}
                onSelectBank={handleSelectBank}
                isLoading={loadingBanks}
            />

            <TransactionPreviewDialog
                open={showTransactionPreview}
                onOpenChange={setShowTransactionPreview}
                transactions={previewTransactions}
                settings={settings}
                onImport={importTransactions}
                isImporting={isImporting}
            />
        </div>
    );
}