import type { JSX } from 'react';
import { Link } from 'react-router';
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
}

// H4: a card with title, text preview and last edit. The whole card is one link (stretched link),
// so there are no nested interactive elements and the card is clickable without hover (S9).
export function DocumentCard({ doc, now }: DocumentCardProps): JSX.Element {
  return (
    <li className="doc-card">
      <h2 className="doc-card__title">
        <Link to={`/documents/${doc.id}`} className="doc-card__link">
          {displayTitle(doc.title)}
        </Link>
      </h2>
      {doc.preview.length > 0 ? <p className="doc-card__preview">{doc.preview}</p> : null}
      <p className="doc-card__meta">Edited {formatRelativeTime(doc.updatedAt, now)}</p>
    </li>
  );
}
