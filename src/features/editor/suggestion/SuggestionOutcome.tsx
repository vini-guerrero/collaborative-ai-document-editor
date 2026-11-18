import type { JSX } from 'react';
import { Spinner } from '@/design-system';
import type { SuggestionFailure, SuggestionRequest } from './suggestionRequest';

export type SuggestionOutcomeRequest = SuggestionRequest;

// D14: plain, factual one-liners. The model's text is never shown here.
const FAILURE_TEXT: Record<SuggestionFailure, string> = {
  out_of_credit: 'The AI is out of credit.',
  unavailable: 'The AI is unavailable. Try again later.',
  stale: 'The text changed after this suggestion was written.',
};

export interface SuggestionOutcomeProps {
  request: SuggestionOutcomeRequest;
}

// The body of the card for each state of the request (D14, T10).
export function SuggestionOutcome({ request }: SuggestionOutcomeProps): JSX.Element {
  switch (request.kind) {
    case 'loading':
      return <Spinner label="Writing a suggestion" />;
    case 'ready':
      return <p className="suggestion-card__note">The change is shown in the text.</p>;
    case 'empty':
      return <p className="suggestion-card__note">No changes suggested</p>;
    case 'error':
      return (
        <>
          <p className="suggestion-card__note">Your text is unchanged.</p>
          <p className="suggestion-card__note">{FAILURE_TEXT[request.reason]}</p>
        </>
      );
  }
}
