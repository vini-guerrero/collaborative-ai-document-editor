import { act, render, screen } from '@testing-library/react';
import type { JSX } from 'react';
import { describe, expect, it } from 'vitest';
import { setViewportWidth } from '../../test/matchMedia';
import { useBreakpoint } from './useBreakpoint';

function BreakpointProbe(): JSX.Element {
  return <output aria-label="breakpoint">{useBreakpoint()}</output>;
}

// S9: the layout mode follows the viewport width through the min-width scale.
describe('useBreakpoint (S9)', () => {
  it('reports base below the smallest breakpoint', () => {
    setViewportWidth(360);
    render(<BreakpointProbe />);

    expect(screen.getByLabelText('breakpoint').textContent).toBe('base');
  });

  it('reports md between 768 and 1023 pixels', () => {
    setViewportWidth(800);
    render(<BreakpointProbe />);

    expect(screen.getByLabelText('breakpoint').textContent).toBe('md');
  });

  it('reports lg between 1024 and 1279 pixels', () => {
    setViewportWidth(1100);
    render(<BreakpointProbe />);

    expect(screen.getByLabelText('breakpoint').textContent).toBe('lg');
  });

  it('updates when the viewport crosses a breakpoint', () => {
    setViewportWidth(1100);
    render(<BreakpointProbe />);

    act(() => {
      setViewportWidth(1300);
    });

    expect(screen.getByLabelText('breakpoint').textContent).toBe('xl');
    act(() => {
      setViewportWidth(360);
    });
    expect(screen.getByLabelText('breakpoint').textContent).toBe('base');
  });
});
