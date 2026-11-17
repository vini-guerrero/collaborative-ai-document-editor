import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Avatar } from './Avatar';

// S4 and S7: initials are derived from the name; the circle is an image named by the full name.
describe('Avatar (S4, S7)', () => {
  it('shows the initials of the first two words', () => {
    render(<Avatar name="Ada Lovelace" />);

    expect(screen.getByRole('img', { name: 'Ada Lovelace' }).textContent).toBe('AL');
  });

  it('shows one initial for a single name', () => {
    render(<Avatar name="Ada" />);

    expect(screen.getByRole('img', { name: 'Ada' }).textContent).toBe('A');
  });

  it('keeps a non-ASCII leading letter whole', () => {
    render(<Avatar name="Émile" />);

    expect(screen.getByRole('img', { name: 'Émile' }).textContent).toBe('É');
  });

  it('is exposed as an image labelled with the full name', () => {
    render(<Avatar name="Ada Lovelace" size="sm" />);

    const avatar = screen.getByRole('img', { name: 'Ada Lovelace' });
    expect(avatar.getAttribute('aria-label')).toBe('Ada Lovelace');
  });
});
