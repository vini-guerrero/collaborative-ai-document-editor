import { useSyncExternalStore } from 'react';
import { BREAKPOINTS, type ViewportBreakpoint, type Breakpoint } from './breakpoints';

// Largest first, so the first match is the current breakpoint.
const DESCENDING: readonly Breakpoint[] = ['xl', 'lg', 'md', 'sm'];
const SERVER_SNAPSHOT: ViewportBreakpoint = 'base';

function minWidthQuery(breakpoint: Breakpoint): string {
  return `(min-width: ${String(BREAKPOINTS[breakpoint])}px)`;
}

function readBreakpoint(): ViewportBreakpoint {
  for (const breakpoint of DESCENDING) {
    if (window.matchMedia(minWidthQuery(breakpoint)).matches) {
      return breakpoint;
    }
  }
  return 'base';
}

// Subscribes to every breakpoint query so a change at any edge notifies React. The returned
// function removes every listener it added.
function subscribe(onChange: () => void): () => void {
  const lists = DESCENDING.map((breakpoint) => window.matchMedia(minWidthQuery(breakpoint)));
  for (const list of lists) {
    list.addEventListener('change', onChange);
  }
  return () => {
    for (const list of lists) {
      list.removeEventListener('change', onChange);
    }
  };
}

// S9: the layout mode is chosen from the viewport width. Server rendering reports 'base'.
export function useBreakpoint(): ViewportBreakpoint {
  return useSyncExternalStore(subscribe, readBreakpoint, () => SERVER_SNAPSHOT);
}
