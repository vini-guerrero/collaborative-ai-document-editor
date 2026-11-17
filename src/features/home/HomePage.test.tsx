import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMemoryRouter, RouterProvider, type DataRouter } from 'react-router';
import { describe, expect, it } from 'vitest';
import { setViewportWidth } from '@/test/matchMedia';
import {
  DocumentStoreProvider,
  type DocumentStore,
  type DocumentSummary,
  type Result,
  type StoreError,
} from '@/features/documents';
import { HomePage } from './HomePage';

type ListResult = Result<DocumentSummary[], StoreError>;

const PLAN: DocumentSummary = { id: 'doc-plan', title: 'Plan', preview: 'Goals', updatedAt: 0 };
const NEW_ID = 'new-doc-1';

// In-memory DocumentStore: each list() call takes the next scripted result.
function fakeStore(results: ListResult[]): DocumentStore {
  let index = 0;
  return {
    list: (): Promise<ListResult> => {
      const result = results[Math.min(index, results.length - 1)];
      index += 1;
      return Promise.resolve(result ?? { ok: true, value: [] });
    },
    get: () => Promise.resolve({ ok: false, error: { kind: 'not-found' } } as const),
    save: () => Promise.resolve({ ok: true, value: undefined } as const),
    remove: () => Promise.resolve({ ok: true, value: undefined } as const),
  };
}

function renderHome(store: DocumentStore): DataRouter {
  const router = createMemoryRouter(
    [
      { path: '/', element: <HomePage newId={() => NEW_ID} /> },
      { path: '/documents/:id', element: <p>Editor</p> },
    ],
    { initialEntries: ['/'] },
  );
  render(
    <DocumentStoreProvider store={store}>
      <RouterProvider router={router} />
    </DocumentStoreProvider>,
  );
  return router;
}

describe('HomePage', () => {
  // H1: while the index loads, a status spinner holds the space.
  it('shows the loading spinner before the documents arrive (H1)', async () => {
    const store = fakeStore([{ ok: true, value: [PLAN] }]);
    renderHome(store);

    expect(screen.getByRole('status').textContent).toBe('Loading documents');
    await screen.findByRole('link', { name: 'Plan' });
    expect(screen.queryByRole('status')).toBeNull();
  });

  // H1: documents link to their editor route.
  it('lists each document as a link to its editor route (H1)', async () => {
    renderHome(fakeStore([{ ok: true, value: [PLAN] }]));

    const link = await screen.findByRole('link', { name: 'Plan' });
    expect(link.getAttribute('href')).toBe('/documents/doc-plan');
    expect(screen.getByText('Goals')).toBeTruthy();
    expect(screen.getByText(/Edited /)).toBeTruthy();
  });

  // H4: cards are the default view; the toggle switches to rows and keeps the same links.
  it('shows cards by default and switches to rows with the view toggle (H4, S7)', async () => {
    const user = userEvent.setup();
    renderHome(fakeStore([{ ok: true, value: [PLAN] }]));

    await screen.findByRole('link', { name: 'Plan' });
    const toggle = screen.getByRole('group', { name: 'Document view' });
    const gridButton = within(toggle).getByRole('button', { name: 'Grid' });
    const listButton = within(toggle).getByRole('button', { name: 'List' });
    expect(gridButton.getAttribute('aria-pressed')).toBe('true');
    expect(listButton.getAttribute('aria-pressed')).toBe('false');
    expect(screen.getByTestId('document-grid')).toBeTruthy();

    await user.click(listButton);

    expect(listButton.getAttribute('aria-pressed')).toBe('true');
    expect(gridButton.getAttribute('aria-pressed')).toBe('false');
    expect(screen.queryByTestId('document-grid')).toBeNull();
    expect(screen.getByTestId('document-list')).toBeTruthy();
    expect(screen.getByRole('link', { name: 'Plan' }).getAttribute('href')).toBe(
      '/documents/doc-plan',
    );
  });

  // H6: with no documents, an invitation replaces the list.
  it('shows the empty invitation with a New document action (H6)', async () => {
    renderHome(fakeStore([{ ok: true, value: [] }]));

    await screen.findByRole('heading', { level: 2, name: 'Start your first document' });
    expect(screen.queryByRole('list')).toBeNull();
  });

  // H5: New document opens an editor route for a fresh id; nothing is saved here.
  it('New document in the empty state opens the editor with a new id (H5)', async () => {
    const user = userEvent.setup();
    const router = renderHome(fakeStore([{ ok: true, value: [] }]));

    const main = await screen.findByRole('main');
    await user.click(within(main).getByRole('button', { name: 'New document' }));

    await waitFor(() => {
      expect(router.state.location.pathname).toBe(`/documents/${NEW_ID}`);
    });
  });

  // D14: a failed read shows the error with Retry, and the page heading stays.
  it('shows the error with Retry and keeps the heading when the read fails (D14)', async () => {
    const user = userEvent.setup();
    renderHome(
      fakeStore([
        { ok: false, error: { kind: 'corrupt' } },
        { ok: true, value: [PLAN] },
      ]),
    );

    await screen.findByRole('heading', { level: 2, name: 'Could not load your documents' });
    expect(screen.getByRole('heading', { level: 1, name: 'Documents' })).toBeTruthy();

    await user.click(screen.getByRole('button', { name: 'Retry' }));

    await screen.findByRole('link', { name: 'Plan' });
  });

  // H2: the sidebar keeps Pinned, Collaborations and Archive visible but disabled, with Soon labels.
  it('shows Pinned, Collaborations and Archive as disabled with a Soon label (H2)', () => {
    renderHome(fakeStore([{ ok: true, value: [] }]));

    const nav = screen.getByRole('navigation', { name: 'Primary' });
    for (const label of ['Pinned', 'Collaborations', 'Archive']) {
      const item = within(nav).getByRole('button', { name: new RegExp(label) });
      expect(item.getAttribute('aria-disabled')).toBe('true');
      expect(within(item).getByText('Soon')).toBeTruthy();
    }
    expect(within(nav).getByRole('link', { name: 'Documents' }).getAttribute('aria-current')).toBe(
      'page',
    );
  });

  // S9: at phone width the sidebar is a drawer; New document is reachable inside it (H2).
  it('puts New document inside the drawer at 360px (S9, H2)', async () => {
    setViewportWidth(360);
    const user = userEvent.setup();
    const router = renderHome(fakeStore([{ ok: true, value: [] }]));

    await user.click(screen.getByRole('button', { name: 'Open navigation' }));
    const nav = screen.getByRole('navigation', { name: 'Primary' });
    await user.click(within(nav).getByRole('button', { name: 'New document' }));

    await waitFor(() => {
      expect(router.state.location.pathname).toBe(`/documents/${NEW_ID}`);
    });
  });
});
