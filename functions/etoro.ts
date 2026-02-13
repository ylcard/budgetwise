Deno.serve(async (req) => {
  const url = new URL(req.url);

  // 1. CONFIG: Headers & Helpers (Must be defined first to avoid ReferenceError)
  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type, Authorization, Ocp-Apim-Subscription-Key",
    "Content-Type": "application/json",
  };

  const getAuthToken = async () => {
    const clientId = Deno.env.get("ETORO_CLIENT_ID");
    const userKey = Deno.env.get("ETORO_USER_KEY");

    if (!clientId || !userKey) throw new Error("Missing Secrets");

    const authString = btoa(`${clientId}:${userKey}`);
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

    if (!response.ok) throw new Error("Failed to get token");
    return await response.json();
  };

  // 2. ROUTE: Preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // 3. ROUTE: Auth
  if (url.pathname.endsWith("/auth")) {
    try {
      const data = await getAuthToken();

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

  // 4. ROUTE: Portfolio
  if (url.pathname.endsWith("/portfolio")) {
    try {
      const tokenData = await getAuthToken();
      const username = Deno.env.get("ETORO_USERNAME");
      const userKey = Deno.env.get("ETORO_USER_KEY");

      if (!username) throw new Error("Missing ETORO_USERNAME secret");

      // Corrected URL per your documentation link:
      // https://api-portal.etoro.com/api-reference/users-info/get-the-live-portfolio-of-a-user
      const portfolioUrl = `https://api.etoro.com/v1/users/${username}/portfolio?view=Full`;

      const response = await fetch(portfolioUrl, {
        headers: {
          "Authorization": `Bearer ${tokenData.access_token}`,
          "Content-Type": "application/json",
          "Ocp-Apim-Subscription-Key": userKey || ""
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

  return new Response("Not Found", { status: 404 });
});
