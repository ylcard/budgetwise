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

  // 2. The Auth Route
  if (url.pathname === "/api/etoro-auth") {
    try {
      // A. Retrieve Secrets from Environment Variables
      const clientId = Deno.env.get("ETORO_CLIENT_ID");
      const userKey = Deno.env.get("ETORO_USER_KEY");

      if (!clientId || !userKey) {
        throw new Error("Missing Server-Side Secrets");
      }

      // B. Create the Base64 Auth String (The "Basic Auth" header)
      // Logic: "Basic " + base64(clientId:userKey)
      const authString = btoa(`${clientId}:${userKey}`);

      // C. Call eToro's Token Endpoint
      // CRITICAL: Check your "Authentication" doc for the exact URL. 
      // It is usually one of these two structures:
      const etoroAuthUrl = "https://api.etoro.com/oauth/token"; 
      
      const response = await fetch(etoroAuthUrl, {
        method: "POST",
        headers: {
          "Authorization": `Basic ${authString}`,
          "Content-Type": "application/x-www-form-urlencoded", // Common for OAuth
          // If eToro requires an APIM key (Azure), add it here:
          // "Ocp-Apim-Subscription-Key": Deno.env.get("ETORO_APIM_KEY") 
        },
        body: new URLSearchParams({
          grant_type: "client_credentials",
          scope: "trade" // Adjust scope based on your needs
        }),
      });

      const data = await response.json();

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

  return new Response("Not Found", { status: 404 });
});
