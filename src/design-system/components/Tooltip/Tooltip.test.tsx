import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Tooltip } from './Tooltip';

// S7: the hint describes the control; the control keeps its own name.
describe('Tooltip', () => {
  it('describes its child with the hint text', () => {
    render(
      <Tooltip content="Open the history">
        <button type="button">History</button>
      </Tooltip>,
    );
    expect(screen.getByRole('tooltip', { hidden: true }).textContent).toBe('Open the history');
    expect(screen.getByRole('button', { name: 'History' })).toBeTruthy();
  });
});
