import type { JSX } from 'react';
import { AiBubble } from '@/design-system';
import type { ParagraphBubble } from './useParagraphBubbles';
import './AiBubbles.css';

export interface AiBubblesProps {
  bubbles: readonly ParagraphBubble[];
  // Opens the suggestion card of the flag with this id (D5).
  onOpenFlag: (flagId: string) => void;
}

// S5: the AI bubbles in the frame's inline-end gutter, one per paragraph that is being analyzed or
// has suggestions. They sit over the reserved paragraph padding, so they never change the layout.
export function AiBubbles({ bubbles, onOpenFlag }: AiBubblesProps): JSX.Element {
  return (
    <div className="ai-bubbles">
      {bubbles.map((bubble) => (
        <div key={bubble.pos} className="ai-bubbles__item" style={{ top: bubble.top }}>
          {bubble.state === 'loading' || bubble.firstFlagId === undefined ? (
            <AiBubble state="loading" />
          ) : (
            <AiBubble
              state="ready"
              count={bubble.count}
              onOpen={() => {
                if (bubble.firstFlagId !== undefined) {
                  onOpenFlag(bubble.firstFlagId);
                }
              }}
            />
          )}
        </div>
      ))}
    </div>
  );
}
