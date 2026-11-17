import { render, screen } from '@testing-library/react';
import { createMemoryRouter } from 'react-router';
import { describe, it } from 'vitest';
import { App } from '@/App';
import { createAppRoutes } from '@/app/router';

describe('App', () => {
  // T9: smoke test that the app shell renders its title for assistive technology.
  it('renders the editor title as a level-1 heading on the home route (T9)', async () => {
    const router = createMemoryRouter(createAppRoutes(), { initialEntries: ['/'] });

    render(<App router={router} />);

    await screen.findByRole('heading', { level: 1, name: 'AI Co-Author Editor' });
  });

  // H7: an unknown path falls through to the not-found page with a way home.
  it('renders the not-found page for an unknown path', async () => {
    const router = createMemoryRouter(createAppRoutes(), { initialEntries: ['/nope'] });

    render(<App router={router} />);

    await screen.findByRole('heading', { level: 1, name: 'Page not found' });
  });
});
