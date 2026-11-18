import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { AiBubble } from './AiBubble';

describe('AiBubble (S5)', () => {
  it('announces that the AI is analyzing, with no button to press', () => {
    render(<AiBubble state="loading" />);
    expect(screen.getByRole('status', { name: 'AI Is Analyzing This Paragraph' })).toBeTruthy();
    expect(screen.queryByRole('button')).toBeNull();
  });

  it('opens the suggestions when the ready bubble is pressed', async () => {
    const user = userEvent.setup();
    const onOpen = vi.fn();
    render(<AiBubble state="ready" count={2} onOpen={onOpen} />);
    await user.click(screen.getByRole('button', { name: 'Show AI Suggestions (2)' }));
    expect(onOpen).toHaveBeenCalledTimes(1);
  });

  it('shows a count only when there is more than one suggestion', () => {
    const { rerender } = render(<AiBubble state="ready" count={1} onOpen={() => undefined} />);
    expect(screen.queryByText('1')).toBeNull();
    rerender(<AiBubble state="ready" count={3} onOpen={() => undefined} />);
    expect(screen.getByText('3')).toBeTruthy();
  });
});
