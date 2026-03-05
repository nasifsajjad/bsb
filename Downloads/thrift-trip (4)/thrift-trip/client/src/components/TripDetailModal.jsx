import { useState, useEffect } from 'react';
import { formatCurrency } from '../utils/currencyFormatter.js';
import { formatDate } from '../utils/dateHelpers.js';
import { MOCK_ITINERARIES } from '../utils/mockData.js';

const API_BASE = import.meta.env.VITE_API_BASE_URL || '';

export default function TripDetailModal({ trip, onClose }) {
  const [itinerary, setItinerary] = useState(null);
  const [loadingItinerary, setLoadingItinerary] = useState(true);

  const { destination, flight, hotel, activities, grandTotal, stayDays, travelers, currency } = trip;
  const fmt = (amount) => formatCurrency(amount, currency);

  // Load itinerary from Gemini (or fall back to mock)
  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const res = await fetch(
          `${API_BASE}/api/activities/itinerary?city=${encodeURIComponent(destination.city)}&country=${encodeURIComponent(destination.country)}&stayDays=${stayDays}`,
          { signal: AbortSignal.timeout(6000) }
        );
        if (!res.ok) throw new Error('Failed');
        const data = await res.json();
        if (!cancelled) setItinerary(data);
      } catch {
        // Fall back to mock itinerary
        if (!cancelled) setItinerary(MOCK_ITINERARIES.default(destination.city, stayDays));
      } finally {
        if (!cancelled) setLoadingItinerary(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, [destination.city, destination.country, stayDays]);

  // Close on Escape
  useEffect(() => {
    function onKey(e) {
      if (e.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()} role="dialog" aria-modal="true">
        {/* Header */}
        <div className="modal__header">
          <div>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.4rem', fontWeight: 700, letterSpacing: '-0.02em' }}>
              {destination.city}, {destination.country}
            </div>
            <div style={{ fontSize: '0.8rem', color: 'var(--ink-muted)', marginTop: '2px' }}>
              {formatDate(flight.departureDate, 'long')} → {formatDate(flight.returnDate, 'long')}
            </div>
          </div>
          <button className="modal__close" onClick={onClose} aria-label="Close">✕</button>
        </div>

        <div className="modal__body">
          {/* Cost Breakdown */}
          <div className="modal__section">
            <h3 className="modal__section-title">Cost Breakdown</h3>
            <div className="cost-breakdown">
              <div className="cost-breakdown__row">
                <span className="cost-breakdown__label">✈ Flights ({travelers} traveler{travelers > 1 ? 's' : ''})</span>
                <span className="cost-breakdown__value">{fmt(flight.totalCost)}</span>
              </div>
              <div className="cost-breakdown__row">
                <span className="cost-breakdown__label">🏨 Hotel ({stayDays} nights)</span>
                <span className="cost-breakdown__value">{fmt(hotel.totalCost)}</span>
              </div>
              <div className="cost-breakdown__row">
                <span className="cost-breakdown__label">🗺️ Activities & Food (est.)</span>
                <span className="cost-breakdown__value">{fmt(activities.totalCost)}</span>
              </div>
              <div className="cost-breakdown__row cost-breakdown__total">
                <span className="cost-breakdown__label">Grand Total</span>
                <span className="cost-breakdown__value">{fmt(grandTotal)}</span>
              </div>
            </div>
          </div>

          {/* Flight Details */}
          <div className="modal__section">
            <h3 className="modal__section-title">Flight Details</h3>
            <div style={{ fontSize: '0.9rem', color: 'var(--ink-light)', lineHeight: 1.7 }}>
              <div><strong>Airline:</strong> {flight.airline} {flight.flightNumber && `(${flight.flightNumber})`}</div>
              <div><strong>Departure:</strong> {formatDate(flight.departureDate, 'long')}</div>
              <div><strong>Return:</strong> {formatDate(flight.returnDate, 'long')}</div>
              <div><strong>Round-trip price:</strong> {fmt(flight.totalCost)} for {travelers} traveler{travelers > 1 ? 's' : ''}</div>
            </div>
          </div>

          {/* Hotel Details */}
          <div className="modal__section">
            <h3 className="modal__section-title">Hotel Details</h3>
            <div style={{ fontSize: '0.9rem', color: 'var(--ink-light)', lineHeight: 1.7 }}>
              <div><strong>Hotel:</strong> {hotel.name}</div>
              {hotel.rating && <div><strong>Rating:</strong> ★ {hotel.rating} ({hotel.reviewCount?.toLocaleString()} reviews)</div>}
              <div><strong>Nightly rate:</strong> {fmt(hotel.nightlyRate)}</div>
              <div><strong>Total stay ({stayDays} nights):</strong> {fmt(hotel.totalCost)}</div>
            </div>
          </div>

          {/* Itinerary */}
          <div className="modal__section">
            <h3 className="modal__section-title">Suggested Itinerary</h3>
            {loadingItinerary ? (
              <div style={{ color: 'var(--ink-muted)', fontSize: '0.875rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span className="loading-dot" /> Generating your personalized itinerary…
              </div>
            ) : itinerary ? (
              <>
                {itinerary.intro && (
                  <p style={{ fontSize: '0.9rem', color: 'var(--ink-light)', fontStyle: 'italic', marginBottom: 'var(--space-5)', lineHeight: 1.65 }}>
                    {itinerary.intro}
                  </p>
                )}
                {itinerary.days?.map(day => (
                  <div key={day.day} className="itinerary-day">
                    <div className="itinerary-day__title">Day {day.day} — {day.title}</div>
                    <ul className="itinerary-day__activities">
                      {day.activities?.map((a, i) => (
                        <li key={i} className="itinerary-day__activity">{a}</li>
                      ))}
                    </ul>
                    {day.meal && <div className="itinerary-day__meal">🍜 {day.meal}</div>}
                    {day.tip && <div className="itinerary-day__tip">💡 {day.tip}</div>}
                  </div>
                ))}
                {itinerary.bestTimeToVisit && (
                  <div style={{ fontSize: '0.8rem', color: 'var(--ink-muted)', marginTop: 'var(--space-3)' }}>
                    📅 Best time to visit: {itinerary.bestTimeToVisit}
                  </div>
                )}
                {itinerary.packingTip && (
                  <div style={{ fontSize: '0.8rem', color: 'var(--ink-muted)', marginTop: 'var(--space-2)' }}>
                    🎒 {itinerary.packingTip}
                  </div>
                )}
              </>
            ) : (
              <p style={{ fontSize: '0.875rem', color: 'var(--ink-muted)' }}>
                Explore {destination.city}'s local neighborhoods, markets, and cultural landmarks. Ask locals for their favorite hidden spots!
              </p>
            )}
          </div>
        </div>

        {/* Footer CTAs */}
        <div className="modal__footer">
          <a
            href={flight.bookingLink}
            className="btn-book btn-book--flight"
            target="_blank"
            rel="noopener noreferrer"
            style={{ flex: 1 }}
          >
            ✈ Book This Flight
          </a>
          <a
            href={hotel.bookingLink}
            className="btn-book btn-book--hotel"
            target="_blank"
            rel="noopener noreferrer"
            style={{ flex: 1 }}
          >
            🏨 Book This Hotel
          </a>
        </div>
      </div>
    </div>
  );
}
