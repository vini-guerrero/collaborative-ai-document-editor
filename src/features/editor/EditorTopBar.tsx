import type { JSX, ReactNode } from 'react';
import { Link } from 'react-router';
import { Button, Icon, iconLinkClassName, useBreakpoint } from '@/design-system';
import { AiModeToggle } from './AiModeToggle';
import { EditorOverflowMenu } from './EditorOverflowMenu';
import type { AiMode, ViewMode } from './editorModes';
import { ViewModeToggle } from './ViewModeToggle';

// The controls that exist once the document is open.
export interface EditorViewControls {
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
  aiMode: AiMode;
  onAiModeChange: (mode: AiMode) => void;
}

export interface EditorTopBarProps {
  // Text for the save live region; empty when there is nothing to announce.
  message: string;
  // The title field; absent while the document is loading or cannot be opened.
  title?: ReactNode;
  // Absent while the document is loading or cannot be opened.
  view?: EditorViewControls | undefined;
  // The AI status indicator (D14); absent while the document is loading.
  aiStatus?: ReactNode;
  // The Next flag control (D17); the caller shows it only while a flag exists.
  flagControl?: ReactNode;
}

// H5, D1, D15, H7, S9: back and app name, the title, the view and AI mode toggles, and the save
// status. Below md the view toggle and History move into the overflow menu.
export function EditorTopBar({
  message,
  title,
  view,
  aiStatus,
  flagControl,
}: EditorTopBarProps): JSX.Element {
  const breakpoint = useBreakpoint();
  const compact = breakpoint === 'base' || breakpoint === 'sm';

  return (
    <header className="editor-top-bar">
      <Link to="/" aria-label="Back to documents" className={iconLinkClassName()}>
        <Icon name="arrow-left" />
      </Link>
      <Link to="/" className="editor-top-bar__name">
        WebApp
      </Link>
      {view !== undefined && compact ? (
        <div className="editor-top-bar__overflow">
          <EditorOverflowMenu viewMode={view.viewMode} onViewModeChange={view.onViewModeChange} />
        </div>
      ) : null}
      {title === undefined ? null : <div className="editor-top-bar__title">{title}</div>}
      {view !== undefined && !compact ? (
        <ViewModeToggle value={view.viewMode} onChange={view.onViewModeChange} />
      ) : null}
      {view !== undefined ? (
        <AiModeToggle value={view.aiMode} onChange={view.onAiModeChange} />
      ) : null}
      {view !== undefined && !compact ? <Button disabled>History (Soon)</Button> : null}
      {flagControl ?? null}
      {aiStatus ?? null}
      <p role="status" className="editor-top-bar__status">
        {message}
      </p>
    </header>
  );
}
