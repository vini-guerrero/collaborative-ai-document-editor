import { Editor } from '@tiptap/core';
import { afterEach, describe, expect, it } from 'vitest';
import { createEditorExtensions } from './extensions';

let current: Editor | null = null;

afterEach(() => {
  current?.destroy();
  current = null;
});

// T2, T10: a paragraph whose later lines start with block syntax must not become a heading after
// a reload, so every line is escaped, not only the first.
describe('paragraph Markdown escaping', () => {
  it('escapes a block marker on a later line of the same paragraph', () => {
    const editor = new Editor({
      extensions: createEditorExtensions(),
      content: 'line',
      contentType: 'markdown',
    });
    current = editor;
    editor.view.dispatch(editor.state.tr.insertText('\n# x'));
    const markdown = editor.getMarkdown();
    expect(markdown).not.toMatch(/^# x$/m);
    expect(markdown).toContain('\\# x');
  });
});
