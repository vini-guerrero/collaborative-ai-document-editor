import type { JSX } from 'react';
import { VisuallyHidden } from '../VisuallyHidden/VisuallyHidden';
import './Spinner.css';

export interface SpinnerProps {
  // Announced to assistive technology through the status region.
  label?: string;
}

// S4 and S7: generating indicator (D14). Announced as a status; static ring under reduced motion.
export function Spinner({ label = 'Loading' }: SpinnerProps): JSX.Element {
  return (
    <span role="status" className="ds-spinner">
      <span className="ds-spinner__ring" aria-hidden="true" />
      <VisuallyHidden>{label}</VisuallyHidden>
    </span>
  );
}
