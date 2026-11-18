import { useEffect, useRef, type JSX } from 'react';
import { Button } from '@/design-system';
import { KIND_LABELS } from '../FlagPanel';
import { SuggestionOutcome, type SuggestionOutcomeRequest } from './SuggestionOutcome';

export interface SuggestionCardProps {
  request: SuggestionOutcomeRequest;
  onAccept: () => void;
  onDismiss: () => void;
}

// D5, D17: the card for one suggestion. Tab accepts while the card has focus and the suggestion
// is ready; Esc closes it from the popover (FlagPopover). The card takes focus when it opens.
export function SuggestionCard({ request, onAccept, onDismiss }: SuggestionCardProps): JSX.Element {
  const cardRef = useRef<HTMLDivElement>(null);
  const isReady = request.kind === 'ready';

  useEffect(() => {
    cardRef.current?.focus();
  }, []);

  // Document capture, so Tab is seen before the popover's own Tab trap. Accepting stops the
  // event so the trap does not also move focus.
  useEffect(() => {
    if (!isReady) {
      return undefined;
    }
    const handleKeyDown = (event: KeyboardEvent): void => {
      if (event.key !== 'Tab' || event.shiftKey || event.altKey || event.ctrlKey || event.metaKey) {
        return;
      }
      if (cardRef.current?.contains(document.activeElement) !== true) {
        return;
      }
      event.preventDefault();
      event.stopImmediatePropagation();
      onAccept();
    };
    document.addEventListener('keydown', handleKeyDown, true);
    return () => {
      document.removeEventListener('keydown', handleKeyDown, true);
    };
  }, [isReady, onAccept]);

  return (
    <div className="suggestion-card" ref={cardRef} tabIndex={-1}>
      <div className="flag-panel__header">
        <p className="flag-panel__kind">{KIND_LABELS[request.flag.kind]}</p>
        <p className="flag-panel__reason">{request.flag.reason}</p>
      </div>
      <div className="suggestion-card__outcome">
        <SuggestionOutcome request={request} />
      </div>
      <div className="suggestion-card__actions">
        {isReady ? (
          <Button variant="primary" onClick={onAccept}>
            Accept
          </Button>
        ) : null}
        <Button onClick={onDismiss}>Dismiss</Button>
      </div>
    </div>
  );
}
