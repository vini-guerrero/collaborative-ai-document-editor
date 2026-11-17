import type { DocumentSummary, StoredDocument } from './schema';

export type Result<T, E> = { ok: true; value: T } | { ok: false; error: E };

// Expected failures are typed results; thrown errors are reserved for bugs (AGENTS.md).
export type StoreError =
  { kind: 'not-found' } | { kind: 'corrupt' } | { kind: 'quota' } | { kind: 'invalid' };

// Async so a SQLite- or IndexedDB-backed store can replace the localStorage one (T6).
export interface DocumentStore {
  // Reads the index only. Sorted by updatedAt descending, ties by id.
  list(): Promise<Result<DocumentSummary[], StoreError>>;
  get(id: string): Promise<Result<StoredDocument, StoreError>>;
  // Validates first; `invalid` leaves storage untouched. Callers keep history at most 200
  // entries; the store does not trim it. Quota returns a result; other storage failures
  // (SecurityError, storage disabled) reject the promise, so callers must catch them.
  save(doc: StoredDocument): Promise<Result<void, StoreError>>;
  remove(id: string): Promise<Result<void, StoreError>>;
}
