import { useContext, useSyncExternalStore } from 'react';
import type { ColorMode } from './theme';
import { ThemeContext } from './themeContext';

// The mode on screen and a setter that fixes it (leaving "follow the system").
export function useThemeMode(): readonly [ColorMode, (next: ColorMode) => void] {
  const controller = useContext(ThemeContext);
  const mode = useSyncExternalStore(controller.subscribe, controller.mode);
  return [mode, controller.set];
}
