import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { VisuallyHidden } from './VisuallyHidden';

// S7: hidden visually, but its text is still in the document for assistive technology.
describe('VisuallyHidden (S7)', () => {
  it('renders its children in the document', () => {
    render(<VisuallyHidden>Opens in a new tab</VisuallyHidden>);

    expect(screen.getByText('Opens in a new tab')).not.toBeNull();
  });
});
