import { useEffect, useState } from 'react';
import {
  useDocumentStore,
  type Result,
  type StoreError,
  type StoredDocument,
} from '@/features/documents';

export type StoredDocumentState =
  | { kind: 'loading' }
  // document is null for a new draft: the id is not in the store yet (H5).
  | { kind: 'ready'; document: StoredDocument | null }
  | { kind: 'error' };

function toLoadedState(result: Result<StoredDocument, StoreError>): StoredDocumentState {
  if (result.ok) {
    return { kind: 'ready', document: result.value };
  }
  if (result.error.kind === 'not-found') {
    return { kind: 'ready', document: null };
  }
  return { kind: 'error' };
}

// The only place the editor reads the store. Callers remount on id change (the route keys by
// id), so the state never describes a different document.
export function useStoredDocument(documentId: string): StoredDocumentState {
  const store = useDocumentStore();
  const [state, setState] = useState<StoredDocumentState>({ kind: 'loading' });

  useEffect(() => {
    let active = true;
    store.get(documentId).then(
      (result) => {
        if (active) {
          setState(toLoadedState(result));
        }
      },
      () => {
        if (active) {
          setState({ kind: 'error' });
        }
      },
    );
    return () => {
      active = false;
    };
  }, [store, documentId]);

  return state;
}
