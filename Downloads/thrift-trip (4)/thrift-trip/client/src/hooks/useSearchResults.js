import { useState, useCallback } from 'react';
import { generateMockTrips } from '../utils/mockData.js';

const API_BASE = import.meta.env.VITE_API_BASE_URL || '';

// Simulate realistic loading delay for demo mode
function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export function useSearchResults() {
  const [trips, setTrips] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [hasSearched, setHasSearched] = useState(false);
  const [isDemoMode, setIsDemoMode] = useState(false);

  const search = useCallback(async ({ origin, windowStart, windowEnd, stayDays, travelers, currency }) => {
    setLoading(true);
    setError(null);
    setHasSearched(true);
    setIsDemoMode(false);

    try {
      const res = await fetch(`${API_BASE}/api/flights/search`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ origin, windowStart, windowEnd, stayDays, travelers, currency }),
        // Short timeout so we fall back to demo mode quickly if server is down
        signal: AbortSignal.timeout(8000),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || `Search failed (${res.status})`);
      }

      const data = await res.json();
      setTrips(data.trips || []);
    } catch (err) {
      // If network error or timeout, fall back to demo mode with mock data
      const isNetworkError =
        err.name === 'TypeError' ||
        err.name === 'AbortError' ||
        err.message?.includes('fetch') ||
        err.message?.includes('network') ||
        err.message?.toLowerCase().includes('failed to fetch');

      if (isNetworkError) {
        // Use realistic mock data so the UI is fully explorable
        await delay(2200); // Simulate search time
        const mockTrips = generateMockTrips({ origin, windowStart, stayDays, travelers, currency });
        setTrips(mockTrips);
        setIsDemoMode(true);
      } else {
        setError(err.message || 'Something went wrong. Please try again.');
        setTrips([]);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  const reset = useCallback(() => {
    setTrips([]);
    setError(null);
    setHasSearched(false);
    setIsDemoMode(false);
  }, []);

  return { trips, loading, error, hasSearched, search, reset, isDemoMode };
}
