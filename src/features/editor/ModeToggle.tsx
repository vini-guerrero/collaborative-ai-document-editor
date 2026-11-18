import type { JSX } from 'react';
import { IconButton, Tooltip, type IconName } from '@/design-system';

export interface ModeOption<Mode extends string> {
  readonly value: Mode;
  readonly label: string;
  readonly icon: IconName;
}

export interface ModeToggleProps<Mode extends string> {
  value: Mode;
  // Exactly two modes: one is on, the other is what a press switches to.
  options: readonly [ModeOption<Mode>, ModeOption<Mode>];
  onChange: (mode: Mode) => void;
}

// S4: an either-or control in one icon button. The icon shows the mode a press switches to, the
// same mode the accessible name states. The tooltip states the current mode too, so the state
// never relies on the icon alone (S7).
export function ModeToggle<Mode extends string>({
  value,
  options,
  onChange,
}: ModeToggleProps<Mode>): JSX.Element {
  const [first, second] = options;
  const current = value === first.value ? first : second;
  const other = current === first ? second : first;
  return (
    <Tooltip content={`${current.label}\nSwitch to ${other.label}`}>
      <IconButton
        icon={other.icon}
        label={`Switch to ${other.label}`}
        variant="secondary"
        onClick={() => {
          onChange(other.value);
        }}
      />
    </Tooltip>
  );
}
