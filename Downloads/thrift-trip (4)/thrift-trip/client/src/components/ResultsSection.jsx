import { useState } from 'react';
import TripCard from './TripCard.jsx';
import TripDetailModal from './TripDetailModal.jsx';

export default function ResultsSection({ trips, loading, error, hasSearched, onRetry, isDemoMode }) {
  const [selectedTrip, setSelectedTrip] = useState(null);

  if (!hasSearched && !loading) return null;

  return (
    <section className="results-section" id="results">
      {/* Demo mode banner */}
      {isDemoMode && !loading && trips.length > 0 && (
        <div style={{
          maxWidth: '1200px',
          margin: '0 auto var(--space-6)',
          padding: '0 var(--space-6)',
        }}>
          <div style={{
            background: 'rgba(212,168,83,0.12)',
            border: '1px solid rgba(212,168,83,0.4)',
            borderRadius: 'var(--radius-md)',
            padding: 'var(--space-3) var(--space-5)',
            display: 'flex',
            alignItems: 'center',
            gap: 'var(--space-3)',
            fontSize: '0.85rem',
            color: 'var(--ink-light)',
          }}>
            <span style={{ fontSize: '1rem' }}>✦</span>
            <span>
              <strong>Demo mode</strong> — showing sample destinations. Connect a backend with your API keys to see real live prices.
              See the README for setup instructions.
            </span>
          </div>
        </div>
      )}

      {/* Header */}
      {!loading && !error && trips.length > 0 && (
        <div className="results-section__header">
          <h2 className="results-section__title">Best Trips Found</h2>
          <span className="results-section__count">{trips.length} destination{trips.length !== 1 ? 's' : ''} · ranked by total cost</span>
        </div>
      )}

      {/* Loading state */}
      {loading && (
        <>
          <div className="loading-status">
            <div className="loading-status__text">
              <span className="loading-dot" />
              Scanning flights worldwide and pairing with hotels…
            </div>
          </div>
          <div className="skeleton-grid">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="skeleton-card">
                <div className="skeleton-shimmer" />
              </div>
            ))}
          </div>
        </>
      )}

      {/* Error state */}
      {!loading && error && (
        <div className="state-message">
          <div className="state-message__icon">✈️💨</div>
          <h3 className="state-message__title">Something went sideways</h3>
          <p className="state-message__body">{error}</p>
          <button className="btn-retry" onClick={onRetry}>Try Again</button>
        </div>
      )}

      {/* Empty state */}
      {!loading && !error && hasSearched && trips.length === 0 && (
        <div className="state-message">
          <div className="state-message__icon">🌍</div>
          <h3 className="state-message__title">No trips found</h3>
          <p className="state-message__body">
            We couldn't find flight and hotel combinations for your search. Try widening your travel window, adjusting your stay length, or searching from a different airport.
          </p>
          <button className="btn-retry" onClick={onRetry}>Adjust Search</button>
        </div>
      )}

      {/* Results grid */}
      {!loading && !error && trips.length > 0 && (
        <div className="results-grid">
          {trips.map((trip) => (
            <TripCard
              key={trip.id}
              trip={trip}
              onOpen={setSelectedTrip}
            />
          ))}
        </div>
      )}

      {/* Modal */}
      {selectedTrip && (
        <TripDetailModal
          trip={selectedTrip}
          onClose={() => setSelectedTrip(null)}
        />
      )}
    </section>
  );
}
