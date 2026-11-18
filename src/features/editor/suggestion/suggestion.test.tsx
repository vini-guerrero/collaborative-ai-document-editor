import { Editor } from '@tiptap/core';
import { afterEach, describe, expect, it } from 'vitest';
import { fnv1a32 } from '@/lib/hash';
import { createEditorExtensions } from '../markdown/extensions';
import { applySuggestion } from './applySuggestion';
import { createSuggestionPlugin, getSuggestion, setSuggestionMeta } from './suggestionPlugin';
import type { Suggestion } from './suggestionState';

const PARAGRAPH = 'The launch moved to the second week of March.';
const QUOTE = 'moved';

let current: Editor | null = null;

afterEach(() => {
  current?.destroy();
  current = null;
  document.body.replaceChildren();
});

function createEditor(markdown: string): Editor {
  // Attached to the document, so the decorations are queryable from the DOM.
  const element = document.createElement('div');
  document.body.append(element);
  const created = new Editor({
    element,
    extensions: [...createEditorExtensions(), createSuggestionPlugin()],
    content: markdown,
    contentType: 'markdown',
  });
  current = created;
  return created;
}

// The suggestion for the first occurrence of `quote` in a one-paragraph document.
function suggestionFor(editor: Editor, replacement: string, quote = QUOTE): Suggestion {
  const index = editor.state.doc.textContent.indexOf(quote);
  return {
    from: index + 1,
    to: index + 1 + quote.length,
    quote,
    replacement,
    blockHash: fnv1a32(editor.state.doc.textContent),
  };
}

function showSuggestion(editor: Editor, suggestion: Suggestion): void {
  editor.view.dispatch(setSuggestionMeta(editor.state.tr, suggestion));
}

function textOf(selector: string): string {
  return Array.from(document.querySelectorAll(selector))
    .map((element) => element.textContent)
    .join('');
}

describe('suggestion preview and accept', () => {
  // T3, D5: the preview is decorations; the document is unchanged until Accept.
  it('shows the preview without changing the text before Accept (T3, D5)', () => {
    const editor = createEditor(PARAGRAPH);
    showSuggestion(editor, suggestionFor(editor, 'pushed back'));

    expect(editor.state.doc.textContent).toBe(PARAGRAPH);
    expect(getSuggestion(editor.state)).not.toBeNull();
    expect(textOf('.suggestion-delete')).toBe('moved');
    expect(textOf('.suggestion-insert')).toBe('pushed back');
  });

  // D17: Accept is one undo step; one undo restores the original text.
  it('applies once and a single undo restores the original text (D17, T3)', () => {
    const editor = createEditor(PARAGRAPH);
    const suggestion = suggestionFor(editor, 'pushed back');
    showSuggestion(editor, suggestion);

    expect(applySuggestion(editor, suggestion)).toEqual({ ok: true });
    expect(editor.state.doc.textContent).toBe(
      'The launch pushed back to the second week of March.',
    );
    expect(getSuggestion(editor.state)).toBeNull();

    editor.commands.undo();

    expect(editor.state.doc.textContent).toBe(PARAGRAPH);
  });

  // T10: a suggestion whose block changed is rejected and changes nothing.
  it('rejects a suggestion whose block hash no longer matches (T10)', () => {
    const editor = createEditor(PARAGRAPH);
    const stale = { ...suggestionFor(editor, 'pushed back'), blockHash: 'stale-hash' };

    expect(applySuggestion(editor, stale)).toEqual({ ok: false, reason: 'stale' });
    expect(editor.state.doc.textContent).toBe(PARAGRAPH);
  });

  // D5: editing the range closes the preview.
  it('clears the suggestion when the flagged range is edited (D5, D17)', () => {
    const editor = createEditor(PARAGRAPH);
    const suggestion = suggestionFor(editor, 'pushed back');
    showSuggestion(editor, suggestion);

    editor.commands.insertContentAt(suggestion.from + 1, 'x');

    expect(getSuggestion(editor.state)).toBeNull();
    expect(document.querySelector('.suggestion-insert')).toBeNull();
  });

  // Any change to the block changes its hash, so the preview closes even outside the range.
  it('clears the suggestion when other text in the same block changes', () => {
    const editor = createEditor(PARAGRAPH);
    showSuggestion(editor, suggestionFor(editor, 'pushed back'));

    editor.commands.insertContentAt(1, 'Yes. ');

    expect(getSuggestion(editor.state)).toBeNull();
  });

  // T10: a replacement with markup is shown as text and creates no element.
  it('keeps markup in a replacement as text (T10)', () => {
    const editor = createEditor(PARAGRAPH);
    showSuggestion(editor, suggestionFor(editor, '<img src=x onerror=alert(1)>'));

    expect(document.querySelector('.ProseMirror img')).toBeNull();
    expect(textOf('.suggestion-insert')).toBe('<img src=x onerror=alert(1)>');
  });

  // Non-ASCII: positions are counted in the same units as the text, so the diff lines up.
  it('previews a non-ASCII replacement against a non-ASCII quote', () => {
    const text = 'Le café ouvert ici.';
    const editor = createEditor(text);
    showSuggestion(editor, suggestionFor(editor, 'café ☕', 'café'));

    expect(editor.state.doc.textContent).toBe(text);
    expect(textOf('.suggestion-delete')).toBe('');
    expect(textOf('.suggestion-insert')).toContain('☕');
  });
});
