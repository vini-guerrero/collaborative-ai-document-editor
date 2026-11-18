import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { StrictMode, useRef, useState, type JSX } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { Dialog, type DialogProps } from './Dialog';

const TITLE = 'Delete “Q3 plan”?';
const DESCRIPTION = 'This removes the document from this browser. It cannot be undone.';

function baseProps(overrides: Partial<DialogProps> = {}): DialogProps {
  return {
    open: true,
    title: TITLE,
    description: DESCRIPTION,
    confirmLabel: 'Delete Document',
    destructive: true,
    onConfirm: vi.fn<() => void>(),
    onCancel: vi.fn<() => void>(),
    ...overrides,
  };
}

function renderDialog(overrides: Partial<DialogProps> = {}) {
  const props = baseProps(overrides);
  const view = render(<Dialog {...props} />);
  return { ...view, props };
}

function getDialog(): HTMLDialogElement {
  const dialog = document.querySelector('dialog');
  if (dialog === null) {
    throw new Error('Dialog did not render a <dialog> element');
  }
  return dialog;
}

// Opens the dialog from a trigger the way the app will, so focus return can be observed.
function DeleteHarness(): JSX.Element {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        onClick={() => {
          setOpen(true);
        }}
      >
        Remove document
      </button>
      <Dialog
        open={open}
        title={TITLE}
        confirmLabel="Delete Document"
        destructive
        onConfirm={() => {
          setOpen(false);
        }}
        onCancel={() => {
          setOpen(false);
        }}
      />
    </>
  );
}

// The trigger is removed on confirm, so focus must go to a fallback element instead (onCloseFocus).
function RemovingTriggerHarness(): JSX.Element {
  const [open, setOpen] = useState(false);
  const [triggerShown, setTriggerShown] = useState(true);
  const fallbackRef = useRef<HTMLButtonElement>(null);
  return (
    <>
      {triggerShown ? (
        <button
          type="button"
          onClick={() => {
            setOpen(true);
          }}
        >
          Remove document
        </button>
      ) : null}
      <button type="button" ref={fallbackRef}>
        Back to list
      </button>
      <Dialog
        open={open}
        title={TITLE}
        confirmLabel="Delete Document"
        destructive
        onConfirm={() => {
          setTriggerShown(false);
          setOpen(false);
        }}
        onCancel={() => {
          setOpen(false);
        }}
        onCloseFocus={() => fallbackRef.current}
      />
    </>
  );
}

// H5 and S7: a rare confirm dialog that names the object, is labelled, and is operable by keyboard.
// jsdom has no native Escape or close-watcher behaviour; see the DEBT note in src/test/setup.ts.
describe('Dialog (H5, S4, S7)', () => {
  it('exposes a named dialog with its title and description when open', () => {
    renderDialog();

    const dialog = screen.getByRole('dialog', { name: TITLE });
    expect(dialog.getAttribute('aria-describedby')).not.toBeNull();
    expect(screen.getByText(DESCRIPTION)).not.toBeNull();
  });

  it('syncs the native open state across open, close and reopen (S7)', () => {
    const { props, rerender } = renderDialog({ open: false });
    expect(getDialog().hasAttribute('open')).toBe(false);

    rerender(<Dialog {...props} open />);
    expect(getDialog().hasAttribute('open')).toBe(true);
    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Cancel' }));

    rerender(<Dialog {...props} open={false} />);
    expect(getDialog().hasAttribute('open')).toBe(false);

    rerender(<Dialog {...props} open />);
    expect(getDialog().hasAttribute('open')).toBe(true);
    expect(props.onCancel).not.toHaveBeenCalled();
  });

  it('focuses the Cancel button first, never the destructive action (H5)', () => {
    renderDialog();

    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Cancel' }));
  });

  it('keeps focus on Cancel when busy flips on (S7)', () => {
    const { props, rerender } = renderDialog();
    const cancel = screen.getByRole('button', { name: 'Cancel' });

    rerender(<Dialog {...props} busy />);

    expect(document.activeElement).toBe(cancel);
  });

  it('calls onCancel when Cancel is clicked and not onConfirm', async () => {
    const user = userEvent.setup();
    const { props } = renderDialog();

    await user.click(screen.getByRole('button', { name: 'Cancel' }));

    expect(props.onCancel).toHaveBeenCalledTimes(1);
    expect(props.onConfirm).not.toHaveBeenCalled();
  });

  it('calls onConfirm when the named action is clicked', async () => {
    const user = userEvent.setup();
    const { props } = renderDialog();

    await user.click(screen.getByRole('button', { name: 'Delete Document' }));

    expect(props.onConfirm).toHaveBeenCalledTimes(1);
    expect(props.onCancel).not.toHaveBeenCalled();
  });

  it('turns Esc into onCancel and prevents the browser from closing the dialog (S7)', () => {
    const { props } = renderDialog();

    // jsdom does not emulate the native Escape key, so the cancel event is dispatched directly.
    const notPrevented = fireEvent(getDialog(), new Event('cancel', { cancelable: true }));

    expect(props.onCancel).toHaveBeenCalledTimes(1);
    expect(notPrevented).toBe(false);
    expect(getDialog().hasAttribute('open')).toBe(true);
  });

  it('ignores Esc while busy but still prevents the native close (H5)', () => {
    const { props } = renderDialog({ busy: true });

    const notPrevented = fireEvent(getDialog(), new Event('cancel', { cancelable: true }));

    expect(props.onCancel).not.toHaveBeenCalled();
    expect(notPrevented).toBe(false);
  });

  it('ignores Cancel and confirm clicks while busy (S7)', async () => {
    const user = userEvent.setup();
    const { props } = renderDialog({ busy: true });

    await user.click(screen.getByRole('button', { name: 'Cancel' }));
    await user.click(screen.getByRole('button', { name: 'Delete Document' }));

    expect(props.onCancel).not.toHaveBeenCalled();
    expect(props.onConfirm).not.toHaveBeenCalled();
  });

  it('treats a press and release on the backdrop as cancel, but not a click inside the panel', async () => {
    const user = userEvent.setup();
    const { props } = renderDialog();

    await user.click(screen.getByText(TITLE));
    expect(props.onCancel).not.toHaveBeenCalled();

    await user.click(getDialog());
    expect(props.onCancel).toHaveBeenCalledTimes(1);
  });

  it('does not cancel when a drag-select starts in the panel and ends on the backdrop (H5)', () => {
    const { props } = renderDialog();

    fireEvent.pointerDown(screen.getByText(TITLE));
    fireEvent.click(getDialog());

    expect(props.onCancel).not.toHaveBeenCalled();
  });

  it('ignores backdrop clicks while busy (H5)', () => {
    const { props } = renderDialog({ busy: true });

    fireEvent.pointerDown(getDialog());
    fireEvent.click(getDialog());

    expect(props.onCancel).not.toHaveBeenCalled();
  });

  it('calls onCancel when the native dialog fires close while still open (state stays truth)', () => {
    const { props } = renderDialog();

    fireEvent(getDialog(), new Event('close'));

    expect(props.onCancel).toHaveBeenCalledTimes(1);
  });

  it('does not call onCancel for a close the component requested itself', () => {
    const { props, rerender } = renderDialog();

    rerender(<Dialog {...props} open={false} />);

    expect(getDialog().hasAttribute('open')).toBe(false);
    expect(props.onCancel).not.toHaveBeenCalled();
  });

  it('closes the native dialog when the component unmounts while open', () => {
    const { props, unmount } = renderDialog();
    const dialog = getDialog();

    unmount();

    expect(dialog.hasAttribute('open')).toBe(false);
    expect(props.onCancel).not.toHaveBeenCalled();
  });

  it('opens once and focuses Cancel under StrictMode double effects', () => {
    const props = baseProps();
    render(
      <StrictMode>
        <Dialog {...props} />
      </StrictMode>,
    );

    expect(getDialog().hasAttribute('open')).toBe(true);
    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Cancel' }));
    expect(props.onCancel).not.toHaveBeenCalled();
  });

  it('shows the error in an alert and keeps the dialog open for a retry (recovery)', () => {
    renderDialog({ error: 'Could not delete the document. Try again.' });
    const alert = screen.getByRole('alert');

    expect(alert.textContent).toBe('Could not delete the document. Try again.');
    expect(screen.getByRole('dialog', { name: TITLE })).not.toBeNull();
  });

  it('keeps the alert region in the DOM when there is no error', () => {
    renderDialog();

    expect(screen.getByRole('alert').textContent).toBe('');
  });

  it('marks both buttons aria-disabled while busy (S7)', () => {
    renderDialog({ busy: true });

    expect(screen.getByRole('button', { name: 'Cancel' }).getAttribute('aria-disabled')).toBe(
      'true',
    );
    expect(
      screen.getByRole('button', { name: 'Delete Document' }).getAttribute('aria-disabled'),
    ).toBe('true');
  });

  it('returns focus to the trigger when it closes (S7)', async () => {
    const user = userEvent.setup();
    render(<DeleteHarness />);
    const trigger = screen.getByRole('button', { name: 'Remove document' });

    await user.click(trigger);
    expect(getDialog().hasAttribute('open')).toBe(true);

    await user.click(screen.getByRole('button', { name: 'Cancel' }));

    expect(getDialog().hasAttribute('open')).toBe(false);
    expect(document.activeElement).toBe(trigger);
  });

  it('focuses onCloseFocus when the trigger was removed before the dialog closed (S7)', async () => {
    const user = userEvent.setup();
    render(<RemovingTriggerHarness />);

    await user.click(screen.getByRole('button', { name: 'Remove document' }));
    await user.click(screen.getByRole('button', { name: 'Delete Document' }));

    expect(getDialog().hasAttribute('open')).toBe(false);
    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Back to list' }));
  });
});
