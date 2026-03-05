# ✈ Thrift Trip

**Budget travel reimagined.** Stop picking a destination. Pick a budget.

Thrift Trip is an intelligent budget travel search engine that pairs the cheapest international flights with the best-value hotels for your travel window — showing you every destination your money can reach.

---

## Features

- 🌍 **9,000+ world airports** — offline autocomplete, no API key needed
- ✈️ **Google Flights integration** — real round-trip prices via SerpApi
- 🏨 **Google Hotels integration** — cheapest highly-rated hotels at each destination
- 🤖 **AI activity estimates** — Gemini-powered daily cost breakdowns and itineraries
- 🔒 **Privacy-first** — no user accounts, no stored data, all API keys server-side only
- ⚡ **6-hour server-side caching** — keeps usage within free tier limits
- 📱 **Fully responsive** — mobile-first design, tested at 375px / 768px / 1280px+

---

## Tech Stack

| Layer | Tech |
|-------|------|
| Frontend | React 18 + Vite |
| Backend | Node.js 20 + Express |
| Flights/Hotels | SerpApi (Google Flights + Hotels) |
| AI Estimates | Google Gemini Pro |
| Geolocation | ipapi.co (free, no key) |
| Airport Data | OpenFlights dataset (offline) |
| Caching | node-cache (in-memory, 6hr TTL) |
| Rate Limiting | express-rate-limit (20 req/15min) |

---

## Getting Started

### Prerequisites
- Node.js 18+
- SerpApi account (free tier: 100 searches/month)
- Google AI Studio account (free tier: 60 requests/minute for Gemini)

### API Keys

1. **SerpApi**: Sign up at [serpapi.com](https://serpapi.com) — free tier includes 100 searches/month
2. **Gemini API**: Get a key at [aistudio.google.com](https://aistudio.google.com) — generous free tier

### Local Development

```bash
# 1. Clone the repo
git clone https://github.com/yourname/thrift-trip
cd thrift-trip

# 2. Set up environment variables
cp .env.example server/.env
cp .env.example client/.env.local

# 3. Add your API keys to server/.env
#    SERPAPI_KEY=your_serpapi_key
#    GEMINI_API_KEY=your_gemini_key
#    CLIENT_URL=http://localhost:5173

# 4. Start the backend
cd server
npm install
npm run dev

# 5. Start the frontend (in a new terminal)
cd client
npm install
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

### Generate Airport Data (optional — pre-built data included)

```bash
node scripts/buildAirportData.js
```

This downloads the full OpenFlights dataset (~9,000 airports) and writes it to `client/src/data/airportData.json`.

---

## Production Deployment

### Frontend → Vercel

1. Push to GitHub
2. Import repo at [vercel.com/new](https://vercel.com/new)
3. Set root directory to `client`
4. Set environment variable: `VITE_API_BASE_URL=https://your-render-app.onrender.com`
5. Deploy

### Backend → Render

1. Connect your GitHub repo at [render.com](https://render.com)
2. Select the `render.yaml` configuration (auto-detected)
3. Set the following environment variables in Render dashboard:
   - `SERPAPI_KEY` — your SerpApi key
   - `GEMINI_API_KEY` — your Gemini API key
   - `CLIENT_URL` — your Vercel frontend URL (e.g. `https://thrift-trip.vercel.app`)
4. Deploy

> **Note**: Render free tier spins down after 15 minutes of inactivity. First request after sleep takes ~30 seconds. Consider using a free uptime monitor (UptimeRobot) to ping `/api/health` every 10 minutes.

---

## Project Structure

```
thrift-trip/
├── client/               # React + Vite frontend
│   ├── src/
│   │   ├── components/   # UI components
│   │   ├── pages/        # Route pages (Home, Privacy, Terms, Cookies)
│   │   ├── hooks/        # Custom React hooks
│   │   ├── utils/        # Currency formatter, date helpers
│   │   └── data/         # Airport dataset (offline JSON)
│   └── ...
├── server/               # Node.js + Express API
│   ├── routes/           # API endpoints
│   ├── services/         # SerpApi, Gemini, cache, pairing engine
│   ├── middleware/        # Rate limiter, error handler
│   └── app.js
├── scripts/              # Build scripts (airport data generator)
├── render.yaml           # Render deployment config
└── .env.example
```

---

## API Reference

### `POST /api/flights/search`
Main search endpoint — finds and pairs cheapest flights + hotels.

**Body:**
```json
{
  "origin": "JFK",
  "windowStart": "2025-03-01",
  "windowEnd": "2025-03-31",
  "stayDays": 7,
  "travelers": 2,
  "currency": "USD"
}
```

**Response:** Array of trip objects sorted by total cost.

### `GET /api/geocode`
Detects user's approximate location from IP for airport pre-fill.

### `GET /api/activities/estimate`
Returns Gemini-generated daily activity/food cost estimate.

### `GET /api/activities/itinerary`
Returns Gemini-generated day-by-day itinerary.

---

## Cost & Free Tier Limits

| Service | Free Tier | Usage Pattern |
|---------|-----------|---------------|
| SerpApi | 100 searches/month | 6hr server cache prevents repeat calls |
| Gemini | 60 req/min | Called per destination (max 10 per search) |
| Vercel | Unlimited requests | Static frontend |
| Render | 750 hrs/month | Backend API proxy |
| ipapi.co | 30,000 req/month | One call per page load |

With 6-hour caching, 100 SerpApi calls supports ~100 unique searches/month. Scales cost-effectively with paid tier.

---

## License

MIT — free to use, modify, and deploy.
