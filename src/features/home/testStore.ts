import type { DocumentStore, DocumentSummary, Result, StoreError } from '@/features/documents';

// Shared in-memory DocumentStore fakes for the home screen tests (no real storage, no model).

export type ListResult = Result<DocumentSummary[], StoreError>;
export type RemoveOutcome = Result<void, StoreError>;

const UNUSED_GET: Result<never, StoreError> = { ok: false, error: { kind: 'not-found' } };
const UNUSED_SAVE: Result<void, StoreError> = { ok: true, value: undefined };

// Each list() call takes the next scripted result; the last one repeats.
export function fakeStore(results: ListResult[]): DocumentStore {
  let index = 0;
  return {
    list: (): Promise<ListResult> => {
      const result = results[Math.min(index, results.length - 1)];
      index += 1;
      return Promise.resolve(result ?? { ok: true, value: [] });
    },
    get: () => Promise.resolve(UNUSED_GET),
    save: () => Promise.resolve(UNUSED_SAVE),
    remove: () => Promise.resolve(UNUSED_SAVE),
  };
}

// For the delete flow: list() returns what is left, and remove() applies the outcome. A
// "not-found" outcome also drops the document, since it is already gone (H5).
export function deletableStore(
  initial: DocumentSummary[],
  outcome: () => Promise<RemoveOutcome>,
): { store: DocumentStore; removed: string[] } {
  let docs = initial;
  const removed: string[] = [];
  const store: DocumentStore = {
    list: () => Promise.resolve({ ok: true, value: [...docs] }),
    get: () => Promise.resolve(UNUSED_GET),
    save: () => Promise.resolve(UNUSED_SAVE),
    remove: (id: string): Promise<RemoveOutcome> => {
      removed.push(id);
      return outcome().then((result) => {
        if (result.ok || result.error.kind === 'not-found') {
          docs = docs.filter((doc) => doc.id !== id);
        }
        return result;
      });
    },
  };
  return { store, removed };
}

export function deferred<T>(): { promise: Promise<T>; resolve: (value: T) => void } {
  let resolve: (value: T) => void = () => undefined;
  const promise = new Promise<T>((done) => {
    resolve = done;
  });
  return { promise, resolve };
}
