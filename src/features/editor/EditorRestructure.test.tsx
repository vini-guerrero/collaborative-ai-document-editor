import { act, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { Editor } from '@tiptap/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { FetchLike } from '@/features/ai';
import { readyEditor, renderEditorPage } from './testing/editorHarness';
import { analyzeResponse } from './testing/fakeAi';

const DOCUMENT = '# A\n\nfirst\n\n# B\n\nsecond';

// The restructure contract answers with one operation: move the first section after the second (D10).
// Analysis is empty; other requests are not expected here.
function restructureFetch(bodies: string[]): FetchLike {
  return (_url, init) => {
    const body = typeof init.body === 'string' ? init.body : '';
    if (body.includes('"task":"restructure"')) {
      bodies.push(body);
      return Promise.resolve(
        new Response(JSON.stringify({ op: 'move', from: 0, to: 1 }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }),
      );
    }
    return Promise.resolve(analyzeResponse([]));
  };
}

// The document's text with the end of the "first" paragraph, where the author types "/".
function endOfParagraph(editor: Editor, text: string): number {
  let end = -1;
  editor.state.doc.descendants((node, pos) => {
    if (node.type.name === 'paragraph' && node.textContent === text) {
      end = pos + node.nodeSize - 1;
    }
    return end === -1;
  });
  return end;
}

beforeEach(() => {
  vi.useFakeTimers({ shouldAdvanceTime: true });
});

afterEach(() => {
  vi.useRealTimers();
  window.localStorage.clear();
});

describe('restructure section from the slash menu (D10, D11)', () => {
  // D10, D11, T3: the slash item asks for an operation on the caret's section; the preview is
  // shown; Accept moves the section as one undo step and records an AI history entry (D7).
  it('previews the operation, applies it on Accept and undoes it in one step', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    const bodies: string[] = [];
    const holder = renderEditorPage(restructureFetch(bodies));
    const editor = await readyEditor(holder);
    act(() => {
      editor.commands.insertContent(DOCUMENT, { contentType: 'markdown' });
    });
    const at = endOfParagraph(editor, 'first');
    // The caret moves after the typed " /", which is what the suggestion plugin reads.
    act(() => {
      editor.commands.setTextSelection(at);
      editor.view.focus();
      editor.view.dispatch(editor.state.tr.insertText(' /'));
    });
    await user.click(await screen.findByRole('option', { name: /Restructure section/ }));

    const panel = await screen.findByRole('region', { name: 'Restructure suggestion' });
    expect(bodies[0]).toContain('"action":"move"');
    expect(bodies[0]).toContain('"section":0');
    // The document is unchanged until Accept (T3).
    expect(editor.getText().indexOf('first')).toBeLessThan(editor.getText().indexOf('second'));

    await user.click(within(panel).getByRole('button', { name: 'Accept' }));

    await waitFor(() => {
      expect(editor.getText().indexOf('second')).toBeLessThan(editor.getText().indexOf('first'));
    });
    expect(screen.queryByRole('region', { name: 'Restructure suggestion' })).toBeNull();

    act(() => {
      editor.commands.undo();
    });
    expect(editor.getText().indexOf('first')).toBeLessThan(editor.getText().indexOf('second'));
  });
});
