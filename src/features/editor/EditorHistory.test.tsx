import { act, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { FetchLike } from '@/features/ai';
import {
  insertParagraph,
  PARAGRAPH,
  readyEditor,
  renderEditorPage,
  rewriteResponse,
} from './testing/editorHarness';
import { analyzeResponse } from './testing/fakeAi';

// Analysis is empty; rewrite requests get the reply (T9).
function rewriteFetch(reply: string): FetchLike {
  return (_url, init) => {
    const body = typeof init.body === 'string' ? init.body : '';
    if (!body.includes('"task":"rewrite"')) {
      return Promise.resolve(analyzeResponse([]));
    }
    return Promise.resolve(rewriteResponse(reply));
  };
}

beforeEach(() => {
  vi.useFakeTimers({ shouldAdvanceTime: true });
});

afterEach(() => {
  vi.useRealTimers();
  window.localStorage.clear();
});

describe('version history (D7)', () => {
  // D7: an accepted suggestion is recorded; restoring it replaces the text as one undo step.
  it('records an accepted suggestion and restores it as one undo step', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    const holder = renderEditorPage(rewriteFetch('pushed back'));
    const editor = await readyEditor(holder);
    insertParagraph(editor, PARAGRAPH);
    act(() => {
      editor.commands.setTextSelection({ from: 12, to: 17 });
    });
    await user.click(await screen.findByRole('button', { name: 'Rewrite' }));
    const card = await screen.findByRole('dialog', { name: 'Suggestion' });
    await user.click(await within(card).findByRole('button', { name: 'Accept' }));
    await waitFor(() => {
      expect(editor.getText()).toContain('pushed back');
    });

    // Later edits, then the timeline restores the accepted version.
    act(() => {
      editor.commands.insertContentAt(editor.state.doc.content.size - 1, 'more');
    });
    expect(editor.getText()).toContain('more');

    await user.click(screen.getByRole('button', { name: 'History' }));
    const timeline = await screen.findByRole('dialog', { name: 'Version history' });
    await user.click(
      within(timeline).getByRole('button', { name: 'Restore this version: Selected Text' }),
    );

    await waitFor(() => {
      expect(editor.getText()).not.toContain('more');
    });
    expect(editor.getText()).toContain('pushed back');

    act(() => {
      editor.commands.undo();
    });
    expect(editor.getText()).toContain('more');
  });
});
