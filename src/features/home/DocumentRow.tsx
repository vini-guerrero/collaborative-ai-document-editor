import type { JSX } from 'react';
import { Link } from 'react-router';
import type { DocumentSummary } from '@/features/documents';
import { formatRelativeTime } from '@/lib/relativeTime';
import { displayTitle } from './DocumentCard';

export interface DocumentRowProps {
  doc: DocumentSummary;
  now: number;
}

// H4: a compact row. The preview column appears only from md up (S9); the whole row is one link.
export function DocumentRow({ doc, now }: DocumentRowProps): JSX.Element {
  return (
    <li className="doc-row">
      <h2 className="doc-row__title">
        <Link to={`/documents/${doc.id}`} className="doc-row__link">
          {displayTitle(doc.title)}
        </Link>
      </h2>
      {doc.preview.length > 0 ? <p className="doc-row__preview">{doc.preview}</p> : null}
      <p className="doc-row__meta">Edited {formatRelativeTime(doc.updatedAt, now)}</p>
    </li>
  );
}
