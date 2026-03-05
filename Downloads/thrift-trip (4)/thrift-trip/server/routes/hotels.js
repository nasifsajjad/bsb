const express = require('express');
const router = express.Router();
const { searchHotels } = require('../services/serpapi');

/**
 * GET /api/hotels?destination=Paris,France&checkIn=2024-06-01&checkOut=2024-06-07&adults=2
 */
router.get('/', async (req, res, next) => {
  try {
    const { city, country, checkIn, checkOut, adults = 1, currency = 'USD' } = req.query;
    if (!city || !checkIn || !checkOut) {
      return res.status(400).json({ error: 'Missing required fields: city, checkIn, checkOut' });
    }

    const hotel = await searchHotels({
      destination: { city, country: country || '' },
      checkIn,
      checkOut,
      adults: parseInt(adults, 10),
      currency,
    });

    if (!hotel) return res.json({ hotel: null });
    res.json({ hotel });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
