import { useState, useEffect, useMemo, useCallback, useRef } from 'react';

let airportCache = null;

async function loadAirports() {
  if (airportCache) return airportCache;
  try {
    // Try public folder first (works in both dev and prod builds)
    const res = await fetch('/airportData.json');
    if (!res.ok) throw new Error('Failed to load airports');
    airportCache = await res.json();
    return airportCache;
  } catch {
    // Fallback: try importing directly (dev only)
    try {
      const mod = await import('../data/airportData.json');
      airportCache = mod.default;
      return airportCache;
    } catch {
      return [];
    }
  }
}

function rankResults(airports, query) {
  const q = query.toLowerCase().trim();
  
  return airports
    .map(airport => {
      const iata = airport.iata?.toLowerCase() || '';
      const city = airport.city?.toLowerCase() || '';
      const name = airport.name?.toLowerCase() || '';
      const country = airport.country?.toLowerCase() || '';

      let score = 0;

      // Exact IATA match
      if (iata === q) score = 100;
      // IATA starts with
      else if (iata.startsWith(q)) score = 90;
      // City exact match
      else if (city === q) score = 85;
      // City starts with
      else if (city.startsWith(q)) score = 75;
      // City contains
      else if (city.includes(q)) score = 60;
      // Country starts with
      else if (country.startsWith(q)) score = 50;
      // Airport name contains
      else if (name.includes(q)) score = 40;
      // Country contains
      else if (country.includes(q)) score = 30;
      else score = -1;

      return { airport, score };
    })
    .filter(({ score }) => score >= 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 8)
    .map(({ airport }) => airport);
}

export function useAirportSearch() {
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [selectedAirport, setSelectedAirport] = useState(null);
  const [isOpen, setIsOpen] = useState(false);
  const [focusedIndex, setFocusedIndex] = useState(-1);
  const [airports, setAirports] = useState([]);
  const debounceRef = useRef(null);

  // Load airports once on mount
  useEffect(() => {
    loadAirports().then(data => setAirports(data));
  }, []);

  // Debounced search
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (query.length < 2) {
      setSuggestions([]);
      setIsOpen(false);
      return;
    }

    debounceRef.current = setTimeout(() => {
      const results = rankResults(airports, query);
      setSuggestions(results);
      setIsOpen(results.length > 0);
      setFocusedIndex(-1);
    }, 150);

    return () => clearTimeout(debounceRef.current);
  }, [query, airports]);

  const selectAirport = useCallback((airport) => {
    setSelectedAirport(airport);
    setQuery(`${airport.city}, ${airport.country} (${airport.iata})`);
    setSuggestions([]);
    setIsOpen(false);
    setFocusedIndex(-1);
  }, []);

  const handleKeyDown = useCallback((e) => {
    if (!isOpen || !suggestions.length) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setFocusedIndex(i => Math.min(i + 1, suggestions.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setFocusedIndex(i => Math.max(i - 1, 0));
    } else if (e.key === 'Enter' && focusedIndex >= 0) {
      e.preventDefault();
      selectAirport(suggestions[focusedIndex]);
    } else if (e.key === 'Escape') {
      setIsOpen(false);
      setFocusedIndex(-1);
    }
  }, [isOpen, suggestions, focusedIndex, selectAirport]);

  const clearSelection = useCallback(() => {
    setSelectedAirport(null);
    setQuery('');
    setSuggestions([]);
    setIsOpen(false);
  }, []);

  const prefillAirport = useCallback((airport) => {
    if (!airport) return;
    setSelectedAirport(airport);
    setQuery(`${airport.city}, ${airport.country} (${airport.iata})`);
  }, []);

  return {
    query,
    setQuery: (val) => {
      setQuery(val);
      if (selectedAirport) setSelectedAirport(null);
    },
    suggestions,
    selectedAirport,
    isOpen,
    focusedIndex,
    selectAirport,
    handleKeyDown,
    clearSelection,
    prefillAirport,
    close: () => setIsOpen(false),
  };
}
