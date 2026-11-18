import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import type { RestructureOperation } from '@shared/schemas/restructure';
import { outline } from './sections';
import { RestructureSuggestion } from './RestructureSuggestion';

// The suggestion is presentational: the wording comes from the outline, actions are callbacks (D11).
const DOCUMENT = '# Intro\n\nA.\n\n## Pricing\n\nB.\n\n## Team\n\nC.\n';

function renderSuggestion(operation: RestructureOperation) {
  const onAccept = vi.fn();
  const onDismiss = vi.fn();
  render(
    <RestructureSuggestion
      operation={operation}
      sections={outline(DOCUMENT)}
      onAccept={onAccept}
      onDismiss={onDismiss}
    />,
  );
  return { onAccept, onDismiss };
}

describe('RestructureSuggestion wording', () => {
  it('describes a move in words', () => {
    renderSuggestion({ op: 'move', from: 2, to: 0 });
    expect(screen.getByText('Move "Team" above "Intro"')).toBeTruthy();
  });

  it('describes a move to the end', () => {
    renderSuggestion({ op: 'move', from: 0, to: 2 });
    expect(screen.getByText('Move "Intro" to the end')).toBeTruthy();
  });

  it('describes a merge in words', () => {
    renderSuggestion({ op: 'merge', first: 0, second: 1 });
    expect(screen.getByText('Merge "Intro" and "Pricing"')).toBeTruthy();
  });

  it('describes a split by paragraph', () => {
    renderSuggestion({ op: 'split', section: 2, atParagraph: 2 });
    expect(screen.getByText('Split "Team" after paragraph 2')).toBeTruthy();
  });

  it('gives Accept a visually hidden description that names the undo step', () => {
    renderSuggestion({ op: 'merge', first: 0, second: 1 });
    const accept = screen.getByRole('button', { name: 'Accept' });
    const descriptionId = accept.getAttribute('aria-describedby') ?? '';
    expect(document.getElementById(descriptionId)?.textContent).toContain('one undo step');
  });
});

describe('RestructureSuggestion actions', () => {
  it('calls onAccept when Accept is pressed', async () => {
    const user = userEvent.setup();
    const { onAccept, onDismiss } = renderSuggestion({ op: 'merge', first: 0, second: 1 });
    await user.click(screen.getByRole('button', { name: 'Accept' }));
    expect(onAccept).toHaveBeenCalledTimes(1);
    expect(onDismiss).not.toHaveBeenCalled();
  });

  it('calls onDismiss when Dismiss is pressed', async () => {
    const user = userEvent.setup();
    const { onAccept, onDismiss } = renderSuggestion({ op: 'merge', first: 0, second: 1 });
    await user.click(screen.getByRole('button', { name: 'Dismiss' }));
    expect(onDismiss).toHaveBeenCalledTimes(1);
    expect(onAccept).not.toHaveBeenCalled();
  });

  it('reaches Accept with Tab first and dismisses with Escape', async () => {
    const user = userEvent.setup();
    const { onAccept, onDismiss } = renderSuggestion({ op: 'merge', first: 0, second: 1 });
    await user.tab();
    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Accept' }));
    await user.keyboard('{Enter}');
    expect(onAccept).toHaveBeenCalledTimes(1);
    await user.keyboard('{Escape}');
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });
});
