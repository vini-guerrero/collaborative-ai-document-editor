import type { JSX } from 'react';
import { Button } from '@/design-system';
import './ImproveSectionButton.css';

export interface ImproveSectionButtonProps {
  onImprove: () => void;
}

// D9, S9: a heading affordance that is always shown on touch screens and is reached by keyboard
// and focus on desktop, so it never depends on hover alone.
export function ImproveSectionButton({ onImprove }: ImproveSectionButtonProps): JSX.Element {
  return (
    <span className="improve-section">
      <Button onClick={onImprove}>Improve Section</Button>
    </span>
  );
}
