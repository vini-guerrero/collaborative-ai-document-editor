import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useRef, useState, type JSX } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { Popover, type PopoverProps } from './Popover';

const LABEL = 'Suggestion for this sentence';
const EDITOR_TEXT = 'The editor text outside the popover.';

type ReturnFocus = PopoverProps['returnFocusTo'];

// The anchor is a real element in the document, so focus and pointer checks use the DOM as the
// app does. Positioning itself is not asserted: jsdom has no layout.
function ControlledPopover({
  open,
  onClose,
  returnFocusTo,
}: {
  open: boolean;
  onClose: () => void;
  returnFocusTo?: ReturnFocus;
}): JSX.Element {
  const [anchor, setAnchor] = useState<HTMLButtonElement | null>(null);
  return (
    <>
      <button type="button" ref={setAnchor}>
        Show suggestion
      </button>
      <p>{EDITOR_TEXT}</p>
      <Popover
        anchor={anchor}
        open={open}
        onClose={onClose}
        label={LABEL}
        returnFocusTo={returnFocusTo}
      >
        <button type="button">Accept</button>
        <button type="button">Dismiss</button>
      </Popover>
    </>
  );
}

// A trigger that opens the popover, so focus return is observed the way the editor will use it.
function ToggleHarness({ onClose }: { onClose: () => void }): JSX.Element {
  const [open, setOpen] = useState(false);
  const [anchor, setAnchor] = useState<HTMLButtonElement | null>(null);
  return (
    <>
      <button
        type="button"
        ref={setAnchor}
        onClick={() => {
          setOpen(true);
        }}
      >
        Show suggestion
      </button>
      <p>{EDITOR_TEXT}</p>
      <Popover
        anchor={anchor}
        open={open}
        onClose={() => {
          setOpen(false);
          onClose();
        }}
        label={LABEL}
      >
        <button type="button">Accept</button>
      </Popover>
    </>
  );
}

// Closes on Escape through the real onClose path, and resolves return targets through refs so no
// query runs during unmount teardown.
function ReturnFocusHarness({
  mode,
  onClose,
}: {
  mode: 'elsewhere' | 'detached';
  onClose: () => void;
}): JSX.Element {
  const [open, setOpen] = useState(false);
  const [anchor, setAnchor] = useState<HTMLButtonElement | null>(null);
  const elsewhere = useRef<HTMLButtonElement>(null);
  const [detached] = useState(() => document.createElement('button'));
  return (
    <>
      <button
        type="button"
        ref={setAnchor}
        onClick={() => {
          setOpen(true);
        }}
      >
        Show suggestion
      </button>
      <button type="button" ref={elsewhere}>
        Elsewhere
      </button>
      <Popover
        anchor={anchor}
        open={open}
        onClose={() => {
          setOpen(false);
          onClose();
        }}
        label={LABEL}
        returnFocusTo={() => (mode === 'elsewhere' ? elsewhere.current : detached)}
      >
        <button type="button">Accept</button>
      </Popover>
    </>
  );
}

// Removes the trigger from inside the open panel, so focus is in the panel when the anchor goes.
function RemovableAnchorHarness(): JSX.Element {
  const [anchor, setAnchor] = useState<HTMLButtonElement | null>(null);
  const [triggerShown, setTriggerShown] = useState(true);
  return (
    <>
      {triggerShown ? (
        <button type="button" ref={setAnchor}>
          Show suggestion
        </button>
      ) : null}
      <Popover anchor={anchor} open onClose={vi.fn<() => void>()} label={LABEL}>
        <button
          type="button"
          onClick={() => {
            setTriggerShown(false);
          }}
        >
          Remove trigger
        </button>
      </Popover>
    </>
  );
}

// S5, S7, S9, D17: an anchored, non-modal dialog that is keyboard and touch operable.
describe('Popover (S5, S7, S9, D17)', () => {
  it('renders a named, non-modal dialog only while open', () => {
    const { rerender } = render(<ControlledPopover open={false} onClose={vi.fn<() => void>()} />);
    expect(screen.queryByRole('dialog')).toBeNull();

    rerender(<ControlledPopover open onClose={vi.fn<() => void>()} />);

    const dialog = screen.getByRole('dialog', { name: LABEL });
    expect(dialog.getAttribute('aria-modal')).toBeNull();
    expect(screen.getByRole('button', { name: 'Accept' })).not.toBeNull();
  });

  it('renders nothing while there is no anchor element', () => {
    render(
      <Popover anchor={null} open onClose={vi.fn<() => void>()} label={LABEL}>
        <button type="button">Accept</button>
      </Popover>,
    );

    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('moves focus to the first control on open, so the keyboard path works at once', () => {
    const { rerender } = render(<ControlledPopover open={false} onClose={vi.fn<() => void>()} />);

    rerender(<ControlledPopover open onClose={vi.fn<() => void>()} />);

    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Accept' }));
  });

  it('moves focus to the panel when it has no controls', () => {
    render(
      <Popover anchor={document.body} open onClose={vi.fn<() => void>()} label={LABEL}>
        <p>Read-only note</p>
      </Popover>,
    );

    expect(document.activeElement).toBe(screen.getByRole('dialog', { name: LABEL }));
  });

  it('wraps Tab past the last control back to the first, never out to the body', async () => {
    const user = userEvent.setup();
    const { rerender } = render(<ControlledPopover open={false} onClose={vi.fn<() => void>()} />);
    rerender(<ControlledPopover open onClose={vi.fn<() => void>()} />);
    const accept = screen.getByRole('button', { name: 'Accept' });
    const dismiss = screen.getByRole('button', { name: 'Dismiss' });

    await user.tab();
    expect(document.activeElement).toBe(dismiss);

    await user.tab();
    expect(document.activeElement).toBe(accept);
  });

  it('wraps Shift+Tab before the first control to the last', async () => {
    const user = userEvent.setup();
    const { rerender } = render(<ControlledPopover open={false} onClose={vi.fn<() => void>()} />);
    rerender(<ControlledPopover open onClose={vi.fn<() => void>()} />);

    await user.tab({ shift: true });

    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Dismiss' }));
  });

  it('calls onClose on Escape, including when focus is outside the panel', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn<() => void>();
    const { rerender } = render(<ControlledPopover open={false} onClose={onClose} />);
    rerender(<ControlledPopover open onClose={onClose} />);

    screen.getByRole('button', { name: 'Show suggestion' }).focus();
    await user.keyboard('{Escape}');

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('stops Escape from reaching other key listeners once the popover consumes it', () => {
    const windowSpy = vi.fn<(event: KeyboardEvent) => void>();
    window.addEventListener('keydown', windowSpy);
    const onClose = vi.fn<() => void>();
    try {
      render(<ControlledPopover open onClose={onClose} />);

      fireEvent.keyDown(document.activeElement ?? document.body, { key: 'Escape' });

      expect(onClose).toHaveBeenCalledTimes(1);
      expect(windowSpy).not.toHaveBeenCalled();
    } finally {
      window.removeEventListener('keydown', windowSpy);
    }
  });

  it('returns focus to the anchor after Escape closes it (S7)', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn<() => void>();
    render(<ToggleHarness onClose={onClose} />);
    const trigger = screen.getByRole('button', { name: 'Show suggestion' });

    await user.click(trigger);
    expect(screen.getByRole('dialog', { name: LABEL })).not.toBeNull();

    await user.keyboard('{Escape}');

    expect(screen.queryByRole('dialog')).toBeNull();
    expect(document.activeElement).toBe(trigger);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('returns focus to returnFocusTo when it gives a connected element', async () => {
    const user = userEvent.setup();
    render(<ReturnFocusHarness mode="elsewhere" onClose={vi.fn<() => void>()} />);
    await user.click(screen.getByRole('button', { name: 'Show suggestion' }));
    expect(screen.getByRole('dialog', { name: LABEL })).not.toBeNull();

    await user.keyboard('{Escape}');

    expect(screen.queryByRole('dialog')).toBeNull();
    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Elsewhere' }));
  });

  it('falls back to the anchor when returnFocusTo gives a detached element', async () => {
    const user = userEvent.setup();
    render(<ReturnFocusHarness mode="detached" onClose={vi.fn<() => void>()} />);
    const trigger = screen.getByRole('button', { name: 'Show suggestion' });
    await user.click(trigger);

    await user.keyboard('{Escape}');

    expect(screen.queryByRole('dialog')).toBeNull();
    expect(document.activeElement).toBe(trigger);
  });

  it('falls back to the document body when the anchor is gone and focus was in the panel', async () => {
    const user = userEvent.setup();
    render(<RemovableAnchorHarness />);

    await user.click(screen.getByRole('button', { name: 'Remove trigger' }));

    expect(screen.queryByRole('dialog')).toBeNull();
    expect(document.activeElement).toBe(document.body);
  });

  it('calls onClose on an outside press, not on a press inside the panel or on the anchor', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn<() => void>();
    const { rerender } = render(<ControlledPopover open={false} onClose={onClose} />);
    rerender(<ControlledPopover open onClose={onClose} />);

    await user.click(screen.getByRole('button', { name: 'Accept' }));
    await user.click(screen.getByRole('button', { name: 'Show suggestion' }));
    expect(onClose).not.toHaveBeenCalled();

    await user.click(screen.getByText(EDITOR_TEXT));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('does not pull focus back to the anchor after a press outside the panel', async () => {
    const user = userEvent.setup();
    render(<ToggleHarness onClose={vi.fn<() => void>()} />);
    await user.click(screen.getByRole('button', { name: 'Show suggestion' }));
    const trigger = screen.getByRole('button', { name: 'Show suggestion' });

    await user.click(screen.getByText(EDITOR_TEXT));

    expect(screen.queryByRole('dialog')).toBeNull();
    expect(document.activeElement).not.toBe(trigger);
  });

  it('returns focus on a later close after an outside press the parent ignored', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn<() => void>();
    const { rerender } = render(<ControlledPopover open={false} onClose={onClose} />);
    rerender(<ControlledPopover open onClose={onClose} />);
    const trigger = screen.getByRole('button', { name: 'Show suggestion' });

    // The parent keeps the popover open after the press, so no close happens yet.
    await user.click(screen.getByText(EDITOR_TEXT));
    expect(screen.getByRole('dialog', { name: LABEL })).not.toBeNull();

    await user.keyboard('{Escape}');
    rerender(<ControlledPopover open={false} onClose={onClose} />);

    expect(document.activeElement).toBe(trigger);
  });

  it('stays hidden until the first position is applied, then is marked placed', async () => {
    const { rerender } = render(<ControlledPopover open={false} onClose={vi.fn<() => void>()} />);

    rerender(<ControlledPopover open onClose={vi.fn<() => void>()} />);
    const dialog = screen.getByRole('dialog', { name: LABEL });

    await waitFor(() => {
      expect(dialog.hasAttribute('data-placed')).toBe(true);
    });
  });

  it('stops listening for Escape and presses once closed', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn<() => void>();
    const { rerender } = render(<ControlledPopover open onClose={onClose} />);

    rerender(<ControlledPopover open={false} onClose={onClose} />);
    await user.keyboard('{Escape}');
    await user.click(screen.getByText(EDITOR_TEXT));

    expect(onClose).not.toHaveBeenCalled();
  });

  it('removes its listeners on unmount while open', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn<() => void>();
    const { unmount } = render(<ControlledPopover open onClose={onClose} />);

    unmount();
    await user.keyboard('{Escape}');
    await user.click(document.body);

    expect(onClose).not.toHaveBeenCalled();
  });
});
