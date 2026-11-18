import type { JSX } from 'react';
import { Link } from 'react-router';
import { Button } from '@/design-system';

// Route error boundary. Says what failed without stack traces. "Try again" reloads the page,
// because a failed lazy chunk stays rejected until the module is fetched again.
export function RouteError(): JSX.Element {
  return (
    <main>
      <h1>This Page Could Not Be Shown</h1>
      <p>Something went wrong while loading it. Try again, or go to home.</p>
      <Button
        variant="primary"
        onClick={() => {
          window.location.reload();
        }}
      >
        Try again
      </Button>
      <Link to="/">Go to Home</Link>
    </main>
  );
}
