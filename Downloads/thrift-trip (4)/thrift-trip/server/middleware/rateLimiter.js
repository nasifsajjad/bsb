const rateLimit = require('express-rate-limit');

const rateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: 'Too many requests from this IP. Please wait 15 minutes before trying again.',
    retryAfter: '15 minutes',
  },
  handler: (req, res, next, options) => {
    res.status(429).json(options.message);
  },
});

module.exports = { rateLimiter };
