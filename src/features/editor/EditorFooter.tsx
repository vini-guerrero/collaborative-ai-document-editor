import type { JSX } from 'react';
import type { DocumentInfo } from './useDocumentPersistence';
import { formatRelativeTime } from '@/lib/relativeTime';
import './EditorFooter.css';

export interface EditorFooterProps {
  info: DocumentInfo;
  now: number;
}

const COUNT_FORMAT = new Intl.NumberFormat();

// A thin status bar under the page: when the document was last saved and how many revisions its
// history holds (D7). It is plain text, not a live region: the top bar announces saving.
export function EditorFooter({ info, now }: EditorFooterProps): JSX.Element {
  const { savedAt, revisions } = info;
  const noun = revisions === 1 ? 'revision' : 'revisions';
  return (
    <footer className="editor-footer">
      <span>
        {savedAt === null ? 'Not saved yet' : `Last edited ${formatRelativeTime(savedAt, now)}`}
      </span>
      <span aria-hidden="true" className="editor-footer__dot">
        ·
      </span>
      <span>{`${COUNT_FORMAT.format(revisions)} ${noun}`}</span>
    </footer>
  );
}
