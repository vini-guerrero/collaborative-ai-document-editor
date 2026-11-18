import type { JSX } from 'react';
import { Icon, type IconName } from '../../icons';
import { type ButtonProps } from '../Button/Button';
import { Tooltip, type TooltipProps } from '../Tooltip/Tooltip';
import { titleCase } from '../../titleCase';
import '../Button/Button.css';
import './IconButton.css';

export interface IconButtonProps extends Omit<ButtonProps, 'children' | 'aria-label'> {
  icon: IconName;
  // Required: an icon-only control has no visible text, so the label is its accessible name (S7).
  label: string;
  // The hint shown on hover and focus. Defaults to the label in Title Case; pass text when the
  // label holds user text. False only where a parent already shows one.
  tooltip?: string | false;
  tooltipAlign?: TooltipProps['align'];
}

// S4: icon-only button. The icon is decorative; the label carries the meaning.
export function IconButton({
  icon,
  label,
  tooltip,
  tooltipAlign,
  variant = 'subtle',
  type = 'button',
  ...rest
}: IconButtonProps): JSX.Element {
  const button = (
    <button
      type={type}
      aria-label={label}
      className={`ds-button ds-button--${variant} ds-icon-button`}
      {...rest}
    >
      <Icon name={icon} />
    </button>
  );
  if (tooltip === false) {
    return button;
  }
  return (
    <Tooltip content={tooltip ?? titleCase(label)} align={tooltipAlign ?? 'end'}>
      {button}
    </Tooltip>
  );
}
