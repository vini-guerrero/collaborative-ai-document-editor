import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { Button } from './Button';

// S4 and S7: Button is a native button, labelled by its verb, operable by pointer and keyboard.
describe('Button (S4, S7)', () => {
  it('renders its label as a button found by role', () => {
    render(<Button>Accept</Button>);

    expect(screen.getByRole('button', { name: 'Accept' })).not.toBeNull();
  });

  it('calls the click handler when activated', async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();
    render(<Button onClick={onClick}>Dismiss</Button>);

    await user.click(screen.getByRole('button', { name: 'Dismiss' }));

    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('does not fire the handler and exposes the disabled state when disabled (S7)', async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();
    render(
      <Button disabled onClick={onClick}>
        Delete
      </Button>,
    );

    const button = screen.getByRole('button', { name: 'Delete' });
    await user.click(button);

    expect(onClick).not.toHaveBeenCalled();
    expect(button.hasAttribute('disabled')).toBe(true);
  });

  it('defaults to type "button" so it never submits a form by accident (S4)', () => {
    render(
      <form>
        <Button>Refine</Button>
      </form>,
    );

    expect(screen.getByRole('button', { name: 'Refine' }).getAttribute('type')).toBe('button');
  });
});
