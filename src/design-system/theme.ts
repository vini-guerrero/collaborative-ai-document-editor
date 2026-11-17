// Light and dark switch through ADS token sets (S3). Components carry no theme logic:
// the vendored token CSS selects on data-theme and data-color-mode, set here on the root.

export type ColorMode = 'light' | 'dark';

// Matches the activation selectors in vendor/ads-tokens (light:light, dark:dark, plus the
// spacing, typography, shape and motion sets).
export const THEME_ATTRIBUTE_VALUE =
  'light:light dark:dark spacing:spacing typography:typography shape:shape motion:motion';

// Narrow shapes so the functions take real DOM objects and plain test fakes alike.
export interface ThemeRoot {
  setAttribute(name: string, value: string): void;
}

export interface ColorSchemeSource {
  readonly matches: boolean;
  addEventListener(type: 'change', listener: () => void): void;
  removeEventListener(type: 'change', listener: () => void): void;
}

export function applyTheme(root: ThemeRoot, mode: ColorMode): void {
  root.setAttribute('data-theme', THEME_ATTRIBUTE_VALUE);
  root.setAttribute('data-color-mode', mode);
}

// Follows the OS preference (S3) and returns a cleanup that removes the listener.
export function watchColorScheme(root: ThemeRoot, media: ColorSchemeSource): () => void {
  const sync = (): void => {
    applyTheme(root, media.matches ? 'dark' : 'light');
  };
  sync();
  media.addEventListener('change', sync);
  return (): void => {
    media.removeEventListener('change', sync);
  };
}
