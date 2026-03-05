const fetch = require('node-fetch');

const GEMINI_API_BASE = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent';

/**
 * Get estimated daily activity and food costs for a destination using Gemini.
 */
async function getActivityEstimate({ city, country, currency = 'USD' }) {
  const prompt = `Give a realistic estimate in ${currency} for 1 person per day for budget sightseeing, street food, and basic recreation in ${city}, ${country}. Respond ONLY in raw JSON, no markdown, no explanation: { "dailyCost": number, "currency": "${currency}", "highlights": ["string", "string", "string"] }`;

  const body = {
    contents: [{ parts: [{ text: prompt }] }],
    generationConfig: {
      temperature: 0.2,
      maxOutputTokens: 256,
    },
  };

  const url = `${GEMINI_API_BASE}?key=${process.env.GEMINI_API_KEY}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Gemini API error ${res.status}: ${err}`);
  }

  const data = await res.json();
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text || '';

  // Strip any markdown fences
  const clean = text.replace(/```json|```/g, '').trim();

  try {
    return JSON.parse(clean);
  } catch {
    // Return a sensible fallback if parsing fails
    return {
      dailyCost: 50,
      currency,
      highlights: [`Explore ${city}'s local markets`, `Try street food in ${city}`, `Visit local cultural sites`],
    };
  }
}

/**
 * Generate a detailed day-by-day itinerary for a destination using Gemini.
 */
async function generateItinerary({ city, country, stayDays }) {
  const prompt = `Create a concise ${stayDays}-day budget travel itinerary for ${city}, ${country}. 
For each day provide: a day title, 2-3 activities, a meal recommendation, and a pro tip.
Respond ONLY in raw JSON, no markdown: {
  "intro": "one sentence destination hook",
  "days": [
    {
      "day": 1,
      "title": "string",
      "activities": ["string"],
      "meal": "string",
      "tip": "string"
    }
  ],
  "bestTimeToVisit": "string",
  "packingTip": "string"
}`;

  const body = {
    contents: [{ parts: [{ text: prompt }] }],
    generationConfig: {
      temperature: 0.7,
      maxOutputTokens: 1024,
    },
  };

  const url = `${GEMINI_API_BASE}?key=${process.env.GEMINI_API_KEY}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  if (!res.ok) throw new Error(`Gemini API error: ${res.status}`);

  const data = await res.json();
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
  const clean = text.replace(/```json|```/g, '').trim();

  try {
    return JSON.parse(clean);
  } catch {
    return {
      intro: `${city} is a fantastic budget destination with rich culture and history.`,
      days: Array.from({ length: stayDays }, (_, i) => ({
        day: i + 1,
        title: `Day ${i + 1} in ${city}`,
        activities: ['Explore the city center', 'Visit local markets', 'Walk the historic district'],
        meal: 'Try local street food at the central market',
        tip: 'Use public transport to save money',
      })),
      bestTimeToVisit: 'Spring and autumn for best weather',
      packingTip: 'Pack light layers for variable weather',
    };
  }
}

module.exports = { getActivityEstimate, generateItinerary };
