import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { describe, expect, it } from 'vitest';
import {
  DocumentStoreProvider,
  type DocumentStore,
  type DocumentSummary,
} from '@/features/documents';
import { HomePage } from './HomePage';
import { deferred, deletableStore } from './testStore';

const PLAN: DocumentSummary = { id: 'doc-plan', title: 'Plan', preview: 'Goals', updatedAt: 0 };
const NOTES: DocumentSummary = { id: 'doc-notes', title: 'Notes', preview: '', updatedAt: 0 };
const DELETE_FAILED = 'Could not delete this document. It is still saved. Try again.';

const SUCCESS = (): Promise<{ ok: true; value: undefined }> =>
  Promise.resolve({ ok: true, value: undefined });

function renderHome(store: DocumentStore): void {
  const router = createMemoryRouter(
    [
      { path: '/', element: <HomePage newId={() => 'unused'} /> },
      { path: '/documents/:id', element: <p>Editor</p> },
    ],
    { initialEntries: ['/'] },
  );
  render(
    <DocumentStoreProvider store={store}>
      <RouterProvider router={router} />
    </DocumentStoreProvider>,
  );
}

// The dialog stays in the DOM when closed; its open attribute is the state the user sees.
function dialogIsOpen(): boolean {
  return document.querySelector('dialog')?.hasAttribute('open') === true;
}

function documentsHeading(): HTMLElement {
  return screen.getByRole('heading', { level: 1, name: 'Documents' });
}

// H5: the delete flow, from the trash button to the refreshed list.
describe('HomePage delete flow (H5, D14)', () => {
  // H5: the delete button opens a confirmation that names the document.
  it('opens a confirmation naming the document from its delete button (H5)', async () => {
    const user = userEvent.setup();
    const { store } = deletableStore([PLAN], SUCCESS);
    renderHome(store);

    await screen.findByRole('link', { name: 'Plan' });
    await user.click(screen.getByRole('button', { name: 'Delete "Plan"' }));

    expect(dialogIsOpen()).toBe(true);
    expect(screen.getByText('Delete "Plan"?')).toBeTruthy();
    expect(screen.getByText(/This can't be undone\./)).toBeTruthy();
  });

  // H5: Cancel closes the dialog, keeps the document, and returns focus to its delete button.
  it('Cancel closes the confirmation, keeps the document and returns focus to its trigger (H5)', async () => {
    const user = userEvent.setup();
    const { store, removed } = deletableStore([PLAN], SUCCESS);
    renderHome(store);

    await screen.findByRole('link', { name: 'Plan' });
    const trigger = screen.getByRole('button', { name: 'Delete "Plan"' });
    await user.click(trigger);
    await user.click(screen.getByRole('button', { name: 'Cancel' }));

    expect(dialogIsOpen()).toBe(false);
    expect(removed).toEqual([]);
    expect(screen.getByRole('link', { name: 'Plan' })).toBeTruthy();
    expect(document.activeElement).toBe(trigger);
  });

  // H5: confirm removes the document; while the reload is pending the list stays visible and no
  // spinner appears (stale-while-revalidate). The gate is released to let the refresh finish.
  it('refreshes the list in place with no spinner while the reload is pending (H5)', async () => {
    const user = userEvent.setup();
    const base = deletableStore([PLAN, NOTES], SUCCESS);
    const gate = deferred<undefined>();
    let reads = 0;
    const store: DocumentStore = {
      ...base.store,
      list: () => {
        reads += 1;
        return reads === 1 ? base.store.list() : gate.promise.then(() => base.store.list());
      },
    };
    renderHome(store);

    await screen.findByRole('link', { name: 'Plan' });
    await user.click(screen.getByRole('button', { name: 'Delete "Plan"' }));
    await user.click(screen.getByRole('button', { name: 'Delete document' }));

    await waitFor(() => {
      expect(dialogIsOpen()).toBe(false);
    });
    expect(screen.queryByRole('status')).toBeNull();
    expect(screen.getByRole('link', { name: 'Plan' })).toBeTruthy();

    gate.resolve(undefined);

    await waitFor(() => {
      expect(screen.queryByRole('link', { name: 'Plan' })).toBeNull();
    });
    expect(screen.getByRole('link', { name: 'Notes' })).toBeTruthy();
    expect(screen.queryByRole('status')).toBeNull();
    expect(base.removed).toEqual(['doc-plan']);
  });

  // H5: after a successful delete, focus moves to the Documents heading, since the removed
  // card's button can no longer hold it.
  it('moves focus to the Documents heading after a successful delete (H5, S7)', async () => {
    const user = userEvent.setup();
    const { store } = deletableStore([PLAN, NOTES], SUCCESS);
    renderHome(store);

    await screen.findByRole('link', { name: 'Plan' });
    await user.click(screen.getByRole('button', { name: 'Delete "Plan"' }));
    await user.click(screen.getByRole('button', { name: 'Delete document' }));

    await waitFor(() => {
      expect(dialogIsOpen()).toBe(false);
    });
    expect(document.activeElement).toBe(documentsHeading());
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

  // D14: if the list cannot be re-read after a successful delete, the error state is shown.
  // This documents the current behavior: a failed silent reload replaces the list with the error.
  it('shows the load error when the reload fails after a successful delete (D14)', async () => {
    const user = userEvent.setup();
    const base = deletableStore([PLAN, NOTES], SUCCESS);
    let reads = 0;
    const store: DocumentStore = {
      ...base.store,
      list: () => {
        reads += 1;
        return reads === 1
          ? base.store.list()
          : Promise.resolve({ ok: false, error: { kind: 'corrupt' } } as const);
      },
    };
    renderHome(store);

    await screen.findByRole('link', { name: 'Plan' });
    await user.click(screen.getByRole('button', { name: 'Delete "Plan"' }));
    await user.click(screen.getByRole('button', { name: 'Delete document' }));

    await screen.findByRole('heading', { level: 2, name: 'Could not load your documents' });
    expect(dialogIsOpen()).toBe(false);
    expect(screen.queryByRole('link', { name: 'Plan' })).toBeNull();
  });

  // S7, D14: Esc closes the confirmation when nothing is running and leaves the list alone.
  it('Esc cancels the confirmation when not busy (H5, S7)', async () => {
    const user = userEvent.setup();
    const { store, removed } = deletableStore([PLAN], SUCCESS);
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
