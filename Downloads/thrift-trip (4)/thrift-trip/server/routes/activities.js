const express = require('express');
const router = express.Router();
const { getActivityEstimate, generateItinerary } = require('../services/gemini');

/**
 * GET /api/activities/estimate?city=Bangkok&country=Thailand&currency=USD
 */
router.get('/estimate', async (req, res, next) => {
  try {
    const { city, country, currency = 'USD' } = req.query;
    if (!city || !country) {
      return res.status(400).json({ error: 'Missing required fields: city, country' });
    }

    const estimate = await getActivityEstimate({ city, country, currency });
    res.json(estimate);
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/activities/itinerary?city=Bangkok&country=Thailand&stayDays=7
 */
router.get('/itinerary', async (req, res, next) => {
  try {
    const { city, country, stayDays = 7 } = req.query;
    if (!city || !country) {
      return res.status(400).json({ error: 'Missing required fields: city, country' });
    }

    const itinerary = await generateItinerary({
      city,
      country,
      stayDays: parseInt(stayDays, 10),
    });
    res.json(itinerary);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
