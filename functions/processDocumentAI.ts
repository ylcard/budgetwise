import { createClientFromRequest } from 'npm:@base44/sdk@0.8.18';
import { SignJWT, importPKCS8 } from 'npm:jose@5.2.0';

/**
 * Google Document AI Processor
 * CREATED: 12-Feb-2026
 * Description: Securely exchanges Service Account credentials for a Google Access Token
 * and processes documents via the REST API.
 */

// CONFIGURATION
const SCOPES = ['https://www.googleapis.com/auth/cloud-platform'];
const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token';

/**
 * Helper: Generate Google Access Token from Service Account JSON
 * This allows us to avoid hardcoding short-lived tokens.
 */
async function getGoogleAccessToken(serviceAccountJson) {
    try {
        const c = typeof serviceAccountJson === 'string' ? JSON.parse(serviceAccountJson) : serviceAccountJson;
        
        // 1. Sign a JWT asserting we are this service account
        const algorithm = 'RS256';
        const privateKey = await importPKCS8(c.private_key, algorithm);
        
        const jwt = await new SignJWT({
            scope: SCOPES.join(' '),
            aud: GOOGLE_TOKEN_URL,
            iss: c.client_email,
            sub: c.client_email,
            iat: Math.floor(Date.now() / 1000),
            exp: Math.floor(Date.now() / 1000) + 3600, // 1 hour
        })
        .setProtectedHeader({ alg: algorithm, typ: 'JWT' })
        .sign(privateKey);

        // 2. Exchange JWT for Access Token
        const response = await fetch(GOOGLE_TOKEN_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({
                grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
                assertion: jwt,
            }),
        });

        const data = await response.json();
        return data.access_token;
    } catch (err) {
        console.error('Error generating Google Token:', err);
        throw new Error('Failed to authenticate with Google Cloud');
    }
}

Deno.serve(async (req) => {
    try {
        console.log('🚀 [DOC_AI] Processing started');
        
        // 1. Initialize Base44 Client (Authentication Check)
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();
        
        if (!user) {
            console.error('❌ [DOC_AI] Unauthorized access attempt');
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }
        
        console.log('👤 [DOC_AI] User authenticated:', user.email);

        // 2. Parse Request
        const { fileBase64, mimeType } = await req.json();
        
        if (!fileBase64) {
            return Response.json({ error: 'Missing file content' }, { status: 400 });
        }

        // 3. Load Environment Variables
        const serviceAccountStr = Deno.env.get("GOOGLE_SERVICE_ACCOUNT");
        const projectId = Deno.env.get("GOOGLE_PROJECT_ID");
        const processorId = Deno.env.get("DOC_AI_PROCESSOR_ID");
        const location = "us"; // Change to "eu" if your processor is in Europe

        if (!serviceAccountStr || !projectId || !processorId) {
            console.error('❌ [DOC_AI] Missing server configuration');
            return Response.json({ error: 'Server misconfiguration: Missing Google Credentials' }, { status: 500 });
        }

        // 4. Authenticate with Google
        console.log('🔐 [DOC_AI] Authenticating with Google Cloud...');
        const googleToken = await getGoogleAccessToken(serviceAccountStr);

        // 5. Call Document AI API
        const endpoint = `https://${location}-documentai.googleapis.com/v1/projects/${projectId}/locations/${location}/processors/${processorId}:process`;
        
        const response = await fetch(endpoint, {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${googleToken}`,
                "Content-Type": "application/json; charset=utf-8",
            },
            body: JSON.stringify({
                rawDocument: {
                    content: fileBase64,
                    mimeType: mimeType || "application/pdf",
                }
            }),
        });

        if (!response.ok) {
            const errText = await response.text();
            console.error('❌ [DOC_AI] Google API Error:', errText);
            throw new Error(`Google Document AI Error: ${errText}`);
        }

        const data = await response.json();
        
        // 6. Parse Entities (Bank Statement Logic)
        const entities = data.document?.entities || [];
        console.log(`✅ [DOC_AI] Extracted ${entities.length} entities`);

        const transactions = entities
            .filter((e) => e.type === "transaction") 
            .map((e) => {
                const props = e.properties || [];
                
                // Helper to safely get text from nested properties
                const getText = (type) => props.find((p) => p.type === type)?.mentionText;
                const getNormalized = (type) => props.find((p) => p.type === type)?.normalizedValue?.text;

                const dateStr = getNormalized("date") || getText("date");
                const amountStr = getNormalized("amount") || getText("amount");
                const description = getText("description") || getText("supplier_name") || "Unknown Transaction";

                let amount = 0;
                if (amountStr) {
                    amount = parseFloat(amountStr.replace(/[^0-9.-]/g, ""));
                }

                return {
                    date: dateStr,
                    reason: description,
                    amount: amount,
                    raw: e.mentionText
                };
            });

        return Response.json({ transactions: transactions });

    } catch (error) {
        console.error('💥 [DOC_AI] Processing failed:', error);
        return Response.json({ 
            error: error.message,
            stack: error.stack 
        }, { status: 500 });
    }
});