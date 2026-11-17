import type { JSX, ReactNode } from 'react';
import './VisuallyHidden.css';

export interface VisuallyHiddenProps {
  children: ReactNode;
}

// S7: text that stays in the accessibility tree but is clipped off screen.
export function VisuallyHidden({ children }: VisuallyHiddenProps): JSX.Element {
  return <span className="ds-visually-hidden">{children}</span>;
}
