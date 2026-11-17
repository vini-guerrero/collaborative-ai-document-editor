import type { AnchorHTMLAttributes, JSX } from 'react';
import { Icon, type IconName } from '../../icons';
import '../Button/Button.css';
import '../IconButton/IconButton.css';
import './IconLink.css';

const ICON_LINK_CLASS_NAME = 'ds-button ds-button--subtle ds-icon-button ds-icon-link';

// Class string for a router Link that must look like an IconButton. Routers render their own
// anchors, so this lets a feature style one without copying class names.
export function iconLinkClassName(): string {
  return ICON_LINK_CLASS_NAME;
}

export interface IconLinkProps extends Omit<
  AnchorHTMLAttributes<HTMLAnchorElement>,
  'children' | 'className' | 'aria-label'
> {
  href: string;
  icon: IconName;
  // Required: an icon-only link has no visible text, so the label is its accessible name (S7).
  label: string;
}

// S4: icon-only navigation link, styled like IconButton. Use a router Link with
// iconLinkClassName() when the destination is a client-side route.
export function IconLink({ icon, label, ...rest }: IconLinkProps): JSX.Element {
  return (
    <a aria-label={label} className={ICON_LINK_CLASS_NAME} {...rest}>
      <Icon name={icon} />
    </a>
  );
}
