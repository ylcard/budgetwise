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

    console.log(`[Etoro Auth] Attempting login with client: ${clientId?.substring(0, 4)}...`);
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
        scope: "userinfo portfolio trade"
      }),
    });

    console.log(`[Etoro Auth] Status: ${response.status}`);
    if (!response.ok) throw new Error("Failed to get token");
    return await response.json();
  };

  // 2. The Auth Route
  if (url.pathname.endsWith("/auth")) {
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
  if (url.pathname.endsWith("/portfolio")) {
    try {
      const tokenData = await getAuthToken();
      const username = Deno.env.get("ETORO_USERNAME");
      const userKey = Deno.env.get("ETORO_USER_KEY");

      // CRITICAL: Check the docs for the exact path. 
      // It usually requires a 'demo' or 'real' switch, or a specific version.
      // Example: https://api-portal.etoro.com/api/v1/users/me/portfolio
      if (!username) throw new Error("Missing ETORO_USERNAME secret");

      // Use the actual username instead of 'me'
      // const portfolioUrl = `https://api-portal.etoro.com/api/v1/users/${username}/portfolio`;
      // Use /v1/ for stable user info; check if you're using 'real' or 'demo'
      // Real path: https://api.etoro.com/trading/real/v1/portfolio
      const portfolioUrl = `https://api.etoro.com/trading/real/v1/portfolio`;
      console.log(`[Etoro Portfolio] Fetching: ${portfolioUrl}`);

      const response = await fetch(portfolioUrl, {
        headers: {
          "Authorization": `Bearer ${tokenData.access_token}`,
          "Content-Type": "application/json",
          "Ocp-Apim-Subscription-Key": userKey || ""
        }
      });

      const data = await response.json(); 1
      console.log(`[Etoro Portfolio] Found ${data?.Positions?.length || 0} positions.`);
      return new Response(JSON.stringify(data), { headers: corsHeaders });
    } catch (error) {
      console.error(`[Etoro Portfolio Error]`, error.message);
      return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: corsHeaders });
    }
  }

  return new Response("Not Found", { status: 404 });
});
