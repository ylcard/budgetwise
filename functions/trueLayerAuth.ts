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

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();

        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { action, ...params } = await req.json();

        const clientId = Deno.env.get("TRUELAYER_CLIENT_ID");
        const clientSecret = Deno.env.get("TRUELAYER_CLIENT_SECRET");

        if (!clientId || !clientSecret) {
            return Response.json({ 
                error: 'TrueLayer credentials not configured'
            }, { status: 500 });
        }

        // Generate auth link
        if (action === 'generateAuthLink') {
            const { redirectUrl, state, providerId } = params;
            
            const scopes = [
                'info',
                'accounts',
                'balance',
                'transactions',
                'offline_access'
            ].join('%20');

            let authUrl = `https://auth.truelayer.com/?` +
                `response_type=code` +
                `&client_id=${clientId}` +
                `&redirect_uri=${encodeURIComponent(redirectUrl)}` +
                `&scope=${scopes}` +
                `&state=${state}`;

            if (providerId) {
                authUrl += `&provider_id=${providerId}&providers=uk-ob-all`;
            } else {
                authUrl += `&providers=uk-ob-all`;
            }

            return Response.json({ authUrl });
        }

        // Exchange code for access token
        if (action === 'exchangeCode') {
            const { code, redirectUrl } = params;

            const response = await fetch('https://auth.truelayer.com/connect/token', {
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

            const response = await fetch('https://auth.truelayer.com/connect/token', {
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

        // COMMENTED OUT: 26-Jan-2026 - TrueLayer doesn't provide public API to list providers
        // The auth dialog shows available banks after clicking auth link
        // if (action === 'getProviders') {
        //     const response = await fetch('https://api.truelayer.com/providers', {
        //         headers: {
        //             'Accept': 'application/json',
        //         },
        //     });
        //     if (!response.ok) {
        //         const errorText = await response.text();
        //         throw new Error(`Failed to fetch providers: ${response.status} ${errorText}`);
        //     }
        //     const data = await response.json();
        //     return Response.json({ providers: data });
        // }

        return Response.json({ error: 'Invalid action' }, { status: 400 });

    } catch (error) {
        console.error('TrueLayer Auth Error:', error);
        return Response.json({ 
            error: error.message,
            details: error.toString()
        }, { status: 500 });
    }
});