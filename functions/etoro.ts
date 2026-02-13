Deno.serve(async (req) => {
    const url = new URL(req.url);

    // 1. CONFIG: CORS Headers
    const corsHeaders = {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "Content-Type, Authorization, Ocp-Apim-Subscription-Key, x-api-key, x-user-key, x-request-id",
        "Content-Type": "application/json",
    };

    // 2. ROUTE: Preflight
    if (req.method === "OPTIONS") {
        return new Response(null, { headers: corsHeaders });
    }

    // 3. ROUTE: Portfolio (Standard API)
    const route = url.searchParams.get("route");

    if (route === "portfolio") {
        try {
            const username = Deno.env.get("ETORO_USERNAME");
            const apiKey = Deno.env.get("ETORO_CLIENT_ID");
            const userKey = Deno.env.get("ETORO_USER_KEY");

            if (!username || !apiKey || !userKey) {
                throw new Error("Missing Secrets: ETORO_USERNAME, ETORO_CLIENT_ID, or ETORO_USER_KEY");
            }

            // Documentation URL: https://public-api.etoro.com/api/v1/trading/info/portfolio
            const portfolioUrl = `https://public-api.etoro.com/api/v1/trading/info/portfolio`;
            const requestId = crypto.randomUUID();

            const response = await fetch(portfolioUrl, {
                headers: {
                    "x-api-key": apiKey,
                    "x-user-key": userKey,
                    "x-request-id": requestId,
                    "Content-Type": "application/json"
                }
            });

            if (!response.ok) {
                const errText = await response.text();
                throw new Error(`eToro API Error: ${response.status} - ${errText}`);
            }

            const portfolioData = await response.json();
            return new Response(JSON.stringify(portfolioData), { headers: corsHeaders });
        } catch (error) {
            return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: corsHeaders });
        }
    }

    // 4. ROUTE: Market Rates
    if (route === "rates") {
        try {
            const apiKey = Deno.env.get("ETORO_CLIENT_ID");
            const userKey = Deno.env.get("ETORO_USER_KEY");
            const instrumentIds = url.searchParams.get("instrumentIds");

            if (!apiKey || !userKey || !instrumentIds) {
                throw new Error("Missing credentials or instrumentIds");
            }

            const ratesUrl = `https://public-api.etoro.com/api/v1/market-data/instruments/rates?instrumentIds=${instrumentIds}`;
            const requestId = crypto.randomUUID();

            const response = await fetch(ratesUrl, {
                headers: {
                    "x-api-key": apiKey,
                    "x-user-key": userKey,
                    "x-request-id": requestId,
                    "Content-Type": "application/json"
                }
            });

            if (!response.ok) {
                const errText = await response.text();
                throw new Error(`eToro Rates API Error: ${response.status} - ${errText}`);
            }

            const ratesData = await response.json();
            return new Response(JSON.stringify(ratesData), { headers: corsHeaders });
        } catch (error) {
            console.error(error);
            return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: corsHeaders });
        }
    }

    return new Response("Not Found", { status: 404 });
});
