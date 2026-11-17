import { describe, expect, it } from 'vitest';
import {
  THEME_ATTRIBUTE_VALUE,
  applyTheme,
  watchColorScheme,
  type ColorSchemeSource,
  type ThemeRoot,
} from './theme';

// S3: theme is token-set selection on the root; tested with plain fakes, no DOM needed.
function fakeRoot(): { root: ThemeRoot; attributes: Map<string, string> } {
  const attributes = new Map<string, string>();
  const root: ThemeRoot = {
    setAttribute: (name, value) => {
      attributes.set(name, value);
    },
  };
  return { root, attributes };
}

function fakeMedia(initialMatches: boolean): {
  media: ColorSchemeSource;
  setMatches: (next: boolean) => void;
  listenerCount: () => number;
} {
  const listeners = new Set<() => void>();
  const state = { matches: initialMatches };
  const media: ColorSchemeSource = {
    get matches() {
      return state.matches;
    },
    addEventListener: (_type, listener) => {
      listeners.add(listener);
    },
    removeEventListener: (_type, listener) => {
      listeners.delete(listener);
    },
  };
  return {
    media,
    setMatches: (next) => {
      state.matches = next;
      for (const listener of listeners) {
        listener();
      }
    },
    listenerCount: () => listeners.size,
  };
}

describe('applyTheme (S3)', () => {
  it('sets data-theme to the ADS activation value and data-color-mode to the mode', () => {
    const { root, attributes } = fakeRoot();

    applyTheme(root, 'dark');

    expect(attributes.get('data-theme')).toBe(THEME_ATTRIBUTE_VALUE);
    expect(attributes.get('data-color-mode')).toBe('dark');
  });
});

describe('watchColorScheme (S3)', () => {
  it('applies light when the system prefers light, and dark when it matches dark', () => {
    const light = fakeRoot();
    watchColorScheme(light.root, fakeMedia(false).media);
    expect(light.attributes.get('data-color-mode')).toBe('light');

    const dark = fakeRoot();
    watchColorScheme(dark.root, fakeMedia(true).media);
    expect(dark.attributes.get('data-color-mode')).toBe('dark');
  });

  it('reapplies the mode when the color scheme changes', () => {
    const { root, attributes } = fakeRoot();
    const media = fakeMedia(false);
    watchColorScheme(root, media.media);

    media.setMatches(true);

    expect(attributes.get('data-color-mode')).toBe('dark');
  });

  it('removes its listener when the returned cleanup runs', () => {
    const { root, attributes } = fakeRoot();
    const media = fakeMedia(false);
    const cleanup = watchColorScheme(root, media.media);

    cleanup();
    media.setMatches(true);

    expect(media.listenerCount()).toBe(0);
    expect(attributes.get('data-color-mode')).toBe('light');
  });
});
