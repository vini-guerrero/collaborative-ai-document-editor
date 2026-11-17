import type { JSX } from 'react';
import { Link } from 'react-router';
import { IconButton } from '@/design-system';
import type { DocumentSummary } from '@/features/documents';
import { formatRelativeTime } from '@/lib/relativeTime';
import { displayTitle } from './DocumentCard';

export interface DocumentRowProps {
  doc: DocumentSummary;
  now: number;
  // Opens the delete confirmation for this document (H5).
  onDelete: (doc: DocumentSummary) => void;
}

// H4: a compact row. The preview column appears only from md up (S9); the whole row is one link.
// The delete button is its own cell after the edit time, outside the link (H5, S9, D17).
export function DocumentRow({ doc, now, onDelete }: DocumentRowProps): JSX.Element {
  const title = displayTitle(doc.title);
  return (
    <li className="doc-row">
      <h2 className="doc-row__title">
        <Link to={`/documents/${doc.id}`} className="doc-row__link">
          {title}
        </Link>
      </h2>
      {doc.preview.length > 0 ? <p className="doc-row__preview">{doc.preview}</p> : null}
      <p className="doc-row__meta">Edited {formatRelativeTime(doc.updatedAt, now)}</p>
      <div className="doc-row__action">
        <IconButton
          icon="trash"
          label={`Delete "${title}"`}
          onClick={() => {
            onDelete(doc);
          }}
        />
      </div>
    </li>
  );
}
