import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { App } from '@/App';

describe('App', () => {
  // T9: smoke test that the app shell renders its title for assistive technology.
  it('renders the editor title as a level-1 heading (T9)', () => {
    render(<App />);

    const heading = screen.getByRole('heading', { level: 1, name: 'AI Co-Author Editor' });

    expect(heading.textContent).toBe('AI Co-Author Editor');
  });
});
