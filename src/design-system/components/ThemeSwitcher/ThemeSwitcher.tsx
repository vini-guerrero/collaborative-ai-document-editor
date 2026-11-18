import type { JSX } from 'react';
import { useThemePreference } from '../../useThemePreference';
import { THEME_PREFERENCES, parseThemePreference } from '../../themePreference';
import { Select, type SelectOption } from '../Select/Select';

const LABELS = { system: 'System', light: 'Light', dark: 'Dark' } as const;
const OPTIONS: readonly SelectOption[] = THEME_PREFERENCES.map((value) => ({
  value,
  label: LABELS[value],
}));

// S3: the colour mode choice, System, Light or Dark.
export function ThemeSwitcher(): JSX.Element {
  const [preference, setPreference] = useThemePreference();
  return (
    <Select
      label="Theme"
      value={preference}
      options={OPTIONS}
      onChange={(value) => {
        setPreference(parseThemePreference(value));
      }}
    />
  );
}
