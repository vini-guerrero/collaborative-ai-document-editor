import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMemoryRouter, RouterProvider, type DataRouter } from 'react-router';
import { describe, expect, it } from 'vitest';
import { setViewportWidth } from '@/test/matchMedia';
import {
  DocumentStoreProvider,
  type DocumentStore,
  type DocumentSummary,
} from '@/features/documents';
import { HomePage } from './HomePage';
import { fakeStore } from './testStore';

const PLAN: DocumentSummary = { id: 'doc-plan', title: 'Plan', preview: 'Goals', updatedAt: 0 };
const NEW_ID = 'new-doc-1';

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

  // H4: the Grid/List toggle sits in the same row as the title, and only when there are documents.
  it('puts the view toggle in the title row once documents exist (H4)', async () => {
    renderHome(fakeStore([{ ok: true, value: [] }]));
    await screen.findByRole('heading', { level: 2, name: 'Start Your First Document' });
    expect(screen.queryByRole('group', { name: 'Document view' })).toBeNull();
  });

  it('shares the title row with the view toggle when documents exist (H4)', async () => {
    renderHome(fakeStore([{ ok: true, value: [PLAN] }]));

    await screen.findByRole('link', { name: 'Plan' });
    const title = screen.getByRole('heading', { level: 1, name: 'Documents' });
    const toggle = screen.getByRole('group', { name: 'Document view' });
    expect(title.parentElement?.contains(toggle)).toBe(true);
  });

  // H4: cards are the default view; the toggle switches to rows and keeps the same links.
  // The preview belongs to the grid cards only (H4), so it disappears in the list.
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
    expect(screen.getByText('Goals')).toBeTruthy();

    await user.click(listButton);

    expect(listButton.getAttribute('aria-pressed')).toBe('true');
    expect(gridButton.getAttribute('aria-pressed')).toBe('false');
    expect(screen.queryByTestId('document-grid')).toBeNull();
    expect(screen.getByTestId('document-list')).toBeTruthy();
    expect(screen.queryByText('Goals')).toBeNull();
    expect(screen.getByRole('link', { name: 'Plan' }).getAttribute('href')).toBe(
      '/documents/doc-plan',
    );
  });

  // H6: with no documents, an invitation replaces the list.
  it('shows the empty invitation with a New Document action (H6)', async () => {
    renderHome(fakeStore([{ ok: true, value: [] }]));

    await screen.findByRole('heading', { level: 2, name: 'Start Your First Document' });
    expect(screen.queryByRole('list')).toBeNull();
  });

  // H5: New Document opens an editor route for a fresh id; nothing is saved here.
  it('New Document in the empty state opens the editor with a new id (H5)', async () => {
    const user = userEvent.setup();
    const router = renderHome(fakeStore([{ ok: true, value: [] }]));

    const main = await screen.findByRole('main');
    await user.click(within(main).getByRole('button', { name: 'New Document' }));

    await waitFor(() => {
      expect(router.state.location.pathname).toBe(`/documents/${NEW_ID}`);
    });
  });

  // D14: a failed read shows the error with Retry; only the sentence is the alert.
  it('shows the error with Retry and keeps the heading when the read fails (D14)', async () => {
    const user = userEvent.setup();
    renderHome(
      fakeStore([
        { ok: false, error: { kind: 'corrupt' } },
        { ok: true, value: [PLAN] },
      ]),
    );

    await screen.findByRole('heading', { level: 2, name: 'Could Not Load Your Documents' });
    expect(screen.getByRole('heading', { level: 1, name: 'Documents' })).toBeTruthy();
    expect(screen.getByRole('alert').textContent).toBe('Storage could not be read. Try again.');

    await user.click(screen.getByRole('button', { name: 'Retry' }));

    await screen.findByRole('link', { name: 'Plan' });
  });

  // H3: the navbar search is visible but disabled; it explains itself with a tooltip, not a label.
  it('shows a disabled search with a tooltip and no Soon label in the navbar (H3)', () => {
    renderHome(fakeStore([{ ok: true, value: [] }]));

    const banner = screen.getByRole('banner');
    const search = within(banner).getByRole('searchbox', { name: 'Search documents' });
    expect(search.hasAttribute('disabled')).toBe(true);
    expect(search.getAttribute('aria-disabled')).toBe('true');
    expect(screen.getByRole('tooltip', { name: 'Search is coming later' })).toBeTruthy();
    expect(within(banner).queryByText('Soon')).toBeNull();
  });

  // H2: the sidebar keeps Pinned, Collaborations and Archive visible but disabled, with Soon labels.
  it('shows Pinned, Collaborations and Archive as disabled with a Soon label (H2)', () => {
    renderHome(fakeStore([{ ok: true, value: [] }]));

    const nav = screen.getByRole('navigation', { name: 'Primary' });
    for (const label of ['Pinned', 'Collaborations', 'Archive']) {
      const item = within(nav).getByRole('button', { name: new RegExp(label) });
      expect(item.getAttribute('aria-disabled')).toBe('true');
      expect(within(item).getByText('Soon')).toBeTruthy();
      expect(item.getAttribute('aria-describedby')).not.toBeNull();
    }
    expect(within(nav).getByRole('link', { name: 'Documents' }).getAttribute('aria-current')).toBe(
      'page',
    );
  });

  // H2: a plain click on Documents is handled in-app (no full reload); modified clicks keep the
  // browser default, so the real href can open a new tab.
  it('handles a plain click on Documents in-app and keeps modified clicks native (H2)', () => {
    renderHome(fakeStore([{ ok: true, value: [] }]));
    const link = screen.getByRole('link', { name: 'Documents' });

    // fireEvent returns false when the default action was prevented.
    expect(fireEvent.click(link)).toBe(false);
    expect(fireEvent.click(link, { ctrlKey: true })).toBe(true);
    expect(fireEvent.click(link, { button: 1 })).toBe(true);
  });

  // S9: at phone width the sidebar is a drawer; New Document is reachable inside it (H2).
  it('puts New Document inside the drawer at 360px (S9, H2)', async () => {
    setViewportWidth(360);
    const user = userEvent.setup();
    const router = renderHome(fakeStore([{ ok: true, value: [] }]));

    await user.click(screen.getByRole('button', { name: 'Open navigation' }));
    const nav = screen.getByRole('navigation', { name: 'Primary' });
    await user.click(within(nav).getByRole('button', { name: 'New Document' }));

    await waitFor(() => {
      expect(router.state.location.pathname).toBe(`/documents/${NEW_ID}`);
    });
  });
});
