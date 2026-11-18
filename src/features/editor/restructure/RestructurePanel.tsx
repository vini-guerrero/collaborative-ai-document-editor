import type { JSX } from 'react';
import { Button, Spinner } from '@/design-system';
import { RestructureSuggestion } from './RestructureSuggestion';
import type { RestructureFailure, RestructureFlow } from './useRestructureFlow';

// D14: plain, factual one-liners. The model's text is never shown here (T10).
const FAILURE_TEXT: Record<RestructureFailure, string> = {
  empty: 'There is no text to restructure.',
  nothing_to_do: 'This section has nothing to move, split or merge yet.',
  too_long: 'The document is too long to restructure in one step.',
  out_of_credit: 'The AI is out of credit.',
  unavailable: 'The AI is unavailable. Try again later.',
  stale: 'The text changed after this suggestion was written.',
  invalid_index: 'This change cannot be applied to the current text.',
  noop: 'This change would not change the text.',
  invalid_markdown: 'This change cannot be applied to the current text.',
};

export interface RestructurePanelProps {
  flow: RestructureFlow;
}

// D10, D11: the restructure suggestion, its loading state and its errors, below the editor bar.
export function RestructurePanel({ flow }: RestructurePanelProps): JSX.Element | null {
  const { state } = flow;
  if (state.kind === 'idle') {
    return null;
  }
  if (state.kind === 'loading') {
    return (
      <section className="restructure-panel" aria-label="Restructure">
        <Spinner label="Working on the section" />
      </section>
    );
  }
  if (state.kind === 'ready') {
    return (
      <RestructureSuggestion
        operation={state.operation}
        sections={state.sections}
        onAccept={flow.accept}
        onDismiss={flow.dismiss}
      />
    );
  }
  return (
    <section className="restructure-panel" aria-label="Restructure">
      <p className="restructure-panel__note">Your text is unchanged.</p>
      <p className="restructure-panel__note">{FAILURE_TEXT[state.reason]}</p>
      <Button onClick={flow.dismiss}>Dismiss</Button>
    </section>
  );
}
