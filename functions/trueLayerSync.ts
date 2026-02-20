import { createClientFromRequest } from 'npm:@base44/sdk@0.8.18';

/**
 * TrueLayer Sync Handler
 * CREATED: 26-Jan-2026
 * 
 * Fetches accounts, balances, and transactions from TrueLayer
 */

// CONFIGURATION: Production Mode
const BASE_API_URL = "https://api.truelayer.com";

/**
 * THE DICTIONARY
 * Maintainable list of canonical names and their default classifications.
 */
const DICTIONARY = [
    { key: 'AMAZON', clean: 'Amazon', category: 'Shopping', priority: 'wants' },
    { key: 'UBER', clean: 'Uber', category: 'Transport', priority: 'needs' },
    { key: 'STARBUCKS', clean: 'Starbucks', category: 'Dining Out', priority: 'wants' },
    { key: 'MCDONALD', clean: 'McDonalds', category: 'Dining Out', priority: 'wants' },
    { key: 'MERCADONA', clean: 'Mercadona', category: 'Groceries', priority: 'needs' },
    { key: 'TESCO', clean: 'Tesco', category: 'Groceries', priority: 'needs' },
];

const FALLBACK_REGEX = [
    { pattern: /(VUELING|RYANAIR|EASYJET|WIZZAIR|ELAL|FINNAIR)/i, category: 'Travel', priority: 'wants' },
    { pattern: /(MOBILITAT|BEENETWORK|BEE NETWORK|BEE|TRANSPORTE|BVG|RIVERTY)/i, category: 'Transport', priority: 'needs' },
    { pattern: /(LA SIRENA|Mcdonalds)/i, category: 'Dining', priority: 'wants' },
    { pattern: /(STEAM|STEAMGAMES)/i, category: 'Entertainment', priority: 'wants' },
    { pattern: /(MERCADONA|Tesco|CAPRABO)/i, category: 'Groceries', priority: 'needs' },
    { pattern: /(IMPULS|ADMINISTRACION)/i, category: 'Housing', priority: 'needs' },
    { pattern: /(INTERNET|WIFI|CABLE|COMCAST|AT&T|VERIZON|T-MOBILE|ORANGE|FINETWORK|AIGUES|WATER|POWER|GAS|ELECTRIC|ENERGIA|NUFRI)/i, category: 'Utilities', priority: 'needs' },
    { pattern: /(HOSTEL|HOSTELS|HOTEL|HOTELS|HOSTELWORLD|TOC|UNITE)/i, category: 'Travel', priority: 'wants' },
    { pattern: /(HOSPITAL|DOCTOR|CLINIC|DENTIST|PHARMACY|CVS|WALGREENS|PERRUQUERS)/i, category: 'Health', priority: 'needs' }
];

// --- HELPER: SMART CATEGORY MATCHING ---
const findCategorySmart = (targetName, categoryList) => {
    if (!targetName || !categoryList) return null;
    const search = targetName.toUpperCase().trim();

    // 1. Exact Match
    let match = categoryList.find(c => c.name.toUpperCase() === search);
    if (match) return match;

    // 2. Singular/Plural Handling (e.g. "Investments" vs "Investment")
    // We check if the category name is a substring of the search or vice versa to catch "Transportation" vs "Transport"
    match = categoryList.find(c => {
        const catName = c.name.toUpperCase();

        // Direct substring check (covers Transport <-> Transportation)
        if (catName.includes(search) || search.includes(catName)) return true;

        // Simple plural check
        const catSingular = catName.endsWith('S') ? catName.slice(0, -1) : catName;
        const searchSingular = search.endsWith('S') ? search.slice(0, -1) : search;

        return catSingular === searchSingular;
    });

    return match;
};

const categorizeTransaction = (searchString, userRules, userCategories, systemCategories) => {
    // 1. User Rules (Highest Priority)
    for (const rule of userRules) {
        let matched = false;
        if (rule.regexPattern) {
            try { if (new RegExp(rule.regexPattern, 'i').test(searchString)) matched = true; } catch (e) { }
        } else if (rule.keyword) {
            // Split comma-separated variations into an array and check if any match
            const variations = rule.keyword.split(',').map(k => k.trim().toUpperCase());
            if (variations.some(k => searchString.includes(k))) {
                matched = true;
            }
        }
        if (matched && rule.categoryId) {
            const cat = userCategories.find(c => c.id === rule.categoryId);
            if (cat) return {
                categoryId: cat.id,
                categoryName: cat.name,
                priority: cat.priority || 'wants',
                needsReview: false,
                renamedTitle: rule.renamedTitle || null // Pass the clean name back!
            };
        }
    }

    // Helper to try User then System
    const resolveCategory = (targetName, defaultPriority) => {
        // A. Try User Categories (Preferred)
        const userMatch = findCategorySmart(targetName, userCategories);
        if (userMatch) {
            return { categoryId: userMatch.id, categoryName: userMatch.name, priority: userMatch.priority || defaultPriority, needsReview: true };
        }

        // B. Try System Categories (Fallback - No ID assigned to avoid FK errors)
        const sysMatch = findCategorySmart(targetName, systemCategories);
        if (sysMatch) {
            return { categoryId: null, categoryName: sysMatch.name, priority: sysMatch.priority || defaultPriority, needsReview: true };
        }

        // C. No match found, but we have a name
        return { categoryId: null, categoryName: targetName, priority: defaultPriority, needsReview: true };
    };

    // 2. Dictionary Pass (Fuzzy + Cleaning)
    // This is where "AMZN" matches "AMAZON"
    for (const entry of DICTIONARY) {
        const score = calculateSimilarity(searchString, entry.key);
        if (score > 0.75) {
            const resolved = resolveCategory(entry.category, entry.priority);
            return { ...resolved, renamedTitle: entry.clean, needsReview: false };
        }
    }

    // 3. Regex Fallback
    for (const { pattern, category, priority } of FALLBACK_REGEX) {
        if (pattern.test(searchString)) {
            return resolveCategory(category, priority);
        }
    }

    // 4. Default Budget Assignment (The "Safety Net")
    // No category assigned, but priority is set so it appears in the budget.
    return { categoryId: null, categoryName: null, priority: 'wants', needsReview: true };
};

// --- HELPER: FUZZY MATCHING STRATEGY ---
const findMatchingManualTransaction = (incomingTx, existingTransactions) => {
    // 1. Filter: Only check transactions that DO NOT have a bank ID yet (Manual/CSV)
    const candidates = existingTransactions.filter(t => !t.bankTransactionId && !t.providerTransactionId);

    return candidates.find(existing => {
        // A. Exact Amount Match (Banks are precise)
        const amtMatch = Math.abs(existing.amount) === Math.abs(incomingTx.amount);

        // B. Date Window (+/- 4 Days)
        // Manual entry might be "today", but bank settles "3 days later".
        const d1 = new Date(existing.date);
        const d2 = new Date(incomingTx.timestamp);
        const diffTime = Math.abs(d2 - d1);
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        const dateMatch = diffDays <= 4;

        // C. Currency Match (Strict)
        const currMatch = existing.originalCurrency === incomingTx.currency;

        return amtMatch && dateMatch && currMatch;
    });
};

const getOrCreateBudget = async (base44, userEmail, txDate, priority) => {
    const date = new Date(txDate);
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const monthStart = `${y}-${m}-01`;

    const existing = await base44.entities.SystemBudget.filter({ created_by: userEmail, startDate: monthStart, systemBudgetType: priority });
    if (existing && existing.length > 0) return existing[0].id;

    // Create basic placeholder budget if none exists (Amount can be updated later by the UI)
    const newBudget = await base44.entities.SystemBudget.create({
        name: priority === 'needs' ? 'Needs' : 'Wants',
        budgetAmount: 0,
        startDate: monthStart,
        endDate: new Date(y, date.getMonth() + 1, 0).toISOString().split('T')[0],
        color: priority === 'needs' ? 'emerald' : 'amber',
        created_by: userEmail,
        systemBudgetType: priority
    });
    return newBudget.id;
};

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
            created_by: connection?.user_email,
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
                'TrueLayer-Adapter-Version': '2023-06-15',
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

        // --- FETCH APP CONTEXT FOR CATEGORIZATION ---
        console.log('🧠 [SYNC] Fetching rules, categories, and existing transactions...');

        // Only fetch relevant history from DB (Sync Range - 7 days buffer for fuzzy matching)
        // We need a buffer because 'findMatchingManualTransaction' looks for dates +/- 4 days
        const lookbackDate = new Date(dateFrom || new Date());
        lookbackDate.setDate(lookbackDate.getDate() - 7);
        const dbQueryDate = lookbackDate.toISOString().split('T')[0];

        const [customCategories, systemCategories, rules, existingTx] = await Promise.all([
            base44.entities.Category.filter({ created_by: user.email }),
            base44.entities.SystemCategory.list(),
            base44.entities.CategoryRule.filter({ created_by: user.email }),
            base44.entities.Transaction.filter({
                created_by: user.email,
                date: { $gte: dbQueryDate }
            })
        ]);
        const existingBankIds = new Set(existingTx.filter(t => t.bankTransactionId).map(t => t.bankTransactionId));
        const existingNormalisedIds = new Set(existingTx.filter(t => t.normalisedProviderTransactionId).map(t => t.normalisedProviderTransactionId));

        // const allCategories = [...customCategories, ...systemCategories];

        /**
         * Fetch transactions for each account
         * Use a Map for deduplication based on bankTransactionId
         */
        const transactionMap = new Map();

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

            let nextLink = `${BASE_API_URL}/data/v1/accounts/${account.account_id}/transactions?${params}`;
            let accountTransactions = [];
            let pageCount = 0;
            const MAX_PAGES = 100; // Safety cap to prevent infinite loops

            while (nextLink && pageCount < MAX_PAGES) {
                pageCount++;
                console.log(`🌐 [SYNC] Fetching page ${pageCount} for account ${account.account_id}...`);

                const txResponse = await fetch(nextLink, {
                    headers: {
                        'Authorization': `Bearer ${accessToken}`,
                        'TrueLayer-Adapter-Version': '2023-06-15',
                        'Accept': 'application/json',
                        // IMPORTANT: Ensures pagination object is returned in response
                        'tl-enable-pagination': 'true'
                    }
                });

                if (!txResponse.ok) {
                    const errorText = await txResponse.text();
                    console.error(`❌ [SYNC] Failed to fetch transactions:`, errorText);
                    break;
                }

                const txData = await txResponse.json();
                const results = txData.results || [];
                accountTransactions = [...accountTransactions, ...results];

                // Follow the breadcrumbs to the next page
                nextLink = txData.pagination?.next_link || null;

                if (nextLink) {
                    console.log(`🔗 [SYNC] Moving to next page: ${nextLink}`);
                }
            }

            console.log(`✅ [SYNC] Collected ${accountTransactions.length} raw transactions across ${pageCount} pages`);

            // Deduplicate and Transform to app format
            for (const tx of accountTransactions) {
                // Strict DB deduplication to prevent double imports
                if (existingBankIds.has(tx.transaction_id) || (tx.normalised_provider_transaction_id && existingNormalisedIds.has(tx.normalised_provider_transaction_id))) {
                    continue;
                }

                const rawDescription = String(tx.description || tx.transaction_category || 'Bank Transaction');

                // Combine all available string data to maximize regex matching surface area
                const searchString = `${rawDescription} ${tx.merchant_name || ''} ${tx.meta?.counter_party_preferred_name || ''}`.toUpperCase();

                // const catResult = await categorizeTransaction(base44, user.email, searchString, rules, categories);
                const txDate = tx.timestamp.split('T')[0];
                const isExpense = tx.transaction_type !== 'CREDIT';

                // Default to null/false for Income
                let catResult = { categoryId: null, priority: null, needsReview: false };

                // --- CRITICAL: DUPLICATE PREVENTION ---
                // Check if this bank transaction matches a manual one we already have.
                const softMatch = findMatchingManualTransaction(tx, existingTx);
                const existingDbId = softMatch ? softMatch.id : null;

                if (softMatch) {
                    console.log(`🔗 [SYNC] MATCH FOUND: Linking Bank Tx ${tx.transaction_id} to Manual Tx ${softMatch.id}`);
                    // We will UPDATE the manual transaction instead of creating a new one.
                    // We preserve the User's category/title if they set one.
                    if (softMatch.category_id) {
                        catResult = { categoryId: softMatch.category_id, priority: softMatch.financial_priority, renamedTitle: softMatch.title, needsReview: false };
                    }
                }

                // Only run categorization engine for expenses
                if (isExpense && !catResult.categoryId) {
                    // Merged categories used here
                    catResult = categorizeTransaction(searchString, rules, customCategories, systemCategories);
                }

                // Determine the clean name (AI/Rule result OR raw fallback)
                const finalCleanName = catResult.renamedTitle || rawDescription;

                const transformed = {
                    id: existingDbId, // <--- If this is set, we UPDATE. If null, we CREATE.
                    title: finalCleanName, // Dynamic Display Name
                    rawDescription: rawDescription, // Immutable Source
                    cleanDescription: finalCleanName, // Immutable Clean
                    amount: Math.abs(tx.amount),
                    originalAmount: Math.abs(tx.amount),
                    originalCurrency: tx.currency,
                    type: isExpense ? 'expense' : 'income',
                    date: txDate,
                    isPaid: isExpense,
                    paidDate: isExpense ? txDate : null,
                    bankTransactionId: tx.transaction_id,
                    normalisedProviderTransactionId: tx.normalised_provider_transaction_id || null,
                    providerTransactionId: tx.provider_transaction_id || null,
                    merchantName: tx.merchant_name || null,
                    counterPartyName: tx.meta?.counter_party_preferred_name || null,
                    category_id: catResult.categoryId,
                    financial_priority: catResult.priority,
                    needsReview: catResult.needsReview
                };

                // Map.set automatically handles deduplication by overwriting same IDs
                transactionMap.set(tx.transaction_id, transformed);
            }

            console.log(`✅ [SYNC] Account ${account.account_id} processing complete.`);
        }

        // Convert Map back to an array for the final response
        const allTransactions = Array.from(transactionMap.values());
        console.log(`\n📊 [SYNC] Total UNIQUE transactions collected: ${allTransactions.length}`);

        const toCreate = [];
        const toUpdate = [];

        // --- ASSIGN BUDGETS & BULK CREATE ---
        console.log('💾 [SYNC] Resolving budgets and saving to database...');
        const budgetCache = {};
        for (const tx of allTransactions) {
            // If updating, preserve existing budget if present in the manual record
            if (tx.id) {
                const existingRecord = existingTx.find(t => t.id === tx.id);
                if (existingRecord?.budgetId) tx.budgetId = existingRecord.budgetId;
            }

            if (tx.type === 'expense') {
                const cacheKey = `${tx.date}|${tx.financial_priority}`;
                if (!tx.budgetId && !budgetCache[cacheKey]) {
                    budgetCache[cacheKey] = await getOrCreateBudget(base44, user.email, tx.date, tx.financial_priority);
                }
                if (!tx.budgetId) tx.budgetId = budgetCache[cacheKey];
            }

            if (tx.id) toUpdate.push(tx);
            else toCreate.push(tx);
        }

        let importedCount = 0;

        // 1. CREATE NEW
        if (toCreate.length > 0) {
            await base44.entities.Transaction.bulkCreate(toCreate);
            importedCount += toCreate.length;
        }

        // 2. UPDATE EXISTING (The Merge Logic)
        if (toUpdate.length > 0) {
            console.log(`🔄 [SYNC] Upgrading ${toUpdate.length} manual transactions to synced status...`);
            const updatePromises = toUpdate.map(tx => base44.entities.Transaction.update(tx.id, {
                // We ONLY update the "Hard Data" + ID fields to verify the transaction
                bankTransactionId: tx.bankTransactionId,
                providerTransactionId: tx.providerTransactionId,
                normalisedProviderTransactionId: tx.normalisedProviderTransactionId,
                isPaid: true,
                paidDate: tx.date,
                // Optional: We do NOT overwrite 'title' or 'category_id' here, preserving manual edits
            }));
            await Promise.all(updatePromises);
            importedCount += toUpdate.length;
        }

        // Calculate how many transactions require user attention
        const needsReviewCount = toCreate.filter(t => t.needsReview).length + toUpdate.filter(t => t.needsReview).length;

        console.log(`✅ [SYNC] Processed ${importedCount} transactions (${needsReviewCount} need review)`);

        // Update connection metadata
        console.log('💾 [SYNC] Updating connection metadata...');
        const updatePayload = {
            last_sync: new Date().toISOString(),
            accounts: accounts.map(acc => ({
                account_id: String(acc.account_id || ''),
                name: String(acc.display_name || acc.account_type || 'Account'),
                account_number: acc.account_number?.number ? String(acc.account_number.number) : undefined,
                sort_code: acc.account_number?.sort_code ? String(acc.account_number.sort_code) : undefined,
                iban: acc.account_number?.iban ? String(acc.account_number.iban) : undefined,
                currency: String(acc.currency || 'EUR'),
                account_type: String(acc.account_type || '')
            }))
        };
        console.log('📝 [SYNC] Update payload:', JSON.stringify(updatePayload, null, 2));

        await base44.entities.BankConnection.update(connectionId, updatePayload);
        console.log('✅ [SYNC] Connection metadata updated successfully');

        const response = {
            importedCount: importedCount,
            needsReviewCount: needsReviewCount,
            accounts: accounts,
            count: importedCount
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