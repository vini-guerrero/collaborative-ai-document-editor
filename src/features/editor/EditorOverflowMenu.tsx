import type { JSX } from 'react';
import { Menu, type MenuItem } from '@/design-system';
import type { ViewMode } from './editorModes';

export interface EditorOverflowMenuProps {
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
  onHistory: () => void;
}

// S9: below md the Raw view and History move here from the bar (D7).
export function EditorOverflowMenu({
  viewMode,
  onViewModeChange,
  onHistory,
}: EditorOverflowMenuProps): JSX.Element {
  const items: readonly MenuItem[] = [
    { id: 'toggle-raw', label: viewMode === 'markdown' ? 'Visual' : 'Raw' },
    { id: 'history', label: 'History' },
  ];
  return (
    <Menu
      label="More actions"
      trigger={{ kind: 'icon', icon: 'menu' }}
      items={items}
      onSelect={(id) => {
        if (id === 'toggle-raw') {
          onViewModeChange(viewMode === 'markdown' ? 'visual' : 'markdown');
        } else if (id === 'history') {
          onHistory();
        }
      }}
    />
  );
}
