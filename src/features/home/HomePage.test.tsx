import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
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
const NOTES: DocumentSummary = { id: 'doc-notes', title: 'Notes', preview: '', updatedAt: 0 };
const NEW_ID = 'new-doc-1';
const DELETE_FAILED = 'Could not delete this document. It is still saved. Try again.';

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

// In-memory store for the delete flow: list() returns what is left, and remove() applies the
// scripted outcome. "not-found" also drops the document, since it is already gone (H5).
function deletableStore(
  initial: DocumentSummary[],
  outcome: () => Promise<RemoveOutcome>,
): { store: DocumentStore; removed: string[] } {
  let docs = initial;
  const removed: string[] = [];
  const store: DocumentStore = {
    list: () => Promise.resolve({ ok: true, value: [...docs] }),
    get: () => Promise.resolve({ ok: false, error: { kind: 'not-found' } } as const),
    save: () => Promise.resolve({ ok: true, value: undefined } as const),
    remove: (id: string): Promise<Result<void, StoreError>> => {
      removed.push(id);
      return outcome().then((result) => {
        if (result.ok || result.error.kind === 'not-found') {
          docs = docs.filter((doc) => doc.id !== id);
        }
        return result;
      });
    },
  };
  return { store, removed };
}

type RemoveOutcome = Result<void, StoreError>;

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

// The dialog stays in the DOM when closed; its open attribute is the state the user sees.
function dialogIsOpen(): boolean {
  return document.querySelector('dialog')?.hasAttribute('open') === true;
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

  // H5: the delete button is always visible and opens a confirmation that names the document.
  it('opens a confirmation naming the document from its delete button (H5)', async () => {
    const user = userEvent.setup();
    const { store } = deletableStore([PLAN], () => Promise.resolve({ ok: true, value: undefined }));
    renderHome(store);

    await screen.findByRole('link', { name: 'Plan' });
    await user.click(screen.getByRole('button', { name: 'Delete "Plan"' }));

    expect(dialogIsOpen()).toBe(true);
    expect(screen.getByText('Delete "Plan"?')).toBeTruthy();
    expect(screen.getByText(/This can't be undone\./)).toBeTruthy();
  });

  // H5: Cancel closes the dialog and leaves the document in the list.
  it('Cancel closes the confirmation without removing the document (H5)', async () => {
    const user = userEvent.setup();
    const { store, removed } = deletableStore([PLAN], () =>
      Promise.resolve({ ok: true, value: undefined }),
    );
    renderHome(store);

    await screen.findByRole('link', { name: 'Plan' });
    await user.click(screen.getByRole('button', { name: 'Delete "Plan"' }));
    await user.click(screen.getByRole('button', { name: 'Cancel' }));

    expect(dialogIsOpen()).toBe(false);
    expect(removed).toEqual([]);
    expect(screen.getByRole('link', { name: 'Plan' })).toBeTruthy();
  });

  // H5: confirm removes the document and refreshes the list in place, with no spinner.
  it('confirm removes the document and refreshes the list without a spinner (H5)', async () => {
    const user = userEvent.setup();
    const { store, removed } = deletableStore([PLAN, NOTES], () =>
      Promise.resolve({ ok: true, value: undefined }),
    );
    renderHome(store);

    await screen.findByRole('link', { name: 'Plan' });
    await user.click(screen.getByRole('button', { name: 'Delete "Plan"' }));
    await user.click(screen.getByRole('button', { name: 'Delete document' }));

    expect(screen.queryByRole('status')).toBeNull();
    await waitFor(() => {
      expect(screen.queryByRole('link', { name: 'Plan' })).toBeNull();
    });
    expect(screen.getByRole('link', { name: 'Notes' })).toBeTruthy();
    expect(screen.queryByRole('status')).toBeNull();
    expect(removed).toEqual(['doc-plan']);
    expect(dialogIsOpen()).toBe(false);
  });

  // D14, H5: not-found means the document is already gone, so the list simply drops it.
  it('treats a not-found result as deleted and drops the document (D14, H5)', async () => {
    const user = userEvent.setup();
    const { store } = deletableStore([PLAN], () =>
      Promise.resolve({ ok: false, error: { kind: 'not-found' } }),
    );
    renderHome(store);

    await screen.findByRole('link', { name: 'Plan' });
    await user.click(screen.getByRole('button', { name: 'Delete "Plan"' }));
    await user.click(screen.getByRole('button', { name: 'Delete document' }));

    await waitFor(() => {
      expect(screen.queryByRole('link', { name: 'Plan' })).toBeNull();
    });
    expect(dialogIsOpen()).toBe(false);
  });

  // D14: a failed delete keeps the dialog open with the error and the document still listed.
  it('keeps the dialog open with an error when the store fails, and the document listed (D14)', async () => {
    const user = userEvent.setup();
    const { store } = deletableStore([PLAN], () =>
      Promise.resolve({ ok: false, error: { kind: 'quota' } }),
    );
    renderHome(store);

    await screen.findByRole('link', { name: 'Plan' });
    await user.click(screen.getByRole('button', { name: 'Delete "Plan"' }));
    await user.click(screen.getByRole('button', { name: 'Delete document' }));

    expect(await screen.findByText(DELETE_FAILED)).toBeTruthy();
    expect(dialogIsOpen()).toBe(true);
    expect(screen.getByRole('link', { name: 'Plan' })).toBeTruthy();
  });

  // D14: a rejected delete (storage disabled) is shown the same way, never thrown or lost.
  it('keeps the dialog open with an error when the store rejects (D14)', async () => {
    const user = userEvent.setup();
    const { store } = deletableStore([PLAN], () => Promise.reject(new Error('storage disabled')));
    renderHome(store);

    await screen.findByRole('link', { name: 'Plan' });
    await user.click(screen.getByRole('button', { name: 'Delete "Plan"' }));
    await user.click(screen.getByRole('button', { name: 'Delete document' }));

    expect(await screen.findByText(DELETE_FAILED)).toBeTruthy();
    expect(dialogIsOpen()).toBe(true);
    expect(screen.getByRole('link', { name: 'Plan' })).toBeTruthy();
  });

  // S7, D14: Esc closes the confirmation when nothing is running and leaves the list alone.
  it('Esc cancels the confirmation when not busy (H5, S7)', async () => {
    const user = userEvent.setup();
    const { store, removed } = deletableStore([PLAN], () =>
      Promise.resolve({ ok: true, value: undefined }),
    );
    renderHome(store);

    await screen.findByRole('link', { name: 'Plan' });
    await user.click(screen.getByRole('button', { name: 'Delete "Plan"' }));
    const dialog = document.querySelector('dialog');
    if (dialog === null) {
      throw new Error('Dialog did not render a <dialog> element');
    }
    // jsdom does not emulate the native Escape key, so the cancel event is dispatched directly.
    fireEvent(dialog, new Event('cancel', { cancelable: true }));

    expect(dialogIsOpen()).toBe(false);
    expect(removed).toEqual([]);
    expect(screen.getByRole('link', { name: 'Plan' })).toBeTruthy();
  });
});
