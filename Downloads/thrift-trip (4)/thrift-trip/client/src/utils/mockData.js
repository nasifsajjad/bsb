/**
 * Mock API responses for demo/standalone mode.
 * Used when the backend is unreachable (e.g. running the built frontend without a server).
 */

function randomBetween(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function addDays(dateStr, days) {
  const d = new Date(dateStr + 'T00:00:00');
  d.setDate(d.getDate() + days);
  return d.toISOString().split('T')[0];
}

const MOCK_DESTINATIONS = [
  { iata: 'BKK', city: 'Bangkok', country: 'Thailand', flag: '🇹🇭', flightBase: 420, hotelBase: 35, activityBase: 30, highlights: ['Street food paradise', 'Grand Palace', 'Floating markets'] },
  { iata: 'LIS', city: 'Lisbon', country: 'Portugal', flag: '🇵🇹', flightBase: 380, hotelBase: 80, activityBase: 50, highlights: ['Pastel de nata cafés', 'Tram 28', 'Belém Tower'] },
  { iata: 'KRK', city: 'Kraków', country: 'Poland', flag: '🇵🇱', flightBase: 290, hotelBase: 55, activityBase: 35, highlights: ['Wawel Castle', 'Kazimierz district', 'Medieval markets'] },
  { iata: 'VNO', city: 'Vilnius', country: 'Lithuania', flag: '🇱🇹', flightBase: 260, hotelBase: 60, activityBase: 30, highlights: ['Old Town UNESCO site', 'Local amber markets', 'Gothic architecture'] },
  { iata: 'BUD', city: 'Budapest', country: 'Hungary', flag: '🇭🇺', flightBase: 310, hotelBase: 65, activityBase: 40, highlights: ['Thermal baths', 'Ruin bars', 'Parliament building'] },
  { iata: 'ATH', city: 'Athens', country: 'Greece', flag: '🇬🇷', flightBase: 340, hotelBase: 75, activityBase: 45, highlights: ['Acropolis & Parthenon', 'Monastiraki flea market', 'Souvlaki street food'] },
  { iata: 'PRG', city: 'Prague', country: 'Czech Republic', flag: '🇨🇿', flightBase: 300, hotelBase: 70, activityBase: 38, highlights: ['Charles Bridge', 'Old Town Square', 'Czech pilsner culture'] },
  { iata: 'KUL', city: 'Kuala Lumpur', country: 'Malaysia', flag: '🇲🇾', flightBase: 480, hotelBase: 40, activityBase: 25, highlights: ['Petronas Towers', 'Jalan Alor food street', 'Batu Caves'] },
  { iata: 'LIM', city: 'Lima', country: 'Peru', flag: '🇵🇪', flightBase: 390, hotelBase: 55, activityBase: 35, highlights: ['World-class ceviche', 'Miraflores clifftop walks', 'Larco Museum'] },
  { iata: 'CMN', city: 'Casablanca', country: 'Morocco', flag: '🇲🇦', flightBase: 320, hotelBase: 50, activityBase: 30, highlights: ['Hassan II Mosque', 'Medina souks', 'Mint tea culture'] },
];

const AIRLINES = ['Ryanair', 'easyJet', 'Wizz Air', 'TAP Air Portugal', 'Turkish Airlines', 'Pegasus Airlines', 'LOT Polish Airlines', 'Vueling', 'Iberia Express', 'Air Arabia'];
const HOTEL_NAMES = [
  'Central Boutique Hostel', 'Old Town Guesthouse', 'City Budget Inn',
  'Riverside Stay Hotel', 'Heritage House Hotel', 'The Budget Traveller',
  'Nomad Central Hotel', 'Urban Nest Hostel', 'Passport Inn',
];

export function generateMockTrips({ origin, windowStart, stayDays, travelers, currency }) {
  const shuffled = [...MOCK_DESTINATIONS].sort(() => Math.random() - 0.5);

  return shuffled.map((dest, i) => {
    // Stagger departure dates across the window
    const departureDate = addDays(windowStart, i * 2);
    const returnDate = addDays(departureDate, stayDays);

    const flightPricePerPerson = dest.flightBase + randomBetween(-50, 80);
    const flightTotal = flightPricePerPerson * travelers;

    const nightlyRate = dest.hotelBase + randomBetween(-10, 20);
    const hotelTotal = nightlyRate * stayDays * Math.ceil(travelers / 2);

    const dailyActivity = dest.activityBase + randomBetween(-5, 15);
    const activitiesTotal = dailyActivity * stayDays * travelers;

    const grandTotal = flightTotal + hotelTotal + activitiesTotal;

    const airline = AIRLINES[i % AIRLINES.length];
    const hotelName = HOTEL_NAMES[i % HOTEL_NAMES.length];

    // Build realistic Google Flights deep link
    const bookingLink = `https://www.google.com/travel/flights?q=flights+from+${origin}+to+${dest.iata}&tfs=CBwQAhopEgoyMDI0LTAxLTAxKABSC${origin}agMLEgJHQhoCU0Y`;
    const hotelLink = `https://www.google.com/travel/hotels?q=hotels+in+${encodeURIComponent(dest.city + ', ' + dest.country)}&dates=${departureDate},${returnDate}&guests=${travelers}`;

    return {
      id: `${dest.iata}-${departureDate}`,
      destination: { iata: dest.iata, city: dest.city, country: dest.country },
      flight: {
        price: flightPricePerPerson,
        airline,
        flightNumber: `${airline.slice(0, 2).toUpperCase()}${randomBetween(100, 999)}`,
        departureDate,
        returnDate,
        totalCost: flightTotal,
        bookingLink,
      },
      hotel: {
        name: hotelName,
        nightlyRate,
        totalCost: hotelTotal,
        rating: (3.5 + Math.random() * 1.4).toFixed(1),
        reviewCount: randomBetween(120, 2800),
        bookingLink: hotelLink,
        thumbnail: null,
      },
      activities: {
        dailyCost: dailyActivity,
        currency,
        highlights: dest.highlights,
        totalCost: activitiesTotal,
        perDayPerPerson: dailyActivity,
      },
      grandTotal,
      stayDays,
      travelers,
      currency,
    };
  }).sort((a, b) => a.grandTotal - b.grandTotal);
}

export const MOCK_ITINERARIES = {
  default: (city, stayDays) => ({
    intro: `${city} is one of the most rewarding budget destinations in the world — rich culture, incredible food, and friendly locals await.`,
    days: Array.from({ length: Math.min(stayDays, 7) }, (_, i) => ({
      day: i + 1,
      title: ['Arrival & First Impressions', 'Deep Dive Into the Old Town', 'Markets & Street Food', 'Day Trip to the Outskirts', 'Culture & Museums', 'Hidden Gems & Local Life', 'Final Day & Souvenirs'][i] || `Day ${i + 1} — Explore More`,
      activities: [
        `Explore ${city}'s city center on foot`,
        'Visit the main historic landmarks',
        'Browse local markets and shop for crafts',
      ],
      meal: `Try the local specialty dish at a neighbourhood restaurant`,
      tip: i === 0 ? 'Get a local SIM card at the airport for cheap data' : 'Use public transport — it\'s cheap and gives you a real local experience',
    })),
    bestTimeToVisit: 'Spring (March–May) and autumn (September–November) for mild weather and fewer tourists',
    packingTip: 'Pack comfortable walking shoes — the best discoveries happen on foot',
  }),
};
