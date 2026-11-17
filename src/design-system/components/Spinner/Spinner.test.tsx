import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Spinner } from './Spinner';

// S4 and S7: the spinner is a status region whose text is announced, not only shown.
describe('Spinner (S4, S7)', () => {
  it('is a status region with the default "Loading" text', () => {
    render(<Spinner />);

    const status = screen.getByRole('status');
    expect(status.textContent).toBe('Loading');
  });

  it('uses a custom label as its announced text', () => {
    render(<Spinner label="Generating suggestion" />);

    const status = screen.getByRole('status');
    expect(status.textContent).toBe('Generating suggestion');
  });
});
