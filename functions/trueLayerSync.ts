import { createClientFromRequest } from 'npm:@base44/sdk@0.8.18';

/**
 * TrueLayer Sync Handler
 * CREATED: 26-Jan-2026
 * 
 * Fetches accounts, balances, and transactions from TrueLayer
 */

// CONFIGURATION: Production Mode
const BASE_API_URL = "https://api.truelayer.com";

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();

        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await req.json();
        const connectionId = body.connectionId;
        const dateFrom = body.dateFrom;
        const dateTo = body.dateTo;

        // Fetch bank connection by ID
        const connection = await base44.asServiceRole.entities.BankConnection.get(connectionId);
        
        if (!connection || connection.created_by !== user.email) {
            return Response.json({ error: 'Connection not found' }, { status: 404 });
        }

        if (connection.status !== 'active') {
            return Response.json({ error: 'Connection is not active' }, { status: 400 });
        }

        // Get fresh access token (refresh if needed)
        let accessToken = connection.access_token;
        const tokenExpiry = new Date(connection.token_expiry);
        
        if (tokenExpiry < new Date()) {
            // Token expired, refresh it
            const refreshResponse = await base44.functions.invoke('trueLayerAuth', {
                action: 'refreshToken',
                refreshToken: connection.refresh_token
            });

            if (!refreshResponse.data.tokens) {
                throw new Error('Failed to refresh access token');
            }

            const tokens = refreshResponse.data.tokens;
            accessToken = tokens.access_token;

            // Update connection with new tokens
            await base44.asServiceRole.entities.BankConnection.update(connectionId, {
                access_token: tokens.access_token,
                refresh_token: tokens.refresh_token || connection.refresh_token,
                token_expiry: new Date(Date.now() + tokens.expires_in * 1000).toISOString()
            });
        }

        // Fetch accounts
        const accountsResponse = await fetch(`${BASE_API_URL}/data/v1/accounts`, {
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Accept': 'application/json',
            }
        });

        if (!accountsResponse.ok) {
            throw new Error('Failed to fetch accounts from TrueLayer');
        }

        const accountsData = await accountsResponse.json();
        const accounts = accountsData.results || [];

        // Fetch transactions for each account
        const allTransactions = [];
        
        for (const account of accounts) {
            // Build query params
            const params = new URLSearchParams();
            if (dateFrom) params.append('from', dateFrom);
            if (dateTo) params.append('to', dateTo);

            const txResponse = await fetch(
                `${BASE_API_URL}/data/v1/accounts/${account.account_id}/transactions?${params}`,
                {
                    headers: {
                        'Authorization': `Bearer ${accessToken}`,
                        'Accept': 'application/json',
                    }
                }
            );

            if (!txResponse.ok) {
                console.error(`Failed to fetch transactions for account ${account.account_id}`);
                continue;
            }

            const txData = await txResponse.json();
            
            // Transform transactions to app format
            const transactions = (txData.results || []).map(tx => ({
                bankTransactionId: tx.transaction_id,
                accountId: account.account_id,
                accountName: account.display_name || `${account.account_type} Account`,
                date: tx.timestamp.split('T')[0],
                amount: Math.abs(tx.amount),
                type: tx.transaction_type === 'CREDIT' ? 'income' : 'expense',
                description: tx.description || tx.transaction_category || 'Bank Transaction',
                currency: tx.currency,
                merchantName: tx.merchant_name,
                category: tx.transaction_category,
                originalData: tx,
            }));

            allTransactions.push(...transactions);
        }

        // Update connection metadata
        await base44.asServiceRole.entities.BankConnection.update(connectionId, {
            last_sync: new Date().toISOString(),
            accounts: accounts.map(acc => ({
                account_id: acc.account_id,
                name: acc.display_name || `${acc.account_type} Account`,
                account_number: acc.account_number?.number,
                sort_code: acc.account_number?.sort_code,
                iban: acc.account_number?.iban,
                currency: acc.currency,
                account_type: acc.account_type,
            }))
        });

        return Response.json({ 
            transactions: allTransactions,
            accounts: accounts,
            count: allTransactions.length
        });

    } catch (error) {
        console.error('TrueLayer Sync Error:', error);
        return Response.json({ 
            error: error.message,
            details: error.toString()
        }, { status: 500 });
    }
});