Deno.serve(async (req) => {
    const url = new URL(req.url);

    // 1. Handle CORS (Allow your React app to talk to this backend)
    // Replace '*' with your specific React app URL in production for security
    const corsHeaders = {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "Content-Type, Authorization",
        "Content-Type": "application/json",
    };

    if (req.method === "OPTIONS") {
        return new Response(null, { headers: corsHeaders });
    }

    // Helper to get Token
    const getAuthToken = async () => {
        const clientId = Deno.env.get("ETORO_CLIENT_ID");
        const userKey = Deno.env.get("ETORO_USER_KEY");

        if (!clientId || !userKey) throw new Error("Missing Secrets");

        const authString = btoa(`${clientId}:${userKey}`);
        // CRITICAL: Verify this URL in your docs. It might be https://api.etoro.com/oauth/token
        const etoroAuthUrl = "https://api.etoro.com/oauth/token";

        const response = await fetch(etoroAuthUrl, {
            method: "POST",
            headers: {
                "Authorization": `Basic ${authString}`,
                "Content-Type": "application/x-www-form-urlencoded",
            },
            body: new URLSearchParams({
                grant_type: "client_credentials",
                scope: "trade" // check if 'portfolio' scope is needed
            }),
        });

        if (!response.ok) throw new Error("Failed to get token");
        return await response.json();
    };

    // 2. The Auth Route
    if (url.pathname === "/api/etoro-auth") {
        try {
            const data = await getAuthToken();

            // D. Return the Access Token to React
            return new Response(JSON.stringify(data), {
                headers: corsHeaders
            });

        } catch (error) {
            return new Response(JSON.stringify({ error: error.message }), {
                status: 500,
                headers: corsHeaders
            });
        }
    }

    // 3. The Portfolio Route (New)
    if (url.pathname === "/api/etoro-portfolio") {
        try {
            const tokenData = await getAuthToken();
            const accessToken = tokenData.access_token;

            // CRITICAL: Check the docs for the exact path. 
            // It usually requires a 'demo' or 'real' switch, or a specific version.
            // Example: https://api-portal.etoro.com/api/v1/users/me/portfolio
            // You might need to pass a username if 'me' isn't supported by client_credentials
            const portfolioUrl = "https://api-portal.etoro.com/api/v1/users/me/portfolio";

            const response = await fetch(portfolioUrl, {
                headers: {
                    "Authorization": `Bearer ${accessToken}`,
                    "Content-Type": "application/json",
                    // "Ocp-Apim-Subscription-Key": Deno.env.get("ETORO_USER_KEY") // Sometimes needed here too
                }
            });

            const data = await response.json();
            return new Response(JSON.stringify(data), { headers: corsHeaders });
        } catch (error) {
            return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: corsHeaders });
        }
    }

    return new Response("Not Found", { status: 404 });
});
