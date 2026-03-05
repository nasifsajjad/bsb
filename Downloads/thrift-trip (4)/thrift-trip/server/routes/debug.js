const express = require('express');
const fetch = require('node-fetch');
const router = express.Router();

const SERPAPI_BASE = 'https://serpapi.com/search.json';

/**
 * GET /api/debug/flight?from=JFK&to=LHR&out=2025-04-01&ret=2025-04-08
 * Test a single flight search and see the raw result.
 */
router.get('/flight', async (req, res) => {
  const { from = 'JFK', to = 'LHR', out, ret } = req.query;

  // Default to ~30 days from now if no dates provided
  const today = new Date();
  const outDate = out || new Date(today.getTime() + 30 * 86400000).toISOString().split('T')[0];
  const retDate = ret || new Date(today.getTime() + 37 * 86400000).toISOString().split('T')[0];

  const params = new URLSearchParams({
    engine: 'google_flights',
    type: '2',
    departure_id: from,
    arrival_id: to,
    outbound_date: outDate,
    return_date: retDate,
    adults: '1',
    currency: 'USD',
    api_key: process.env.SERPAPI_KEY,
  });

  try {
    const serpRes = await fetch(`${SERPAPI_BASE}?${params}`);
    const data = await serpRes.json();

    const bestFlights = data.best_flights || [];
    const otherFlights = data.other_flights || [];
    const all = [...bestFlights, ...otherFlights];

    res.json({
      query: { from, to, outDate, retDate },
      serpapi_error: data.error || null,
      total_results: all.length,
      cheapest_price: all.length ? Math.min(...all.map(f => f.price || 9999)) : null,
      first_result: all[0] || null,
      key_preview: process.env.SERPAPI_KEY ? `${process.env.SERPAPI_KEY.slice(0, 6)}...` : 'NOT SET',
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/debug/hotel?city=London&country=United+Kingdom&in=2025-04-01&out=2025-04-08
 */
router.get('/hotel', async (req, res) => {
  const { city = 'London', country = 'United Kingdom', in: checkIn, out: checkOut } = req.query;

  const today = new Date();
  const inDate = checkIn || new Date(today.getTime() + 30 * 86400000).toISOString().split('T')[0];
  const outDate = checkOut || new Date(today.getTime() + 37 * 86400000).toISOString().split('T')[0];

  const params = new URLSearchParams({
    engine: 'google_hotels',
    q: `hotels in ${city} ${country}`,
    check_in_date: inDate,
    check_out_date: outDate,
    adults: '1',
    currency: 'USD',
    sort_by: '3',
    api_key: process.env.SERPAPI_KEY,
  });

  try {
    const serpRes = await fetch(`${SERPAPI_BASE}?${params}`);
    const data = await serpRes.json();

    const properties = data.properties || [];
    res.json({
      query: { city, country, inDate, outDate },
      serpapi_error: data.error || null,
      total_hotels: properties.length,
      first_hotel: properties[0] ? {
        name: properties[0].name,
        rating: properties[0].overall_rating,
        rate_per_night: properties[0].rate_per_night,
        total_rate: properties[0].total_rate,
      } : null,
      key_preview: process.env.SERPAPI_KEY ? `${process.env.SERPAPI_KEY.slice(0, 6)}...` : 'NOT SET',
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/debug/status — check env vars and connectivity
 */
router.get('/status', (req, res) => {
  res.json({
    serpapi_key_set: !!process.env.SERPAPI_KEY,
    gemini_key_set: !!process.env.GEMINI_API_KEY,
    node_env: process.env.NODE_ENV,
    timestamp: new Date().toISOString(),
  });
});

module.exports = router;
