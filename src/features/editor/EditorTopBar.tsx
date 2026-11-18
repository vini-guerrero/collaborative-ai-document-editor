import type { JSX, ReactNode } from 'react';
import { Link } from 'react-router';
import { Icon, Tooltip, iconLinkClassName, useBreakpoint } from '@/design-system';
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
  // Opens the version history (D7).
  onHistory: () => void;
}

export interface EditorTopBarProps {
  // The title field; absent while the document is loading or cannot be opened.
  title?: ReactNode;
  // Absent while the document is loading or cannot be opened.
  view?: EditorViewControls | undefined;
  // The AI status indicator (D14); absent while the document is loading.
  aiStatus?: ReactNode;
  // The Next Flag control (D17); the caller shows it only while a flag exists.
  flagControl?: ReactNode;
}

// H5, D1, D15, H7, S9: the back arrow, the title, the AI status, the view and AI mode toggles, and the save
// status. Below md the view toggle and History move into the overflow menu. The AI status and the
// flag control have reserved widths, so their appearing or changing does not move the toggles.
export function EditorTopBar({
  title,
  view,
  aiStatus,
  flagControl,
}: EditorTopBarProps): JSX.Element {
  const breakpoint = useBreakpoint();
  const compact = breakpoint === 'base' || breakpoint === 'sm';

  return (
    <header className="editor-top-bar">
      <Tooltip content="Back to Documents" align="start">
        <Link to="/" aria-label="Back to documents" className={iconLinkClassName()}>
          <Icon name="arrow-left" />
        </Link>
      </Tooltip>
      {view !== undefined && compact ? (
        <div className="editor-top-bar__overflow">
          <EditorOverflowMenu
            viewMode={view.viewMode}
            onViewModeChange={view.onViewModeChange}
            onHistory={view.onHistory}
          />
        </div>
      ) : null}
      {title === undefined ? null : <div className="editor-top-bar__title">{title}</div>}
      <div className="editor-top-bar__flags">{flagControl ?? null}</div>
      <div className="editor-top-bar__ai">{aiStatus ?? null}</div>
      <div className="editor-top-bar__toggles">
        {view !== undefined && !compact ? (
          <ViewModeToggle value={view.viewMode} onChange={view.onViewModeChange} />
        ) : null}
        {view !== undefined ? (
          <AiModeToggle value={view.aiMode} onChange={view.onAiModeChange} />
        ) : null}
      </div>
    </header>
  );
}
