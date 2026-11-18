import type { JSX } from 'react';
import { Icon } from '../../icons';
import './AiBubble.css';

export type AiBubbleProps =
  | {
      // The AI is still analyzing: a non-interactive status with a spinning ring.
      readonly state: 'loading';
    }
  | {
      // The AI found suggestions: a pulsing button that opens them.
      readonly state: 'ready';
      // How many suggestions wait behind the bubble.
      readonly count: number;
      readonly onOpen: () => void;
    };

// S5: the AI's presence beside a paragraph. Loading tells the author the AI is reading the text;
// ready invites a click that opens the suggestion card. The pulse and the ring are transform and
// opacity only, and stop under reduced motion (the global rule shortens them to one pass).
export function AiBubble(props: AiBubbleProps): JSX.Element {
  if (props.state === 'loading') {
    return (
      <span
        role="status"
        aria-label="AI Is Analyzing This Paragraph"
        className="ds-ai-bubble ds-ai-bubble--loading"
      >
        <span className="ds-ai-bubble__ring" aria-hidden="true" />
        <Icon name="sparkles" size={14} />
      </span>
    );
  }
  const { count, onOpen } = props;
  const label = `Show AI Suggestions (${String(count)})`;
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      className="ds-ai-bubble ds-ai-bubble--ready"
      onClick={onOpen}
    >
      <span className="ds-ai-bubble__pulse" aria-hidden="true" />
      <Icon name="sparkles" size={14} />
      {count > 1 ? (
        <span className="ds-ai-bubble__count" aria-hidden="true">
          {count}
        </span>
      ) : null}
    </button>
  );
}
