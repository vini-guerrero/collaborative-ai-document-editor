import { render, screen } from '@testing-library/react';
import { createMemoryRouter } from 'react-router';
import { describe, it } from 'vitest';
import { App } from '@/App';
import { createAppRoutes } from '@/app/router';
import { createLocalStorageStore, DocumentStoreProvider } from '@/features/documents';

describe('App', () => {
  // T9: smoke test that the app shell renders its title for assistive technology.
  it('renders the documents title as a level-1 heading on the home route (T9)', async () => {
    const router = createMemoryRouter(createAppRoutes(), { initialEntries: ['/'] });
    const store = createLocalStorageStore({ storage: window.localStorage });

    render(
      <DocumentStoreProvider store={store}>
        <App router={router} />
      </DocumentStoreProvider>,
    );

    await screen.findByRole('heading', { level: 1, name: 'Documents' });
  });

  // H7: an unknown path falls through to the not-found page with a way home.
  it('renders the not-found page for an unknown path', async () => {
    const router = createMemoryRouter(createAppRoutes(), { initialEntries: ['/nope'] });
    const store = createLocalStorageStore({ storage: window.localStorage });

    render(
      <DocumentStoreProvider store={store}>
        <App router={router} />
      </DocumentStoreProvider>,
    );

    await screen.findByRole('heading', { level: 1, name: 'Page Not Found' });
  });
});
