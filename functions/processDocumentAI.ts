// functions/processDocumentAI.ts
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

// You need to set these in your Base44/Project Environment Variables
const GOOGLE_ACCESS_TOKEN = Deno.env.get("GOOGLE_ACCESS_TOKEN"); // Service Account OAuth Token
const PROJECT_ID = Deno.env.get("GOOGLE_PROJECT_ID");
const LOCATION = "us"; // or eu, etc.
const PROCESSOR_ID = Deno.env.get("DOC_AI_PROCESSOR_ID"); // Create a "Bank Statement Parser" in GCP

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: { "Access-Control-Allow-Origin": "*" } });

  try {
    const { fileBase64, mimeType } = await req.json();

    // 1. Call Google Document AI REST API
    const url = `https://us-documentai.googleapis.com/v1/projects/${PROJECT_ID}/locations/${LOCATION}/processors/${PROCESSOR_ID}:process`;
    
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${GOOGLE_ACCESS_TOKEN}`,
        "Content-Type": "application/json; charset=utf-8",
      },
      body: JSON.stringify({
        rawDocument: {
          content: fileBase64,
          mimeType: mimeType || "application/pdf",
        }
      }),
    });

    const data = await response.json();
    if (data.error) throw new Error(data.error.message);

    // 2. Parse the complex Document AI output into simple JSON
    // Note: 'entities' usually contains specific fields. For Bank Statements, 
    // you often need to parse the 'text' or specific 'table' entities.
    // This is a simplified extractor assuming the model returns a "entities" list.
    const transactions = (data.document.entities || [])
      .filter((e: any) => e.type === "transaction") // Adjust based on your specific Processor version
      .map((e: any) => {
        // Extract properties from the transaction entity
        const props = e.properties || [];
        const getDate = (t: string) => props.find((p: any) => p.type === t)?.mentionText;
        
        return {
            date: getDate("date") || getDate("transaction_date"),
            reason: getDate("supplier_name") || getDate("description") || "Unknown Merchant",
            amount: parseFloat(getDate("amount")?.replace(/[^0-9.-]/g, "") || "0"),
            // Detect credit/debit based on keywords or negative signs in the original text
        };
      });

    return new Response(JSON.stringify({ transactions }), { 
      headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" } 
    });

  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
});
