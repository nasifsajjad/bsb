import { useState, useEffect } from 'react';

const API_BASE = import.meta.env.VITE_API_BASE_URL || '';

export function useGeoLocation() {
  const [location, setLocation] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function detectLocation() {
      try {
        const res = await fetch(`${API_BASE}/api/geocode`, {
          signal: AbortSignal.timeout(4000),
        });
        if (!res.ok) throw new Error('Geocode failed');
        const data = await res.json();
        if (!cancelled) setLocation(data);
      } catch {
        // Silently fall back — no errors shown to user
        if (!cancelled) setLocation({ city: 'New York', country: 'United States', iata: 'JFK', countryCode: 'US' });
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    detectLocation();
    return () => { cancelled = true; };
  }, []);

  return { location, loading };
}
