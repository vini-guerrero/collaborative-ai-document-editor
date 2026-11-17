import type { JSX } from 'react';
import { Link } from 'react-router';
import { Avatar, Lozenge, TextField } from '@/design-system';

// H3: product name, a visible but disabled search with a "Soon" label, and a placeholder user.
export function HomeNavbar(): JSX.Element {
  return (
    <div className="home-navbar">
      <Link to="/" className="home-navbar__name">
        WebApp
      </Link>
      <div className="home-navbar__search">
        <TextField label="Search documents" hideLabel type="search" disabled />
        <Lozenge tone="soon">Soon</Lozenge>
      </div>
      <div className="home-navbar__user">
        <Avatar name="You" />
      </div>
    </div>
  );
}
