import {
  useId,
  useLayoutEffect,
  useRef,
  type JSX,
  type MouseEvent,
  type PointerEvent as ReactPointerEvent,
  type SyntheticEvent,
} from 'react';
import { Button } from '../Button/Button';
import './Dialog.css';

export interface DialogProps {
  open: boolean;
  // Names the object being confirmed, e.g. "Delete “Q3 plan”?" (H5).
  title: string;
  description?: string;
  // A verb naming the outcome, e.g. "Delete Document".
  confirmLabel: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
  // Uses the danger button for the confirm action.
  destructive?: boolean;
  // Shown inside the dialog, which stays open so the user can retry or cancel (H5, recovery).
  error?: string;
  // Blocks every dismissal path (Esc, backdrop, Cancel, confirm) while a request runs.
  busy?: boolean;
  // Where focus goes after closing, for when the trigger no longer exists. Returning null keeps
  // the browser's own focus return.
  onCloseFocus?: () => HTMLElement | null;
}

function isDialogOpen(dialog: HTMLDialogElement): boolean {
  // The open attribute is what the native `open` property reflects; reading it directly keeps
  // the checks reliable in every DOM implementation.
  return dialog.hasAttribute('open');
}

// Closes the native dialog on purpose. Browsers fire the close event asynchronously, so the flag
// stays set until that event arrives and tells the handler it is not a user dismissal.
function closeNatively(dialog: HTMLDialogElement, ignoreNextClose: { current: boolean }): void {
  ignoreNextClose.current = true;
  dialog.close();
}

// H5, S4, S7: a confirm dialog on the native <dialog>. showModal() traps focus and close() returns
// focus to the trigger. React state is the source of truth: Esc, backdrop clicks and a native
// close only call onCancel, and the dialog closes when the parent sets open to false.
export function Dialog({
  open,
  title,
  description,
  confirmLabel,
  cancelLabel = 'Cancel',
  onConfirm,
  onCancel,
  destructive = false,
  error,
  busy = false,
  onCloseFocus,
}: DialogProps): JSX.Element {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const actionsRef = useRef<HTMLDivElement>(null);
  const ignoreNextClose = useRef(false);
  const pointerDownOnBackdrop = useRef(false);
  const titleId = useId();
  const descriptionId = useId();
  const hasDescription = description !== undefined && description.length > 0;

  // Layout effect: showModal and close run before paint and before the node can detach.
  useLayoutEffect(() => {
    const dialog = dialogRef.current;
    if (dialog === null) {
      return undefined;
    }
    if (open && !isDialogOpen(dialog)) {
      dialog.showModal();
      // Explicit focus on the safe action; the first button in the actions row is Cancel.
      actionsRef.current?.querySelector<HTMLButtonElement>('button')?.focus();
    } else if (!open && isDialogOpen(dialog)) {
      closeNatively(dialog, ignoreNextClose);
      onCloseFocus?.()?.focus();
    }
    return undefined;
  }, [open, onCloseFocus]);

  // Closing on unmount keeps the native top layer and inert state consistent with the React tree.
  useLayoutEffect(() => {
    const dialog = dialogRef.current;
    return () => {
      if (dialog !== null && isDialogOpen(dialog)) {
        closeNatively(dialog, ignoreNextClose);
      }
    };
  }, []);

  // Esc fires a cancelable "cancel" event. Preventing the default keeps the dialog open, so the
  // parent's state stays the only thing that closes it.
  function handleCancelEvent(event: SyntheticEvent<HTMLDialogElement>): void {
    event.preventDefault();
    if (busy) {
      return;
    }
    onCancel();
  }

  // A native close that the parent did not request (for example a form submitting with
  // method="dialog") is reported as a cancel so the parent's open state catches up.
  function handleCloseEvent(): void {
    if (ignoreNextClose.current) {
      ignoreNextClose.current = false;
      return;
    }
    if (open) {
      onCancel();
    }
  }

  // Drag-select starts inside the panel and ends on the backdrop; only a press and release that
  // both target the dialog element itself count as a backdrop dismissal.
  function handlePointerDown(event: ReactPointerEvent<HTMLDialogElement>): void {
    pointerDownOnBackdrop.current = event.target === event.currentTarget;
  }

  function handleBackdropClick(event: MouseEvent<HTMLDialogElement>): void {
    const startedOnBackdrop = pointerDownOnBackdrop.current;
    pointerDownOnBackdrop.current = false;
    if (startedOnBackdrop && event.target === event.currentTarget && !busy) {
      onCancel();
    }
  }

  // aria-disabled (not disabled) keeps focus in place while busy; the click guards make it inert.
  return (
    <dialog
      ref={dialogRef}
      className="ds-dialog"
      aria-labelledby={titleId}
      aria-describedby={hasDescription ? descriptionId : undefined}
      onCancel={handleCancelEvent}
      onClose={handleCloseEvent}
      onPointerDown={handlePointerDown}
      onClick={handleBackdropClick}
    >
      <div className="ds-dialog__panel">
        <h2 id={titleId} className="ds-dialog__title">
          {title}
        </h2>
        {hasDescription ? (
          <p id={descriptionId} className="ds-dialog__description">
            {description}
          </p>
        ) : null}
        <div role="alert" className="ds-dialog__error">
          {error}
        </div>
        <div className="ds-dialog__actions" ref={actionsRef}>
          <Button
            variant="subtle"
            aria-disabled={busy}
            onClick={() => {
              if (!busy) {
                onCancel();
              }
            }}
          >
            {cancelLabel}
          </Button>
          <Button
            variant={destructive ? 'danger' : 'primary'}
            aria-disabled={busy}
            onClick={() => {
              if (!busy) {
                onConfirm();
              }
            }}
          >
            {confirmLabel}
          </Button>
        </div>
      </div>
    </dialog>
  );
}
