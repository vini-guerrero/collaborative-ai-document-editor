import type { JSX } from 'react';
import { Menu, type MenuItem } from '@/design-system';
import type { ViewMode } from './editorModes';

export interface EditorOverflowMenuProps {
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
}

// S9: below md the Raw view and History move here from the bar. History is built in phase 42, so
// it stays visible and disabled, and says so in its label (H2, H3).
export function EditorOverflowMenu({
  viewMode,
  onViewModeChange,
}: EditorOverflowMenuProps): JSX.Element {
  const items: readonly MenuItem[] = [
    { id: 'toggle-raw', label: viewMode === 'markdown' ? 'Visual' : 'Raw' },
    { id: 'history', label: 'History (Soon)', disabled: true },
  ];
  return (
    <Menu
      label="More actions"
      trigger={{ kind: 'icon', icon: 'menu' }}
      items={items}
      onSelect={(id) => {
        if (id === 'toggle-raw') {
          onViewModeChange(viewMode === 'markdown' ? 'visual' : 'markdown');
        }
      }}
    />
  );
}
