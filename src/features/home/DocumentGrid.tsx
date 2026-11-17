import type { JSX } from 'react';
import type { DocumentSummary } from '@/features/documents';
import { DocumentCard } from './DocumentCard';

export interface DocumentGridProps {
  documents: readonly DocumentSummary[];
  now: number;
  onDelete: (doc: DocumentSummary) => void;
}

// H4: the default view. Columns fill the width (S9: one column at 360px, more when wider).
export function DocumentGrid({ documents, now, onDelete }: DocumentGridProps): JSX.Element {
  return (
    <ul className="doc-grid" data-testid="document-grid">
      {documents.map((doc) => (
        <DocumentCard key={doc.id} doc={doc} now={now} onDelete={onDelete} />
      ))}
    </ul>
  );
}
