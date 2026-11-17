import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import type { DocumentSummary } from '@/features/documents';
import { DeleteDocumentDialog, type DeleteDocumentDialogProps } from './DeleteDocumentDialog';
import type { DeleteState } from './useDeleteDocument';

const PLAN: DocumentSummary = { id: 'doc-plan', title: 'Plan', preview: '', updatedAt: 1 };
const BLANK: DocumentSummary = { id: 'doc-blank', title: '  ', preview: '', updatedAt: 1 };

function isDialogOpen(): boolean {
  return document.querySelector('dialog')?.hasAttribute('open') === true;
}

function renderDialog(
  state: DeleteState,
  overrides: Partial<DeleteDocumentDialogProps> = {},
): DeleteDocumentDialogProps {
  const props: DeleteDocumentDialogProps = {
    state,
    onConfirm: vi.fn<() => void>(),
    onCancel: vi.fn<() => void>(),
    onCloseFocus: vi.fn<() => HTMLElement | null>(() => null),
    ...overrides,
  };
  render(<DeleteDocumentDialog {...props} />);
  return props;
}

// H5: the dialog is closed while idle and opens to name the document being deleted.
describe('DeleteDocumentDialog', () => {
  it('stays closed while idle (H5)', () => {
    renderDialog({ kind: 'idle' });

    expect(isDialogOpen()).toBe(false);
  });

  // H5: the title names the document and the description says the delete is permanent.
  it('names the document and says the delete cannot be undone (H5)', () => {
    renderDialog({ kind: 'confirming', document: PLAN });

    expect(isDialogOpen()).toBe(true);
    expect(screen.getByText('Delete "Plan"?')).toBeTruthy();
    expect(screen.getByText(/This can't be undone\./)).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeTruthy();
  });

  // H5: a blank title is named Untitled document, as on the home list.
  it('names a blank title as Untitled document (H5)', () => {
    renderDialog({ kind: 'confirming', document: BLANK });

    expect(screen.getByText('Delete "Untitled document"?')).toBeTruthy();
  });

  // H5: the confirm button is labelled with the outcome and calls onConfirm.
  it('calls onConfirm from the Delete document button (H5)', async () => {
    const user = userEvent.setup();
    const props = renderDialog({ kind: 'confirming', document: PLAN });

    await user.click(screen.getByRole('button', { name: 'Delete document' }));

    expect(props.onConfirm).toHaveBeenCalledTimes(1);
    expect(props.onCancel).not.toHaveBeenCalled();
  });

  // H5: Cancel reports a cancel and never confirms.
  it('calls onCancel from the Cancel button (H5)', async () => {
    const user = userEvent.setup();
    const props = renderDialog({ kind: 'confirming', document: PLAN });

    await user.click(screen.getByRole('button', { name: 'Cancel' }));

    expect(props.onCancel).toHaveBeenCalledTimes(1);
    expect(props.onConfirm).not.toHaveBeenCalled();
  });

  // H5: Esc cancels the dialog when nothing is running.
  it('treats Esc as cancel when not busy (H5)', () => {
    const props = renderDialog({ kind: 'confirming', document: PLAN });

    const dialog = document.querySelector('dialog');
    if (dialog === null) {
      throw new Error('Dialog did not render a <dialog> element');
    }
    // jsdom does not emulate the native Escape key, so the cancel event is dispatched directly.
    fireEvent(dialog, new Event('cancel', { cancelable: true }));

    expect(props.onCancel).toHaveBeenCalledTimes(1);
  });

  // H5, D14: while the delete runs, Esc and the buttons cannot dismiss or repeat it.
  it('blocks Esc, Cancel and confirm while the delete is running (H5)', async () => {
    const user = userEvent.setup();
    const props = renderDialog({ kind: 'deleting', document: PLAN });

    const dialog = document.querySelector('dialog');
    if (dialog === null) {
      throw new Error('Dialog did not render a <dialog> element');
    }
    fireEvent(dialog, new Event('cancel', { cancelable: true }));
    await user.click(screen.getByRole('button', { name: 'Cancel' }));
    await user.click(screen.getByRole('button', { name: 'Delete document' }));

    expect(props.onCancel).not.toHaveBeenCalled();
    expect(props.onConfirm).not.toHaveBeenCalled();
  });

  // D14: a failed delete shows the message inside the open dialog, so the user can retry or cancel.
  it('shows the error inside the open dialog (D14)', () => {
    renderDialog({
      kind: 'error',
      document: PLAN,
      message: 'Could not delete this document. It is still saved. Try again.',
    });

    expect(isDialogOpen()).toBe(true);
    expect(screen.getByRole('alert').textContent).toBe(
      'Could not delete this document. It is still saved. Try again.',
    );
  });
});
