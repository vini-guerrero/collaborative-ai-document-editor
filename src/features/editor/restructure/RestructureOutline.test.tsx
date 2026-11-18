import { render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { RestructureOutline } from './RestructureOutline';
import { outline } from './sections';

// D10: the outline lists each section's heading in document order. Text before the first heading
// is listed as opening text.
function titlesOf(markdown: string): string[] {
  render(<RestructureOutline sections={outline(markdown)} />);
  const nav = screen.getByRole('navigation', { name: 'Document outline' });
  return within(nav)
    .getAllByRole('listitem')
    .map((item) => item.textContent);
}

describe('RestructureOutline', () => {
  it('lists the section headings in order', () => {
    expect(titlesOf('# Intro\n\nA.\n\n## Pricing\n\nB.\n')).toEqual(['Intro', 'Pricing']);
  });

  it('lists text before the first heading as opening text', () => {
    expect(titlesOf('Lead.\n\n# Intro\n\nBody.\n')).toEqual(['Opening text', 'Intro']);
  });

  it('shows an empty state when there are no sections', () => {
    render(<RestructureOutline sections={outline('')} />);
    expect(screen.getByText('No sections yet.')).toBeTruthy();
    expect(screen.queryByRole('navigation', { name: 'Document outline' })).toBeNull();
  });
});
