import { useId, type JSX, type ReactElement } from 'react';
import './Tooltip.css';

export interface TooltipProps {
  // A short plain-text hint. It is also the accessible description of the child.
  content: string;
  // The one focusable element the hint belongs to.
  children: ReactElement;
}

// S5, S9: a hint shown on hover and on keyboard focus, never the only place the information lives
// (the child keeps its own accessible name). Pure CSS: no portal, no timers.
export function Tooltip({ content, children }: TooltipProps): JSX.Element {
  const id = useId();
  return (
    <span className="ds-tooltip">
      <span aria-describedby={id} className="ds-tooltip__anchor">
        {children}
      </span>
      <span id={id} role="tooltip" className="ds-tooltip__bubble">
        {content}
      </span>
    </span>
  );
}
