import type { JSX } from 'react';
import { Dialog } from '@/design-system';
import { displayTitle } from './DocumentCard';
import type { DeleteState } from './useDeleteDocument';

export interface DeleteDocumentDialogProps {
  state: DeleteState;
  onConfirm: () => void;
  onCancel: () => void;
  // Stable identity from the caller; Dialog re-runs its focus effect when this changes.
  onCloseFocus: () => HTMLElement | null;
}

const DESCRIPTION =
  "This document and its history will be permanently deleted. This can't be undone.";

// H5: names the document being deleted and stays open on error so the user can retry or cancel.
export function DeleteDocumentDialog({
  state,
  onConfirm,
  onCancel,
  onCloseFocus,
}: DeleteDocumentDialogProps): JSX.Element {
  const target = state.kind === 'idle' ? null : state.document;
  const busy = state.kind === 'deleting';
  const error = state.kind === 'error' ? state.message : '';

  return (
    <Dialog
      open={target !== null}
      title={target === null ? '' : `Delete "${displayTitle(target.title)}"?`}
      description={DESCRIPTION}
      confirmLabel="Delete Document"
      cancelLabel="Cancel"
      destructive
      busy={busy}
      error={error}
      onConfirm={onConfirm}
      onCancel={onCancel}
      onCloseFocus={onCloseFocus}
    />
  );
}
