import { render, screen } from '@testing-library/react';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { afterEach, describe, expect, it } from 'vitest';
import { createAppRoutes } from '@/app/router';
import { createLocalStorageStore, DocumentStoreProvider } from '@/features/documents';
import { AiTestProvider } from '@/test/fakeAi';

function renderAt(path: string): void {
  const store = createLocalStorageStore({ storage: window.localStorage });
  const router = createMemoryRouter(createAppRoutes(), { initialEntries: [path] });
  render(
    <DocumentStoreProvider store={store}>
      <AiTestProvider>
        <RouterProvider router={router} />
      </AiTestProvider>
    </DocumentStoreProvider>,
  );
}

describe('app routes', () => {
  afterEach(() => {
    window.localStorage.clear();
  });

  // H7: unknown paths land on a page that links back home.
  it('shows the not-found page with a link home for an unknown path', async () => {
    renderAt('/does-not-exist');

    await screen.findByRole('heading', { level: 1, name: 'Page not found' });
    expect(screen.getByRole('link', { name: 'Go to home' }).getAttribute('href')).toBe('/');
  });

  // H1: the home screen is the root route.
  it('shows the documents heading on the root route (H1)', async () => {
    renderAt('/');

    await screen.findByRole('heading', { level: 1, name: 'Documents' });
  });

  // H5: a document route opens the editor; a new id starts as a blank draft.
  it('opens the editor for a valid document id', async () => {
    renderAt('/documents/x');

    expect(await screen.findByRole('textbox', { name: 'Document' })).toBeTruthy();
  });

  // H5: ids outside the allowed pattern are not documents, so they show not-found.
  it('shows the not-found page for an invalid document id', async () => {
    renderAt('/documents/bad.id');

    await screen.findByRole('heading', { level: 1, name: 'Page not found' });
  });
});
