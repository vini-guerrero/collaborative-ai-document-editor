import { Editor } from '@tiptap/core';
import { describe, expect, it } from 'vitest';
import { createEditorExtensions } from '../markdown/extensions';
import { CURRENT_BLOCK_CLASS, createCurrentBlockExtension } from './currentBlockExtension';

// D17: the block under the caret is marked; the document itself does not change (T3).
describe('current block marker', () => {
  it('marks only the top-level block that holds the caret', () => {
    const editor = new Editor({
      extensions: [...createEditorExtensions(), createCurrentBlockExtension()],
      content: 'First line\n\nSecond line',
      contentType: 'markdown',
    });
    editor.commands.setTextSelection(3);
    const marked = editor.view.dom.querySelectorAll(`.${CURRENT_BLOCK_CLASS}`);
    expect(marked).toHaveLength(1);
    expect(marked[0]?.textContent).toBe('First line');

    editor.commands.setTextSelection(editor.state.doc.content.size - 2);
    expect(editor.view.dom.querySelector(`.${CURRENT_BLOCK_CLASS}`)?.textContent).toBe(
      'Second line',
    );
    editor.destroy();
  });
});
