const { searchCheapestFlightsFromOrigin, searchHotels } = require('./serpapi');
const { getActivityEstimate } = require('./gemini');
const { hashKey, get, set } = require('./cache');

/**
 * Core pairing engine: finds and ranks cheapest flight + hotel combinations.
 * 
 * @param {Object} params
 * @param {string} params.origin - Origin airport IATA code
 * @param {string} params.windowStart - Travel window start date (YYYY-MM-DD)
 * @param {string} params.windowEnd - Travel window end date (YYYY-MM-DD)
 * @param {number} params.stayDays - Length of stay in days
 * @param {number} params.travelers - Number of travelers
 * @param {string} params.currency - Display currency code
 */
async function findBestPairings({ origin, windowStart, windowEnd, stayDays, travelers = 1, currency = 'USD' }) {
  const cacheKey = hashKey({ origin, windowStart, windowEnd, stayDays, travelers });
  
  // Serve from cache if available
  const cached = get(cacheKey);
  if (cached) {
    console.log(`Cache hit for key ${cacheKey.slice(0, 8)}...`);
    return cached;
  }

  console.log(`Finding pairings: ${origin} → anywhere, ${windowStart}–${windowEnd}, ${stayDays} days, ${travelers} travelers`);

  // Step 1: Find cheapest flights from origin
  const cheapestFlights = await searchCheapestFlightsFromOrigin({
    origin,
    windowStart,
    windowEnd,
    stayDays,
    adults: travelers,
    currency,
  });

  if (!cheapestFlights.length) {
    return { trips: [], message: 'No flights found for this route and date range.' };
  }

  // Step 2: For each destination, get hotels and activity costs in parallel
  const tripPromises = cheapestFlights.slice(0, 10).map(async (flight) => {
    try {
      const [hotel, activities] = await Promise.all([
        searchHotels({
          destination: flight.destination,
          checkIn: flight.departureDate,
          checkOut: flight.returnDate,
          adults: travelers,
          currency,
        }),
        getActivityEstimate({
          city: flight.destination.city,
          country: flight.destination.country,
          currency,
        }),
      ]);

      if (!hotel) return null;

      const flightTotal = flight.price * travelers;
      const hotelTotal = hotel.nightlyRate * stayDays * Math.ceil(travelers / 2); // rooms
      const activitiesTotal = (activities.dailyCost || 50) * stayDays * travelers;
      const grandTotal = flightTotal + hotelTotal + activitiesTotal;

      return {
        id: `${flight.destination.iata}-${flight.departureDate}`,
        destination: flight.destination,
        flight: {
          ...flight,
          totalCost: flightTotal,
        },
        hotel: {
          ...hotel,
          totalCost: hotelTotal,
        },
        activities: {
          ...activities,
          totalCost: activitiesTotal,
          perDayPerPerson: activities.dailyCost || 50,
        },
        grandTotal,
        stayDays,
        travelers,
        currency,
      };
    } catch (err) {
      console.error(`Failed to pair ${flight.destination?.city}:`, err.message);
      return null;
    }
  });

  const results = (await Promise.all(tripPromises)).filter(Boolean);

  // Step 3: Sort by grand total ascending
  results.sort((a, b) => a.grandTotal - b.grandTotal);

  const payload = { trips: results, generatedAt: new Date().toISOString() };

  // Cache for 6 hours
  set(cacheKey, payload);

  return payload;
}

module.exports = { findBestPairings };
