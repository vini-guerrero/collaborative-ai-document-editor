import { act, render, waitFor } from '@testing-library/react';
import type { Editor } from '@tiptap/react';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { expect, vi } from 'vitest';
import type { Flag } from '@shared/schemas';
import type { FetchLike } from '@/features/ai';
import { createLocalStorageStore, DocumentStoreProvider } from '@/features/documents';
import { DEFAULT_PAUSE_MS } from '../analyze/analyzeScheduler';
import { EditorPageView } from '../EditorPage';
import { AiTestProvider, analyzeResponse } from './fakeAi';

// Shared fixtures for the editor page tests that need the whole page with a faked AI.
export const NOW = 1_700_000_000_000;
export const PARAGRAPH = 'The launch moved to the second week of March.';
export const FLAG: Flag = { kind: 'clarity', quote: 'moved', reason: 'Say why the date changed.' };

export interface EditorHolder {
  editor: Editor | null;
}

// The page with a real store and AI client on top of the given fetch (T9).
export function renderEditorPage(fetchImpl: FetchLike): EditorHolder {
  const holder: EditorHolder = { editor: null };
  const store = createLocalStorageStore({ storage: window.localStorage });
  const router = createMemoryRouter(
    [
      {
        path: '/documents/doc-1',
        element: (
          <EditorPageView
            documentId="doc-1"
            now={() => NOW}
            onReady={(editor) => {
              holder.editor = editor;
            }}
          />
        ),
      },
    ],
    { initialEntries: ['/documents/doc-1'] },
  );
  render(
    <DocumentStoreProvider store={store}>
      <AiTestProvider fetchImpl={fetchImpl}>
        <RouterProvider router={router} />
      </AiTestProvider>
    </DocumentStoreProvider>,
  );
  return holder;
}

export async function readyEditor(holder: EditorHolder): Promise<Editor> {
  await waitFor(() => {
    expect(holder.editor).not.toBeNull();
  });
  if (holder.editor === null) {
    throw new Error('the editor was not handed to onReady');
  }
  return holder.editor;
}

export function insertParagraph(editor: Editor, text: string): void {
  act(() => {
    editor.commands.insertContent(text, { contentType: 'markdown' });
  });
}

export async function advancePastPause(): Promise<void> {
  await act(async () => {
    await vi.advanceTimersByTimeAsync(DEFAULT_PAUSE_MS);
  });
}

export function flagElementOrThrow(): HTMLElement {
  const element = document.querySelector<HTMLElement>('.flag');
  if (element === null) {
    throw new Error('no flag is rendered');
  }
  return element;
}

// Analysis returns FLAG; any rewrite request goes to `rewrite`.
export function flagFetch(rewrite: () => Promise<Response>): FetchLike {
  return (_url, init) => {
    const body = typeof init.body === 'string' ? init.body : '';
    return body.includes('"task":"rewrite"') ? rewrite() : Promise.resolve(analyzeResponse([FLAG]));
  };
}

export function rewriteResponse(replacement: string): Response {
  return new Response(JSON.stringify({ replacement }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
}

export interface DeferredResponse {
  promise: Promise<Response>;
  resolve: (response: Response) => void;
}

// A response that stays pending until the test resolves it, to observe the loading state.
export function deferredResponse(): DeferredResponse {
  let settle: (response: Response) => void = () => undefined;
  const promise = new Promise<Response>((resolve) => {
    settle = resolve;
  });
  return {
    promise,
    resolve: (response) => {
      settle(response);
    },
  };
}
