import { useRef } from 'react';
import HeroSection from '../components/HeroSection.jsx';
import SearchForm from '../components/SearchForm.jsx';
import ResultsSection from '../components/ResultsSection.jsx';
import { useSearchResults } from '../hooks/useSearchResults.js';

export default function Home() {
  const { trips, loading, error, hasSearched, search, reset, isDemoMode } = useSearchResults();
  const resultsRef = useRef(null);

  function handleSearch(params) {
    search(params);
    setTimeout(() => {
      resultsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 100);
  }

  return (
    <>
      <HeroSection />
      <SearchForm onSearch={handleSearch} loading={loading} />
      <div ref={resultsRef}>
        <ResultsSection
          trips={trips}
          loading={loading}
          error={error}
          hasSearched={hasSearched}
          onRetry={reset}
          isDemoMode={isDemoMode}
        />
      </div>
    </>
  );
}
