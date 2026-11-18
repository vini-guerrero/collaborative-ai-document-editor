import { describe, expect, it, vi } from 'vitest';
import type { ColorSchemeSource } from './theme';
import {
  THEME_STORAGE_KEY,
  createThemeController,
  parseThemePreference,
  resolveColorMode,
  type ThemeStorage,
} from './themePreference';

// S3: the stored choice wins over the system; unknown values follow the system.
function fixtures(initial: string | null, systemIsDark: boolean) {
  const attributes = new Map<string, string>();
  const root = {
    setAttribute: (name: string, value: string): void => {
      attributes.set(name, value);
    },
  };
  const removeListener = vi.fn();
  const media: ColorSchemeSource = {
    matches: systemIsDark,
    addEventListener: vi.fn(),
    removeEventListener: removeListener,
  };
  const store = new Map<string, string>(initial === null ? [] : [[THEME_STORAGE_KEY, initial]]);
  const storage: ThemeStorage = {
    getItem: (key) => store.get(key) ?? null,
    setItem: (key, value) => {
      store.set(key, value);
    },
  };
  return { attributes, root, media, storage, store, removeListener };
}

describe('theme preference (S3)', () => {
  it('parses only known values and falls back to system', () => {
    expect(parseThemePreference('dark')).toBe('dark');
    expect(parseThemePreference('purple')).toBe('system');
    expect(parseThemePreference(null)).toBe('system');
  });

  it('resolves system from the OS and keeps an explicit pick', () => {
    expect(resolveColorMode('system', true)).toBe('dark');
    expect(resolveColorMode('light', true)).toBe('light');
  });

  it('applies the stored preference at start', () => {
    const f = fixtures('light', true);
    createThemeController(f.root, f.media, f.storage);
    expect(f.attributes.get('data-color-mode')).toBe('light');
  });

  it('applies, stores and announces a new preference', () => {
    const f = fixtures(null, false);
    const controller = createThemeController(f.root, f.media, f.storage);
    const listener = vi.fn();
    controller.subscribe(listener);

    controller.set('dark');

    expect(f.attributes.get('data-color-mode')).toBe('dark');
    expect(f.store.get(THEME_STORAGE_KEY)).toBe('dark');
    expect(controller.get()).toBe('dark');
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it('removes the system listener on dispose', () => {
    const f = fixtures(null, false);
    createThemeController(f.root, f.media, f.storage).dispose();
    expect(f.removeListener).toHaveBeenCalled();
  });
});

describe('theme mode (S3)', () => {
  it('reports the system mode until a mode is set, then that mode', () => {
    const f = fixtures(null, true);
    const controller = createThemeController(f.root, f.media, f.storage);
    expect(controller.mode()).toBe('dark');
    controller.set('light');
    expect(controller.mode()).toBe('light');
  });
});
