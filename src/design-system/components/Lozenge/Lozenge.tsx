import type { JSX, ReactNode } from 'react';
import './Lozenge.css';

export type LozengeTone = 'neutral' | 'soon';

export interface LozengeProps {
  children: ReactNode;
  tone?: LozengeTone;
}

// S4: small inline status label. The "soon" tone marks disabled future features (H2, H3).
export function Lozenge({ children, tone = 'neutral' }: LozengeProps): JSX.Element {
  return <span className={`ds-lozenge ds-lozenge--${tone}`}>{children}</span>;
}
