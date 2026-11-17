import type { JSX } from 'react';
import type { DocumentSummary } from '@/features/documents';
import { DocumentRow } from './DocumentRow';

export interface DocumentListProps {
  documents: readonly DocumentSummary[];
  now: number;
  onDelete: (doc: DocumentSummary) => void;
}

// H4: the compact List view, one row per document in the same order as the grid.
export function DocumentList({ documents, now, onDelete }: DocumentListProps): JSX.Element {
  return (
    <ul className="doc-list" data-testid="document-list">
      {documents.map((doc) => (
        <DocumentRow key={doc.id} doc={doc} now={now} onDelete={onDelete} />
      ))}
    </ul>
  );
}
