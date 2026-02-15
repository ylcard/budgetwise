/**
 * Backend function to generate AI-powered budget insights using Gemini Flash API
 * CREATED: 18-Jan-2026
 * 
 * Accepts budget data and returns actionable insights using Gemini AI
 */

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { budgetData } = await req.json();

    if (!budgetData) {
      return Response.json({ error: 'Budget data is required' }, { status: 400 });
    }

    const apiKey = Deno.env.get('GROQ_API_KEY');
    if (!apiKey) {
      return Response.json({ error: 'Groq API key not configured' }, { status: 500 });
    }

    // Prepare prompt for Gemini
    const prompt = `You are a financial advisor analyzing a budget. Provide concise, actionable insights (3-5 bullet points max).

Budget Data:
- Name: ${budgetData.name}
- Status: ${budgetData.status}
- Allocated Amount: $${budgetData.allocatedAmount?.toFixed(2) || 0}
- Start Date: ${budgetData.startDate}
- End Date: ${budgetData.endDate}
- Spent: $${budgetData.spent?.toFixed(2) || 0}
- Remaining: $${budgetData.remaining?.toFixed(2) || 0}
- Progress: ${budgetData.progress?.toFixed(1) || 0}%
${budgetData.feasibility ? `
Feasibility Analysis:
- Overall Grade: ${budgetData.feasibility.grade}
- Feasibility Score: ${budgetData.feasibility.feasibilityScore}/100
- Risk Level: ${budgetData.feasibility.riskLevel}
- Projected Savings Rate: ${budgetData.feasibility.metrics?.projectedSavingsRate?.toFixed(1)}%
` : ''}

Provide specific, actionable advice based on this data. Focus on practical tips to improve their budget management.`;

    // Call Groq API
    const response = await fetch(
      'https://api.groq.com/openai/v1/chat/completions',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: 'llama-3.3-70b-versatile',
          messages: [
            { role: 'system', content: 'You are a helpful financial advisor.' },
            { role: 'user', content: prompt }
          ],
          temperature: 0.7,
          max_tokens: 500
        }),
      }
    );

    if (!response.ok) {
      const errorData = await response.text();
      console.error('Groq API error:', errorData);
      return Response.json({ error: 'Failed to generate insights' }, { status: 500 });
    }

    const data = await response.json();
    const insight = data.choices?.[0]?.message?.content || 'No insights generated';

    return Response.json({ insight });
  } catch (error) {
    console.error('Error generating insights:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});
