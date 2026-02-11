import { createClientFromRequest } from 'npm:@base44/sdk@0.8.18';

/**
 * TrueLayer Sync Handler
 * CREATED: 26-Jan-2026
 * 
 * Fetches accounts, balances, and transactions from TrueLayer
 */

// CONFIGURATION: Production Mode
const BASE_API_URL = "https://api.truelayer.com";

// --- DEFAULT CATEGORY TEMPLATE ---
const DEFAULT_SYSTEM_CATEGORIES = [
    { name: 'Housing', icon: 'Home', color: '#6366F1', priority: 'needs', is_system: true },
    { name: 'Groceries', icon: 'ShoppingCart', color: '#10B981', priority: 'needs', is_system: true },
    { name: 'Transport', icon: 'Car', color: '#F59E0B', priority: 'needs', is_system: true },
    { name: 'Bills & Utilities', icon: 'Zap', color: '#06B6D4', priority: 'needs', is_system: true },
    { name: 'Health & Personal Care', icon: 'HeartPulse', color: '#EF4444', priority: 'needs', is_system: true },
    { name: 'Dining Out', icon: 'Utensils', color: '#F97316', priority: 'wants', is_system: true },
    { name: 'Shopping', icon: 'ShoppingBag', color: '#8B5CF6', priority: 'wants', is_system: true },
    { name: 'Entertainment', icon: 'Film', color: '#EC4899', priority: 'wants', is_system: true },
    { name: 'Travel', icon: 'Plane', color: '#0EA5E9', priority: 'wants', is_system: true }
];

const ensureSystemCategories = async (base44, userEmail, categoriesList) => {
    const hasSystemCategories = categoriesList.some(c => c.is_system);

    if (!hasSystemCategories) {
        console.log('🌱 [SYNC] Seeding default system categories for user...');
        // Map through defaults and assign ownership to the user so RLS allows them to see it
        const promises = DEFAULT_SYSTEM_CATEGORIES.map(cat => base44.entities.Category.create({ ...cat, user_email: userEmail }));
        const newCats = await Promise.all(promises);
        categoriesList.push(...newCats);
    }
};

// --- SERVER-SIDE CATEGORIZATION & BUDGET LOGIC ---
const HARDCODED_KEYWORDS = {
    'AMAZON': { name: 'Shopping', priority: 'wants' },
    'UBER': { name: 'Transport', priority: 'needs' },
    'LYFT': { name: 'Transport', priority: 'needs' },
    'NETFLIX': { name: 'Subscriptions', priority: 'wants' },
    'SPOTIFY': { name: 'Subscriptions', priority: 'wants' },
    'APPLE': { name: 'Subscriptions', priority: 'wants' },
    'STARBUCKS': { name: 'Dining Out', priority: 'wants' },
    'MCDONALD': { name: 'Dining Out', priority: 'wants' },
    'BURGER KING': { name: 'Dining Out', priority: 'wants' },
    'WALMART': { name: 'Groceries', priority: 'needs' },
    'KROGER': { name: 'Groceries', priority: 'needs' },
    'WHOLE FOODS': { name: 'Groceries', priority: 'needs' },
    'SHELL': { name: 'Transport', priority: 'needs' },
    'BP': { name: 'Transport', priority: 'needs' },
    'EXXON': { name: 'Transport', priority: 'needs' },
    'CHEVRON': { name: 'Transport', priority: 'needs' },
    'AIRBNB': { name: 'Hotels', priority: 'wants' },
    'HOTEL': { name: 'Hotels', priority: 'wants' },
    'AIRLINES': { name: 'Flights', priority: 'wants' },
};

const FALLBACK_REGEX = [
    { pattern: /(POWER|GAS|ELECTRIC|ENERGIA|NUFRI)/i, category: 'Electricity', priority: 'needs' },
    { pattern: /(VUELING|RYANAIR|EASYJET|WIZZAIR|ELAL|FINNAIR)/i, category: 'Flights', priority: 'wants' },
    { pattern: /(BARKCELONA)/i, category: 'Pets', priority: 'needs' },
    { pattern: /(INTERMON)/i, category: 'Charity', priority: 'wants' },
    { pattern: /(MOBILITAT|BEENETWORK|BEE NETWORK|BEE|TRANSPORTE)/i, category: 'Transport', priority: 'needs' },
    { pattern: /(LA SIRENA|Mcdonalds)/i, category: 'Dining Out', priority: 'wants' },
    { pattern: /(STEAM|STEAMGAMES)/i, category: 'Games', priority: 'wants' },
    { pattern: /(CAPRABO)/i, category: 'Groceries', priority: 'needs' },
    { pattern: /(MERCADONA|Tesco)/i, category: 'Groceries', priority: 'needs' },
    { pattern: /(IMPULS|ADMINISTRACION)/i, category: 'Rent', priority: 'needs' },
    { pattern: /(AIGUES|WATER)/i, category: 'Water', priority: 'needs' },
    { pattern: /(INTERNET|WIFI|CABLE|COMCAST|AT&T|VERIZON|T-MOBILE|ORANGE|FINETWORK)/i, category: 'Connectivity', priority: 'needs' },
    { pattern: /(HOSTEL|HOSTELS|HOTEL|HOTELS|HOSTELWORLD|TOC|UNITE)/i, category: 'Hotels', priority: 'wants' },
    { pattern: /(HOSPITAL|DOCTOR|CLINIC|DENTIST|PHARMACY|CVS|WALGREENS|PERRUQUERS)/i, category: 'Health', priority: 'needs' }
];

const getOrCreateCategory = async (base44, userEmail, categoryName, priority, categoriesList) => {
    let cat = categoriesList.find(c => c.name.toUpperCase() === categoryName.toUpperCase());
    if (!cat) {
        console.log(`[SYNC] Creating missing category: ${categoryName}`);
        cat = await base44.entities.Category.create({
            name: categoryName,
            priority: priority || 'wants',
            user_email: userEmail
        });
        categoriesList.push(cat); // Add to memory so we don't recreate it in the next loop
    }
    return cat;
};

const categorizeTransaction = async (base44, userEmail, searchString, userRules, categoriesList) => {
    // 1. User Rules (Highest Priority)
    for (const rule of userRules) {
        let matched = false;
        if (rule.regexPattern) {
            try { if (new RegExp(rule.regexPattern, 'i').test(searchString)) matched = true; } catch (e) { }
        } else if (rule.keyword && searchString.includes(rule.keyword.toUpperCase())) {
            matched = true;
        }
        if (matched && rule.categoryId) {
            const cat = categoriesList.find(c => c.id === rule.categoryId);
            if (cat) return { categoryId: cat.id, categoryName: cat.name, priority: cat.priority || 'wants', needsReview: false };
        }
    }

    // 2. Hardcoded Keywords
    for (const [keyword, data] of Object.entries(HARDCODED_KEYWORDS)) {
        if (searchString.includes(keyword)) {
            const cat = await getOrCreateCategory(base44, userEmail, data.name, data.priority, categoriesList);
            // Set needsReview: true because this is a guess, let the user confirm it in the Inbox
            return { categoryId: cat.id, categoryName: cat.name, priority: cat.priority, needsReview: true };
        }
    }

    // 3. Fallback Regex
    for (const { pattern, category, priority } of FALLBACK_REGEX) {
        if (pattern.test(searchString)) {
            const cat = await getOrCreateCategory(base44, userEmail, category, priority, categoriesList);
            return { categoryId: cat.id, categoryName: cat.name, priority: cat.priority, needsReview: true };
        }
    }

    // 4. Uncategorized (Total Failure to Match)
    return { categoryId: null, categoryName: 'Uncategorized', priority: 'wants', needsReview: true };
};

const getOrCreateBudget = async (base44, userEmail, txDate, priority) => {
    const date = new Date(txDate);
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const monthStart = `${y}-${m}-01`;

    const existing = await base44.entities.SystemBudget.filter({ user_email: userEmail, startDate: monthStart, systemBudgetType: priority });
    if (existing && existing.length > 0) return existing[0].id;

    // Create basic placeholder budget if none exists (Amount can be updated later by the UI)
    const newBudget = await base44.entities.SystemBudget.create({
        name: priority === 'needs' ? 'Needs' : 'Wants',
        budgetAmount: 0,
        startDate: monthStart,
        endDate: new Date(y, date.getMonth() + 1, 0).toISOString().split('T')[0],
        color: priority === 'needs' ? 'emerald' : 'amber',
        user_email: userEmail,
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
        const [categories, rules, existingTx] = await Promise.all([
            base44.entities.Category.list(),
            base44.entities.CategoryRule.list({ user_email: user.email }),
            base44.entities.Transaction.list()
        ]);
        const existingBankIds = new Set(existingTx.filter(t => t.bankTransactionId).map(t => t.bankTransactionId));
        const existingNormalisedIds = new Set(existingTx.filter(t => t.normalisedProviderTransactionId).map(t => t.normalisedProviderTransactionId));

        // --- SEED DEFAULTS BEFORE CATEGORIZING ---
        await ensureSystemCategories(base44, user.email, categories);

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

                const catResult = await categorizeTransaction(base44, user.email, searchString, rules, categories);
                const txDate = tx.timestamp.split('T')[0];
                const isExpense = tx.transaction_type !== 'CREDIT';

                const transformed = {
                    title: rawDescription,
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

        // --- ASSIGN BUDGETS & BULK CREATE ---
        console.log('💾 [SYNC] Resolving budgets and saving to database...');
        const budgetCache = {};
        for (const tx of allTransactions) {
            if (tx.type === 'expense') {
                const cacheKey = `${tx.date}|${tx.financial_priority}`;
                if (!budgetCache[cacheKey]) {
                    budgetCache[cacheKey] = await getOrCreateBudget(base44, user.email, tx.date, tx.financial_priority);
                }
                tx.budgetId = budgetCache[cacheKey];
            }
        }

        let importedCount = 0;
        if (allTransactions.length > 0) {
            await base44.entities.Transaction.bulkCreate(allTransactions);
            importedCount = allTransactions.length;
            console.log(`✅ [SYNC] Successfully imported ${importedCount} transactions to DB`);
        }

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