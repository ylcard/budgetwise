/**
 * CategorizationEngine.ts
 * REFINED: 10-Feb-2026
 * * Backend-optimized (Deno) logic for transaction categorization.
 * * Designed to be stateless: data is passed in to avoid RLS/asServiceRole issues.
 */

export interface CategorizationTransaction {
    id: string;
    title: string;
    description?: string;
    category_id?: string | null;
}

export interface CategorizationCategory {
    id: string;
    name: string;
}

export interface CategorizationRule {
    keyword?: string;
    regexPattern?: string;
    categoryId: string;
}

/**
 * Standardized Taxonomy: Maps hardcoded keywords to generic Slugs.
 * This prevents crashes if a user doesn't have a specific category name.
 */
const STANDARD_TAXONOMY: Record<string, string[]> = {
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
    { pattern: /(CAPRABO|ALDI|CARREFOUR|LLOBET|LLOVI|SUKHA|EROSKI|MERCADONA|TESCO|LIDL|EDEKA)/i, slug: 'GROCERIES' },
    { pattern: /(IMPULS|ADMINISTRACION|LLOGUER)/i, slug: 'RENT' },
    { pattern: /(AIGUES|WATER)/i, slug: 'UTILITIES' },
    { pattern: /(INTERNET|WIFI|CABLE|COMCAST|AT&T|VERIZON|T-MOBILE|ORANGE|FINETWORK)/i, slug: 'CONNECTIVITY' },
    { pattern: /(HOSTEL|HOSTELS|HOTEL|HOTELS|HOSTELWORLD|TOC|UNITE|BOOKING|BOOKING.COM)/i, slug: 'TRAVEL' },
    { pattern: /(HOSPITAL|DOCTOR|CLINIC|DENTIST|PHARMACY|CVS|WALGREENS|PERRUQUERS|NADEU|FARMACIA)/i, slug: 'HEALTH' },
];

export class CategorizationEngine {
    private groqKey: string | undefined;

    constructor() {
        this.groqKey = Deno.env.get('GROQ_API_KEY');
    }

    /**
     * TIER 1 & 2: Local Matching
     */
    private matchLocally(
        tx: CategorizationTransaction, 
        rules: CategorizationRule[], 
        categories: CategorizationCategory[]
    ) {
        const text = (tx.title || tx.description || '').toUpperCase();

        // 1. User Rules
        for (const rule of rules) {
            if (rule.regexPattern) {
                try {
                    if (new RegExp(rule.regexPattern, 'i').test(text)) {
                        return { category_id: rule.categoryId, source: 'user_rule' };
                    }
                } catch { /* ignore invalid regex */ }
            }
            if (rule.keyword && text.includes(rule.keyword.toUpperCase())) {
                return { category_id: rule.categoryId, source: 'user_rule' };
            }
        }

        // 2. Standardized Taxonomy (Slug-based)
        for (const [slug, keywords] of Object.entries(STANDARD_TAXONOMY)) {
            if (keywords.some(kw => text.includes(kw))) {
                return { slug, source: 'standard_taxonomy' };
            }
        }
      
        // 3. Fallback Regex (Slug-based)
        for (const entry of FALLBACK_REGEX) {
            if (entry.pattern.test(text)) {
                return { slug: (entry as any).slug, source: 'regex_fallback' };
            }
        }

        return null;
    }

    /**
     * Resolves a Slug to a real User Category ID by checking names and taxonomy keywords.
     */
    private resolveSlugToId(slug: string, categories: CategorizationCategory[]): { id: string, name: string } | null {
        const keywords = STANDARD_TAXONOMY[slug] || [slug];
        
        // 1. Exact match on slug name
        const exact = categories.find(c => c.name.toUpperCase() === slug);
        if (exact) return exact;

        // 2. Inclusion match (does user category name contain any taxonomy keyword?)
        const matched = categories.find(c => {
            const name = c.name.toUpperCase();
            return keywords.some(kw => name.includes(kw.toUpperCase()) || kw.toUpperCase().includes(name));
        });

        return matched || null;
    }

    /**
     * TIER 3: AI Batch Processing
     */
    private async matchWithAI(
        descriptions: string[], 
        categories: CategorizationCategory[]
    ): Promise<Record<string, string>> {
        if (!this.groqKey || descriptions.length === 0) return {};

        const catNames = categories.map(c => c.name);
        const prompt = `Categorize these financial transactions into exactly one of these categories: [${catNames.join(', ')}].
        Return ONLY a JSON object where the key is the merchant name and the value is the category name. 
        If you are truly unsure, use "Uncategorized".
        
        Merchants to categorize: ${descriptions.join(', ')}`;

        try {
            const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${this.groqKey}`,
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

    /**
     * Master Entry Point
     */
    public async process(
        transactions: CategorizationTransaction[], 
        rules: CategorizationRule[], 
        categories: CategorizationCategory[]
    ) {
        const results: any[] = [];
        const toAI: CategorizationTransaction[] = [];

        for (const tx of transactions) {
            const local = this.matchLocally(tx, rules, categories);
            if (local && (local as any).category_id) {
                results.push({ ...tx, ...local });
            } else if (local && (local as any).slug) {
                const resolved = this.resolveSlugToId((local as any).slug, categories);
                results.push({ ...tx, category_id: resolved?.id || null, categoryName: resolved?.name || 'Uncategorized', source: local.source });
            } else {
                toAI.push(tx);
            }
        }

        if (toAI.length > 0) {
            const descriptions = toAI.map(t => t.title);
            const aiMappings = await this.matchWithAI(descriptions, categories);

            for (const tx of toAI) {
                const aiCatName = aiMappings[tx.title] || 'Uncategorized';
                const cat = categories.find(c => c.name.toLowerCase() === aiCatName.toLowerCase());
                
                results.push({
                    ...tx,
                    category_id: cat?.id || null,
                    categoryName: cat?.name || 'Uncategorized',
                    source: 'ai'
                });
            }
        }

        return results;
    }
}
