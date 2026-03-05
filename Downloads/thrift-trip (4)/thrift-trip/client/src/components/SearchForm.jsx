import { useState, useEffect, useRef } from 'react';
import { useAirportSearch } from '../hooks/useAirportSearch.js';
import { useGeoLocation } from '../hooks/useGeoLocation.js';
import { getTodayStr, getDateInDays } from '../utils/dateHelpers.js';

export default function SearchForm({ onSearch, loading }) {
  const { location } = useGeoLocation();
  const airport = useAirportSearch();
  const dropdownRef = useRef(null);

  const [windowStart, setWindowStart] = useState(getDateInDays(7));
  const [windowEnd, setWindowEnd] = useState(getDateInDays(30));
  const [stayDays, setStayDays] = useState(7);
  const [travelers, setTravelers] = useState(1);
  const [errors, setErrors] = useState({});

  const today = getTodayStr();
  const maxDate = getDateInDays(90);

  // Pre-fill origin from IP geolocation
  useEffect(() => {
    if (location?.iata && !airport.selectedAirport) {
      airport.prefillAirport({
        iata: location.iata,
        city: location.city,
        country: location.country,
        currency: 'USD',
      });
    }
  }, [location]);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClick(e) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        airport.close();
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [airport.close]);

  function validate() {
    const errs = {};
    if (!airport.selectedAirport) errs.origin = 'Please select a departure airport';
    if (!windowStart) errs.windowStart = 'Required';
    if (!windowEnd) errs.windowEnd = 'Required';
    if (windowEnd <= windowStart) errs.windowEnd = 'End must be after start';
    if (stayDays < 1) errs.stayDays = 'At least 1 day';
    return errs;
  }

  function handleSubmit(e) {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length) {
      setErrors(errs);
      return;
    }
    setErrors({});
    onSearch({
      origin: airport.selectedAirport.iata,
      windowStart,
      windowEnd,
      stayDays,
      travelers,
      currency: airport.selectedAirport.currency || 'USD',
    });
  }

  const stayLabel = stayDays === 1 ? 'night' : 'nights';
  const travelerLabel = travelers === 1 ? 'traveler' : 'travelers';

  return (
    <section className="search-section" id="search">
      <form className="search-form" onSubmit={handleSubmit} noValidate>
        <h2 className="search-form__title">Where can you go?</h2>

        {/* Row 1: Origin + Travel Window */}
        <div className="search-form__grid">
          {/* Origin airport */}
          <div className="form-field" ref={dropdownRef}>
            <label className="form-field__label">Departing from</label>
            <input
              className="form-field__input"
              type="text"
              placeholder="City or airport code..."
              value={airport.query}
              onChange={e => airport.setQuery(e.target.value)}
              onKeyDown={airport.handleKeyDown}
              onFocus={() => airport.query.length >= 2 && airport.close() === undefined}
              autoComplete="off"
            />
            {errors.origin && (
              <span style={{ fontSize: '0.75rem', color: 'var(--rust)', marginTop: '2px' }}>{errors.origin}</span>
            )}
            {airport.isOpen && airport.suggestions.length > 0 && (
              <div className="airport-dropdown">
                {airport.suggestions.map((a, i) => (
                  <div
                    key={a.iata}
                    className={`airport-dropdown__item${airport.focusedIndex === i ? ' airport-dropdown__item--focused' : ''}`}
                    onMouseDown={() => airport.selectAirport(a)}
                  >
                    <div className="airport-dropdown__city">
                      🌍 {a.city}, {a.country}
                      <span className="airport-dropdown__iata">{a.iata}</span>
                    </div>
                    <div className="airport-dropdown__detail">{a.name}</div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Travel window */}
          <div className="form-field">
            <label className="form-field__label">Travel window</label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
              <div>
                <input
                  className="form-field__input"
                  type="date"
                  value={windowStart}
                  min={today}
                  max={maxDate}
                  onChange={e => setWindowStart(e.target.value)}
                  style={{ fontSize: '0.85rem' }}
                />
                {errors.windowStart && (
                  <span style={{ fontSize: '0.72rem', color: 'var(--rust)' }}>{errors.windowStart}</span>
                )}
              </div>
              <div>
                <input
                  className="form-field__input"
                  type="date"
                  value={windowEnd}
                  min={windowStart || today}
                  max={maxDate}
                  onChange={e => setWindowEnd(e.target.value)}
                  style={{ fontSize: '0.85rem' }}
                />
                {errors.windowEnd && (
                  <span style={{ fontSize: '0.72rem', color: 'var(--rust)' }}>{errors.windowEnd}</span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Row 2: Stay length + Travelers */}
        <div className="search-form__row">
          <div className="form-field">
            <label className="form-field__label">Length of stay</label>
            <div className="stepper">
              <button
                type="button"
                className="stepper__btn"
                onClick={() => setStayDays(d => Math.max(1, d - 1))}
                aria-label="Decrease stay"
              >−</button>
              <div className="stepper__value">
                {stayDays} <span className="stepper__unit">{stayLabel}</span>
              </div>
              <button
                type="button"
                className="stepper__btn"
                onClick={() => setStayDays(d => Math.min(30, d + 1))}
                aria-label="Increase stay"
              >+</button>
            </div>
          </div>

          <div className="form-field">
            <label className="form-field__label">Travelers</label>
            <div className="stepper">
              <button
                type="button"
                className="stepper__btn"
                onClick={() => setTravelers(t => Math.max(1, t - 1))}
                aria-label="Decrease travelers"
              >−</button>
              <div className="stepper__value">
                {travelers} <span className="stepper__unit">{travelerLabel}</span>
              </div>
              <button
                type="button"
                className="stepper__btn"
                onClick={() => setTravelers(t => Math.min(9, t + 1))}
                aria-label="Increase travelers"
              >+</button>
            </div>
          </div>
        </div>

        {/* CTA */}
        <button type="submit" className="btn-cta" disabled={loading}>
          {loading ? (
            <>
              <span className="loading-dot" />
              Scanning flights worldwide…
            </>
          ) : (
            <>✦ Find My Trip</>
          )}
        </button>
      </form>
    </section>
  );
}
