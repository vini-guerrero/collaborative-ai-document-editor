import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { IconButton } from './IconButton';

// S7: icon-only controls have an accessible name and a keyboard path.
describe('IconButton (S7)', () => {
  it('exposes its label as the accessible name', () => {
    render(<IconButton icon="x" label="Close panel" />);

    expect(screen.getByRole('button', { name: 'Close panel' })).not.toBeNull();
  });

  it('shows its label in Title Case as a tooltip, or the text it is given', () => {
    render(
      <>
        <IconButton icon="x" label="Close panel" />
        <IconButton icon="trash" label="Delete note" tooltip="Remove This Note" />
      </>,
    );

    expect(screen.getByRole('tooltip', { name: 'Close Panel' })).not.toBeNull();
    expect(screen.getByRole('tooltip', { name: 'Remove This Note' })).not.toBeNull();
  });

  it('activates with Enter from the keyboard', async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();
    render(<IconButton icon="plus" label="New Document" onClick={onClick} />);

    await user.tab();
    await user.keyboard('{Enter}');

    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('activates with Space from the keyboard', async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();
    render(<IconButton icon="trash" label="Delete Document" onClick={onClick} />);

    await user.tab();
    await user.keyboard(' ');

    expect(onClick).toHaveBeenCalledTimes(1);
  });
});
