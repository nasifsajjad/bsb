const express = require('express');
const router = express.Router();
const { findBestPairings } = require('../services/pairingEngine');

/**
 * POST /api/flights/search
 * Body: { origin, windowStart, windowEnd, stayDays, travelers, currency }
 */
router.post('/search', async (req, res, next) => {
  try {
    const { origin, windowStart, windowEnd, stayDays, travelers, currency } = req.body;

    // Validate required fields
    if (!origin || !windowStart || !windowEnd || !stayDays) {
      return res.status(400).json({ error: 'Missing required fields: origin, windowStart, windowEnd, stayDays' });
    }

    // Validate dates
    const today = new Date().toISOString().split('T')[0];
    if (windowStart < today) {
      return res.status(400).json({ error: 'Travel window cannot start in the past' });
    }

    const maxDate = new Date();
    maxDate.setDate(maxDate.getDate() + 90);
    const maxDateStr = maxDate.toISOString().split('T')[0];
    if (windowEnd > maxDateStr) {
      return res.status(400).json({ error: 'Travel window cannot exceed 90 days from today' });
    }

    const result = await findBestPairings({
      origin: origin.toUpperCase(),
      windowStart,
      windowEnd,
      stayDays: parseInt(stayDays, 10),
      travelers: parseInt(travelers || 1, 10),
      currency: currency || 'USD',
    });

    res.json(result);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
