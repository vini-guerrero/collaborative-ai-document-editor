import { act, render, screen, waitFor } from '@testing-library/react';
import type { JSX } from 'react';
import userEvent from '@testing-library/user-event';
import type { Editor } from '@tiptap/react';
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
import { EditorPageView } from './EditorPage';
import { setViewportWidth } from '@/test/matchMedia';
import { AiTestProvider } from './testing/fakeAi';
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

// Holds the editor that the page hands out through onReady; the latest mount wins.
interface EditorHolder {
  readonly editor: Editor | null;
  capture: (editor: Editor) => void;
}

function EditorHarness({ holder }: { holder: EditorHolder }): JSX.Element {
  const { id = '' } = useParams();
  return (
    <EditorPageView
      key={id}
      documentId={id}
      now={() => NOW}
      onReady={(editor) => {
        holder.capture(editor);
      }}
    />
  );
}

interface RenderedEditor {
  router: DataRouter;
  holder: EditorHolder;
}

function renderEditor(store: DocumentStore, path = '/documents/doc-1'): RenderedEditor {
  let current: Editor | null = null;
  const holder: EditorHolder = {
    get editor() {
      return current;
    },
    capture: (editor) => {
      current = editor;
    },
  };
  const router = createMemoryRouter(
    [
      { path: '/documents/:id', element: <EditorHarness holder={holder} /> },
      { path: '/', element: <p>Home</p> },
    ],
    { initialEntries: [path] },
  );
  render(
    <DocumentStoreProvider store={store}>
      <AiTestProvider>
        <RouterProvider router={router} />
      </AiTestProvider>
    </DocumentStoreProvider>,
  );
  return { router, holder };
}

// Waits until the page has mounted its editor and handed it out.
async function readyEditor(holder: EditorHolder): Promise<Editor> {
  await waitFor(() => {
    expect(holder.editor).not.toBeNull();
  });
  if (holder.editor === null) {
    throw new Error('the editor was not handed to onReady');
  }
  return holder.editor;
}

// Inserts Markdown as if typed; the editor emits an update, which the page autosaves.
function insertMarkdown(editor: Editor, markdown: string): void {
  act(() => {
    editor.commands.insertContent(markdown, { contentType: 'markdown' });
  });
}

function valueOf(element: HTMLElement): string {
  if (element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement) {
    return element.value;
  }
  throw new Error('Expected a text input');
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

describe('EditorPage', () => {
  // D17 and H5: typing is saved once after the debounce; a blank title falls back to the default.
  it('saves the serialized Markdown once after the debounce (D17, H5)', async () => {
    const store = createFakeStore();
    const { holder } = renderEditor(store);

    const editor = await readyEditor(holder);
    insertMarkdown(editor, 'Hello');
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
    const { holder } = renderEditor(store);

    insertMarkdown(await readyEditor(holder), 'Leaving');
    await user.click(screen.getByRole('link', { name: 'Back to documents' }));
    await advancePastDebounce();

    expect(await screen.findByText('Home')).toBeTruthy();
    expect(store.saves).toHaveLength(1);
    expect(store.saves[0]?.markdown).toBe('Leaving');
  });

  // H7: the back arrow leads home; the editor bar carries no app name.
  it('links the back arrow to home and shows no app name (H7)', async () => {
    renderEditor(createFakeStore());

    const back = await screen.findByRole('link', { name: 'Back to documents' });

    expect(back.getAttribute('href')).toBe('/');
    expect(screen.queryByRole('link', { name: 'WebApp' })).toBeNull();
  });

  // H5: an unknown document opens as a blank draft with the title as a placeholder hint only.
  it('opens an unknown document as an empty editable draft (H5)', async () => {
    const { holder } = renderEditor(createFakeStore());

    const title = await screen.findByRole('textbox', { name: 'Document title' });
    const editor = await readyEditor(holder);

    expect(title.getAttribute('placeholder')).toBe('Untitled document');
    expect(screen.getByRole('textbox', { name: 'Document' })).toBeTruthy();
    expect(valueOf(title)).toBe('');
    expect(editor.getMarkdown()).toBe('');
  });

  // H5: a new draft with a title but no body is not kept.
  it('does not save a new draft whose body is still empty (H5)', async () => {
    const store = createFakeStore();
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    renderEditor(store);

    const title = await screen.findByRole('textbox', { name: 'Document title' });
    await user.type(title, 'Draft');
    await advancePastDebounce();

    expect(store.saves).toHaveLength(0);
  });

  // The stored Markdown is parsed into the editor, not shown as raw text.
  it('loads stored Markdown into the editor (T2)', async () => {
    const stored = toStoredDocument(
      null,
      { id: 'doc-1', title: 'Notes', markdown: '# Heading\n\nSome **bold** text' },
      100,
    );
    const { holder } = renderEditor(createFakeStore({ docs: [stored] }));

    const editor = await readyEditor(holder);

    await waitFor(() => {
      expect(editor.getMarkdown()).toBe('# Heading\n\nSome **bold** text');
    });
    expect(editor.isEmpty).toBe(false);
  });

  // D17 and H5: reopening keeps createdAt and history; only updatedAt moves on save.
  it('keeps createdAt and history when reopening an existing document (D17)', async () => {
    const existing: StoredDocument = {
      ...toStoredDocument(null, { id: 'doc-1', title: 'Old', markdown: 'Old text' }, 100),
      updatedAt: 200,
      history: [{ id: 'h-1', author: 'user', markdown: 'Earlier', createdAt: 150 }],
    };
    const store = createFakeStore({ docs: [existing] });
    const { holder } = renderEditor(store);

    const editor = await readyEditor(holder);
    expect(editor.getMarkdown()).toBe('Old text');
    insertMarkdown(editor, 'more');
    await advancePastDebounce();

    await waitFor(() => {
      expect(store.saves).toHaveLength(1);
    });
    expect(store.saves[0]?.createdAt).toBe(100);
    // The earlier entry is kept as it was; an edit may add a "You" checkpoint after it (D7).
    const history = store.saves[0]?.history ?? [];
    expect(history[0]).toEqual(existing.history[0]);
    expect(history.slice(1).every((entry) => entry.author === 'user')).toBe(true);
    expect(store.saves[0]?.updatedAt).toBe(NOW);
    expect(store.saves[0]?.markdown).toContain('more');
  });

  // D14: a failed save says what happened, what is kept and what happens next.
  it('shows an actionable message when a save fails', async () => {
    const store = createFakeStore({ saveError: { kind: 'quota' } });
    const { holder } = renderEditor(store);

    insertMarkdown(await readyEditor(holder), 'Too big');
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
    const { holder } = renderEditor(store);

    insertMarkdown(await readyEditor(holder), 'x');
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
    const { router, holder } = renderEditor(store);

    const firstEditor = await readyEditor(holder);
    await waitFor(() => {
      expect(firstEditor.getMarkdown()).toBe('First text');
    });
    await act(async () => {
      await router.navigate('/documents/doc-2');
    });

    expect(await screen.findByDisplayValue('Second')).toBeTruthy();
    await waitFor(() => {
      expect(holder.editor?.getMarkdown()).toBe('Second body');
    });
    expect(holder.editor).not.toBe(firstEditor);
  });

  // T10: raw HTML in stored Markdown loads as text; no img or script element reaches the DOM.
  it('loads raw HTML from storage without live img or script elements (T10)', async () => {
    const stored = toStoredDocument(
      null,
      {
        id: 'doc-1',
        title: 'Unsafe',
        markdown: 'Safe text\n\n<img src=x onerror=alert(1)>\n\n<script>alert(1)</script>',
      },
      100,
    );
    const { holder } = renderEditor(createFakeStore({ docs: [stored] }));

    await readyEditor(holder);
    const surface = await screen.findByRole('textbox', { name: 'Document' });
    await waitFor(() => {
      expect(surface.textContent).toContain('Safe text');
    });

    expect(surface.querySelector('img')).toBeNull();
    expect(surface.querySelector('script')).toBeNull();
    expect(surface.querySelector('[onerror]')).toBeNull();
  });

  // D17: opening a document only reads it; leaving without a change writes nothing.
  it('does not save when an existing document is opened and left unchanged (D17)', async () => {
    const existing = toStoredDocument(
      null,
      { id: 'doc-1', title: 'Kept', markdown: 'Kept text' },
      100,
    );
    const store = createFakeStore({ docs: [existing] });
    const { router, holder } = renderEditor(store);

    const editor = await readyEditor(holder);
    await waitFor(() => {
      expect(editor.getMarkdown()).toBe('Kept text');
    });
    await advancePastDebounce();
    await act(async () => {
      await router.navigate('/');
    });
    expect(await screen.findByText('Home')).toBeTruthy();

    expect(store.saves).toHaveLength(0);
  });

  // D14: a document that cannot be read shows an error with a way home.
  it('shows the error state for a corrupt document', async () => {
    renderEditor(createFakeStore({ getError: { kind: 'corrupt' } }));

    expect(
      await screen.findByRole('heading', { level: 2, name: 'This Document Could Not Be Opened' }),
    ).toBeTruthy();
    expect(screen.getByRole('link', { name: 'Go to Home' }).getAttribute('href')).toBe('/');
  });
  // H5: the title is typed in the top bar and saves through the same debounced autosave.
  it('saves a title typed in the top bar (H5)', async () => {
    const stored = toStoredDocument(null, { id: 'doc-1', title: 'Notes', markdown: 'Body' }, 100);
    const store = createFakeStore({ docs: [stored] });
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    renderEditor(store);

    const title = await screen.findByRole('textbox', { name: 'Document title' });
    await user.clear(title);
    await user.type(title, 'Renamed');
    await advancePastDebounce();

    await waitFor(() => {
      expect(store.saves.at(-1)?.title).toBe('Renamed');
    });
  });

  // D15: Visual -> Markdown -> edit -> Visual keeps the edited text in the saved Markdown.
  it('keeps text edited in the Markdown view after returning to Visual (D15)', async () => {
    const stored = toStoredDocument(null, { id: 'doc-1', title: 'Notes', markdown: 'Hello' }, 100);
    const store = createFakeStore({ docs: [stored] });
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    const { holder } = renderEditor(store);
    const editor = await readyEditor(holder);

    await user.click(screen.getByRole('button', { name: 'Switch to Markdown' }));
    const source = await screen.findByRole('textbox', { name: 'Markdown source' });
    expect(valueOf(source)).toBe('Hello');
    expect(screen.queryByRole('textbox', { name: 'Document' })).toBeNull();

    await user.type(source, ' edited');
    await user.click(screen.getByRole('button', { name: 'Switch to Visual' }));

    await waitFor(() => {
      expect(editor.getMarkdown()).toBe('Hello edited');
    });
    await advancePastDebounce();
    await waitFor(() => {
      expect(store.saves.at(-1)?.markdown).toBe('Hello edited');
    });
  });

  // D1: the AI mode defaults to Ambient and the toggle only changes its state.
  it('switches the AI mode between Ambient and On Demand (D1)', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    renderEditor(createFakeStore());

    // The icon button names the mode a press switches to; the other name appears after it.
    const toOnDemand = await screen.findByRole('button', { name: 'Switch to On Demand' });
    expect(screen.queryByRole('button', { name: 'Switch to Ambient' })).toBeNull();

    await user.click(toOnDemand);

    expect(await screen.findByRole('button', { name: 'Switch to Ambient' })).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Switch to On Demand' })).toBeNull();
  });

  // S9: from md the view toggle and History are inline; below md they move into More actions.
  it('keeps History inline from md and has no overflow menu there (S9, D7)', async () => {
    renderEditor(createFakeStore());

    expect(await screen.findByRole('button', { name: 'Switch to Markdown' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'History' }).hasAttribute('disabled')).toBe(false);
    expect(screen.queryByRole('button', { name: 'More actions' })).toBeNull();
  });

  it('shows the overflow menu with Raw and History below md (S9)', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    setViewportWidth(360);
    renderEditor(createFakeStore());

    await user.click(await screen.findByRole('button', { name: 'More actions' }));
    expect(screen.queryByRole('button', { name: 'Switch to Markdown' })).toBeNull();
    const history = screen.getByRole('menuitem', { name: 'History' });
    expect(history.getAttribute('aria-disabled')).not.toBe('true');

    await user.click(screen.getByRole('menuitem', { name: 'Raw' }));

    expect(await screen.findByRole('textbox', { name: 'Markdown source' })).toBeTruthy();
  });
});
