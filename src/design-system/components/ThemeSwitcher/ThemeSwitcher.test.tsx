import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import type { ColorSchemeSource } from '../../theme';
import { createThemeController } from '../../themePreference';
import { ThemeProvider } from '../../ThemeProvider';
import { ThemeSwitcher } from './ThemeSwitcher';

// S3: one icon button flips the mode and its name says what it will switch to.
describe('ThemeSwitcher', () => {
  it('switches from dark to light and back, naming the next mode', async () => {
    const user = userEvent.setup();
    const media: ColorSchemeSource = {
      matches: true,
      addEventListener: () => undefined,
      removeEventListener: () => undefined,
    };
    const store = new Map<string, string>();
    const controller = createThemeController({ setAttribute: () => undefined }, media, {
      getItem: (key) => store.get(key) ?? null,
      setItem: (key, value) => void store.set(key, value),
    });
    render(
      <ThemeProvider controller={controller}>
        <ThemeSwitcher />
      </ThemeProvider>,
    );

    await user.click(screen.getByRole('button', { name: 'Switch to Light Theme' }));
    expect(controller.mode()).toBe('light');

    await user.click(screen.getByRole('button', { name: 'Switch to Dark Theme' }));
    expect(controller.mode()).toBe('dark');
  });
});
