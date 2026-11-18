import type { JSX } from 'react';
import { IconButton, ThemeSwitcher, useBreakpoint } from '@/design-system';
import { formatRelativeTime } from '@/lib/relativeTime';
import { ModeToggle } from './ModeToggle';
import type { DocumentInfo } from './useDocumentPersistence';
import './EditorFooter.css';

export interface EditorFooterProps {
  info: DocumentInfo;
  now: number;
  // The save status, announced politely; empty when there is nothing to announce.
  message?: string;
  // The page controls on the right. Absent in tests of the text alone.
  controls?: {
    wide: boolean;
    onWideChange: (wide: boolean) => void;
    onHistory: () => void;
  };
}

const COUNT_FORMAT = new Intl.NumberFormat();

// A thin status bar under the page: when the document was last saved and how many revisions its
// history holds (D7) on the left; the layout width, History and the theme on the right. The save
// status sits beside them as the page's one live region. Below md History lives in the top
// bar's More actions menu, so it is not repeated here (S9).
// DEBT: "Last edited" is computed from the time at render, so it only refreshes on a save or other
// re-render, not on a clock. Revisit with a minute-interval tick if it reads stale.
export function EditorFooter({
  info,
  now,
  message = '',
  controls,
}: EditorFooterProps): JSX.Element {
  const breakpoint = useBreakpoint();
  const compact = breakpoint === 'base' || breakpoint === 'sm';
  const { savedAt, revisions } = info;
  const noun = revisions === 1 ? 'revision' : 'revisions';
  return (
    <footer className="editor-footer">
      <span>
        {savedAt === null ? 'Not saved yet' : `Last edited ${formatRelativeTime(savedAt, now)}`}
      </span>
      <span aria-hidden="true">·</span>
      <span>{`${COUNT_FORMAT.format(revisions)} ${noun}`}</span>
      <p role="status" className="editor-footer__status">
        {message}
      </p>
      {controls === undefined ? null : (
        <div className="editor-footer__controls">
          {compact ? null : (
            <ModeToggle
              value={controls.wide ? 'wide' : 'standard'}
              options={[
                { value: 'standard', label: 'Standard Layout', icon: 'minimize' },
                { value: 'wide', label: 'Wide Layout', icon: 'maximize' },
              ]}
              onChange={(mode) => {
                controls.onWideChange(mode === 'wide');
              }}
            />
          )}
          {compact ? null : (
            <IconButton icon="history" label="History" onClick={controls.onHistory} />
          )}
          <ThemeSwitcher />
        </div>
      )}
    </footer>
  );
}
