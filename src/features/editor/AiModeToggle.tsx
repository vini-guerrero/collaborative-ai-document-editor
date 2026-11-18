import type { JSX } from 'react';
import { ModeToggle } from './ModeToggle';
import type { AiMode } from './editorModes';

export interface AiModeToggleProps {
  value: AiMode;
  onChange: (mode: AiMode) => void;
}

// D1: Ambient analyzes while the author writes; On Demand waits to be asked.
export function AiModeToggle({ value, onChange }: AiModeToggleProps): JSX.Element {
  return (
    <ModeToggle
      value={value}
      options={[
        { value: 'ambient', label: 'Ambient', icon: 'bot-check' },
        { value: 'on-demand', label: 'On Demand', icon: 'bot-off' },
      ]}
      onChange={onChange}
    />
  );
}
