require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { rateLimiter } = require('./middleware/rateLimiter');
const { errorHandler } = require('./middleware/errorHandler');

const flightsRouter = require('./routes/flights');
const hotelsRouter = require('./routes/hotels');
const activitiesRouter = require('./routes/activities');
const geocodeRouter = require('./routes/geocode');
const debugRouter = require('./routes/debug');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:5173',
  credentials: true,
}));
app.use(express.json());
app.use(rateLimiter);

// Routes
app.use('/api/flights', flightsRouter);
app.use('/api/hotels', hotelsRouter);
app.use('/api/activities', activitiesRouter);
app.use('/api/geocode', geocodeRouter);
app.use('/api/debug', debugRouter);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Error handler (must be last)
app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`Thrift Trip server running on port ${PORT}`);
});
