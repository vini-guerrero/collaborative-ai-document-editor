import type { DocumentStore, Result, StoreError } from './DocumentStore';
import { createPreview } from './preview';
import {
  CURRENT_SCHEMA_VERSION,
  DocumentSchema,
  IndexSchema,
  type DocumentSummary,
  type StoredDocument,
} from './schema';
import { decode, writeJson } from './storageCodec';

const DEFAULT_KEY_PREFIX = 'chiri.';

interface LocalStorageStoreDeps {
  storage: Pick<Storage, 'getItem' | 'setItem' | 'removeItem' | 'length' | 'key'>;
  keyPrefix?: string;
}

const NOT_FOUND: Result<never, StoreError> = { ok: false, error: { kind: 'not-found' } };

const byRecency = (a: DocumentSummary, b: DocumentSummary): number => {
  if (a.updatedAt !== b.updatedAt) {
    return b.updatedAt - a.updatedAt;
  }
  if (a.id === b.id) {
    return 0;
  }
  return a.id < b.id ? -1 : 1;
};

const summarize = (doc: StoredDocument): DocumentSummary => ({
  id: doc.id,
  title: doc.title,
  preview: createPreview(doc.markdown),
  updatedAt: doc.updatedAt,
});

const sameSummary = (a: DocumentSummary, b: DocumentSummary): boolean =>
  a.title === b.title && a.preview === b.preview && a.updatedAt === b.updatedAt;

// Last entry wins for a duplicated id, so an index never lists one document twice.
const uniqueById = (summaries: readonly DocumentSummary[]): DocumentSummary[] =>
  Array.from(new Map<string, DocumentSummary>(summaries.map((s) => [s.id, s])).values());

const upsert = (
  summaries: readonly DocumentSummary[],
  next: DocumentSummary,
): DocumentSummary[] => [...summaries.filter((summary) => summary.id !== next.id), next];

// Work runs inside a promise chain so a thrown bug becomes a rejection, not a sync throw.
const defer = <T>(work: () => T): Promise<T> => Promise.resolve().then(work);

export const createLocalStorageStore = ({
  storage,
  keyPrefix = DEFAULT_KEY_PREFIX,
}: LocalStorageStoreDeps): DocumentStore => {
  const indexKey = `${keyPrefix}index`;
  const docPrefix = `${keyPrefix}doc.`;
  const docKey = (id: string): string => `${docPrefix}${id}`;

  const readDocument = (id: string): Result<StoredDocument, StoreError> => {
    const doc = decode(DocumentSchema, storage.getItem(docKey(id)));
    if (!doc.ok) {
      return doc;
    }
    return doc.value.id === id ? doc : { ok: false, error: { kind: 'corrupt' } };
  };

  const scanDocumentIds = (): string[] => {
    const ids: string[] = [];
    for (let position = 0; position < storage.length; position += 1) {
      const key = storage.key(position);
      if (key?.startsWith(docPrefix) === true) {
        ids.push(key.slice(docPrefix.length));
      }
    }
    return ids;
  };

  // Recovery: rebuilds summaries from the document keys. Corrupt documents are skipped.
  const rebuildSummaries = (): DocumentSummary[] => {
    const summaries: DocumentSummary[] = [];
    for (const id of scanDocumentIds()) {
      const doc = readDocument(id);
      if (doc.ok) {
        summaries.push(summarize(doc.value));
      }
    }
    return summaries;
  };

  // Undefined means the index is missing or undecodable, so the caller must rebuild it.
  const readIndexSummaries = (): DocumentSummary[] | undefined => {
    const index = decode(IndexSchema, storage.getItem(indexKey));
    return index.ok ? uniqueById(index.value.summaries) : undefined;
  };

  const writeIndex = (summaries: readonly DocumentSummary[]): Result<void, StoreError> =>
    writeJson(storage, indexKey, {
      schemaVersion: CURRENT_SCHEMA_VERSION,
      summaries: [...summaries],
    });

  const listDocuments = (): Result<DocumentSummary[], StoreError> => {
    const indexed = readIndexSummaries();
    if (indexed) {
      return { ok: true, value: indexed.sort(byRecency) };
    }
    const rebuilt = rebuildSummaries();
    // A quota failure here is non-fatal: the list is correct in memory and the next save retries.
    writeIndex(rebuilt);
    return { ok: true, value: rebuilt.sort(byRecency) };
  };

  const saveDocument = (doc: StoredDocument): Result<void, StoreError> => {
    const parsed = DocumentSchema.safeParse(doc);
    if (!parsed.success) {
      return { ok: false, error: { kind: 'invalid' } };
    }
    const valid = parsed.data;
    const key = docKey(valid.id);
    // Read (or rebuild) the index before writing, so a rebuild cannot see the new document
    // and the rollback below knows whether the id was already known.
    const indexed = readIndexSummaries();
    const current = indexed ?? rebuildSummaries();
    const written = writeJson(storage, key, valid);
    if (!written.ok) {
      return written;
    }
    const next = summarize(valid);
    const previous = current.find((summary) => summary.id === next.id);
    if (indexed && previous && sameSummary(previous, next)) {
      return { ok: true, value: undefined };
    }
    const indexWrite = writeIndex(upsert(current, next));
    if (!indexWrite.ok && !previous) {
      // Roll back a new document so storage never holds one the index does not list.
      storage.removeItem(key);
    }
    return indexWrite;
  };

  const removeDocument = (id: string): Result<void, StoreError> => {
    const current = readIndexSummaries() ?? rebuildSummaries();
    const present = current.some((summary) => summary.id === id);
    if (!present && storage.getItem(docKey(id)) === null) {
      return NOT_FOUND;
    }
    // The index goes first: if it fails, the document stays stored and listed.
    const indexWrite = writeIndex(current.filter((summary) => summary.id !== id));
    if (!indexWrite.ok) {
      return indexWrite;
    }
    storage.removeItem(docKey(id));
    return { ok: true, value: undefined };
  };

  return {
    list: () => defer(listDocuments),
    get: (id) => defer(() => readDocument(id)),
    save: (doc) => defer(() => saveDocument(doc)),
    remove: (id) => defer(() => removeDocument(id)),
  };
};
