import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { ImproveSectionButton } from './ImproveSectionButton';

describe('ImproveSectionButton', () => {
  it('names the action Improve Section and reports a click', async () => {
    const user = userEvent.setup();
    const onImprove = vi.fn();
    render(<ImproveSectionButton onImprove={onImprove} />);
    await user.click(screen.getByRole('button', { name: 'Improve Section' }));
    expect(onImprove).toHaveBeenCalledTimes(1);
  });

  it('is reachable and activatable from the keyboard', async () => {
    const user = userEvent.setup();
    const onImprove = vi.fn();
    render(<ImproveSectionButton onImprove={onImprove} />);
    await user.tab();
    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Improve Section' }));
    await user.keyboard('{Enter}');
    expect(onImprove).toHaveBeenCalledTimes(1);
  });
});
