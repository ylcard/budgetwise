import { createClientFromRequest } from 'npm:@base44/sdk@0.8.18';

/**
 * CategorizationEngine.ts
 * REFACTORED: Standalone Deno Edge Function
 * * Input (POST Body): { transactions: [], rules: [], categories: [] }
 * Output: Array of processed transactions with 'cleanTitle' and 'category_id'
 */

// --- CONSTANTS ---
const STANDARD_TAXONOMY = {
    'SHOPPING': ['AMAZON', 'WALMART', 'RETAIL', 'EBAY', 'ALIEXPRESS'],
    'TRANSPORT': ['UBER', 'LYFT', 'SHELL', 'BP', 'EXXON', 'CHEVRON', 'TRANSPORT', 'BOLT', 'RENFE', 'FGC', 'MOBILITAT'],
    'SUBSCRIPTIONS': ['NETFLIX', 'SPOTIFY', 'APPLE', 'DISNEY', 'HBO', 'ADOBE'],
    'DINING': ['STARBUCKS', 'MCDONALD', 'BURGER KING', 'RESTAURANT', 'TACO BELL', 'KFC', 'LA SIRENA'],
    'GROCERIES': ['KROGER', 'WHOLE FOODS', 'MERCADONA', 'TESCO', 'ALDI', 'LIDL', 'CARREFOUR', 'CAPRABO', 'EROSKI', 'LLOBET'],
    'TRAVEL': ['AIRBNB', 'HOTEL', 'AIRLINES', 'BOOKING.COM', 'EXPEDIA', 'VUELING', 'RYANAIR', 'EASYJET'],
    'UTILITIES': ['POWER', 'GAS', 'ELECTRIC', 'WATER', 'ENERGIA'],
    'CONNECTIVITY': ['INTERNET', 'WIFI', 'MOBILE', 'ORANGE', 'VODAFONE', 'AT&T', 'VERIZON', 'FINETWORK'],
    'PETS': ['BARKCELONA', 'ANIMALESA', 'VET', 'PETCO'],
    'CHARITY': ['INTERMON', 'OXFAM', 'UNICEF', 'NGO'],
    'GAMES': ['STEAM', 'STEAMGAMES', 'BLIZZARD', 'PLAYSTATION', 'EPIC'],
    'RENT': ['IMPULS', 'ADMINISTRACION', 'LLOGUER', 'RENT'],
    'HEALTH': ['HOSPITAL', 'DOCTOR', 'CLINIC', 'DENTIST', 'PHARMACY', 'FARMACIA']
};

const FALLBACK_REGEX = [
    { pattern: /(POWER|GAS|ELECTRIC|ENERGIA|NUFRI)/i, slug: 'UTILITIES' },
    { pattern: /(VUELING|RYANAIR|EASYJET|WIZZAIR|ELAL|FINNAIR)/i, slug: 'TRAVEL' },
    { pattern: /(BARKCELONA|ANIMALESA)/i, slug: 'PETS' },
    { pattern: /(INTERMON|OXFAM)/i, slug: 'CHARITY' },
    { pattern: /(MOBILITAT|BEENETWORK|BEE NETWORK|BEE|TRANSPORTE|RENFE|FGC)/i, slug: 'TRANSPORT' },
    { pattern: /(LA SIRENA|MCDONALDS|BURGER KING)/i, slug: 'DINING' },
    { pattern: /(STEAM|STEAMGAMES|BLIZZARD|PLAYSTATION|PLAYSTATIONNETWORK|EPIC GAMES|EPICGAMES|RAIDBOTS)/i, slug: 'GAMES' },
    { pattern: /(CAPRABO|ALDI|CARREFOUR|LLOBET|LLOVI|SUKHA|EROSKI|MERCADONA|Tesco|LIDL|EDEKA)/i, slug: 'GROCERIES' },
    { pattern: /(IMPULS|ADMINISTRACION|LLOGUER)/i, slug: 'RENT' },
    { pattern: /(AIGUES|WATER)/i, slug: 'UTILITIES' },
    { pattern: /(INTERNET|WIFI|CABLE|COMCAST|AT&T|VERIZON|T-MOBILE|ORANGE|FINETWORK)/i, slug: 'CONNECTIVITY' },
    { pattern: /(HOSTEL|HOSTELS|HOTEL|HOTELS|HOSTELWORLD|TOC|UNITE|BOOKING|BOOKING.COM)/i, slug: 'TRAVEL' },
    { pattern: /(HOSPITAL|DOCTOR|CLINIC|DENTIST|PHARMACY|CVS|WALGREENS|PERRUQUERS|NADEU|FARMACIA)/i, slug: 'HEALTH' },
];

// --- HELPER FUNCTIONS ---

function buildMemoryMap(historicalTransactions) {
    const memory = new Map();

    // Sort by date ascending, so the LATEST transaction overwrites the key
    // This ensures we learn the user's most recent correction
    const sorted = historicalTransactions.sort((a, b) =>
        new Date(a.date).getTime() - new Date(b.date).getTime()
    );

    for (const tx of sorted) {
        if (!tx.rawDescription) continue;
        const key = tx.rawDescription.trim().toUpperCase();

        // Only learn if there is a valid category assigned
        if (tx.category_id) {
            memory.set(key, { ...tx });
        }
    }
    return memory;
}

function matchLocally(tx, rules, categories) {
    const text = (tx.title || tx.description || '').toUpperCase();

    // 1. User Rules
    for (const rule of rules) {
        if (rule.regexPattern) {
            try {
                if (new RegExp(rule.regexPattern, 'i').test(text)) {
                    return { category_id: rule.categoryId, source: 'user_rule' };
                }
            } catch (e) { /* ignore */ }
        }
        if (rule.keyword && text.includes(rule.keyword.toUpperCase())) {
            return { category_id: rule.categoryId, source: 'user_rule' };
        }
    }

    // 2. Standardized Taxonomy
    for (const [slug, keywords] of Object.entries(STANDARD_TAXONOMY)) {
        if (keywords.some(kw => text.includes(kw))) {
            return { slug, source: 'standard_taxonomy' };
        }
    }

    // 3. Fallback Regex
    for (const entry of FALLBACK_REGEX) {
        if (entry.pattern.test(text)) {
            return { slug: entry.slug, source: 'regex_fallback' };
        }
    }

    return null;
}

function resolveSlugToId(slug, categories) {
    const keywords = STANDARD_TAXONOMY[slug] || [slug];

    // 1. Exact match
    const exact = categories.find(c => c.name.toUpperCase() === slug);
    if (exact) return exact;

    // 2. Inclusion match
    const matched = categories.find(c => {
        const name = c.name.toUpperCase();
        return keywords.some(kw => name.includes(kw.toUpperCase()) || kw.toUpperCase().includes(name));
    });

    return matched || null;
}

async function matchWithAI(descriptions, categories, groqKey, model = 'llama-3.1-8b-instant') {
    if (!groqKey || descriptions.length === 0) return {};

    // Provide default options if user has no categories (for AI prompt only)
    let catNames = categories.map(c => c.name);
    if (catNames.length === 0) {
        catNames = ['Groceries', 'Dining', 'Transport', 'Utilities', 'Shopping', 'Housing', 'Travel', 'Health', 'Services', 'Entertainment'];
    }

    // Updated Prompt: Asks for Clean Name + Category
    const prompt = `Act as a financial data cleaner.
    For each transaction description below, provide:
    1. A 'cleanName' (e.g., "SQ *MY COFFEE" -> "My Coffee").
    2. A 'category' from this list: [${catNames.join(', ')}].
    3. A 'confidence' score between 0.0 and 1.0.

    Return ONLY a JSON object where the key is the ORIGINAL string and the value is object { "cleanName": "...", "category": "...", "confidence": 0.5 }.
    If you are truly unsure, use "Uncategorized".
    
    Merchants to categorize: ${descriptions.join(', ')}`;

    try {
        const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${groqKey}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: model,
                messages: [{ role: 'user', content: prompt }],
                response_format: { type: "json_object" },
                temperature: 0.1
            })
        });

        const data = await response.json();
        return JSON.parse(data.choices[0].message.content);
    } catch (err) {
        console.error('AI Categorization Error:', err);
        return {};
    }
}

// --- MAIN SERVER ENTRYPOINT ---

Deno.serve(async (req) => {
    // Basic CORS handling
    if (req.method === "OPTIONS") {
        return new Response("ok", {
            headers: {
                "Access-Control-Allow-Origin": "*",
                "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
            }
        });
    }

    try {
        const base44 = createClientFromRequest(req);
        const { transactions, rules, categories } = await req.json();
        const groqKey = Deno.env.get('GROQ_API_KEY');

        if (!transactions || !Array.isArray(transactions)) {
            return Response.json({ error: "Invalid input: 'transactions' array required" }, { status: 400 });
        }

        // 1. FETCH MEMORY (The Learning Step)
        // Fetch lightweight history to build the memory map
        const existingTx = await base44.entities.Transaction.list({
            select: ['rawDescription', 'title', 'category_id', 'financial_priority', 'date']
        });
        const memory = buildMemoryMap(existingTx || []);

        const results = [];
        const toAI = [];

        // 2. PIPELINE: MEMORY -> RULES -> AI
        for (const tx of transactions) {
            const rawKey = (tx.rawDescription || tx.title || '').trim().toUpperCase();

            // A. MEMORY CHECK (Instant Learning)
            if (memory.has(rawKey)) {
                const learned = memory.get(rawKey);
                const catObj = categories.find(c => c.id === learned.category_id);

                results.push({
                    ...tx,
                    title: learned.title, // User's preferred title
                    cleanDescription: learned.title,
                    category_id: learned.category_id,
                    categoryName: catObj ? catObj.name : 'Uncategorized',
                    financial_priority: learned.financial_priority || (catObj?.priority || 'wants'),
                    source: 'memory',
                    confidence: 1.0,
                    needsReview: false
                });
                continue;
            }

            // B. LOCAL RULES
            const local = matchLocally(tx, rules || [], categories || []);

            if (local && local.category_id) {
                // Local rule matched
                results.push({ ...tx, ...local, cleanDescription: tx.title, source: 'user_rule', confidence: 1.0 });
            } else if (local && local.slug) {
                // Taxonomy/Regex matched
                const resolved = resolveSlugToId(local.slug, categories || []);
                const cleanName = resolved?.name || local.slug;
                results.push({
                    ...tx,
                    category_id: resolved?.id || null,
                    categoryName: resolved?.name || 'Uncategorized',
                    title: cleanName,
                    cleanDescription: cleanName,
                    source: local.source,
                    confidence: 0.8
                });
            } else {
                // C. AI BUCKET
                toAI.push(tx);
            }
        }

        // 3. Process AI Matches Batch
        if (toAI.length > 0) {
            // TIER 1: Fast Pass (8b model)
            // Use rawDescription for the prompt if available, as it contains more context
            const descriptions = toAI.map(t => t.rawDescription || t.title);
            let aiMappings = await matchWithAI(descriptions, categories || [], groqKey, 'llama-3.1-8b-instant');

            // TIER 2: Peer Review (70b model for low confidence)
            const lowConfidenceItems = [];
            for (const key in aiMappings) {
                if (aiMappings[key].confidence < 0.8) {
                    lowConfidenceItems.push(key);
                }
            }

            if (lowConfidenceItems.length > 0) {
                // Re-run only the tricky ones with the "Smart" model
                const refinedMappings = await matchWithAI(lowConfidenceItems, categories || [], groqKey, 'llama-3.3-70b-versatile');
                // Merge results (overwrite weak ones with smart ones)
                aiMappings = { ...aiMappings, ...refinedMappings };
            }

            for (const tx of toAI) {
                // Ensure we use the exact same logic as the .map() above to find the key
                const lookupKey = tx.rawDescription || tx.title;
                const aiResult = aiMappings[lookupKey] || { category: 'Uncategorized', cleanName: tx.title, confidence: 0 };

                // Handle legacy/hallucinated string responses
                const aiCatName = typeof aiResult === 'string' ? aiResult : aiResult.category;
                const cleanName = typeof aiResult === 'string' ? tx.title : aiResult.cleanName;
                const confidence = typeof aiResult === 'string' ? 0 : aiResult.confidence;

                const cat = categories.find(c => c.name.toLowerCase() === aiCatName.toLowerCase());

                results.push({
                    ...tx,
                    category_id: cat?.id || null,
                    categoryName: cat?.name || aiCatName || 'Uncategorized',
                    title: cleanName, // AI suggested name
                    cleanDescription: cleanName, // Permanent clean record
                    confidence: confidence,
                    source: 'ai'
                });
            }
        }

        return Response.json(results, {
            headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" }
        });

    } catch (error) {
        return Response.json({ error: error.message }, { status: 500, headers: { "Access-Control-Allow-Origin": "*" } });
    }
});