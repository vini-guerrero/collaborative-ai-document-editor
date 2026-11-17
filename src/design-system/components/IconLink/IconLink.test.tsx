import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { iconLinkClassName, IconLink } from './IconLink';

describe('IconLink', () => {
  // S7: an icon-only link keeps its label as the accessible name.
  it('renders an anchor named by its label with the href it was given', () => {
    render(<IconLink href="/" icon="arrow-left" label="Back to documents" />);

    const link = screen.getByRole('link', { name: 'Back to documents' });

    expect(link.getAttribute('href')).toBe('/');
    expect(link.className).toContain('ds-icon-button');
  });

  // S9: navigation runs on click and keyboard alike; the handler is passed through.
  it('passes click handlers through to the anchor', async () => {
    const onClick = vi.fn();
    const user = userEvent.setup();
    render(<IconLink href="#back" icon="arrow-left" label="Back" onClick={onClick} />);

    await user.click(screen.getByRole('link', { name: 'Back' }));

    expect(onClick).toHaveBeenCalledTimes(1);
  });

  // S8: router Links reuse the same class string as IconLink.
  it('exposes the class string used for router links', () => {
    expect(iconLinkClassName()).toBe('ds-button ds-button--subtle ds-icon-button ds-icon-link');
  });
});
