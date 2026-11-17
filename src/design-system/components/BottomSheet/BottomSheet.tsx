import {
  useEffect,
  useLayoutEffect,
  useRef,
  type JSX,
  type MouseEvent,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
  type SyntheticEvent,
} from 'react';
import { IconButton } from '../IconButton/IconButton';
import './BottomSheet.css';

export interface BottomSheetProps {
  open: boolean;
  // Called on Esc, the Close button and a press on the scrim. The sheet only closes when the
  // parent sets open to false.
  onClose: () => void;
  // Accessible name for the sheet, for example "Suggestion for this sentence".
  label: string;
  closeLabel?: string;
  // Where focus goes on close, as Dialog's onCloseFocus. Returning null, or an element that is no
  // longer in the document, falls back to the element focused before the sheet opened, then to
  // the document.
  returnFocusTo?: (() => HTMLElement | null) | undefined;
  children: ReactNode;
}

function isDialogOpen(dialog: HTMLDialogElement): boolean {
  return dialog.hasAttribute('open');
}

// Closes the native dialog on purpose. Browsers fire the close event asynchronously, so the flag
// stays set until that event arrives and tells the handler it is not a user dismissal.
function closeNatively(dialog: HTMLDialogElement, ignoreNextClose: { current: boolean }): void {
  ignoreNextClose.current = true;
  dialog.close();
}

function focusReturnTarget(preferred: HTMLElement | null, fallback: Element | null): void {
  for (const candidate of [preferred, fallback]) {
    if (candidate instanceof HTMLElement && candidate.isConnected) {
      candidate.focus();
      return;
    }
  }
  document.body.focus();
}

// S9: the mobile stand-in for a popover. It is a native modal <dialog> (as Dialog is), so the
// page behind is inert, focus is contained, and Esc arrives as a cancel event. It slides up from
// the bottom. The page scroll is locked while it is open.
export function BottomSheet({
  open,
  onClose,
  label,
  closeLabel = 'Close',
  returnFocusTo,
  children,
}: BottomSheetProps): JSX.Element {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const ignoreNextClose = useRef(false);
  const pointerDownOnBackdrop = useRef(false);
  const previouslyFocused = useRef<Element | null>(null);

  // showModal and close run before paint. Focus goes to the first control (Close) on open, as
  // the native modal does, and to the return target on close.
  useLayoutEffect(() => {
    const dialog = dialogRef.current;
    if (dialog === null) {
      return undefined;
    }
    if (open && !isDialogOpen(dialog)) {
      previouslyFocused.current = document.activeElement;
      dialog.showModal();
    } else if (!open && isDialogOpen(dialog)) {
      closeNatively(dialog, ignoreNextClose);
      focusReturnTarget(returnFocusTo?.() ?? null, previouslyFocused.current);
    }
    return undefined;
  }, [open, returnFocusTo]);

  // Closing on unmount keeps the top layer and inert state consistent with the React tree.
  useLayoutEffect(() => {
    const dialog = dialogRef.current;
    return () => {
      if (dialog !== null && isDialogOpen(dialog)) {
        closeNatively(dialog, ignoreNextClose);
      }
    };
  }, []);

  // Restores the previous overflow value on close and unmount, so nothing stays locked.
  useEffect(() => {
    if (!open) {
      return undefined;
    }
    const { body } = document;
    const previousOverflow = body.style.overflow;
    body.style.overflow = 'hidden';
    return () => {
      body.style.overflow = previousOverflow;
    };
  }, [open]);

  // Esc arrives as a cancelable "cancel" event. Preventing the default keeps the native dialog
  // open, so the parent's state stays the only thing that closes it.
  function handleCancelEvent(event: SyntheticEvent<HTMLDialogElement>): void {
    event.preventDefault();
    onClose();
  }

  // A native close the component did not request is reported as a dismissal so the parent's
  // open state catches up.
  function handleCloseEvent(): void {
    if (ignoreNextClose.current) {
      ignoreNextClose.current = false;
      return;
    }
    if (open) {
      onClose();
    }
  }

  // Only a press and release that both target the dialog element itself count as a scrim click.
  // The panel fills the dialog, so a click on content never targets the dialog element.
  function handlePointerDown(event: ReactPointerEvent<HTMLDialogElement>): void {
    pointerDownOnBackdrop.current = event.target === event.currentTarget;
  }

  function handleBackdropClick(event: MouseEvent<HTMLDialogElement>): void {
    const startedOnBackdrop = pointerDownOnBackdrop.current;
    pointerDownOnBackdrop.current = false;
    if (startedOnBackdrop && event.target === event.currentTarget) {
      onClose();
    }
  }

  return (
    <dialog
      ref={dialogRef}
      className="ds-bottom-sheet"
      aria-label={label}
      onCancel={handleCancelEvent}
      onClose={handleCloseEvent}
      onPointerDown={handlePointerDown}
      onClick={handleBackdropClick}
    >
      <div className="ds-bottom-sheet__panel">
        <div className="ds-bottom-sheet__header">
          <IconButton icon="x" label={closeLabel} onClick={onClose} />
        </div>
        {children}
      </div>
    </dialog>
  );
}
