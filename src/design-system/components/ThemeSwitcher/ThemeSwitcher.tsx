import type { JSX } from 'react';
import { useThemeMode } from '../../useThemeMode';
import { IconButton } from '../IconButton/IconButton';

// S3: one icon button that flips between light and dark. The icon shows the mode it switches to.
export function ThemeSwitcher(): JSX.Element {
  const [mode, setMode] = useThemeMode();
  const next = mode === 'dark' ? 'light' : 'dark';
  return (
    <IconButton
      icon={next === 'light' ? 'sun' : 'moon'}
      label={next === 'light' ? 'Switch to Light Theme' : 'Switch to Dark Theme'}
      onClick={() => {
        setMode(next);
      }}
    />
  );
}
