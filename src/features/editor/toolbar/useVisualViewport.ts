import { useEffect, useState } from 'react';
import type { Box } from './toolbarPosition';

// The area the user can see: the visual viewport, which shrinks when the on-screen keyboard opens
// (S9). Falls back to the window where the visual viewport is not available.
// jsdom and some embedded browsers do not define the property at all, so check for it first.
function currentViewport(): VisualViewport | null {
  return 'visualViewport' in window ? window.visualViewport : null;
}

function readViewport(): Box {
  const viewport = currentViewport();
  if (viewport === null) {
    return { top: 0, left: 0, width: window.innerWidth, height: window.innerHeight };
  }
  return {
    top: viewport.offsetTop,
    left: viewport.offsetLeft,
    width: viewport.width,
    height: viewport.height,
  };
}

// Tracks the visual viewport, with listeners removed on unmount.
export function useVisualViewport(): Box {
  const [box, setBox] = useState<Box>(readViewport);

  useEffect(() => {
    const update = (): void => {
      setBox(readViewport());
    };
    const viewport = currentViewport();
    window.addEventListener('resize', update);
    viewport?.addEventListener('resize', update);
    viewport?.addEventListener('scroll', update);
    return () => {
      window.removeEventListener('resize', update);
      viewport?.removeEventListener('resize', update);
      viewport?.removeEventListener('scroll', update);
    };
  }, []);

  return box;
}
