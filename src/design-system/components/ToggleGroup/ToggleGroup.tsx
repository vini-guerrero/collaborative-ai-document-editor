import type { JSX } from 'react';
import { Icon, type IconName } from '../../icons';
import { Tooltip } from '../Tooltip/Tooltip';
import { VisuallyHidden } from '../VisuallyHidden/VisuallyHidden';
import './ToggleGroup.css';

export interface ToggleGroupOption {
  value: string;
  label: string;
  icon?: IconName;
}

export interface ToggleGroupProps {
  // Accessible name of the group, for example "View".
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: readonly ToggleGroupOption[];
  // Shows only the icon; the label stays in the accessible name (S7).
  iconOnly?: boolean;
}

// S4: a set of pressed-state buttons. Each option is a native button; Tab moves between them.
export function ToggleGroup({
  label,
  value,
  onChange,
  options,
  iconOnly = false,
}: ToggleGroupProps): JSX.Element {
  return (
    <div role="group" aria-label={label} className="ds-toggle-group">
      {options.map((option) => {
        const selected = option.value === value;
        const button = (
          <button
            key={option.value}
            type="button"
            aria-pressed={selected}
            className={
              selected
                ? 'ds-toggle-group__button ds-toggle-group__button--selected'
                : 'ds-toggle-group__button'
            }
            onClick={() => {
              onChange(option.value);
            }}
          >
            {option.icon !== undefined ? <Icon name={option.icon} /> : null}
            {iconOnly ? <VisuallyHidden>{option.label}</VisuallyHidden> : option.label}
          </button>
        );
        // An icon alone is not enough for sighted users, so the label shows as a tooltip (S7).
        return iconOnly ? (
          <Tooltip key={option.value} content={option.label}>
            {button}
          </Tooltip>
        ) : (
          button
        );
      })}
    </div>
  );
}
