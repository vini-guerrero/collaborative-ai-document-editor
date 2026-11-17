import type { JSX } from 'react';
import { Link } from 'react-router';
import { Icon, iconLinkClassName } from '@/design-system';

export interface EditorTopBarProps {
  // Text for the save live region; empty when there is nothing to announce.
  message: string;
}

// H7: the back arrow and the app name both lead home. The status is announced politely.
export function EditorTopBar({ message }: EditorTopBarProps): JSX.Element {
  return (
    <header className="editor-top-bar">
      <Link to="/" aria-label="Back to documents" className={iconLinkClassName()}>
        <Icon name="arrow-left" />
      </Link>
      <Link to="/" className="editor-top-bar__name">
        WebApp
      </Link>
      <p role="status" className="editor-top-bar__status">
        {message}
      </p>
    </header>
  );
}
