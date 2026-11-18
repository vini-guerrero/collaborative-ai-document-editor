import { useContext, useSyncExternalStore } from 'react';
import { ThemeContext } from './themeContext';
import type { ThemePreference } from './themePreference';

export function useThemePreference(): readonly [ThemePreference, (next: ThemePreference) => void] {
  const controller = useContext(ThemeContext);
  const preference = useSyncExternalStore(controller.subscribe, controller.get);
  return [preference, controller.set];
}
