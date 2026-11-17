import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Lozenge } from './Lozenge';

// S4: a Lozenge shows its text inline; the "Soon" tone labels disabled features (H2, H3).
describe('Lozenge (S4)', () => {
  it('shows its text', () => {
    render(<Lozenge>Draft</Lozenge>);

    expect(screen.getByText('Draft')).not.toBeNull();
  });

  it('shows the "Soon" label for the soon tone (H2, H3)', () => {
    render(<Lozenge tone="soon">Soon</Lozenge>);

    expect(screen.getByText('Soon')).not.toBeNull();
  });
});
