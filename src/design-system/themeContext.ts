import { createContext } from 'react';
import type { ThemeController } from './themePreference';

// Without a provider (tests, isolated components) the switcher shows "System" and does nothing.
const NO_CONTROLLER: ThemeController = {
  get: () => 'system',
  set: () => undefined,
  subscribe: () => () => undefined,
  dispose: () => undefined,
};

export const ThemeContext = createContext<ThemeController>(NO_CONTROLLER);
