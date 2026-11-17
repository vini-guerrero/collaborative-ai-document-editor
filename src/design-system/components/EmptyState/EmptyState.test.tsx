import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { EmptyState } from './EmptyState';

// S4 and H6: the empty state has a level 2 heading, an explanation and a next step.
describe('EmptyState (S4, H6)', () => {
  it('renders the title as a level 2 heading', () => {
    render(<EmptyState title="No documents yet" />);

    expect(screen.getByRole('heading', { level: 2, name: 'No documents yet' })).not.toBeNull();
  });

  it('renders the description when given', () => {
    render(<EmptyState title="No documents yet" description="Create one to start writing." />);

    expect(screen.getByText('Create one to start writing.')).not.toBeNull();
  });

  it('renders the action slot', () => {
    render(
      <EmptyState
        title="No documents yet"
        action={<button type="button">Create document</button>}
      />,
    );

    expect(screen.getByRole('button', { name: 'Create document' })).not.toBeNull();
  });
});
