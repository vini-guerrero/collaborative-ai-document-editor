import type { JSX } from 'react';
import { ModeToggle } from './ModeToggle';
import type { ViewMode } from './editorModes';

export interface ViewModeToggleProps {
  value: ViewMode;
  onChange: (mode: ViewMode) => void;
}

// D15: switches the document between the Visual editor and its raw Markdown.
export function ViewModeToggle({ value, onChange }: ViewModeToggleProps): JSX.Element {
  return (
    <ModeToggle
      value={value}
      options={[
        { value: 'visual', label: 'Visual', icon: 'eye' },
        { value: 'markdown', label: 'Markdown', icon: 'square-code' },
      ]}
      onChange={onChange}
    />
  );
}
