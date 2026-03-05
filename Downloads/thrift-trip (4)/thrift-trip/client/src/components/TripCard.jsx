import { formatCurrency } from '../utils/currencyFormatter.js';
import { formatDate } from '../utils/dateHelpers.js';

// Country code → flag emoji
function getFlagEmoji(countryName) {
  const flags = {
    'United Kingdom': '🇬🇧', 'France': '🇫🇷', 'Germany': '🇩🇪',
    'Spain': '🇪🇸', 'Italy': '🇮🇹', 'Netherlands': '🇳🇱',
    'Japan': '🇯🇵', 'Thailand': '🇹🇭', 'Singapore': '🇸🇬',
    'Australia': '🇦🇺', 'UAE': '🇦🇪', 'India': '🇮🇳',
    'Mexico': '🇲🇽', 'Brazil': '🇧🇷', 'Colombia': '🇨🇴',
    'Peru': '🇵🇪', 'Turkey': '🇹🇷', 'Egypt': '🇪🇬',
    'Kenya': '🇰🇪', 'South Africa': '🇿🇦', 'Hong Kong': '🇭🇰',
    'Malaysia': '🇲🇾', 'Indonesia': '🇮🇩', 'Philippines': '🇵🇭',
    'Portugal': '🇵🇹', 'Greece': '🇬🇷', 'Hungary': '🇭🇺',
    'Czech Republic': '🇨🇿', 'Poland': '🇵🇱', 'Lithuania': '🇱🇹',
    'China': '🇨🇳', 'South Korea': '🇰🇷', 'New Zealand': '🇳🇿',
    'Canada': '🇨🇦', 'Argentina': '🇦🇷', 'Chile': '🇨🇱',
    'Morocco': '🇲🇦', 'Nigeria': '🇳🇬', 'Pakistan': '🇵🇰',
  };
  return flags[countryName] || '🌍';
}

export default function TripCard({ trip, onOpen, style }) {
  const { destination, flight, hotel, activities, grandTotal, stayDays, travelers, currency } = trip;

  const fmt = (amount) => formatCurrency(amount, currency);

  return (
    <article className="trip-card" style={style} onClick={() => onOpen(trip)}>
      <div className="trip-card__header">
        <div className="trip-card__destination">
          <div className="trip-card__flag">{getFlagEmoji(destination.country)}</div>
          <div className="trip-card__city">{destination.city}</div>
          <div className="trip-card__country">{destination.country}</div>
        </div>
        <div className="trip-card__total">
          <div className="trip-card__total-label">Total trip</div>
          <div className="trip-card__total-price">{fmt(grandTotal)}</div>
          <div className="trip-card__total-sub">
            {travelers > 1 ? `for ${travelers} travelers` : 'per person'}
          </div>
        </div>
      </div>

      <div className="trip-card__body">
        {/* Flight */}
        <div className="trip-card__row">
          <div className="trip-card__icon">✈️</div>
          <div className="trip-card__info">
            <div className="trip-card__info-label">Flight</div>
            <div className="trip-card__info-value">
              {flight.airline}
              {flight.flightNumber && ` · ${flight.flightNumber}`}
            </div>
            <div className="trip-card__info-value" style={{ opacity: 0.7, fontSize: '0.8rem' }}>
              {formatDate(flight.departureDate, 'short')} → {formatDate(flight.returnDate, 'short')} · {stayDays} nights
            </div>
            <div className="trip-card__info-price">{fmt(flight.totalCost)}</div>
          </div>
        </div>

        {/* Hotel */}
        <div className="trip-card__row">
          <div className="trip-card__icon">🏨</div>
          <div className="trip-card__info">
            <div className="trip-card__info-label">Hotel</div>
            <div className="trip-card__info-value">
              {hotel.name}
              {hotel.rating && (
                <span style={{ color: 'var(--gold)', marginLeft: '6px', fontSize: '0.8rem' }}>
                  ★ {hotel.rating}
                </span>
              )}
            </div>
            <div className="trip-card__info-value" style={{ opacity: 0.7, fontSize: '0.8rem' }}>
              {fmt(hotel.nightlyRate)}/night × {stayDays} nights
            </div>
            <div className="trip-card__info-price">{fmt(hotel.totalCost)}</div>
          </div>
        </div>

        {/* Activities */}
        <div className="trip-card__row">
          <div className="trip-card__icon">🗺️</div>
          <div className="trip-card__info">
            <div className="trip-card__info-label">Activities & Food (est.)</div>
            <div className="trip-card__info-value">
              {fmt(activities.perDayPerPerson)}/person/day × {stayDays} days
            </div>
            {activities.highlights?.length > 0 && (
              <div className="trip-card__highlights">
                {activities.highlights.slice(0, 3).map((h, i) => (
                  <span key={i} className="trip-card__highlight-tag">{h}</span>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="trip-card__footer" onClick={e => e.stopPropagation()}>
        <a
          href={flight.bookingLink}
          className="btn-book btn-book--flight"
          target="_blank"
          rel="noopener noreferrer"
        >
          ✈ Book Flight
        </a>
        <a
          href={hotel.bookingLink}
          className="btn-book btn-book--hotel"
          target="_blank"
          rel="noopener noreferrer"
        >
          🏨 Book Hotel
        </a>
      </div>
    </article>
  );
}
