import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Icon } from './Icon';

// S6: icons are Lucide behind one wrapper; decorative by default, named when labelled.
describe('Icon (S6)', () => {
  it('hides a decorative icon from assistive technology', () => {
    const { container } = render(<Icon name="archive" />);

    const svg = container.querySelector('svg');
    expect(svg?.getAttribute('aria-hidden')).toBe('true');
    expect(screen.queryByRole('img')).toBeNull();
  });

  it('exposes a labelled icon as an image with its label', () => {
    render(<Icon name="search" label="Search documents" />);

    const image = screen.getByRole('img', { name: 'Search documents' });
    expect(image.tagName.toLowerCase()).toBe('svg');
  });
});
