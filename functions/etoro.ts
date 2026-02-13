Deno.serve(async (req) => {
  const url = new URL(req.url);

  // 1. CONFIG: CORS Headers (For the browser)
  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type, Authorization, Ocp-Apim-Subscription-Key, x-api-key, x-user-key, x-request-id",
    "Content-Type": "application/json",
  };

  // 2. ROUTE: Preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // 3. ROUTE: Portfolio (Public API)
  // Changed from URL path check to Query Param check to avoid "Function not found" errors
  const route = url.searchParams.get("route");

  if (route === "portfolio") {
    try {
      const username = Deno.env.get("ETORO_USERNAME");
      // Assuming ETORO_CLIENT_ID is your x-api-key
      const apiKey = Deno.env.get("ETORO_CLIENT_ID");
      const userKey = Deno.env.get("ETORO_USER_KEY");

      if (!username || !apiKey || !userKey) throw new Error("Missing Secrets (Username, ClientID/APIKey, or UserKey)");

      // Documentation URL: https://public-api.etoro.com/api/v1/user-info/people/{username}/portfolio/live
      const portfolioUrl = `https://public-api.etoro.com/api/v1/user-info/people/${username}/portfolio/live`;

      // Generate a random Request ID (UUID v4 style)
      const requestId = crypto.randomUUID();

      const response = await fetch(portfolioUrl, {
        method: 'GET',
        headers: {
          "x-api-key": apiKey,
          "x-user-key": userKey,
          "x-request-id": requestId,
          "Content-Type": "application/json",
          // CRITICAL: Spoof browser here in the FETCH call, not just in corsHeaders
          "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
          "Referer": "https://www.etoro.com/",
          "Origin": "https://www.etoro.com",
          "Accept": "application/json"
        }
      });

      if (!response.ok) {
        const errText = await response.text();
        throw new Error(`eToro Public API Error: ${response.status} - ${errText}`);
      }

      const portfolioData = await response.json();
      return new Response(JSON.stringify(portfolioData), { headers: corsHeaders });
    } catch (error) {
      console.error(error);
      return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: corsHeaders });
    }
  }

  return new Response("Not Found", { status: 404 });
});
