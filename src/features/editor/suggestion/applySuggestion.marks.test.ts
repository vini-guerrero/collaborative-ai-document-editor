import { Editor } from '@tiptap/core';
import { afterEach, describe, expect, it } from 'vitest';
import { fnv1a32 } from '@/lib/hash';
import { createEditorExtensions } from '../markdown/extensions';
import { applySuggestion } from './applySuggestion';
import { createSuggestionPlugin } from './suggestionPlugin';

let current: Editor | null = null;

afterEach(() => {
  current?.destroy();
  current = null;
});

// D17, T3: Accept keeps the bold mark of the quoted text on the replacement.
describe('applySuggestion marks', () => {
  it('keeps the bold mark of the quoted text on the accepted replacement', () => {
    const editor = new Editor({
      extensions: [...createEditorExtensions(), createSuggestionPlugin()],
      content: '**moved** here',
      contentType: 'markdown',
    });
    current = editor;
    const paragraph = editor.state.doc.firstChild;
    const text = paragraph?.textContent ?? '';
    const result = applySuggestion(editor, {
      from: 1,
      to: 6,
      quote: 'moved',
      replacement: 'pushed',
      blockHash: fnv1a32(text),
    });
    expect(result.ok).toBe(true);
    const replaced = editor.state.doc.nodeAt(1);
    expect(replaced?.text).toBe('pushed');
    expect(replaced?.marks.some((mark) => mark.type.name === 'bold')).toBe(true);
  });
});
