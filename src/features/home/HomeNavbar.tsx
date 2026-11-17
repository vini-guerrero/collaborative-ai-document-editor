import type { JSX } from 'react';
import { Link } from 'react-router';
import { Avatar, Icon, TextField } from '@/design-system';

const PRODUCT_NAME = 'WebApp';
// The mark shows the first letter of the product name, so the two never drift apart.
const MARK_LETTER = PRODUCT_NAME.charAt(0);
const SEARCH_PLACEHOLDER = 'Search documents';
// H3: the disabled search explains itself on hover (the native disabled field cannot take focus).
const SEARCH_UNAVAILABLE = 'Search is coming later';

// H3: product name, a visible but disabled search with a "Soon" label, and a placeholder user.
export function HomeNavbar(): JSX.Element {
  return (
    <div className="home-navbar">
      <Link to="/" className="home-navbar__name">
        <span className="home-navbar__mark" aria-hidden="true">
          {MARK_LETTER}
        </span>
        {PRODUCT_NAME}
      </Link>
      <div className="home-navbar__search" title={SEARCH_UNAVAILABLE}>
        <div className="home-navbar__field">
          <span className="home-navbar__search-icon">
            <Icon name="search" size={16} />
          </span>
          <TextField
            label={SEARCH_PLACEHOLDER}
            hideLabel
            type="search"
            disabled
            aria-disabled="true"
            placeholder={SEARCH_PLACEHOLDER}
          />
        </div>
      </div>
      <div className="home-navbar__user">
        <Avatar name="You" />
      </div>
    </div>
  );
}
