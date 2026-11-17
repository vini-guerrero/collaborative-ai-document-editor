import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { TextField } from './TextField';

// S4 and S7: the label is the accessible name, errors are linked, disabled is native.
describe('TextField (S4, S7)', () => {
  it('associates the visible label with the input', () => {
    render(<TextField label="Document title" />);

    const input = screen.getByLabelText('Document title');
    expect(input.tagName).toBe('INPUT');
  });

  it('keeps the label as the accessible name when hideLabel is set (S7)', () => {
    render(<TextField label="Search documents" hideLabel />);

    expect(screen.getByRole('textbox', { name: 'Search documents' })).not.toBeNull();
  });

  it('calls onChange when the user types', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<TextField label="Document title" onChange={onChange} />);

    await user.type(screen.getByRole('textbox', { name: 'Document title' }), 'a');

    expect(onChange).toHaveBeenCalledTimes(1);
  });

  it('describes the input with the error message and marks it invalid (S7)', () => {
    render(<TextField label="Document title" error="Enter a title" />);

    const input = screen.getByRole('textbox', { name: 'Document title' });
    const message = screen.getByText('Enter a title');

    expect(input.getAttribute('aria-invalid')).toBe('true');
    expect(input.getAttribute('aria-describedby')).toBe(message.id);
  });

  it('is not invalid and has no description when there is no error', () => {
    render(<TextField label="Document title" />);

    const input = screen.getByRole('textbox', { name: 'Document title' });

    expect(input.hasAttribute('aria-invalid')).toBe(false);
    expect(input.hasAttribute('aria-describedby')).toBe(false);
  });

  it('is natively disabled when disabled (S7)', () => {
    render(<TextField label="Document title" disabled />);

    expect(screen.getByRole('textbox', { name: 'Document title' }).hasAttribute('disabled')).toBe(
      true,
    );
  });
});
