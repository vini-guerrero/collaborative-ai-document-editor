import { renderHook } from '@testing-library/react';
import { Editor } from '@tiptap/core';
import { undo } from '@tiptap/pm/history';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createEditorExtensions } from '../markdown/extensions';
import { parseMarkdown, serializeMarkdown } from '../markdown/markdown';
import { restoreVersion, useHistoryRestore } from './useHistoryRestore';

// D17: a restore is one undoable transaction. These tests use a headless editor, as the page does.
let editor: Editor;

function createEditor(markdown: string): Editor {
  const parsed = parseMarkdown(markdown);
  if (!parsed.ok) {
    throw new Error('the fixture Markdown did not parse');
  }
  return new Editor({ extensions: createEditorExtensions(), content: parsed.value });
}

function currentMarkdown(): string {
  return serializeMarkdown(editor).trim();
}

beforeEach(() => {
  editor = createEditor('Current draft.');
});

afterEach(() => {
  editor.destroy();
});

describe('restoreVersion', () => {
  it('replaces the document with the restored Markdown', () => {
    const result = restoreVersion(editor, '# Earlier\n\nOld paragraph.');
    expect(result.ok).toBe(true);
    expect(currentMarkdown()).toBe('# Earlier\n\nOld paragraph.');
  });

  it('undoes the whole restore in one step', () => {
    restoreVersion(editor, 'Restored text.');
    expect(currentMarkdown()).toBe('Restored text.');
    undo(editor.state, editor.view.dispatch);
    expect(currentMarkdown()).toBe('Current draft.');
  });

  it('keeps non-ASCII text', () => {
    restoreVersion(editor, 'Café — 東京 😀 ñandú');
    expect(currentMarkdown()).toBe('Café — 東京 😀 ñandú');
  });

  it('keeps raw HTML in the Markdown out of the live DOM', () => {
    restoreVersion(editor, 'Hello <script>alert(1)</script> <img src="x" onerror="boom()">');
    expect(editor.view.dom.querySelector('script')).toBeNull();
    expect(editor.view.dom.querySelector('img')).toBeNull();
  });

  it('restores an empty document when the Markdown is empty', () => {
    const result = restoreVersion(editor, '');
    expect(result.ok).toBe(true);
    expect(currentMarkdown()).toBe('');
  });
});

describe('useHistoryRestore', () => {
  it('returns a restore function that replaces the document', () => {
    const { result } = renderHook(() => useHistoryRestore(editor));
    result.current('From the hook.');
    expect(currentMarkdown()).toBe('From the hook.');
  });

  it('keeps the same function for the same editor across renders', () => {
    const { result, rerender } = renderHook(() => useHistoryRestore(editor));
    const first = result.current;
    rerender();
    expect(result.current).toBe(first);
  });
});
