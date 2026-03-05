const fetch = require('node-fetch');

const SERPAPI_BASE = 'https://serpapi.com/search.json';

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function extractNightlyRate(hotel) {
  return (
    hotel.rate_per_night?.extracted_lowest ||
    hotel.rate_per_night?.extracted_before_taxes_fees ||
    hotel.total_rate?.extracted_lowest ||
    0
  );
}

async function searchFlights({ origin, destination, departureDate, returnDate, adults = 1, currency = 'USD' }) {
  const params = new URLSearchParams({
    engine: 'google_flights',
    type: '2',
    departure_id: origin,
    arrival_id: destination,
    outbound_date: departureDate,
    return_date: returnDate,
    adults: String(adults),
    currency,
    api_key: process.env.SERPAPI_KEY,
  });

  console.log(`  ✈ Flight: ${origin}→${destination} on ${departureDate}`);
  const res = await fetch(`${SERPAPI_BASE}?${params}`);
  const data = await res.json();

  if (data.error) {
    console.log(`  ✗ SerpApi error for ${destination}: ${data.error}`);
    return null;
  }

  const all = [...(data.best_flights || []), ...(data.other_flights || [])];
  if (!all.length) {
    console.log(`  ✗ No flights: ${origin}→${destination}`);
    return null;
  }

  all.sort((a, b) => (a.price || 9999) - (b.price || 9999));
  const cheapest = all[0];

  if (!cheapest.price || cheapest.price <= 0) {
    console.log(`  ✗ Bad price for ${origin}→${destination}: ${cheapest.price}`);
    return null;
  }

  console.log(`  ✓ Flight found: ${origin}→${destination} $${cheapest.price}`);
  return {
    price: cheapest.price,
    airline: cheapest.flights?.[0]?.airline || 'Various Airlines',
    flightNumber: cheapest.flights?.[0]?.flight_number || '',
    departureDate,
    returnDate,
    duration: cheapest.total_duration,
    bookingLink: buildFlightBookingLink(origin, destination, departureDate, returnDate, adults),
  };
}

async function searchCheapestFlightsFromOrigin({ origin, windowStart, windowEnd, stayDays, adults = 1, currency = 'USD' }) {
  const datePairs = generateDatePairs(windowStart, windowEnd, stayDays);
  if (!datePairs.length) {
    console.log('No valid date pairs — window too narrow for stay length.');
    return [];
  }

  // Use middle of the window — better availability than the first day
  const pair = datePairs[Math.floor(datePairs.length / 2)];
  console.log(`Searching ${datePairs.length} possible date pairs, using: ${pair.departure} → ${pair.return}`);

  const destinations = getPopularDestinations();
  const results = [];
  const TARGET = 8;

  for (const dest of destinations) {
    if (results.length >= TARGET) break;
    await sleep(400); // Avoid rate limiting — search sequentially

    try {
      const flight = await searchFlights({
        origin,
        destination: dest.iata,
        departureDate: pair.departure,
        returnDate: pair.return,
        adults,
        currency,
      });

      if (flight) {
        results.push({ ...flight, destination: dest });
      }
    } catch (err) {
      console.log(`  ✗ Exception for ${dest.iata}: ${err.message}`);
    }
  }

  console.log(`Flights done: ${results.length} routes found`);
  results.sort((a, b) => a.price - b.price);
  return results;
}

async function searchHotels({ destination, checkIn, checkOut, adults = 1, currency = 'USD' }) {
  const params = new URLSearchParams({
    engine: 'google_hotels',
    q: `hotels in ${destination.city} ${destination.country}`,
    check_in_date: checkIn,
    check_out_date: checkOut,
    adults: String(adults),
    currency,
    sort_by: '3',
    api_key: process.env.SERPAPI_KEY,
  });

  console.log(`  🏨 Hotels: ${destination.city}`);
  const res = await fetch(`${SERPAPI_BASE}?${params}`);
  const data = await res.json();

  if (data.error) {
    console.log(`  ✗ Hotel error for ${destination.city}: ${data.error}`);
    return null;
  }

  const properties = data.properties || [];
  console.log(`  Hotels in ${destination.city}: ${properties.length}`);
  if (!properties.length) return null;

  const rated = properties.filter(h => !h.overall_rating || h.overall_rating >= 3.0);
  const candidates = (rated.length ? rated : properties).filter(h => extractNightlyRate(h) > 0);

  if (!candidates.length) {
    console.log(`  ✗ No priced hotels for ${destination.city}`);
    return null;
  }

  candidates.sort((a, b) => extractNightlyRate(a) - extractNightlyRate(b));
  const hotel = candidates[0];
  const nightlyRate = extractNightlyRate(hotel);
  const stayNights = Math.round((new Date(checkOut) - new Date(checkIn)) / (1000 * 60 * 60 * 24));

  console.log(`  ✓ Hotel: ${hotel.name} $${nightlyRate}/night`);
  return {
    name: hotel.name,
    nightlyRate,
    totalCost: nightlyRate * stayNights,
    rating: hotel.overall_rating || null,
    reviewCount: hotel.reviews || null,
    bookingLink: hotel.link || buildHotelBookingLink(destination, checkIn, checkOut, adults),
    thumbnail: hotel.images?.[0]?.thumbnail || null,
  };
}

function buildFlightBookingLink(origin, destination, departureDate, returnDate, adults) {
  return `https://www.google.com/travel/flights?q=flights+from+${origin}+to+${destination}#flt=${origin}.${destination}.${departureDate}*${destination}.${origin}.${returnDate};c:USD;e:1;sd:1;t:f;tt:o;pax:${adults}`;
}

function buildHotelBookingLink(destination, checkIn, checkOut, adults) {
  const q = encodeURIComponent(`hotels in ${destination.city}, ${destination.country}`);
  return `https://www.google.com/travel/hotels?q=${q}&dates=${checkIn},${checkOut}&guests=${adults}`;
}

function generateDatePairs(windowStart, windowEnd, stayDays) {
  const pairs = [];
  const start = new Date(windowStart + 'T00:00:00');
  const end = new Date(windowEnd + 'T00:00:00');
  let current = new Date(start);
  while (current <= end) {
    const ret = new Date(current);
    ret.setDate(ret.getDate() + stayDays);
    if (ret <= end) {
      pairs.push({
        departure: current.toISOString().split('T')[0],
        return: ret.toISOString().split('T')[0],
      });
    }
    current.setDate(current.getDate() + 1);
  }
  return pairs;
}

function getPopularDestinations() {
  return [
    { iata: 'LHR', city: 'London', country: 'United Kingdom' },
    { iata: 'CDG', city: 'Paris', country: 'France' },
    { iata: 'AMS', city: 'Amsterdam', country: 'Netherlands' },
    { iata: 'BCN', city: 'Barcelona', country: 'Spain' },
    { iata: 'FCO', city: 'Rome', country: 'Italy' },
    { iata: 'MAD', city: 'Madrid', country: 'Spain' },
    { iata: 'LIS', city: 'Lisbon', country: 'Portugal' },
    { iata: 'ATH', city: 'Athens', country: 'Greece' },
    { iata: 'PRG', city: 'Prague', country: 'Czech Republic' },
    { iata: 'BUD', city: 'Budapest', country: 'Hungary' },
    { iata: 'VIE', city: 'Vienna', country: 'Austria' },
    { iata: 'DXB', city: 'Dubai', country: 'United Arab Emirates' },
    { iata: 'BKK', city: 'Bangkok', country: 'Thailand' },
    { iata: 'SIN', city: 'Singapore', country: 'Singapore' },
    { iata: 'NRT', city: 'Tokyo', country: 'Japan' },
    { iata: 'KUL', city: 'Kuala Lumpur', country: 'Malaysia' },
    { iata: 'IST', city: 'Istanbul', country: 'Turkey' },
    { iata: 'CAI', city: 'Cairo', country: 'Egypt' },
    { iata: 'CMN', city: 'Casablanca', country: 'Morocco' },
    { iata: 'CPT', city: 'Cape Town', country: 'South Africa' },
    { iata: 'NBO', city: 'Nairobi', country: 'Kenya' },
    { iata: 'DEL', city: 'New Delhi', country: 'India' },
    { iata: 'BOM', city: 'Mumbai', country: 'India' },
    { iata: 'MEX', city: 'Mexico City', country: 'Mexico' },
    { iata: 'GRU', city: 'São Paulo', country: 'Brazil' },
    { iata: 'BOG', city: 'Bogotá', country: 'Colombia' },
    { iata: 'LIM', city: 'Lima', country: 'Peru' },
    { iata: 'SCL', city: 'Santiago', country: 'Chile' },
    { iata: 'EZE', city: 'Buenos Aires', country: 'Argentina' },
    { iata: 'YYZ', city: 'Toronto', country: 'Canada' },
  ];
}

module.exports = { searchFlights, searchCheapestFlightsFromOrigin, searchHotels };
