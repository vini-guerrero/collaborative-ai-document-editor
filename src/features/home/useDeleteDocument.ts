import { useCallback, useRef, useState } from 'react';
import { useDocumentStore, type DocumentStore, type DocumentSummary } from '@/features/documents';

// H5: the delete confirmation is a small state machine, so each screen state is one variant.
export type DeleteState =
  | { kind: 'idle' }
  | { kind: 'confirming'; document: DocumentSummary }
  | { kind: 'deleting'; document: DocumentSummary }
  | { kind: 'error'; document: DocumentSummary; message: string };

export interface UseDeleteDocumentOptions {
  // Called once the document is gone, so the caller can refresh the list (H5).
  onDeleted: () => void;
}

export interface UseDeleteDocumentResult {
  state: DeleteState;
  request: (document: DocumentSummary) => void;
  cancel: () => void;
  confirm: () => void;
}

// D14: says what failed and that the document is still there, so the user knows nothing was lost.
export const DELETE_FAILED_MESSAGE =
  'Could not delete this document. It is still saved. Try again.';

// H5: "not-found" means the document is already gone, which is the outcome the user asked for.
// A rejected promise (storage disabled) is a failure, not a crash; it resolves to false.
function removeDocument(store: DocumentStore, id: string): Promise<boolean> {
  return store.remove(id).then(
    (result): boolean => result.ok || result.error.kind === 'not-found',
    (): boolean => false,
  );
}

// H5, D14: confirming a delete is never silent. A failure keeps the document in state so the
// dialog can show it and offer a retry.
export function useDeleteDocument({
  onDeleted,
}: UseDeleteDocumentOptions): UseDeleteDocumentResult {
  const store = useDocumentStore();
  const [state, setState] = useState<DeleteState>({ kind: 'idle' });
  // Blocks a second confirm (double click) before React re-renders the busy state.
  const inFlight = useRef(false);

  const request = useCallback((document: DocumentSummary): void => {
    setState({ kind: 'confirming', document });
  }, []);

  const cancel = useCallback((): void => {
    // Cancel is ignored while the store call runs; the outcome decides the next state.
    if (inFlight.current) {
      return;
    }
    setState({ kind: 'idle' });
  }, []);

  const confirm = useCallback((): void => {
    if (inFlight.current || (state.kind !== 'confirming' && state.kind !== 'error')) {
      return;
    }
    const target = state.document;
    inFlight.current = true;
    setState({ kind: 'deleting', document: target });
    void removeDocument(store, target.id).then((removed) => {
      inFlight.current = false;
      if (removed) {
        // onDeleted runs first so the caller has set its focus target before the dialog closes;
        // the order is explicit here rather than relying on React batching the two updates.
        onDeleted();
        setState({ kind: 'idle' });
        return;
      }
      setState({ kind: 'error', document: target, message: DELETE_FAILED_MESSAGE });
    });
  }, [state, store, onDeleted]);

  return { state, request, cancel, confirm };
}
