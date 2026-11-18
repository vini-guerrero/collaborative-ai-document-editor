import { useCallback } from 'react';
import type { Editor } from '@tiptap/core';
import { closeHistory } from '@tiptap/pm/history';
import { parseMarkdown, type MarkdownResult } from '../markdown/markdown';

// D17: the restore replaces the whole document in one transaction. closeHistory makes it a
// separate undo step, so one undo returns to the Markdown from before the restore.
// The Markdown is parsed into the editor's schema, never assigned as HTML (T10).
// Persistence is not here: the caller appends the "Restored" entry and saves.
// Returns an error without changing the document when the Markdown cannot be parsed.
export function restoreVersion(editor: Editor, markdown: string): MarkdownResult<void> {
  const parsed = parseMarkdown(markdown);
  if (!parsed.ok) {
    return parsed;
  }
  const restored = editor.schema.nodeFromJSON(parsed.value);
  const { tr } = editor.state;
  tr.replaceWith(0, tr.doc.content.size, restored.content);
  editor.view.dispatch(closeHistory(tr));
  // Closed after as well, so typing that follows is not merged into the restore (as in Accept).
  editor.view.dispatch(closeHistory(editor.state.tr));
  return { ok: true, value: undefined };
}

// The returned function is stable for a given editor, so a caller can pass it on without
// re-rendering its children.
export function useHistoryRestore(editor: Editor): (markdown: string) => MarkdownResult<void> {
  return useCallback((markdown: string) => restoreVersion(editor, markdown), [editor]);
}
