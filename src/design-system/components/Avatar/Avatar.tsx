import type { JSX } from 'react';
import './Avatar.css';

export type AvatarSize = 'sm' | 'md';

export interface AvatarProps {
  name: string;
  size?: AvatarSize;
}

const MAX_INITIALS = 2;
// Shown when the name has no letters, so the circle is never empty.
const FALLBACK_INITIAL = '?';

// Array.from splits by code point, so a leading accented letter such as "É" is kept whole.
function getInitials(name: string): string {
  const initials = name
    .trim()
    .split(/\s+/)
    .filter((word) => word.length > 0)
    .slice(0, MAX_INITIALS)
    .map((word) => Array.from(word)[0] ?? '')
    .join('')
    .toLocaleUpperCase();
  return initials.length > 0 ? initials : FALLBACK_INITIAL;
}

// S4: user initials in a circle. It is an image whose name is the full name (S7).
export function Avatar({ name, size = 'md' }: AvatarProps): JSX.Element {
  return (
    <span role="img" aria-label={name} className={`ds-avatar ds-avatar--${size}`}>
      {getInitials(name)}
    </span>
  );
}
