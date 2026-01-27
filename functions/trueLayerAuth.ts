import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

/**
 * TrueLayer Auth Handler
 * CREATED: 26-Jan-2026
 * 
 * Handles TrueLayer OAuth flow:
 * - Generate auth links
 * - Exchange code for access token
 * - Fetch available providers
 */

// CONFIGURATION: Production Mode
const AUTH_URL = "https://auth.truelayer.com";
const API_URL = "https://api.truelayer.com";

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        // const user = await base44.auth.me();

        // if (!user) {
        //     return Response.json({ error: 'Unauthorized' }, { status: 401 });
        // }

        // Debugging: Log the incoming request method
        console.log(`Received request: ${req.method}`);

        // 1. Authenticate User
        const user = await base44.auth.me();
        if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

        const { action, ...params } = await req.json();
        console.log(`Action received: "${action}"`); // DEBUG LOG

        const clientId = Deno.env.get("TRUELAYER_CLIENT_ID");
        const clientSecret = Deno.env.get("TRUELAYER_CLIENT_SECRET");

        if (!clientId || !clientSecret) {
            return Response.json({
                error: 'TrueLayer credentials not configured'
            }, { status: 500 });
        }

        // Generate auth link
        // MODIFIED: 26-Jan-2026 - Use providers parameter to show all UK banks in auth dialog
        if (action === 'generateAuthLink') {
            const { redirectUrl, state, providerId } = params;

            // Use core scopes for better compatibility during testing
            const scopes = 'info accounts balance cards transactions direct_debits standing_orders offline_access';
            
            const authParams = new URLSearchParams({
                response_type: 'code',
                client_id: clientId,
                scope: scopes,
                redirect_uri: redirectUrl,
                state: state,
                // We include UK and ES (Spain) providers here
                providers: 'uk-ob-all uk-oauth-all es-ob-all es-xs2a-all'
            });

            if (providerId) {
                authParams.set('provider_id', providerId);
            }

            const authUrl = `${AUTH_URL}/?${authParams.toString()}`;
            
            return Response.json({ authUrl });
        }

        // Exchange code for access token
        if (action === 'exchangeCode') {
            const { code, redirectUrl } = params;

            const response = await fetch(`${AUTH_URL}/connect/token`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                },
                body: new URLSearchParams({
                    grant_type: 'authorization_code',
                    client_id: clientId,
                    client_secret: clientSecret,
                    redirect_uri: redirectUrl,
                    code: code,
                }),
            });

            if (!response.ok) {
                const error = await response.text();
                throw new Error(`Failed to exchange code: ${error}`);
            }

            const tokens = await response.json();
            return Response.json({ tokens });
        }

        // Refresh access token
        if (action === 'refreshToken') {
            const { refreshToken } = params;

            const response = await fetch(`${AUTH_URL}/connect/token`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                },
                body: new URLSearchParams({
                    grant_type: 'refresh_token',
                    client_id: clientId,
                    client_secret: clientSecret,
                    refresh_token: refreshToken,
                }),
            });

            if (!response.ok) {
                const error = await response.text();
                throw new Error(`Failed to refresh token: ${error}`);
            }

            const tokens = await response.json();
            return Response.json({ tokens });
        }

        // NEW: Required to link the bank connection to specific accounts
        if (action === 'getAccounts') {
            const { accessToken } = params;

            const response = await fetch(`${API_URL}/data/v1/accounts`, {
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                    'Accept': 'application/json',
                }
            });

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`Failed to fetch accounts: ${response.status} ${errorText}`);
            }
            const data = await response.json();
            return Response.json({ results: data.results });
        }

        return Response.json({ error: 'Invalid action' }, { status: 400 });

    } catch (error) {
        console.error('TrueLayer Auth Error:', error);
        return Response.json({
            error: error.message,
            details: error.toString()
        }, { status: 500 });
    }
});