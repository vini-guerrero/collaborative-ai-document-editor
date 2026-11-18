import type { JSX } from 'react';
import { ImproveSectionButton } from './ImproveSectionButton';
import type { HeadingBox } from './useHeadingBoxes';
import './HeadingActions.css';

export interface HeadingActionsProps {
  boxes: readonly HeadingBox[];
  // Called with the heading's document position.
  onImprove: (headingPos: number) => void;
}

// D9: one "Improve Section" control beside each heading that has body text. The controls are
// positioned over the frame's edge, so they never change the text layout.
export function HeadingActions({ boxes, onImprove }: HeadingActionsProps): JSX.Element {
  return (
    <div className="heading-actions">
      {boxes.map((box) => (
        <div key={box.pos} className="heading-actions__item" style={{ top: box.top }}>
          <ImproveSectionButton
            onImprove={() => {
              onImprove(box.pos);
            }}
          />
        </div>
      ))}
    </div>
  );
}
