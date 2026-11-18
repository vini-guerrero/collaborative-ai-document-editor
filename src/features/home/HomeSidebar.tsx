import type { JSX, MouseEvent } from 'react';
import { useNavigate } from 'react-router';
import { Button, Icon, NavItem, useShell } from '@/design-system';

export interface HomeSidebarProps {
  onNewDocument: () => void;
}

const PRIMARY_BUTTON = 0;

// Only a plain left click is handled in-app. Middle clicks and modifier clicks keep the real href,
// so the browser can open the home screen in a new tab.
function isPlainPrimaryClick(event: MouseEvent<HTMLElement>): boolean {
  return (
    event.button === PRIMARY_BUTTON &&
    !event.metaKey &&
    !event.ctrlKey &&
    !event.shiftKey &&
    !event.altKey
  );
}

// H2: only New Document and the current Documents entry work. The rest are visible promises (Soon).
export function HomeSidebar({ onNewDocument }: HomeSidebarProps): JSX.Element {
  const navigate = useNavigate();
  const shell = useShell();

  // The primary action is a button, not a nav item, so it closes the drawer itself (S9).
  function startNewDocument(): void {
    shell.closeDrawer();
    onNewDocument();
  }

  // Stays in the single-page app: a plain click navigates with the router, not a full reload.
  function goHome(event: MouseEvent<HTMLElement>): void {
    if (!isPlainPrimaryClick(event)) {
      return;
    }
    event.preventDefault();
    void navigate('/');
  }

  return (
    <div className="home-sidebar">
      <div className="home-sidebar__new">
        <Button variant="primary" aria-label="New Document" onClick={startNewDocument}>
          <Icon name="plus" />
          <span className="home-sidebar__label">New Document</span>
        </Button>
      </div>
      <NavItem icon="file-text" label="Documents" href="/" current onClick={goHome} />
      <NavItem icon="pin" label="Pinned" disabled soon />
      <NavItem icon="users" label="Collaborations" disabled soon />
      <NavItem icon="archive" label="Archive" disabled soon />
    </div>
  );
}
