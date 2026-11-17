import type { JSX } from 'react';
import { Icon, type IconName } from '../../icons';
import { useShell } from '../AppShell/AppShell';
import { Lozenge } from '../Lozenge/Lozenge';
import { VisuallyHidden } from '../VisuallyHidden/VisuallyHidden';
import './NavItem.css';

export interface NavItemProps {
  icon: IconName;
  label: string;
  // Renders a link. Without href the item is an action button that calls onClick.
  href?: string;
  onClick?: () => void;
  // Marks the page the user is on: aria-current on a link plus a visible indicator bar (S7).
  current?: boolean;
  // Disabled items are announced but not actionable (H2, H3).
  disabled?: boolean;
  // Adds a "Soon" label to a disabled item (H2, H3).
  soon?: boolean;
  // Icon-rail state. Defaults to the enclosing AppShell's state.
  collapsed?: boolean;
}

function joinClassNames(parts: readonly (string | false | undefined)[]): string {
  return parts.filter((part): part is string => typeof part === 'string').join(' ');
}

// S4, S7, S9: one sidebar entry. The accessible name is always the label, even when the icon rail
// hides it visually. Choosing a link or action closes the drawer when the shell uses one.
export function NavItem({
  icon,
  label,
  href,
  onClick,
  current = false,
  disabled = false,
  soon = false,
  collapsed,
}: NavItemProps): JSX.Element {
  const shell = useShell();
  const isCollapsed = collapsed ?? shell.collapsed;
  const showSoon = disabled && soon;
  const className = joinClassNames([
    'ds-nav-item',
    current && 'ds-nav-item--current',
    disabled && 'ds-nav-item--disabled',
    isCollapsed && 'ds-nav-item--collapsed',
  ]);
  // With the icon rail the Soon label is hidden, so the spoken name carries it instead (H3).
  const hiddenLabel = showSoon ? `${label}, coming soon` : label;

  const body = (
    <>
      <Icon name={icon} />
      {isCollapsed ? (
        <VisuallyHidden>{hiddenLabel}</VisuallyHidden>
      ) : (
        <span className="ds-nav-item__label">{label}</span>
      )}
      {showSoon && !isCollapsed ? <Lozenge tone="soon">Soon</Lozenge> : null}
    </>
  );

  // Announced as unavailable; no onClick is attached, so activation does nothing.
  if (disabled) {
    return (
      <button type="button" className={className} aria-disabled="true">
        {body}
      </button>
    );
  }

  function activate(): void {
    onClick?.();
    shell.closeDrawer();
  }

  if (href !== undefined) {
    return (
      <a
        href={href}
        className={className}
        aria-current={current ? 'page' : undefined}
        onClick={activate}
      >
        {body}
      </a>
    );
  }

  return (
    <button type="button" className={className} onClick={activate}>
      {body}
    </button>
  );
}
