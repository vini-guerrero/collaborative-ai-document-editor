import type { JSX, ReactNode } from 'react';
import { ThemeContext } from './themeContext';
import type { ThemeController } from './themePreference';

export interface ThemeProviderProps {
  controller: ThemeController;
  children: ReactNode;
}

// Makes the theme controller (created once at startup) available to the switcher.
export function ThemeProvider({ controller, children }: ThemeProviderProps): JSX.Element {
  return <ThemeContext value={controller}>{children}</ThemeContext>;
}
