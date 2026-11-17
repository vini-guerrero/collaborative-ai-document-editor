import type { JSX } from 'react';
import { Icon, type IconName } from '../../icons';
import { type ButtonProps } from '../Button/Button';
import '../Button/Button.css';
import './IconButton.css';

export interface IconButtonProps extends Omit<ButtonProps, 'children' | 'aria-label'> {
  icon: IconName;
  // Required: an icon-only control has no visible text, so the label is its accessible name (S7).
  label: string;
}

// S4: icon-only button. The icon is decorative; the label carries the meaning.
export function IconButton({
  icon,
  label,
  variant = 'subtle',
  type = 'button',
  ...rest
}: IconButtonProps): JSX.Element {
  return (
    <button
      type={type}
      aria-label={label}
      className={`ds-button ds-button--${variant} ds-icon-button`}
      {...rest}
    >
      <Icon name={icon} />
    </button>
  );
}
