import type { JSX, MouseEvent } from 'react';
import { Icon, type IconName } from '../../icons';
import { useShell } from '../AppShell/AppShell';
import { Lozenge } from '../Lozenge/Lozenge';
import { Tooltip } from '../Tooltip/Tooltip';
import { VisuallyHidden } from '../VisuallyHidden/VisuallyHidden';
import './NavItem.css';

export interface NavItemProps {
  icon: IconName;
  label: string;
  // Renders a link. Without href the item is an action button that calls onClick.
  href?: string;
  // Called on activation. On a link the consumer may call event.preventDefault() to handle the
  // navigation itself (for example an in-app router); the real href stays for other clicks.
  onClick?: (event: MouseEvent<HTMLElement>) => void;
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
    const unavailable = (
      <button type="button" className={className} aria-disabled="true">
        {body}
      </button>
    );
    // H3: a disabled "Soon" item explains itself on hover and on keyboard focus.
    return showSoon ? (
      <Tooltip content={`${label} is coming soon`} align="start" fill>
        {unavailable}
      </Tooltip>
    ) : (
      unavailable
    );
  }

  function activate(event: MouseEvent<HTMLElement>): void {
    onClick?.(event);
    shell.closeDrawer();
  }

  // The icon rail hides the label, so the hint shows it on hover and focus (S7).
  function withRailHint(item: JSX.Element): JSX.Element {
    return isCollapsed ? (
      <Tooltip content={label} align="start" fill>
        {item}
      </Tooltip>
    ) : (
      item
    );
  }

  if (href !== undefined) {
    return withRailHint(
      <a
        href={href}
        className={className}
        aria-current={current ? 'page' : undefined}
        onClick={activate}
      >
        {body}
      </a>,
    );
  }

  return withRailHint(
    <button type="button" className={className} onClick={activate}>
      {body}
    </button>,
  );
}
