import { useCallback, useEffect, useState } from 'react';
import {
  useDocumentStore,
  type DocumentSummary,
  type Result,
  type StoreError,
} from '@/features/documents';

export type DocumentListState =
  { kind: 'loading' } | { kind: 'error' } | { kind: 'ready'; documents: DocumentSummary[] };

export interface UseDocumentsResult {
  state: DocumentListState;
  // Shows the loading state and re-runs the read after an error (D14).
  retry: () => void;
  // Re-runs the read after a mutation such as delete (H5). Keeps the visible list while it reads,
  // so the spinner never flashes over data the user is looking at.
  reload: () => void;
}

function toListState(result: Result<DocumentSummary[], StoreError>): DocumentListState {
  if (result.ok) {
    return { kind: 'ready', documents: result.value };
  }
  return { kind: 'error' };
}

// H1: reads the document index only. A failed read becomes the error state, never a blank screen (D14).
export function useDocuments(): UseDocumentsResult {
  const store = useDocumentStore();
  const [state, setState] = useState<DocumentListState>({ kind: 'loading' });
  const [readCount, setReadCount] = useState(0);

  useEffect(() => {
    let active = true;
    store.list().then(
      (result) => {
        if (active) {
          setState(toListState(result));
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
  }, [store, readCount]);

  const retry = useCallback((): void => {
    setState({ kind: 'loading' });
    setReadCount((count) => count + 1);
  }, []);

  const reload = useCallback((): void => {
    setReadCount((count) => count + 1);
  }, []);

  return { state, retry, reload };
}
