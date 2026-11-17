import type { JSX } from 'react';
import { Link } from 'react-router';
import { IconButton } from '@/design-system';
import type { DocumentSummary } from '@/features/documents';
import { formatRelativeTime } from '@/lib/relativeTime';

const UNTITLED_TITLE = 'Untitled document';

// Shared by the grid cards and the list rows so both views name an untitled document the same way.
export function displayTitle(title: string): string {
  return title.trim() === '' ? UNTITLED_TITLE : title;
}

export interface DocumentCardProps {
  doc: DocumentSummary;
  // Passed in from HomePage so the card stays pure and testable (H4 "Edited x ago").
  now: number;
  // Opens the delete confirmation for this document (H5).
  onDelete: (doc: DocumentSummary) => void;
}

// H4: a card with title, text preview and last edit. The whole card is one link (stretched link),
// so the card is clickable without hover (S9). The delete button sits in its own cell above the
// link overlay, so it is never nested inside the link and is always visible (H5, S9, D17).
export function DocumentCard({ doc, now, onDelete }: DocumentCardProps): JSX.Element {
  const title = displayTitle(doc.title);
  return (
    <li className="doc-card">
      <div className="doc-card__header">
        <h2 className="doc-card__title">
          <Link to={`/documents/${doc.id}`} className="doc-card__link">
            {title}
          </Link>
        </h2>
        <div className="doc-card__action">
          <IconButton
            icon="trash"
            label={`Delete "${title}"`}
            onClick={() => {
              onDelete(doc);
            }}
          />
        </div>
      </div>
      {doc.preview.length > 0 ? <p className="doc-card__preview">{doc.preview}</p> : null}
      <p className="doc-card__meta">Edited {formatRelativeTime(doc.updatedAt, now)}</p>
    </li>
  );
}
