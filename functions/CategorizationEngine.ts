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

async function matchWithAI(descriptions, categories, groqKey) {
    if (!groqKey || descriptions.length === 0) return {};

    const catNames = categories.map(c => c.name);
    // Updated Prompt: Asks for Clean Name + Category
    const prompt = `Act as a financial data cleaner.
    For each transaction description below, provide:
    1. A 'cleanName' (e.g., "SQ *MY COFFEE" -> "My Coffee").
    2. A 'category' from this list: [${catNames.join(', ')}].

    Return ONLY a JSON object where the key is the ORIGINAL string and the value is object { "cleanName": "...", "category": "..." }.
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
                model: 'llama-3.3-70b-versatile',
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
        const { transactions, rules, categories } = await req.json();
        const groqKey = Deno.env.get('GROQ_API_KEY');

        if (!transactions || !Array.isArray(transactions)) {
            return Response.json({ error: "Invalid input: 'transactions' array required" }, { status: 400 });
        }

        const results = [];
        const toAI = [];

        // 1. Process Local Matches First
        for (const tx of transactions) {
            const local = matchLocally(tx, rules || [], categories || []);
            
            if (local && local.category_id) {
                // Local rule matched
                results.push({ ...tx, ...local, cleanTitle: tx.title });
            } else if (local && local.slug) {
                // Taxonomy/Regex matched
                const resolved = resolveSlugToId(local.slug, categories || []);
                results.push({ 
                    ...tx, 
                    category_id: resolved?.id || null, 
                    categoryName: resolved?.name || 'Uncategorized', 
                    cleanTitle: local.slug, // Use slug as clean title (e.g., "NETFLIX")
                    source: local.source 
                });
            } else {
                // No local match, send to AI
                toAI.push(tx);
            }
        }

        // 2. Process AI Matches Batch
        if (toAI.length > 0) {
            const descriptions = toAI.map(t => t.title);
            const aiMappings = await matchWithAI(descriptions, categories || [], groqKey);

            for (const tx of toAI) {
                const aiResult = aiMappings[tx.title] || { category: 'Uncategorized', cleanName: tx.title };
                
                // Handle legacy/hallucinated string responses
                const aiCatName = typeof aiResult === 'string' ? aiResult : aiResult.category;
                const cleanName = typeof aiResult === 'string' ? tx.title : aiResult.cleanName;

                const cat = categories.find(c => c.name.toLowerCase() === aiCatName.toLowerCase());
                
                results.push({
                    ...tx,
                    category_id: cat?.id || null,
                    categoryName: cat?.name || 'Uncategorized',
                    cleanTitle: cleanName,
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