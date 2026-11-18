import { useState } from 'react';

const STORAGE_KEY = 'chiri.wideLayout';
const WIDE = 'wide';

// A per-viewer convenience: the page keeps working when storage is blocked or full, so every
// access is guarded and a failure only means the choice is not remembered.
function readStored(): boolean {
  try {
    return window.localStorage.getItem(STORAGE_KEY) === WIDE;
  } catch {
    return false;
  }
}

function writeStored(wide: boolean): void {
  try {
    if (wide) {
      window.localStorage.setItem(STORAGE_KEY, WIDE);
    } else {
      window.localStorage.removeItem(STORAGE_KEY);
    }
  } catch {
    // Not remembered; the layout still changes for this visit.
  }
}

// The working area is either the reading width or the full page. The choice is remembered.
export function useWideLayout(): { wide: boolean; setWide: (wide: boolean) => void } {
  const [wide, setWideState] = useState(readStored);
  const setWide = (next: boolean): void => {
    setWideState(next);
    writeStored(next);
  };
  return { wide, setWide };
}
