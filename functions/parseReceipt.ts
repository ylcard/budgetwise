import { createClientFromRequest } from 'npm:@base44/sdk@0.8.18';
import { GoogleGenerativeAI } from "npm:@google/generative-ai";

/**
 * Receipt Parser Engine (Gemini 1.5 Flash)
 * Handles image analysis and structured JSON extraction.
 */
Deno.serve(async (req) => {
  // 1. Handle CORS Preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
      }
    });
  }

  try {
    // 2. Authenticate User (Using your base44 pattern)
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    // 3. Parse Request Body
    const { base64Image } = await req.json();
    if (!base64Image) return Response.json({ error: "Missing image data" }, { status: 400 });

    const apiKey = Deno.env.get("GEMINI_API_KEY");
    if (!apiKey) return Response.json({ error: "Gemini API Key not configured" }, { status: 500 });

    // 4. Initialize Gemini
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    // We force a strict JSON response
    const prompt = `
      Analyze this receipt image. 
      Extract:
      1. Merchant/Store Name (as 'merchant')
      2. Total Amount as a number (as 'total')
      3. Transaction Date in YYYY-MM-DD (as 'date')
      4. Currency Code e.g. USD, EUR, GBP (as 'currency')

      Return ONLY a raw JSON object. If a field is missing, use null.
      Example: {"merchant": "Starbucks", "total": 5.50, "date": "2026-02-21", "currency": "EUR"}
    `;

    // Strip the base64 prefix if the frontend sends it
    const imageData = base64Image.includes(',') ? base64Image.split(',')[1] : base64Image;

    const result = await model.generateContent([
      prompt,
      {
        inlineData: {
          data: imageData,
          mimeType: "image/jpeg"
        }
      }
    ]);

    const response = await result.response;
    const text = response.text();
    
    // Safety check: Clean up Gemini's occasional markdown code blocks
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    const dataObj = jsonMatch ? JSON.parse(jsonMatch[0]) : null;

    return Response.json(dataObj, {
      headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" }
    });

  } catch (error) {
    console.error('Gemini OCR Error:', error);
    return Response.json({ error: error.message }, { 
      status: 500, 
      headers: { "Access-Control-Allow-Origin": "*" } 
    });
  }
});
