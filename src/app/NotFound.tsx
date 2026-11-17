import type { JSX } from 'react';
import { Link } from 'react-router';

// Shown for any path the router does not match (H7: the way back is one link away).
export function NotFound(): JSX.Element {
  return (
    <main>
      <h1>Page not found</h1>
      <p>The page you were looking for does not exist.</p>
      <Link to="/">Go to home</Link>
    </main>
  );
}
