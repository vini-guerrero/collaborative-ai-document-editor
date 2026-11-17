import type { ButtonHTMLAttributes, JSX } from 'react';
import './Button.css';

export type ButtonVariant = 'primary' | 'subtle' | 'danger';

export interface ButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'className'> {
  variant?: ButtonVariant;
}

// S4: custom button modelled on the ADS Button. Children are the label, a verb naming the outcome.
// Focus ring comes from the global :focus-visible rule (S7).
export function Button({
  variant = 'subtle',
  type = 'button',
  children,
  ...rest
}: ButtonProps): JSX.Element {
  return (
    <button type={type} className={`ds-button ds-button--${variant}`} {...rest}>
      {children}
    </button>
  );
}
