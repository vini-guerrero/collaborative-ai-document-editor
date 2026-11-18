import { applyTheme, type ColorMode, type ColorSchemeSource, type ThemeRoot } from './theme';

// S3: the author can follow the system or pick a mode. The choice is kept in the browser.
export const THEME_PREFERENCES = ['system', 'light', 'dark'] as const;
export type ThemePreference = (typeof THEME_PREFERENCES)[number];

export const THEME_STORAGE_KEY = 'chiri.theme';

// Narrow shape so a plain fake works in tests.
export interface ThemeStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

export interface ThemeController {
  readonly get: () => ThemePreference;
  // The mode on screen: the preference, or the system's when it follows the system.
  readonly mode: () => ColorMode;
  readonly set: (preference: ThemePreference) => void;
  readonly subscribe: (listener: () => void) => () => void;
  // Removes the system-scheme listener.
  readonly dispose: () => void;
}

// Stored values are untrusted: anything unknown falls back to following the system.
export function parseThemePreference(raw: string | null): ThemePreference {
  return THEME_PREFERENCES.find((preference) => preference === raw) ?? 'system';
}

export function resolveColorMode(preference: ThemePreference, systemIsDark: boolean): ColorMode {
  if (preference === 'system') {
    return systemIsDark ? 'dark' : 'light';
  }
  return preference;
}

function readPreference(storage: ThemeStorage): ThemePreference {
  try {
    return parseThemePreference(storage.getItem(THEME_STORAGE_KEY));
  } catch {
    // Storage can be blocked (private windows); the page then follows the system.
    return 'system';
  }
}

// Applies the mode to the root now, on every system change, and on every `set`.
export function createThemeController(
  root: ThemeRoot,
  media: ColorSchemeSource,
  storage: ThemeStorage,
): ThemeController {
  let preference = readPreference(storage);
  const listeners = new Set<() => void>();
  const sync = (): void => {
    applyTheme(root, resolveColorMode(preference, media.matches));
    for (const listener of listeners) {
      listener();
    }
  };
  sync();
  media.addEventListener('change', sync);
  return {
    get: () => preference,
    mode: () => resolveColorMode(preference, media.matches),
    set: (next) => {
      preference = next;
      sync();
      try {
        storage.setItem(THEME_STORAGE_KEY, next);
      } catch {
        // The choice still applies for this visit; it is just not remembered.
      }
    },
    subscribe: (listener) => {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    dispose: () => {
      media.removeEventListener('change', sync);
    },
  };
}
