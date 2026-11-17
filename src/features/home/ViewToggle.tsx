import type { JSX } from 'react';
import { ToggleGroup, type ToggleGroupOption } from '@/design-system';

// H4: Grid is the default; the choice is local to the home screen and is not persisted.
export type DocumentView = 'grid' | 'list';

export interface ViewToggleProps {
  value: DocumentView;
  onChange: (view: DocumentView) => void;
}

const OPTIONS: readonly ToggleGroupOption[] = [
  { value: 'grid', label: 'Grid', icon: 'layout-grid' },
  { value: 'list', label: 'List', icon: 'list' },
];

function isDocumentView(value: string): value is DocumentView {
  return value === 'grid' || value === 'list';
}

// H4: switches the document listing between cards (Grid) and rows (List).
export function ViewToggle({ value, onChange }: ViewToggleProps): JSX.Element {
  return (
    <ToggleGroup
      label="Document view"
      value={value}
      options={OPTIONS}
      onChange={(next) => {
        if (isDocumentView(next)) {
          onChange(next);
        }
      }}
    />
  );
}
