import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

/**
 * Automated Bank Sync - Scheduled Function
 * CREATED: 26-Jan-2026
 * 
 * Runs daily to sync all active bank connections
 * Should be called by scheduled automation
 */

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        
        // Verify admin for scheduled task
        const user = await base44.auth.me();
        if (user?.role !== 'admin') {
            return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
        }

        // Get all active bank connections with auto-sync enabled
        const connections = await base44.asServiceRole.entities.BankConnection.filter({
            status: 'active',
            auto_sync_enabled: true
        });

        const results = [];
        const dateFrom = new Date();
        dateFrom.setDate(dateFrom.getDate() - 7); // Last 7 days
        const dateTo = new Date();

        for (const connection of connections) {
            try {
                // Call sync function for this connection
                const response = await base44.asServiceRole.functions.invoke('syncBankTransactions', {
                    connectionId: connection.id,
                    dateFrom: dateFrom.toISOString().split('T')[0],
                    dateTo: dateTo.toISOString().split('T')[0]
                });

                // Auto-import transactions (without preview since it's automated)
                if (response.data.transactions && response.data.transactions.length > 0) {
                    // Import transactions for this user
                    const userSettings = await base44.asServiceRole.entities.UserSettings.filter({
                        user_email: connection.user_email
                    });
                    
                    const settings = userSettings[0] || { baseCurrency: 'USD' };
                    
                    // Get existing transactions to avoid duplicates
                    const existingTransactions = await base44.asServiceRole.entities.Transaction.filter({
                        created_by: connection.user_email
                    });

                    const existingDescriptions = new Set(
                        existingTransactions.map(t => `${t.title}_${t.date}_${t.amount}`)
                    );

                    const newTransactions = response.data.transactions
                        .filter(tx => {
                            const key = `${tx.description}_${tx.date}_${tx.amount}`;
                            return !existingDescriptions.has(key);
                        })
                        .map(tx => ({
                            title: tx.description,
                            amount: tx.amount,
                            originalAmount: tx.amount,
                            originalCurrency: tx.currency,
                            type: tx.type,
                            date: tx.date,
                            notes: `Auto-imported from ${tx.accountName}`,
                            created_by: connection.user_email
                        }));

                    if (newTransactions.length > 0) {
                        await base44.asServiceRole.entities.Transaction.bulkCreate(newTransactions);
                    }

                    results.push({
                        connectionId: connection.id,
                        success: true,
                        imported: newTransactions.length,
                        total: response.data.transactions.length
                    });
                } else {
                    results.push({
                        connectionId: connection.id,
                        success: true,
                        imported: 0,
                        total: 0
                    });
                }

            } catch (error) {
                results.push({
                    connectionId: connection.id,
                    success: false,
                    error: error.message
                });
            }
        }

        return Response.json({ 
            synced: results.length,
            results
        });

    } catch (error) {
        console.error('Auto Sync Banks Error:', error);
        return Response.json({ 
            error: error.message,
            details: error.toString()
        }, { status: 500 });
    }
});