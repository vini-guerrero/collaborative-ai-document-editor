import { act, render, screen, waitFor } from '@testing-library/react';
import type { JSX } from 'react';
import userEvent from '@testing-library/user-event';
import { createMemoryRouter, RouterProvider, useParams, type DataRouter } from 'react-router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  DocumentStoreProvider,
  type DocumentStore,
  type DocumentSummary,
  type Result,
  type StoreError,
  type StoredDocument,
  toStoredDocument,
} from '@/features/documents';
import { EditorPlaceholderPage } from '@/features/editor';
import { AUTOSAVE_DELAY_MS } from './useAutosave';

const NOW = 1_700_000_000_000;

interface FakeStore extends DocumentStore {
  readonly saves: StoredDocument[];
}

interface FakeStoreOptions {
  docs?: StoredDocument[];
  getError?: StoreError;
  saveError?: StoreError;
}

// In-memory implementation of the public DocumentStore interface (no documents internals).
function createFakeStore(options: FakeStoreOptions = {}): FakeStore {
  const docs = new Map<string, StoredDocument>();
  for (const doc of options.docs ?? []) {
    docs.set(doc.id, doc);
  }
  const saves: StoredDocument[] = [];

  return {
    saves,
    list: (): Promise<Result<DocumentSummary[], StoreError>> =>
      Promise.resolve({ ok: true, value: [] }),
    get: (id: string): Promise<Result<StoredDocument, StoreError>> => {
      if (options.getError !== undefined) {
        return Promise.resolve({ ok: false, error: options.getError });
      }
      const doc = docs.get(id);
      if (doc === undefined) {
        return Promise.resolve({ ok: false, error: { kind: 'not-found' } });
      }
      return Promise.resolve({ ok: true, value: doc });
    },
    save: (doc: StoredDocument): Promise<Result<void, StoreError>> => {
      if (options.saveError !== undefined) {
        return Promise.resolve({ ok: false, error: options.saveError });
      }
      saves.push(doc);
      docs.set(doc.id, doc);
      return Promise.resolve({ ok: true, value: undefined });
    },
    remove: (id: string): Promise<Result<void, StoreError>> => {
      docs.delete(id);
      return Promise.resolve({ ok: true, value: undefined });
    },
  };
}

function EditorHarness(): JSX.Element {
  const { id = '' } = useParams();
  return <EditorPlaceholderPage key={id} documentId={id} now={() => NOW} />;
}

function valueOf(element: HTMLElement): string {
  if (element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement) {
    return element.value;
  }
  throw new Error('Expected a text input or textarea');
}

function renderEditor(store: DocumentStore, path = '/documents/doc-1'): DataRouter {
  const router = createMemoryRouter(
    [
      { path: '/documents/:id', element: <EditorHarness /> },
      { path: '/', element: <p>Home</p> },
    ],
    { initialEntries: [path] },
  );
  render(
    <DocumentStoreProvider store={store}>
      <RouterProvider router={router} />
    </DocumentStoreProvider>,
  );
  return router;
}

async function advancePastDebounce(): Promise<void> {
  await act(async () => {
    await vi.advanceTimersByTimeAsync(AUTOSAVE_DELAY_MS);
  });
}

// Fake timers that keep advancing with real time so waitFor works (AGENTS).
beforeEach(() => {
  vi.useFakeTimers({ shouldAdvanceTime: true });
});

afterEach(() => {
  vi.useRealTimers();
});

describe('EditorPlaceholderPage', () => {
  // D17 and H5: typing is saved once after the debounce; a blank title falls back to the default.
  it('saves the typed body once after the debounce (D17, H5)', async () => {
    const store = createFakeStore();
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    renderEditor(store);

    const body = await screen.findByRole('textbox', { name: 'Document body' });
    await user.type(body, 'Hello');
    await advancePastDebounce();

    await waitFor(() => {
      expect(store.saves).toHaveLength(1);
    });
    expect(store.saves[0]?.id).toBe('doc-1');
    expect(store.saves[0]?.markdown).toBe('Hello');
    expect(store.saves[0]?.title).toBe('Untitled document');
    expect(store.saves[0]?.createdAt).toBe(NOW);
  });

  // D17: leaving with a pending change writes it exactly once, not again after the debounce.
  it('writes exactly once when Back is clicked during the debounce (D17)', async () => {
    const store = createFakeStore();
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    renderEditor(store);

    const body = await screen.findByRole('textbox', { name: 'Document body' });
    await user.type(body, 'Leaving');
    await user.click(screen.getByRole('link', { name: 'Back to documents' }));
    await advancePastDebounce();

    expect(await screen.findByText('Home')).toBeTruthy();
    expect(store.saves).toHaveLength(1);
    expect(store.saves[0]?.markdown).toBe('Leaving');
  });

  // H7: the back arrow and the app name both lead home.
  it('links the back arrow and the app name to home (H7)', async () => {
    renderEditor(createFakeStore());

    const back = await screen.findByRole('link', { name: 'Back to documents' });
    const appName = screen.getByRole('link', { name: 'WebApp' });

    expect(back.getAttribute('href')).toBe('/');
    expect(appName.getAttribute('href')).toBe('/');
  });

  // H5: an unknown document opens as a blank draft with the title as a placeholder hint only.
  it('opens an unknown document as an empty editable draft (H5)', async () => {
    renderEditor(createFakeStore());

    const title = await screen.findByRole('textbox', { name: 'Document title' });
    const body = screen.getByRole('textbox', { name: 'Document body' });

    expect(valueOf(title)).toBe('');
    expect(title.getAttribute('placeholder')).toBe('Untitled document');
    expect(valueOf(body)).toBe('');
  });

  // D17 and H5: reopening keeps createdAt and history; only updatedAt moves on save.
  it('keeps createdAt and history when reopening an existing document (D17)', async () => {
    const existing: StoredDocument = {
      ...toStoredDocument(null, { id: 'doc-1', title: 'Old', markdown: 'Old text' }, 100),
      updatedAt: 200,
      history: [{ id: 'h-1', author: 'user', markdown: 'Earlier', createdAt: 150 }],
    };
    const store = createFakeStore({ docs: [existing] });
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    renderEditor(store);

    const body = await screen.findByRole('textbox', { name: 'Document body' });
    expect(valueOf(body)).toBe('Old text');
    await user.type(body, ' more');
    await advancePastDebounce();

    await waitFor(() => {
      expect(store.saves).toHaveLength(1);
    });
    expect(store.saves[0]?.createdAt).toBe(100);
    expect(store.saves[0]?.history).toEqual(existing.history);
    expect(store.saves[0]?.updatedAt).toBe(NOW);
    expect(store.saves[0]?.markdown).toContain('more');
  });

  // D14: a failed save says what happened, what is kept and what happens next.
  it('shows an actionable message when a save fails', async () => {
    const store = createFakeStore({ saveError: { kind: 'quota' } });
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    renderEditor(store);

    const body = await screen.findByRole('textbox', { name: 'Document body' });
    await user.type(body, 'Too big');
    await advancePastDebounce();

    expect(
      await screen.findByText(
        'Could not save. Your text is kept here; the next change tries again.',
      ),
    ).toBeTruthy();
  });

  // The store reports invalid documents with their own message.
  it('shows its own message when the store reports an invalid document', async () => {
    const store = createFakeStore({ saveError: { kind: 'invalid' } });
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    renderEditor(store);

    const body = await screen.findByRole('textbox', { name: 'Document body' });
    await user.type(body, 'x');
    await advancePastDebounce();

    expect(await screen.findByText('This document id is not valid.')).toBeTruthy();
  });

  // The page is keyed by id: switching documents shows the new text and never the old one.
  it('does not leak text from one document into another after switching ids', async () => {
    const first = toStoredDocument(
      null,
      { id: 'doc-1', title: 'First', markdown: 'First text' },
      1,
    );
    const second: StoredDocument = {
      ...first,
      id: 'doc-2',
      title: 'Second',
      markdown: 'Second body',
    };
    const store = createFakeStore({ docs: [first, second] });
    const router = renderEditor(store);

    await screen.findByDisplayValue('First text');
    await act(async () => {
      await router.navigate('/documents/doc-2');
    });

    expect(await screen.findByDisplayValue('Second body')).toBeTruthy();
    expect(screen.queryByDisplayValue('First text')).toBeNull();
  });

  // D14: a document that cannot be read shows an error with a way home.
  it('shows the error state for a corrupt document', async () => {
    renderEditor(createFakeStore({ getError: { kind: 'corrupt' } }));

    expect(
      await screen.findByRole('heading', { level: 2, name: 'This document could not be opened' }),
    ).toBeTruthy();
    expect(screen.getByRole('link', { name: 'Go to home' }).getAttribute('href')).toBe('/');
  });
});
