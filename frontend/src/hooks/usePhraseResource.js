import { useState, useRef, useEffect, useCallback } from 'react';
import { fetchActivePhrase } from '../utils/phraseApi';

export default function usePhraseResource() {
  const [phrase, setPhrase] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const version = useRef(0);
  const refresh = useCallback(async () => {
    const current = ++version.current;
    setLoading(true);
    setError(null);
    try {
      const data = await fetchActivePhrase();
      if (current !== version.current) return false;
      setPhrase(data.phrase);
      return true;
    } catch (failure) {
      if (current === version.current) setError(failure.message);
      return false;
    } finally {
      if (current === version.current) setLoading(false);
    }
  }, []);
  useEffect(() => {
    refresh();
    return () => { version.current += 1; };
  }, [refresh]);
  return { phrase, loading, error, setError, refresh };
}
