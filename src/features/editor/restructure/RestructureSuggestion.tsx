import { useId, type JSX } from 'react';
import { Button, Icon, VisuallyHidden } from '@/design-system';
import type { RestructureOperation } from '@shared/schemas';
import { describeOperation } from './describeOperation';
import type { Section } from './sections';
import './restructure.css';

export interface RestructureSuggestionProps {
  operation: RestructureOperation;
  // The outline of the current document, which the operation's indexes refer to.
  sections: readonly Section[];
  onAccept: () => void;
  onDismiss: () => void;
}

// D11: the suggestion in words, with Accept and Dismiss. Tab reaches Accept first; Escape
// dismisses from anywhere in the card (S9, D17). Presentational: it owns no document state.
export function RestructureSuggestion({
  operation,
  sections,
  onAccept,
  onDismiss,
}: RestructureSuggestionProps): JSX.Element {
  const descriptionId = useId();
  const summary = describeOperation(sections, operation);
  return (
    <section
      className="restructure-suggestion"
      aria-label="Restructure suggestion"
      onKeyDown={(event) => {
        if (event.key === 'Escape') {
          event.preventDefault();
          onDismiss();
        }
      }}
    >
      <p className="restructure-suggestion__summary">{summary}</p>
      <span id={descriptionId}>
        <VisuallyHidden>
          {`Suggested change: ${summary}. Accept applies it as one undo step. Escape dismisses it.`}
        </VisuallyHidden>
      </span>
      <div className="restructure-suggestion__actions">
        <Button variant="primary" onClick={onAccept} aria-describedby={descriptionId}>
          <Icon name="check" size={16} />
          Accept
        </Button>
        <Button onClick={onDismiss}>
          <Icon name="x" size={16} />
          Dismiss
        </Button>
      </div>
    </section>
  );
}
