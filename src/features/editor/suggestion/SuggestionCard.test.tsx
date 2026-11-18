import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import type { RewriteTarget } from './rewriteTarget';
import { SuggestionCard } from './SuggestionCard';
import type { SuggestionOutcomeRequest } from './SuggestionOutcome';

const TARGET: RewriteTarget = {
  from: 12,
  to: 17,
  quote: 'moved',
  paragraph: 'The launch moved to the second week of March.',
  blockHash: 'hash',
  flagId: 'flag-1',
  title: 'Clarity',
  detail: 'Say why the date changed.',
};

function renderCard(request: SuggestionOutcomeRequest, onAccept = vi.fn(), onDismiss = vi.fn()) {
  render(
    <SuggestionCard request={request} refine={null} onAccept={onAccept} onDismiss={onDismiss} />,
  );
  return { onAccept, onDismiss };
}

describe('SuggestionCard states', () => {
  // D14: a spinner with a label while the rewrite runs.
  it('shows a spinner while the suggestion is being written', () => {
    renderCard({ kind: 'loading', target: TARGET });

    // A status region takes its text from its content, not an accessible name.
    expect(screen.getByRole('status').textContent).toBe('Writing a suggestion');
    expect(screen.queryByRole('button', { name: 'Accept' })).toBeNull();
  });

  // D5: the success state offers Accept and Dismiss; the reason and kind are text.
  it('offers Accept and Dismiss once a suggestion is ready', async () => {
    const user = userEvent.setup();
    const { onAccept, onDismiss } = renderCard({ kind: 'ready', target: TARGET });

    expect(screen.getByText('Clarity')).toBeTruthy();
    expect(screen.getByText(TARGET.detail ?? '')).toBeTruthy();
    await user.click(screen.getByRole('button', { name: 'Accept' }));
    await user.click(screen.getByRole('button', { name: 'Dismiss' }));

    expect(onAccept).toHaveBeenCalledTimes(1);
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });

  // D8: the empty state says so in plain words and offers no Accept.
  it('says that no changes were suggested when the text is the same', () => {
    renderCard({ kind: 'empty', target: TARGET });
    expect(screen.getByText('No changes suggested')).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Accept' })).toBeNull();
  });

  // D14: errors say the text is unchanged, then give a short plain reason.
  it('shows the unchanged-text error with the reason for out of credit', () => {
    renderCard({ kind: 'error', target: TARGET, reason: 'out_of_credit' });

    expect(screen.getByText('Your text is unchanged.')).toBeTruthy();
    expect(screen.getByText('The AI is out of credit.')).toBeTruthy();
  });

  // A suggestion whose text changed is reported as stale, not applied.
  it('reports a stale suggestion as an error', () => {
    renderCard({ kind: 'error', target: TARGET, reason: 'stale' });

    expect(screen.getByText('The text changed after this suggestion was written.')).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Accept' })).toBeNull();
  });

  // D17: Tab accepts only while the suggestion is ready and the card has focus.
  it('accepts with Tab only in the ready state', async () => {
    const user = userEvent.setup();
    const { onAccept } = renderCard({ kind: 'loading', target: TARGET });
    await user.keyboard('{Tab}');
    expect(onAccept).not.toHaveBeenCalled();
  });

  it('accepts with Tab when the suggestion is ready and the card has focus', async () => {
    const user = userEvent.setup();
    const { onAccept } = renderCard({ kind: 'ready', target: TARGET });
    await user.keyboard('{Tab}');
    expect(onAccept).toHaveBeenCalledTimes(1);
  });
});
