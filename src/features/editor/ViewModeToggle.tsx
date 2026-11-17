import type { JSX } from 'react';
import { ToggleGroup } from '@/design-system';
import { VIEW_MODE_OPTIONS, toViewMode, type ViewMode } from './editorModes';

export interface ViewModeToggleProps {
  value: ViewMode;
  onChange: (mode: ViewMode) => void;
}

// D15: switches the document between the Visual editor and its raw Markdown.
export function ViewModeToggle({ value, onChange }: ViewModeToggleProps): JSX.Element {
  return (
    <ToggleGroup
      label="Editor view"
      value={value}
      options={VIEW_MODE_OPTIONS}
      onChange={(next) => {
        const mode = toViewMode(next);
        if (mode !== undefined) {
          onChange(mode);
        }
      }}
    />
  );
}
