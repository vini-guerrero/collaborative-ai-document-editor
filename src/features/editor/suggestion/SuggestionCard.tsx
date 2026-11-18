import { useEffect, useRef, type JSX } from 'react';
import { Button } from '@/design-system';
import { RefineControls, type RefineControlsProps } from '../refine/RefineControls';
import { SuggestionOutcome, type SuggestionOutcomeRequest } from './SuggestionOutcome';

export interface SuggestionCardProps {
  request: SuggestionOutcomeRequest;
  // The refine controls for the open rewrite (D6); null when there is nothing to refine.
  refine: RefineControlsProps | null;
  onAccept: () => void;
  onDismiss: () => void;
}

// The refine form sits inside the card. Tab from inside it must move focus, not accept (D17).
const REFINE_SELECTOR = '.refine';

// D5, D17: the card for one suggestion. Tab accepts while the card itself has focus and the
// suggestion is ready; Esc closes it from the popover (FlagPopover). The card takes focus when it
// opens, and the popover then focuses its first control, which is Accept when there is one.
export function SuggestionCard({
  request,
  refine,
  onAccept,
  onDismiss,
}: SuggestionCardProps): JSX.Element {
  const cardRef = useRef<HTMLDivElement>(null);
  const isReady = request.kind === 'ready';
  const { target } = request;

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
      const active = document.activeElement;
      if (cardRef.current?.contains(active) !== true || active === null) {
        return;
      }
      if (active.closest(REFINE_SELECTOR) !== null) {
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
        <p className="flag-panel__kind">{target.title}</p>
        {target.detail === undefined ? null : <p className="flag-panel__reason">{target.detail}</p>}
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
      {refine === null ? null : (
        // A disabled fieldset removes the controls from the Tab order while a round is in flight.
        <fieldset className="suggestion-card__refine" disabled={refine.busy}>
          <RefineControls {...refine} />
        </fieldset>
      )}
    </div>
  );
}
