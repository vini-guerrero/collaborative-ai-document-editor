import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import type { FlagEntry } from '../flags/flagsState';
import { SuggestionCard } from './SuggestionCard';
import type { SuggestionOutcomeRequest } from './SuggestionOutcome';

const FLAG: FlagEntry = {
  id: 'flag-1',
  kind: 'clarity',
  reason: 'Say why the date changed.',
  quote: 'moved',
  from: 12,
  to: 17,
  blockHash: 'hash',
};

function renderCard(request: SuggestionOutcomeRequest, onAccept = vi.fn(), onDismiss = vi.fn()) {
  render(<SuggestionCard request={request} onAccept={onAccept} onDismiss={onDismiss} />);
  return { onAccept, onDismiss };
}

describe('SuggestionCard states', () => {
  // D14: a spinner with a label while the rewrite runs.
  it('shows a spinner while the suggestion is being written', () => {
    renderCard({ kind: 'loading', flag: FLAG });

    // A status region takes its text from its content, not an accessible name.
    expect(screen.getByRole('status').textContent).toBe('Writing a suggestion');
    expect(screen.queryByRole('button', { name: 'Accept' })).toBeNull();
  });

  // D5: the success state offers Accept and Dismiss; the reason and kind are text.
  it('offers Accept and Dismiss once a suggestion is ready', async () => {
    const user = userEvent.setup();
    const { onAccept, onDismiss } = renderCard({ kind: 'ready', flag: FLAG });

    expect(screen.getByText('Clarity')).toBeTruthy();
    expect(screen.getByText(FLAG.reason)).toBeTruthy();
    await user.click(screen.getByRole('button', { name: 'Accept' }));
    await user.click(screen.getByRole('button', { name: 'Dismiss' }));

    expect(onAccept).toHaveBeenCalledTimes(1);
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });

  // D8: the empty state says so in plain words and offers no Accept.
  it('says that no changes were suggested when the text is the same', () => {
    renderCard({ kind: 'empty', flag: FLAG });

    expect(screen.getByText('No changes suggested')).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Accept' })).toBeNull();
  });

  // D14: errors say the text is unchanged, then give a short plain reason.
  it('shows the unchanged-text error with the reason for out of credit', () => {
    renderCard({ kind: 'error', flag: FLAG, reason: 'out_of_credit' });

    expect(screen.getByText('Your text is unchanged.')).toBeTruthy();
    expect(screen.getByText('The AI is out of credit.')).toBeTruthy();
  });

  // A suggestion whose text changed is reported as stale, not applied.
  it('reports a stale suggestion as an error', () => {
    renderCard({ kind: 'error', flag: FLAG, reason: 'stale' });

    expect(screen.getByText('The text changed after this suggestion was written.')).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Accept' })).toBeNull();
  });

  // D17: Tab accepts only while the suggestion is ready and the card has focus.
  it('accepts with Tab only in the ready state', async () => {
    const user = userEvent.setup();
    const { onAccept } = renderCard({ kind: 'loading', flag: FLAG });
    await user.keyboard('{Tab}');
    expect(onAccept).not.toHaveBeenCalled();
  });

  it('accepts with Tab when the suggestion is ready and the card has focus', async () => {
    const user = userEvent.setup();
    const { onAccept } = renderCard({ kind: 'ready', flag: FLAG });
    await user.keyboard('{Tab}');
    expect(onAccept).toHaveBeenCalledTimes(1);
  });
});
