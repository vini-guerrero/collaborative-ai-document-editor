import type { JSX } from 'react';
import { ToggleGroup } from '@/design-system';
import { AI_MODE_OPTIONS, toAiMode, type AiMode } from './editorModes';

export interface AiModeToggleProps {
  value: AiMode;
  onChange: (mode: AiMode) => void;
}

// D1: Ambient or On demand. Only the state is set here; the AI behavior arrives in later phases.
export function AiModeToggle({ value, onChange }: AiModeToggleProps): JSX.Element {
  return (
    <ToggleGroup
      label="AI mode"
      value={value}
      options={AI_MODE_OPTIONS}
      onChange={(next) => {
        const mode = toAiMode(next);
        if (mode !== undefined) {
          onChange(mode);
        }
      }}
    />
  );
}
