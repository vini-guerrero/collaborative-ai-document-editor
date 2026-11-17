import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState, type JSX } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { BottomSheet, type BottomSheetProps } from './BottomSheet';

const LABEL = 'Suggestion for this sentence';
const EDITOR_TEXT = 'The editor text behind the sheet.';

function getDialog(): HTMLDialogElement {
  const dialog = document.querySelector('dialog');
  if (dialog === null) {
    throw new Error('BottomSheet did not render a <dialog> element');
  }
  return dialog;
}

function renderSheet(overrides: Partial<BottomSheetProps> = {}) {
  const onClose = overrides.onClose ?? vi.fn<() => void>();
  return render(
    <BottomSheet open label={LABEL} onClose={onClose} {...overrides}>
      <button type="button">Accept</button>
      <button type="button">Dismiss</button>
    </BottomSheet>,
  );
}

// A trigger that opens the sheet, so focus return is observed the way the app will use it.
function SheetHarness({
  returnFocusTo,
}: {
  returnFocusTo?: BottomSheetProps['returnFocusTo'];
}): JSX.Element {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        onClick={() => {
          setOpen(true);
        }}
      >
        Show suggestion
      </button>
      <button type="button">Other control</button>
      <p>{EDITOR_TEXT}</p>
      <BottomSheet
        open={open}
        label={LABEL}
        returnFocusTo={returnFocusTo}
        onClose={() => {
          setOpen(false);
        }}
      >
        <button type="button">Accept</button>
      </BottomSheet>
    </>
  );
}

// S9: below md the suggestion card is a bottom sheet, built on the native modal dialog like
// Dialog. jsdom does not emulate the Escape key or a focus trap, so Esc is dispatched as a cancel
// event; see the DEBT note in src/test/setup.ts.
describe('BottomSheet (S9, S7)', () => {
  it('renders a named dialog only while open', () => {
    const { rerender } = renderSheet({ open: false });
    expect(getDialog().hasAttribute('open')).toBe(false);

    rerender(
      <BottomSheet open={true} label={LABEL} onClose={vi.fn<() => void>()}>
        <button type="button">Accept</button>
      </BottomSheet>,
    );

    expect(getDialog().hasAttribute('open')).toBe(true);
    expect(screen.getByRole('dialog', { name: LABEL })).not.toBeNull();
  });

  it('moves focus to the Close button on open', () => {
    renderSheet();

    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Close' }));
  });

  it('turns Esc into onClose and keeps the native dialog open until the parent closes it', () => {
    const onClose = vi.fn<() => void>();
    renderSheet({ onClose });

    const notPrevented = fireEvent(getDialog(), new Event('cancel', { cancelable: true }));

    expect(onClose).toHaveBeenCalledTimes(1);
    expect(notPrevented).toBe(false);
    expect(getDialog().hasAttribute('open')).toBe(true);
  });

  it('calls onClose from the visible Close button', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn<() => void>();
    renderSheet({ onClose });

    await user.click(screen.getByRole('button', { name: 'Close' }));

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('calls onClose on a press on the scrim, but not on a press inside the sheet', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn<() => void>();
    renderSheet({ onClose });

    await user.click(screen.getByRole('button', { name: 'Accept' }));
    expect(onClose).not.toHaveBeenCalled();

    await user.click(getDialog());
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('returns focus to the element focused before opening, with no returnFocusTo', async () => {
    const user = userEvent.setup();
    render(<SheetHarness />);
    const trigger = screen.getByRole('button', { name: 'Show suggestion' });

    await user.click(trigger);
    expect(getDialog().hasAttribute('open')).toBe(true);

    await user.click(screen.getByRole('button', { name: 'Close' }));

    expect(getDialog().hasAttribute('open')).toBe(false);
    expect(document.activeElement).toBe(trigger);
  });

  it('returns focus to returnFocusTo when it gives a connected element (S7)', async () => {
    const user = userEvent.setup();
    render(
      <SheetHarness returnFocusTo={() => screen.getByRole('button', { name: 'Other control' })} />,
    );
    await user.click(screen.getByRole('button', { name: 'Show suggestion' }));

    await user.click(screen.getByRole('button', { name: 'Close' }));

    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Other control' }));
  });

  it('falls back to the previously focused element when returnFocusTo gives a detached one', async () => {
    const user = userEvent.setup();
    const detached = document.createElement('button');
    render(<SheetHarness returnFocusTo={() => detached} />);
    const trigger = screen.getByRole('button', { name: 'Show suggestion' });
    await user.click(trigger);

    await user.click(screen.getByRole('button', { name: 'Close' }));

    expect(document.activeElement).toBe(trigger);
  });

  it('locks page scroll while open and restores it on close', () => {
    const { rerender } = renderSheet();
    expect(document.body.style.overflow).toBe('hidden');

    rerender(
      <BottomSheet open={false} label={LABEL} onClose={vi.fn<() => void>()}>
        <button type="button">Accept</button>
      </BottomSheet>,
    );

    expect(document.body.style.overflow).toBe('');
  });

  it('closes the native dialog and releases scroll lock on unmount, without calling onClose', () => {
    const onClose = vi.fn<() => void>();
    const { unmount } = renderSheet({ onClose });
    const dialog = getDialog();

    unmount();

    expect(dialog.hasAttribute('open')).toBe(false);
    expect(document.body.style.overflow).toBe('');
    expect(onClose).not.toHaveBeenCalled();
  });
});
