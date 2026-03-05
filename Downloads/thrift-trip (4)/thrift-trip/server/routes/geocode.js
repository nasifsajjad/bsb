const express = require('express');
const fetch = require('node-fetch');
const router = express.Router();

// Major city → IATA mapping for IP geolocation
const cityToIata = {
  'New York': 'JFK',
  'Los Angeles': 'LAX',
  'Chicago': 'ORD',
  'Houston': 'IAH',
  'Phoenix': 'PHX',
  'Philadelphia': 'PHL',
  'San Antonio': 'SAT',
  'San Diego': 'SAN',
  'Dallas': 'DFW',
  'San Jose': 'SJC',
  'San Francisco': 'SFO',
  'Seattle': 'SEA',
  'Denver': 'DEN',
  'Boston': 'BOS',
  'Miami': 'MIA',
  'Atlanta': 'ATL',
  'Minneapolis': 'MSP',
  'Portland': 'PDX',
  'Las Vegas': 'LAS',
  'Detroit': 'DTW',
  'London': 'LHR',
  'Paris': 'CDG',
  'Berlin': 'BER',
  'Madrid': 'MAD',
  'Rome': 'FCO',
  'Amsterdam': 'AMS',
  'Vienna': 'VIE',
  'Zurich': 'ZRH',
  'Brussels': 'BRU',
  'Warsaw': 'WAW',
  'Stockholm': 'ARN',
  'Oslo': 'OSL',
  'Copenhagen': 'CPH',
  'Helsinki': 'HEL',
  'Dubai': 'DXB',
  'Abu Dhabi': 'AUH',
  'Riyadh': 'RUH',
  'Doha': 'DOH',
  'Tehran': 'IKA',
  'Mumbai': 'BOM',
  'Delhi': 'DEL',
  'Bangalore': 'BLR',
  'Hyderabad': 'HYD',
  'Chennai': 'MAA',
  'Kolkata': 'CCU',
  'Beijing': 'PEK',
  'Shanghai': 'PVG',
  'Guangzhou': 'CAN',
  'Shenzhen': 'SZX',
  'Chengdu': 'CTU',
  'Tokyo': 'NRT',
  'Osaka': 'KIX',
  'Seoul': 'ICN',
  'Singapore': 'SIN',
  'Bangkok': 'BKK',
  'Kuala Lumpur': 'KUL',
  'Jakarta': 'CGK',
  'Manila': 'MNL',
  'Hong Kong': 'HKG',
  'Sydney': 'SYD',
  'Melbourne': 'MEL',
  'Brisbane': 'BNE',
  'Auckland': 'AKL',
  'Toronto': 'YYZ',
  'Vancouver': 'YVR',
  'Montreal': 'YUL',
  'Calgary': 'YYC',
  'Mexico City': 'MEX',
  'São Paulo': 'GRU',
  'Rio de Janeiro': 'GIG',
  'Buenos Aires': 'EZE',
  'Lima': 'LIM',
  'Bogotá': 'BOG',
  'Santiago': 'SCL',
  'Cairo': 'CAI',
  'Lagos': 'LOS',
  'Nairobi': 'NBO',
  'Johannesburg': 'JNB',
  'Cape Town': 'CPT',
  'Casablanca': 'CMN',
  'Istanbul': 'IST',
  'Athens': 'ATH',
  'Lisbon': 'LIS',
};

function findNearestIata(city) {
  if (!city) return 'JFK';
  
  // Exact match
  if (cityToIata[city]) return cityToIata[city];
  
  // Partial match
  const key = Object.keys(cityToIata).find(k => 
    city.toLowerCase().includes(k.toLowerCase()) || 
    k.toLowerCase().includes(city.toLowerCase())
  );
  
  return key ? cityToIata[key] : 'JFK';
}

/**
 * GET /api/geocode
 * Silently detect user's location from IP
 */
router.get('/', async (req, res, next) => {
  try {
    // Get client IP (handle proxies)
    const ip = req.headers['x-forwarded-for']?.split(',')[0]?.trim() || 
               req.connection?.remoteAddress || 
               req.ip;

    // Use ipapi.co for free IP geolocation (no key needed)
    const geoRes = await fetch(`https://ipapi.co/${ip}/json/`, {
      headers: { 'User-Agent': 'ThriftTrip/1.0' },
    });
    
    if (!geoRes.ok) throw new Error('Geolocation service unavailable');
    
    const geo = await geoRes.json();
    
    const city = geo.city || geo.region || '';
    const country = geo.country_name || '';
    const iata = findNearestIata(city);

    res.json({ city, country, iata, countryCode: geo.country_code });
  } catch (err) {
    // Graceful fallback — don't fail the whole app
    console.warn('Geocode failed:', err.message);
    res.json({ city: 'New York', country: 'United States', iata: 'JFK', countryCode: 'US' });
  }
});

module.exports = router;
