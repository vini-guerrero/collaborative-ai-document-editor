import { useEffect, useState } from 'react';
import { TYPEAHEAD_RESET_MS } from './listKeyboard';

// Holds the type-ahead text typed so far. Each keystroke restarts the reset timer, and the timer
// is cleared when the query changes again or the component unmounts (S9, AGENTS: timers released).
export function useTypeaheadQuery(): readonly [string, (query: string) => void] {
  const [query, setQuery] = useState('');

  useEffect(() => {
    if (query === '') {
      return undefined;
    }
    const timerId = setTimeout(() => {
      setQuery('');
    }, TYPEAHEAD_RESET_MS);
    return () => {
      clearTimeout(timerId);
    };
  }, [query]);

  return [query, setQuery];
}
