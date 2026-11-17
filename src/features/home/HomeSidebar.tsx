import type { JSX } from 'react';
import { NavItem } from '@/design-system';

export interface HomeSidebarProps {
  onNewDocument: () => void;
}

// H2: only New document and the current Documents entry work. The rest are visible promises (Soon).
export function HomeSidebar({ onNewDocument }: HomeSidebarProps): JSX.Element {
  return (
    <div className="home-sidebar">
      <NavItem icon="plus" label="New document" onClick={onNewDocument} />
      <NavItem icon="file-text" label="Documents" href="/" current />
      <NavItem icon="pin" label="Pinned" disabled soon />
      <NavItem icon="users" label="Collaborations" disabled soon />
      <NavItem icon="archive" label="Archive" disabled soon />
    </div>
  );
}
