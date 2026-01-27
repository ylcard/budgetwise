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
        console.log('🚀 [SYNC] TrueLayer Sync Handler started');

        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();
        console.log('👤 [SYNC] User authenticated:', user?.email);

        if (!user) {
            console.error('❌ [SYNC] No user found - Unauthorized');
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await req.json();
        console.log('📦 [SYNC] Request body:', JSON.stringify(body, null, 2));

        const connectionId = body.connectionId;
        const dateFrom = body.dateFrom;
        const dateTo = body.dateTo;

        console.log('🔑 [SYNC] Parsed parameters:', {
            connectionId,
            dateFrom,
            dateTo,
            hasConnectionId: !!connectionId,
            hasDateFrom: !!dateFrom,
            hasDateTo: !!dateTo
        });

        // Fetch bank connection by ID
        console.log('🔍 [SYNC] Fetching connection with ID:', connectionId);

        // FIXED: 27-Jan-2026 - Use user-scoped query instead of service-role because RLS blocks service-role access
        const connection = await base44.entities.BankConnection.get(connectionId);
        console.log('✅ [SYNC] Connection fetched:', {
            id: connection?.id,
            provider: connection?.provider,
            provider_name: connection?.provider_name,
            status: connection?.status,
            user_email: connection?.user_email,
            hasAccessToken: !!connection?.access_token,
            hasRefreshToken: !!connection?.refresh_token,
            token_expiry: connection?.token_expiry
        });

        if (!connection || connection.user_email !== user.email) {
            console.error('❌ [SYNC] Connection not found or unauthorized:', {
                hasConnection: !!connection,
                connectionUserEmail: connection?.user_email,
                userEmail: user.email
            });
            return Response.json({ error: 'Connection not found' }, { status: 404 });
        }

        if (connection.status !== 'active') {
            console.error('❌ [SYNC] Connection is not active:', connection.status);
            return Response.json({ error: 'Connection is not active' }, { status: 400 });
        }

        // Get fresh access token (refresh if needed)
        let accessToken = connection.access_token;
        const tokenExpiry = new Date(connection.token_expiry);
        const now = new Date();

        console.log('🔐 [SYNC] Token validation:', {
            tokenExpiry: tokenExpiry.toISOString(),
            currentTime: now.toISOString(),
            isExpired: tokenExpiry < now,
            minutesUntilExpiry: Math.floor((tokenExpiry.getTime() - now.getTime()) / 60000)
        });

        if (tokenExpiry < now) {
            console.log('🔄 [SYNC] Token expired, refreshing...');
            const refreshResponse = await base44.functions.invoke('trueLayerAuth', {
                action: 'refreshToken',
                refreshToken: connection.refresh_token
            });
            console.log('✅ [SYNC] Refresh response received:', {
                hasData: !!refreshResponse.data,
                hasTokens: !!refreshResponse.data?.tokens
            });

            // Handle both ways the SDK might wrap the response
            const responseData = refreshResponse.data || refreshResponse;

            // FIXED: TrueLayer returns a flat object, check both flat and nested structures
            const newAccessToken = responseData.access_token || responseData.tokens?.access_token;
            const newRefreshToken = responseData.refresh_token || responseData.tokens?.refresh_token;
            const expiresIn = responseData.expires_in || responseData.tokens?.expires_in;

            if (!newAccessToken) {
                console.error('❌ [SYNC] Failed to refresh access token - missing access_token in response:', responseData);
                throw new Error('Failed to refresh access token - check trueLayerAuth logs');
            }

            // accessToken = responseData.tokens.access_token;
            accessToken = newAccessToken;
            console.log('✅ [SYNC] New access token obtained, updating connection...');

            // Update the connection with the new data
            await base44.entities.BankConnection.update(connectionId, {
                access_token: newAccessToken,
                refresh_token: newRefreshToken || connection.refresh_token,
                token_expiry: new Date(Date.now() + (expiresIn || 3600) * 1000).toISOString()
            });
            console.log('✅ [SYNC] Connection updated with new tokens');
        } else {
            console.log('✅ [SYNC] Access token is still valid, no refresh needed');
        }

        // Fetch accounts
        console.log('🏦 [SYNC] Fetching accounts from TrueLayer...');
        console.log('🌐 [SYNC] Request URL:', `${BASE_API_URL}/data/v1/accounts`);
        console.log('🔑 [SYNC] Using access token (first 20 chars):', accessToken?.substring(0, 20) + '...');

        const accountsResponse = await fetch(`${BASE_API_URL}/data/v1/accounts`, {
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Accept': 'application/json',
            }
        });

        console.log('📡 [SYNC] Accounts response status:', accountsResponse.status, accountsResponse.statusText);

        if (!accountsResponse.ok) {
            const errorText = await accountsResponse.text();
            console.error('❌ [SYNC] Failed to fetch accounts:', {
                status: accountsResponse.status,
                statusText: accountsResponse.statusText,
                errorBody: errorText
            });
            throw new Error(`Failed to fetch accounts from TrueLayer: ${accountsResponse.status} - ${errorText}`);
        }

        const accountsData = await accountsResponse.json();
        console.log('✅ [SYNC] Accounts data received:', JSON.stringify(accountsData, null, 2));

        const accounts = accountsData.results || [];
        console.log('📊 [SYNC] Number of accounts found:', accounts.length);

        // Fetch transactions for each account
        const allTransactions = [];
        console.log('💸 [SYNC] Starting to fetch transactions for', accounts.length, 'accounts');

        for (let i = 0; i < accounts.length; i++) {
            const account = accounts[i];
            console.log(`\n📋 [SYNC] Processing account ${i + 1}/${accounts.length}:`, {
                account_id: account.account_id,
                display_name: account.display_name,
                account_type: account.account_type,
                currency: account.currency
            });

            // Build query params
            const params = new URLSearchParams();
            if (dateFrom) params.append('from', dateFrom);
            if (dateTo) params.append('to', dateTo);

            const txUrl = `${BASE_API_URL}/data/v1/accounts/${account.account_id}/transactions?${params}`;
            console.log('🌐 [SYNC] Fetching transactions from:', txUrl);

            const txResponse = await fetch(txUrl, {
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                    'Accept': 'application/json',
                }
            });

            console.log('📡 [SYNC] Transactions response status:', txResponse.status, txResponse.statusText);

            if (!txResponse.ok) {
                const errorText = await txResponse.text();
                console.error(`❌ [SYNC] Failed to fetch transactions for account ${account.account_id}:`, {
                    status: txResponse.status,
                    statusText: txResponse.statusText,
                    errorBody: errorText
                });
                continue;
            }

            const txData = await txResponse.json();
            console.log('✅ [SYNC] Transaction data received:', {
                resultsCount: txData.results?.length || 0,
                hasResults: !!txData.results
            });

            // Transform transactions to app format
            const transactions = (txData.results || []).map((tx, txIndex) => {
                const transformed = {
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
                };

                if (txIndex === 0) {
                    console.log('📝 [SYNC] Sample transformed transaction:', JSON.stringify(transformed, null, 2));
                }

                return transformed;
            });

            console.log(`✅ [SYNC] Transformed ${transactions.length} transactions for account ${account.account_id}`);
            allTransactions.push(...transactions);
        }

        console.log(`\n📊 [SYNC] Total transactions collected: ${allTransactions.length}`);

        // Update connection metadata
        console.log('💾 [SYNC] Updating connection metadata...');
        const updatePayload = {
            last_sync: new Date().toISOString(),
            accounts: accounts.map(acc => ({
                account_id: acc.account_id,
                name: acc.display_name || `${acc.account_type} Account`,
                account_number: acc.account_number?.number,
                sort_code: acc.account_number?.sort_code,
                iban: acc.account_number?.iban,
                currency: acc.currency,
                account_type: acc.account_type,
                balance: acc.balance?.current
            }))
        };
        console.log('📝 [SYNC] Update payload:', JSON.stringify(updatePayload, null, 2));

        await base44.entities.BankConnection.update(connectionId, updatePayload);
        console.log('✅ [SYNC] Connection metadata updated successfully');

        const response = {
            transactions: allTransactions,
            accounts: accounts,
            count: allTransactions.length
        };
        console.log('🎉 [SYNC] Sync completed successfully:', {
            transactionCount: response.count,
            accountCount: accounts.length
        });

        return Response.json(response);

    } catch (error) {
        console.error('💥 [SYNC] CRITICAL ERROR:', {
            message: error.message,
            name: error.name,
            stack: error.stack,
            toString: error.toString()
        });
        return Response.json({
            error: error.message,
            details: error.toString(),
            stack: error.stack
        }, { status: 500 });
    }
});