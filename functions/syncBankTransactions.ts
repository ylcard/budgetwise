import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import * as jose from 'npm:jose@5.2.0';

/**
 * Sync Bank Transactions from Enable Banking
 * CREATED: 26-Jan-2026
 * 
 * Fetches transactions from connected bank accounts and returns for preview
 */

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();

        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { connectionId, dateFrom, dateTo } = await req.json();

        const appId = Deno.env.get("ENABLE_BANKING_APP_ID");
        const privateKeyPem = Deno.env.get("ENABLE_BANKING_PRIVATE_KEY");
        const environment = Deno.env.get("ENABLE_BANKING_ENVIRONMENT") || "SANDBOX";

        if (!appId || !privateKeyPem) {
            return Response.json({ 
                error: 'Enable Banking credentials not configured'
            }, { status: 500 });
        }

        // Fetch bank connection
        const connection = await base44.entities.BankConnection.get(connectionId);
        
        if (!connection || connection.created_by !== user.email) {
            return Response.json({ error: 'Connection not found' }, { status: 404 });
        }

        if (connection.status !== 'active') {
            return Response.json({ error: 'Connection is not active' }, { status: 400 });
        }

        const baseUrl = "https://api.enablebanking.com";

        // Generate JWT token
        const generateJWT = async () => {
            const privateKey = await jose.importPKCS8(privateKeyPem, 'RS256');
            
            const jwt = await new jose.SignJWT({})
                .setProtectedHeader({ alg: 'RS256', kid: appId })
                .setIssuer(appId)
                .setIssuedAt()
                .setExpirationTime('5m')
                .sign(privateKey);

            return jwt;
        };

        const jwt = await generateJWT();

        // Fetch transactions for each account
        const allTransactions = [];
        
        for (const account of connection.accounts) {
            const params = new URLSearchParams({
                session_id: connection.session_id,
                account_id: account.account_id,
            });

            if (dateFrom) params.append('date_from', dateFrom);
            if (dateTo) params.append('date_to', dateTo);

            const response = await fetch(`${baseUrl}/accounts/${account.account_id}/transactions?${params}`, {
                headers: {
                    'Authorization': `Bearer ${jwt}`,
                    'Content-Type': 'application/json',
                }
            });

            if (!response.ok) {
                console.error(`Failed to fetch transactions for account ${account.account_id}`);
                continue;
            }

            const data = await response.json();
            
            // Transform transactions to app format
            const transactions = (data.transactions || []).map(tx => ({
                bankTransactionId: tx.transaction_id,
                accountId: account.account_id,
                accountName: account.name,
                date: tx.booking_date || tx.value_date,
                amount: Math.abs(tx.amount),
                type: tx.amount > 0 ? 'income' : 'expense',
                description: tx.remittance_information || tx.additional_information || 'Bank Transaction',
                currency: tx.currency || account.currency,
                originalData: tx,
            }));

            allTransactions.push(...transactions);
        }

        // Update last sync timestamp
        await base44.asServiceRole.entities.BankConnection.update(connectionId, {
            last_sync: new Date().toISOString()
        });

        return Response.json({ 
            transactions: allTransactions,
            count: allTransactions.length
        });

    } catch (error) {
        console.error('Sync Bank Transactions Error:', error);
        return Response.json({ 
            error: error.message,
            details: error.toString()
        }, { status: 500 });
    }
});