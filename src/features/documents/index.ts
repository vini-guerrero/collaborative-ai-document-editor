export type { DocumentStore, Result, StoreError } from './DocumentStore';
export type { DocumentSummary, HistoryEntry, StoredDocument } from './schema';
export { HISTORY_LABEL_MAX_CHARS, HISTORY_MAX_ENTRIES } from './schema';
export {
  HISTORY_MAX_MARKDOWN_UNITS,
  IDLE_CHECKPOINT_MS,
  recordEntry,
  restoreEntry,
  shouldCheckpoint,
} from './history';
export type { CheckpointInput, RestoreResult } from './history';
export { createLocalStorageStore } from './localStorageStore';
export { createPreview } from './preview';
export { DocumentStoreProvider, useDocumentStore } from './DocumentStoreContext';
export { toStoredDocument } from './toStoredDocument';
