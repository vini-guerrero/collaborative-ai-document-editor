import { CURRENT_SCHEMA_VERSION, type StoredDocument } from './schema';

export interface DocumentDraft {
  id: string;
  title: string;
  markdown: string;
}

// Builds the record to save. Keeps createdAt and history from the stored copy when there is one;
// a new document starts at `now` with an empty history (D7 keeps history at most 200 entries).
export function toStoredDocument(
  previous: StoredDocument | null,
  draft: DocumentDraft,
  now: number,
): StoredDocument {
  return {
    id: draft.id,
    title: draft.title,
    markdown: draft.markdown,
    createdAt: previous?.createdAt ?? now,
    updatedAt: now,
    history: previous?.history ?? [],
    schemaVersion: CURRENT_SCHEMA_VERSION,
  };
}
