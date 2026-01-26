import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import * as jose from 'npm:jose@5.2.0';

/**
 * Enable Banking - JWT Authentication & Authorization Flow
 * CREATED: 26-Jan-2026
 * 
 * Handles:
 * 1. JWT token generation for API authentication
 * 2. Starting user authorization flow (OAuth)
 * 3. Creating session after user authorization
 */

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();

        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { action, ...params } = await req.json();

        const appId = Deno.env.get("ENABLE_BANKING_APP_ID");
        const privateKeyPem = Deno.env.get("ENABLE_BANKING_PRIVATE_KEY");
        const environment = Deno.env.get("ENABLE_BANKING_ENVIRONMENT") || "SANDBOX";

        if (!appId || !privateKeyPem) {
            return Response.json({ 
                error: 'Enable Banking credentials not configured',
                details: 'Please set ENABLE_BANKING_APP_ID and ENABLE_BANKING_PRIVATE_KEY'
            }, { status: 500 });
        }

        const baseUrl = environment === "PRODUCTION" 
            ? "https://api.enablebanking.com"
            : "https://api.enablebanking.com"; // Both use same URL, environment set in app registration

        // Generate JWT token for API authentication
        const generateJWT = async () => {
            const privateKey = await jose.importPKCS8(privateKeyPem, 'RS256');
            
            const jwt = await new jose.SignJWT({})
                .setProtectedHeader({ alg: 'RS256', kid: appId })
                .setIssuer(appId)
                .setIssuedAt()
                .setExpirationTime('5m')
                .sign(privateKey);

            return jwt;
        };

        const makeAuthenticatedRequest = async (endpoint, options = {}) => {
            const jwt = await generateJWT();
            const response = await fetch(`${baseUrl}${endpoint}`, {
                ...options,
                headers: {
                    'Authorization': `Bearer ${jwt}`,
                    'Content-Type': 'application/json',
                    ...options.headers,
                }
            });

            if (!response.ok) {
                const error = await response.text();
                throw new Error(`Enable Banking API error: ${error}`);
            }

            return await response.json();
        };

        // Route actions
        switch (action) {
            case 'getASPSPs': {
                // Get list of available banks
                const { country } = params;
                const endpoint = country ? `/aspsps?country=${country}` : '/aspsps';
                const aspsps = await makeAuthenticatedRequest(endpoint);
                return Response.json({ aspsps });
            }

            case 'startAuth': {
                // Start authorization flow
                const { aspsp, redirectUrl, state } = params;
                
                const authData = await makeAuthenticatedRequest('/auth', {
                    method: 'POST',
                    body: JSON.stringify({
                        access: {
                            valid_until: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString(), // 90 days
                            max_history: 730, // 2 years of history
                        },
                        aspsp: aspsp,
                        state: state,
                        redirect_url: redirectUrl,
                        psu_type: 'personal',
                    })
                });

                return Response.json({ redirectUrl: authData.url });
            }

            case 'createSession': {
                // Create session after user authorization
                const { code } = params;
                
                const sessionData = await makeAuthenticatedRequest('/sessions', {
                    method: 'POST',
                    body: JSON.stringify({ code })
                });

                return Response.json({ session: sessionData });
            }

            default:
                return Response.json({ error: 'Invalid action' }, { status: 400 });
        }

    } catch (error) {
        console.error('Enable Banking Auth Error:', error);
        return Response.json({ 
            error: error.message,
            details: error.toString()
        }, { status: 500 });
    }
});