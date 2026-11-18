import { cloneElement, useId, type JSX, type ReactElement } from 'react';
import './Tooltip.css';

export interface TooltipProps {
  // A short plain-text hint. It is also the accessible description of the child.
  content: string;
  // The one focusable element the hint belongs to.
  children: ReactElement<{ 'aria-describedby'?: string }>;
  // Which edge of the control the bubble lines up with. Use 'start' near the left edge of the
  // screen and the default 'end' near the right edge, so the bubble is never cut off.
  align?: 'start' | 'end';
}

// S5, S9: a hint shown on hover and on keyboard focus, never the only place the information lives
// (the child keeps its own accessible name). Pure CSS: no portal, no timers.
export function Tooltip({ content, children, align = 'end' }: TooltipProps): JSX.Element {
  const id = useId();
  return (
    <span className={`ds-tooltip ds-tooltip--${align}`}>
      <span className="ds-tooltip__anchor">
        {cloneElement(children, { 'aria-describedby': id })}
      </span>
      <span id={id} role="tooltip" className="ds-tooltip__bubble">
        {content}
      </span>
    </span>
  );
}
